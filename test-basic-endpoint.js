/**
 * Add a basic test endpoint to debug route registration
 */

import fastify from 'fastify';

const server = fastify({ logger: true });

// Test basic route
server.post('/api/test-basic', async (request, reply) => {
  console.log('[Test Basic] Received request');
  return { success: true, message: 'Basic endpoint works', body: request.body };
});

// Test with asyncHandler-like wrapper
server.post('/api/test-wrapped', (request, reply) => {
  return Promise.resolve((async () => {
    console.log('[Test Wrapped] Received request');
    return { success: true, message: 'Wrapped endpoint works', body: request.body };
  })()).catch(err => {
    console.error('[Test Wrapped] Error:', err);
    reply.code(500).send({ error: err.message });
  });
});

// Test phone validation without asyncHandler
server.post('/api/test-phone', async (request, reply) => {
  console.log('[Test Phone] Received request:', request.body);
  const { phoneNumber } = request.body;
  
  if (!phoneNumber) {
    return reply.code(400).send({
      success: false,
      error: 'Phone number required'
    });
  }
  
  return {
    success: true,
    data: {
      isValid: true,
      phoneNumber: phoneNumber
    },
    message: 'Test phone validation'
  };
});

const start = async () => {
  try {
    await server.listen({ port: 8001, host: '0.0.0.0' });
    console.log('Test server running on port 8001');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();