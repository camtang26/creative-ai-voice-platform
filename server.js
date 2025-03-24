import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { registerOutboundRoutes } from './outbound.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';

// Initialize Fastify with optimized TCP settings for lower latency
const server = fastify({ 
  logger: true,
  // Set TCP socket options for lower latency
  http: {
    connectionTimeout: 30000,        // 30 seconds
    keepAliveTimeout: 30000,         // 30 seconds
    maxRequestsPerSocket: 0,         // Unlimited requests per connection
    headersTimeout: 30000,           // 30 seconds
    requestTimeout: 30000,           // 30 seconds
    tcpKeepAlive: true,              // Enable TCP keep-alive
    tcpNoDelay: true                 // Disable Nagle's algorithm
  }
});

// Register plugins with optimized settings for lower latency
server.register(fastifyWebsocket, {
  options: { 
    // Optimize WebSocket for low latency
    perMessageDeflate: false,     // Disable compression for real-time audio
    maxPayload: 64 * 1024,        // Larger payload size (64KB)
    handshakeTimeout: 5000,       // 5 seconds
    clientTracking: false,        // Disable client tracking for better performance
    clientNoContextTakeover: true, // Disable context takeover on client
    serverNoContextTakeover: true  // Disable context takeover on server
  }
});
server.register(fastifyFormBody);

// Register outbound calling routes
registerOutboundRoutes(server);

// Helper function to verify webhook signature
function verifySignature(payload, signature, secret) {
  if (!secret || !signature) {
    console.log('[Webhook] No secret or signature provided, skipping validation');
    return true;
  }
  
  try {
    const [timestampPart, hashPart] = signature.split(',');
    const timestamp = timestampPart.replace('t=', '');
    const receivedHash = hashPart.replace('v0=', '');
    
    const fullPayloadToSign = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = 'v0=' + hmac.digest('hex');
    
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

// Simple debug webhook that just logs and returns success
server.post('/webhooks/elevenlabs-debug', (request, reply) => {
  console.log('[Webhook Debug] Received webhook with headers:', JSON.stringify(request.headers, null, 2));
  
  // Log a truncated version of the body to avoid huge logs
  const bodyStr = JSON.stringify(request.body, null, 2);
  console.log('[Webhook Debug] Request body (truncated):', bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr);
  
  // Always return success
  return reply.code(200).send({ status: 'success', message: 'Webhook received and logged' });
});

// Main webhook handler
server.post('/webhooks/elevenlabs', async (request, reply) => {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    // CRM endpoint URL
    const crmEndpoint = process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is';
    
    console.log('[Webhook] Received ElevenLabs webhook');
    
    // Log a truncated version of the body to avoid huge logs
    const bodyStr = JSON.stringify(request.body);
    console.log('[Webhook] Request body (truncated):', bodyStr.length > 500 ? bodyStr.substring(0, 500) + '...' : bodyStr);
    
    // Verify signature if secret is provided
    const signature = request.headers['elevenlabs-signature'];
    if (webhookSecret && signature) {
      const isValid = verifySignature(request.body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        // Still return 200 to prevent further failures
        return reply.code(200).send({
          status: 'error',
          error: 'Invalid signature'
        });
      }
      console.log('[Webhook] Signature verified successfully');
    }
    
    const webhookData = request.body;
    
    // Skip if this is not a post-call transcription event
    if (webhookData.type !== 'post_call_transcription') {
      console.log(`[Webhook] Ignoring event type: ${webhookData.type}`);
      return reply.code(200).send({
        status: 'success', 
        message: 'Event type ignored'
      });
    }
    
    // Extract required data
    const { data } = webhookData;
    
    // Determine call status
    let status = 'unknown';
    if (data && data.analysis && data.analysis.call_successful) {
      status = data.analysis.call_successful === 'success' ? 'held' : 'failed';
    } else if (data && data.transcript && data.transcript.some(msg => msg.role === 'user')) {
      status = 'held';
    } else {
      // Check for voicemail indicators
      const voicemailIndicators = ['voicemail', 'leave a message', 'after the tone'];
      const lastAgentMessage = data && data.transcript ? 
        data.transcript.filter(msg => msg.role === 'agent').pop()?.message : '';
      
      if (lastAgentMessage && 
          voicemailIndicators.some(indicator => lastAgentMessage.toLowerCase().includes(indicator))) {
        status = 'voicemail';
      } else {
        status = 'no answer';
      }
    }
    
    // Extract name and phone number
    let name = 'Unknown';
    let phoneNumber = 'Unknown';
    
    // Try to get from dynamic variables
    if (data && data.conversation_initiation_client_data?.dynamic_variables) {
      const vars = data.conversation_initiation_client_data.dynamic_variables;
      if (vars.name) name = vars.name;
      if (vars.contact_name) name = vars.contact_name;
      if (vars.phone_number) phoneNumber = vars.phone_number;
    }
    
    // Get summary and duration
    const summary = data && data.analysis?.transcript_summary || 'No summary available';
    const duration = data && data.metadata?.call_duration_secs || 0;
    
    // Prepare the payload for Craig's endpoint
    const crmPayload = {
      type: "conversationAICall",
      subject: "Invitation to re-trial",
      to: phoneNumber,
      name: name,
      summary: summary,
      status: status,
      duration: duration
    };
    
    console.log('[Webhook] Sending to CRM endpoint:', JSON.stringify(crmPayload, null, 2));
    
    try {
      // Send to Craig's endpoint
      const response = await fetch(crmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmPayload)
      });
      
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = 'No response body';
      }
      
      if (!response.ok) {
        console.error(`[Webhook] CRM endpoint error (${response.status}): ${responseText}`);
        // Still return 200 to ElevenLabs
        return reply.code(200).send({
          status: 'error',
          error: 'CRM endpoint error',
          details: responseText
        });
      }
      
      console.log('[Webhook] Successfully sent to CRM endpoint');
      return reply.code(200).send({
        status: 'success',
        message: 'Successfully processed webhook and sent to CRM'
      });
      
    } catch (error) {
      console.error('[Webhook] Error sending to CRM endpoint:', error);
      // Still return 200 to ElevenLabs
      return reply.code(200).send({
        status: 'error',
        error: 'Failed to send to CRM endpoint',
        details: error.message
      });
    }
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    // Always return 200 to ElevenLabs to prevent disabling the webhook
    return reply.code(200).send({
      status: 'error',
      message: error.message
    });
  }
});

// Register email routes
server.post('/api/email/send', {
  handler: async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      
      // Validate auth header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ 
          success: false, 
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header'
        });
      }
      
      const apiKey = authHeader.split(' ')[1];
      if (apiKey !== process.env.EMAIL_API_KEY) {
        return reply.code(401).send({ 
          success: false, 
          error: 'Invalid API key',
          message: 'The provided authorization key is invalid'
        });
      }
      
      // Validate request body
      const { to_email, subject, content, customer_name } = request.body;
      
      if (!to_email || !subject || !content) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields',
          message: 'Email address, subject, and content are required'
        });
      }
      
      try {
        // First try the newer REST API implementation
        console.log('[API] Attempting to send email via Investor Signals API...');
        const result = await sendEmail({
          to_email,
          subject,
          content,
          customer_name
        });
        
        console.log('[API] Email sent successfully via Investor Signals API');
        return {
          success: true,
          message: 'Email sent successfully',
          messageId: result.messageId
        };
      } catch (apiError) {
        console.error('[API] Investor Signals API Error:', apiError.message);
        
        // Fall back to SES if the API fails
        try {
          console.log('[API] Falling back to AWS SES...');
          const sesResult = await sendSESEmail({
            to_email,
            subject,
            content,
            customer_name
          });
          
          console.log('[API] Email sent successfully via SES fallback');
          return {
            success: true,
            message: 'Email sent successfully (via SES fallback)',
            messageId: sesResult.messageId
          };
        } catch (sesError) {
          // Both methods failed
          console.error('[API] SES Email Error:', sesError.message);
          
          // Log details about what we tried to send
          console.log('\n=== FAILED EMAIL ATTEMPT ===');
          console.log(`To: ${to_email}`);
          console.log(`Subject: ${subject}`);
          console.log(`Customer: ${customer_name || 'Not provided'}`);
          console.log('==============================\n');
          
          // Return a proper error response
          return reply.code(500).send({
            success: false,
            error: 'Email sending failed',
            message: `API: ${apiError.message}, SES: ${sesError.message}`,
            details: 'There was an issue with all email services. Please contact support.',
            errorCode: 'ALL_METHODS_FAILED'
          });
        }
      }
    } catch (error) {
      console.error('[API] Unexpected error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// Add health check endpoint
server.get('/api/email/health', async (request, reply) => {
  try {
    const diagnostics = {
      status: 'ok',
      service: 'email-service',
      serverVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      emailConfiguration: {
        primaryProvider: 'Investor Signals API',
        backupProvider: 'AWS SES',
        region: process.env.SES_REGION || 'ap-southeast-2',
        fromEmail: 'info@investorsignals.com', // API always uses this address
        fallbackEnabled: process.env.EMAIL_FALLBACK_ENABLED === 'true',
        apiKeyConfigured: !!process.env.EMAIL_API_KEY
      }
    };
    
    return diagnostics;
  } catch (error) {
    console.error('[API] Health check error:', error);
    return reply.code(500).send({
      status: 'error',
      error: error.message
    });
  }
});

// Add webhook health check endpoint
server.get('/webhooks/elevenlabs/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'elevenlabs-webhook',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET ? 'configured' : 'not configured',
    crmEndpoint: process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is'
  };
});

// Diagnostic endpoint to list all routes
server.get('/debug/routes', (request, reply) => {
  const routes = [];
  
  // Extract all registered routes
  server.routes.forEach(route => {
    routes.push(`${route.method} ${route.url}`);
  });
  
  return reply.code(200).send({ 
    routes,
    webhookConfigured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    crmEndpoint: process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is'
  });
});

// Root route
server.get('/', async (request, reply) => {
  return { 
    status: 'Server is running',
    webhookConfigured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    availableRoutes: [
      'GET /api/email/health',
      'POST /api/email/send',
      'POST /webhooks/elevenlabs',
      'POST /webhooks/elevenlabs-debug',
      'GET /debug/routes',
      'GET /webhooks/elevenlabs/health'
    ],
    debug: 'Routes should be working correctly now',
    version: 'Fastify-only simplified version'
  };
});

// Start the server
const start = async () => {
  try {
    // Use environment port (for Railway) or default to 8000
    const port = process.env.PORT || 8000;
    const host = '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`[Server] Listening on port ${port}`);
    console.log('[Server] Routes registered:');
    console.log('  - POST /webhooks/elevenlabs');
    console.log('  - POST /webhooks/elevenlabs-debug'); 
    console.log('  - GET /webhooks/elevenlabs/health');
    console.log('  - GET /debug/routes');
    
    // Log all registered routes for debugging
    console.log('[Server] All registered routes:');
    server.routes.forEach(route => {
      console.log(`  - ${route.method} ${route.url}`);
    });
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();