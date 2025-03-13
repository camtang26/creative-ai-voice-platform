import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { registerOutboundRoutes } from './outbound.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';

// Initialize Fastify
const server = fastify({ logger: true });

// Register plugins
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
        // Try to send the email using SES
        console.log('[API] Attempting to send email via AWS SES...');
        const result = await sendSESEmail({
          to_email,
          subject,
          content,
          customer_name
        });
        
        console.log('[API] Email sent successfully via SES');
        return {
          success: true,
          message: 'Email sent successfully',
          messageId: result.messageId
        };
      } catch (emailError) {
        // Log the error properly
        console.error('[API] SES Email Error:', emailError.message);
        
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
          message: emailError.message,
          details: 'There was an issue with the email service. Please contact support.',
          // Don't expose too much in the error response for security
          errorCode: emailError.code || 'UNKNOWN'
        });
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
        provider: 'AWS SES',
        region: process.env.SES_REGION || 'ap-southeast-2',
        fromEmail: process.env.SES_FROM_EMAIL || 'noreply@sessyd.investorsignals.com',
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

// Root route
server.get('/', async (request, reply) => {
  return { status: 'Server is running' };
});

// Start the server
const start = async () => {
  try {
    await server.listen({ port: 8000, host: '0.0.0.0' });
    console.log(`[Server] Listening on port 8000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start(); 