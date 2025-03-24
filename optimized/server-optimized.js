import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { registerOutboundRoutes } from './outbound-optimized.js';
import fs from 'fs';

// Get the current directory and parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

// Load environment variables from parent directory
const envPath = path.join(parentDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`ERROR: .env file not found at ${envPath}`);
  process.exit(1);
}

// Import email services after env vars are loaded
const { sendEmail } = await import('../email-tools/api-email-service.js');
const { sendSESEmail } = await import('../email-tools/aws-ses-email.js');

console.log('====================================================');
console.log('       RUNNING OPTIMIZED SERVER FOR LOW LATENCY     ');
console.log('====================================================');

// Verify required environment variables are loaded
const requiredVars = [
  'ELEVENLABS_API_KEY', 
  'ELEVENLABS_AGENT_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

let missingVars = [];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Fastify with performance options
const server = fastify({ 
  logger: true,
  // Set TCP socket options for lower latency
  http: {
    connectionTimeout: 30000, // 30 seconds
    keepAliveTimeout: 30000,  // 30 seconds
  }
});

// Register plugins with optimized settings
server.register(fastifyWebsocket, {
  options: { 
    // Optimize WebSocket for low latency
    perMessageDeflate: false,     // Disable compression for real-time audio
    maxPayload: 64 * 1024,        // Larger payload size (64KB)
    handshakeTimeout: 5000,       // 5 seconds
    clientTracking: false         // Disable client tracking for better performance
  }
});
server.register(fastifyFormBody);

// Register optimized outbound calling routes
registerOutboundRoutes(server);

// Register email routes (same as original)
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

// Add health check endpoint with additional latency monitoring info
server.get('/api/email/health', async (request, reply) => {
  try {
    const diagnostics = {
      status: 'ok',
      service: 'email-service',
      serverVersion: '1.0.0-optimized',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      emailConfiguration: {
        primaryProvider: 'Investor Signals API',
        backupProvider: 'AWS SES',
        region: process.env.SES_REGION || 'ap-southeast-2',
        fromEmail: 'info@investorsignals.com', // API always uses this address
        fallbackEnabled: process.env.EMAIL_FALLBACK_ENABLED === 'true',
        apiKeyConfigured: !!process.env.EMAIL_API_KEY
      },
      optimizations: {
        lowLatencyMode: true,
        websocketCompression: false,
        enhancedAudioProcessing: true
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

// Root route with version info
server.get('/', async (request, reply) => {
  return { 
    status: 'Server is running (Optimized version)',
    optimized: true,
    version: '1.0.0-optimized'
  };
});

// Print environment information
console.log('Environment information:');
console.log(`- TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Missing'}`);
console.log(`- ELEVENLABS_AGENT_ID: ${process.env.ELEVENLABS_AGENT_ID ? '✓ Set' : '✗ Missing'}`);
console.log(`- SERVER_URL: ${process.env.SERVER_URL || 'Not set (will use request host)'}`);

// Start the server
const start = async () => {
  try {
    // Use a different port to avoid conflict with the original server
    const port = process.env.OPTIMIZED_PORT || 8001;
    
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`[Server] Optimized server listening on port ${port}`);
    console.log('[Server] Use this port in your ngrok configuration');
    console.log('[IMPORTANT] Update SERVER_URL in .env to your ngrok URL for this port');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();