import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import { registerOutboundRoutes } from './outbound.js';

// Initialize Fastify
const server = fastify({ logger: true });

// Register plugins
server.register(fastifyWebsocket);
server.register(fastifyFormBody);

// Register outbound calling routes
registerOutboundRoutes(server);

// Root route
server.get('/', async (request, reply) => {
  return { 
    status: 'Server is running', 
    server: 'US-East optimized for low latency',
    version: '1.0.0'
  };
});

// Health check endpoint
server.get('/health', async (request, reply) => {
  try {
    const diagnostics = {
      status: 'ok',
      service: 'twilio-elevenlabs-bridge',
      serverVersion: '1.0.0-optimized',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      region: 'us-east1',
      elevenlabsApiConfigured: !!process.env.ELEVENLABS_API_KEY,
      twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID
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

// Start the server
const start = async () => {
  try {
    // Railway sets PORT environment variable - use that or default to 8000
    const port = process.env.PORT || 8000;
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`[Server] Listening on port ${port}`);
    console.log(`[Server] US-East optimized deployment for low latency`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();