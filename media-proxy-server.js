import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import WebSocket from 'ws'; // Although not used directly, keep for potential future debugging

// --- Fastify Server Setup ---
const proxyServer = fastify({
  logger: {
    level: 'debug' // Keep debug level
  },
  trustProxy: true, // Important for Railway
});

// Register only the websocket plugin
proxyServer.register(fastifyWebsocket);

// --- Health Check ---
proxyServer.get('/healthz', async (request, reply) => {
  return { status: 'ok', service: 'media-proxy-minimal', timestamp: new Date().toISOString() };
});
console.log('[Media Proxy Minimal] Registered /healthz endpoint');


// --- Minimal WebSocket Proxy Handler ---
proxyServer.get('/outbound-media-stream', { websocket: true }, (connection, req) => {
  console.error('!!!!!! [Minimal WS Handler] WebSocket handler invoked! !!!!!!');
  proxyServer.log.info('!!!!!! [Minimal WS Handler] WebSocket handler invoked! !!!!!!'); // Also log info

  let streamSid = null; // Keep track for logging

  // --- Send Connected message immediately ---
  try {
    console.error('[Minimal WS Handler] Attempting to send "connected" event...');
    connection.socket.send(JSON.stringify({ event: "connected" }), (err) => {
      if (err) {
        console.error('[Minimal WS Handler] ERROR sending "connected" event:', err);
        proxyServer.log.error('[Minimal WS Handler] ERROR sending "connected" event:', err);
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
      } else {
        console.error('[Minimal WS Handler] Successfully sent "connected" event.');
        proxyServer.log.info('[Minimal WS Handler] Successfully sent "connected" event.');
      }
    });
  } catch (err) {
    console.error('[Minimal WS Handler] EXCEPTION sending "connected" event:', err);
    proxyServer.log.error('[Minimal WS Handler] EXCEPTION sending "connected" event:', err);
    if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
    return;
  }

  // --- Listen for messages from Twilio ---
  connection.socket.on("message", (message) => {
    try {
      const msg = JSON.parse(message);
      console.error('[Minimal WS Handler] Received message from Twilio:', JSON.stringify(msg, null, 2)); // Log entire message
      proxyServer.log.info(`[Minimal WS Handler] Received event: ${msg.event}`);

      if (msg.event === "start") {
        streamSid = msg.start?.streamSid;
        console.error(`[Minimal WS Handler] Received start event. StreamSid: ${streamSid}`);
        // --- DO NOTHING ELSE ---
        // No ElevenLabs connection, just log that we received start
      } else if (msg.event === "media") {
        // Log that we received media, but don't forward it
        console.error(`[Minimal WS Handler] Received media event (payload length: ${msg.media?.payload?.length}). Discarding.`);
      } else if (msg.event === "stop") {
        console.error(`[Minimal WS Handler] Received stop event.`);
        // No need to close anything, let the close handler do it
      } else {
         console.error(`[Minimal WS Handler] Received unhandled event: ${msg.event}`);
      }

    } catch (error) {
      console.error('[Minimal WS Handler] Error processing Twilio message:', error);
      console.error('[Minimal WS Handler] Raw message:', message.toString());
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
    }
  });

  // --- Handle errors and close ---
  connection.socket.on('error', (error) => {
    console.error('[Minimal WS Handler] Twilio WebSocket error:', error);
  });

  connection.socket.on("close", (code, reason) => {
    console.error(`[Minimal WS Handler] Twilio WebSocket disconnected. Code: ${code}, Reason: ${reason?.toString()}`);
  });

});
// --- End Minimal WebSocket Proxy Handler ---


// --- Server Start ---
const startProxy = async () => {
  try {
    const port = process.env.PORT || 8001;
    const host = '0.0.0.0';
    await proxyServer.listen({ port, host });
    console.log(`[Media Proxy Minimal] Server listening on ${host}:${port}`);
  } catch (err) {
    proxyServer.log.error(err);
    process.exit(1);
  }
};

startProxy();

export default proxyServer;