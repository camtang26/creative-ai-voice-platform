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
  return { status: 'Server is running' };
});

// Add health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    // Railway sets PORT environment variable - use that or default to 8000
    const port = process.env.PORT || 8000;
    await server.listen({ port: port, host: '0.0.0.0' });
    console.log(`[Server] Listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();