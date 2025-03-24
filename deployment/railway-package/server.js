import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { registerOutboundRoutes } from './outbound-minimal.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';

// Initialize Fastify with default settings
const server = fastify({ logger: true });

// Register plugins with standard settings
server.register(fastifyWebsocket);
server.register(fastifyFormBody);

// Register outbound calling routes
registerOutboundRoutes(server);

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

// Simple health check endpoint - for debugging server status
server.get('/health', async (request, reply) => {
  return { 
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  };
});

// Root route
server.get('/', async (request, reply) => {
  return { status: 'Server is running' };
});

// Start the server - use PORT from environment if available (Railway standard)
const start = async () => {
  try {
    // Railway typically sets PORT environment variable
    const port = process.env.PORT || 8000;
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`[Server] Listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();