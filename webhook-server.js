import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Create a standalone Express server for handling webhooks
const app = express();
const PORT = process.env.WEBHOOK_PORT || 3000;

// Parse JSON bodies
app.use(express.json({
  verify: (req, res, buf) => {
    // Store the raw body for signature verification
    req.rawBody = buf.toString();
  }
}));

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
    
    const fullPayloadToSign = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = 'v0=' + hmac.digest('hex');
    
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

// Simple route to check if the server is running
app.get('/', (req, res) => {
  res.json({
    status: 'Webhook server is running',
    endpoints: [
      'POST /webhooks/elevenlabs',
      'POST /webhooks/elevenlabs-debug',
      'GET /webhooks/elevenlabs/health'
    ]
  });
});

// Debug webhook route - just logs the data
app.post('/webhooks/elevenlabs-debug', (req, res) => {
  console.log('[Webhook Debug] Received webhook with headers:', JSON.stringify(req.headers, null, 2));
  
  // Log a portion of the body to keep logs manageable
  const bodyStr = JSON.stringify(req.body, null, 2);
  console.log('[Webhook Debug] Request body (truncated):', 
    bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr);
  
  // Always return success to keep ElevenLabs happy
  res.status(200).json({
    status: 'success',
    message: 'Webhook received and logged'
  });
});

// Main webhook handler
app.post('/webhooks/elevenlabs', async (req, res) => {
  try {
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    const crmEndpoint = process.env.CRM_WEBHOOK_URL || 
      'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is';
    
    console.log('[Webhook] Received ElevenLabs webhook');
    
    // Verify signature if secret is provided
    const signature = req.headers['elevenlabs-signature'];
    if (webhookSecret && signature) {
      const isValid = verifySignature(req.rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        // Still return 200 to prevent further failures
        return res.status(200).json({
          status: 'error',
          error: 'Invalid signature'
        });
      }
      console.log('[Webhook] Signature verified successfully');
    }
    
    const webhookData = req.body;
    
    // Skip if this is not a post-call transcription event
    if (webhookData.type !== 'post_call_transcription') {
      console.log(`[Webhook] Ignoring event type: ${webhookData.type}`);
      return res.status(200).json({
        status: 'success', 
        message: 'Event type ignored'
      });
    }
    
    // Extract required data
    const { data } = webhookData;
    
    // Determine call status
    let status = 'unknown';
    if (data.analysis && data.analysis.call_successful) {
      status = data.analysis.call_successful === 'success' ? 'held' : 'failed';
    } else if (data.transcript && data.transcript.some(msg => msg.role === 'user')) {
      status = 'held';
    } else {
      // Check for voicemail indicators
      const voicemailIndicators = ['voicemail', 'leave a message', 'after the tone'];
      const lastAgentMessage = data.transcript ? 
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
    if (data.conversation_initiation_client_data?.dynamic_variables) {
      const vars = data.conversation_initiation_client_data.dynamic_variables;
      if (vars.name) name = vars.name;
      if (vars.contact_name) name = vars.contact_name;
      if (vars.phone_number) phoneNumber = vars.phone_number;
    }
    
    // Get summary and duration
    const summary = data.analysis?.transcript_summary || 'No summary available';
    const duration = data.metadata?.call_duration_secs || 0;
    
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
      
      if (!response.ok) {
        console.error(`[Webhook] CRM endpoint error (${response.status})`);
        // Still return 200 to ElevenLabs
        return res.status(200).json({
          status: 'error',
          error: 'CRM endpoint error',
          details: await response.text()
        });
      }
      
      console.log('[Webhook] Successfully sent to CRM endpoint');
      return res.status(200).json({
        status: 'success',
        message: 'Successfully processed webhook and sent to CRM'
      });
      
    } catch (error) {
      console.error('[Webhook] Error sending to CRM endpoint:', error);
      // Still return 200 to ElevenLabs
      return res.status(200).json({
        status: 'error',
        error: 'Failed to send to CRM endpoint',
        details: error.message
      });
    }
    
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    // Always return 200 to ElevenLabs to prevent disabling the webhook
    return res.status(200).json({
      status: 'error',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/webhooks/elevenlabs/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'elevenlabs-webhook',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET ? 'configured' : 'not configured',
    crmEndpoint: process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Webhook Server] Running on port ${PORT}`);
  console.log('[Webhook Server] Routes registered:');
  console.log('  - GET /');
  console.log('  - POST /webhooks/elevenlabs');
  console.log('  - POST /webhooks/elevenlabs-debug');
  console.log('  - GET /webhooks/elevenlabs/health');
});
