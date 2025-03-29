import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import WebSocket from 'ws';
import Twilio from 'twilio'; // Keep if terminateCall needs it directly
import crypto from 'crypto';
import {
  getSignedUrl,
  terminateCall, // Assuming this handles Twilio client internally or gets it passed
  isConversationComplete
  // NOTE: Removed DB repository imports and socket-server imports as this service is isolated
} from './outbound.js';

// --- Environment Variable Check ---
const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  TWILIO_ACCOUNT_SID, // Needed if terminateCall uses a client initialized here
  TWILIO_AUTH_TOKEN  // Needed if terminateCall uses a client initialized here
} = process.env;

if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
  console.error("[Media Proxy] Missing required ElevenLabs environment variables (ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID)");
  process.exit(1);
}

// Optional: Initialize Twilio client here if terminateCall needs it and doesn't get it passed
// If terminateCall is self-contained or relies on env vars, this might not be needed.
// If the main app handles termination via webhooks/API, this is definitely not needed here.
// For now, initialize it for safety, assuming terminateCall might be used directly.
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, { region: 'au1' });
  console.log("[Media Proxy] Initialized Twilio client (for potential termination)");
} else {
  console.warn("[Media Proxy] Twilio client not initialized - call termination might fail if needed directly by this service.");
}


// --- Fastify Server Setup ---
const proxyServer = fastify({
  logger: true,
  trustProxy: true, // Important for Railway
  genReqId: req => `req-proxy-${crypto.randomBytes(8).toString('hex')}`
});

// Register only the websocket plugin
proxyServer.register(fastifyWebsocket, {
  options: {
    perMessageDeflate: false,
    maxPayload: 64 * 1024, // 64KB payload limit, adjust if needed
    handshakeTimeout: 5000,
    clientTracking: false,
    clientNoContextTakeover: true,
    serverNoContextTakeover: true
  }
});

// --- Health Check ---
proxyServer.get('/healthz', async (request, reply) => {
  return { status: 'ok', service: 'media-proxy', timestamp: new Date().toISOString() };
});
console.log('[Media Proxy] Registered /healthz endpoint');


// --- WebSocket Proxy Handler ---
proxyServer.get('/outbound-media-stream', { websocket: true }, (connection, req) => {
  // Note: 'connection' is the stream from @fastify/websocket

  proxyServer.log.info('[WS Proxy] Twilio connected to /outbound-media-stream');

  // Removed DB repository initializations

  let streamSid = null;
  let callSid = null;
  let elevenLabsWs = null;
  let customParameters = {};
  let conversationId = null; // Still useful for logging/context
  let initialConfigSent = false;
  let inactivityTimeout = null;
  let lastActivity = Date.now();

  const startInactivityTimer = () => {
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      proxyServer.log.warn(`[WS Proxy] Inactivity detected for call ${callSid}, terminating call`);
      // Use the twilioClient initialized above if available
      if (callSid && twilioClient) { terminateCall(twilioClient, callSid); } // Assuming terminateCall handles client check
      if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); // Close the Twilio connection
    }, 60000); // 60 seconds inactivity timeout
  };

  const updateActivity = () => {
    lastActivity = Date.now();
    startInactivityTimer();
  };

  connection.socket.on('error', (error) => { // Attach to raw socket for underlying errors
    proxyServer.log.error('[WS Proxy] Twilio WebSocket error', error);
    // Attempt to clean up ElevenLabs connection on Twilio error
     if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
  });

  const setupElevenLabs = async () => {
    try {
      const { signed_url } = await getSignedUrl();

      proxyServer.log.info('[WS Proxy] Creating ElevenLabs WebSocket connection');
      elevenLabsWs = new WebSocket(signed_url);

      elevenLabsWs.on("open", () => {
        proxyServer.log.info('[WS Proxy] Connected to ElevenLabs. Waiting for metadata...');
        updateActivity();
      });

      elevenLabsWs.on("message", (data) => {
        updateActivity();
        let message = null;
        const rawData = data.toString();

        try {
          message = JSON.parse(rawData);
        } catch (parseError) {
           proxyServer.log.error('[WS Proxy] Could not parse message from ElevenLabs as JSON:', parseError.message, { rawData });
           if (!initialConfigSent) return; // Critical if first message fails
        }

        // Handle Initial Metadata & Send Config
        if (message?.type === "conversation_initiation_metadata" && !initialConfigSent) {
          initialConfigSent = true;
          const metadataEvent = message.conversation_initiation_metadata_event;
          proxyServer.log.info('[WS Proxy] Received conversation_initiation_metadata');

          if (metadataEvent?.conversation_id) {
            conversationId = metadataEvent.conversation_id;
            proxyServer.log.info(`[WS Proxy] Extracted conversation_id ${conversationId} from metadata`);
          } else {
             proxyServer.log.warn('[WS Proxy] conversation_initiation_metadata missing conversation_id');
          }

          // Prepare and send config using customParameters extracted from Twilio start message
          const initialConfig = {
            type: "conversation_initiation_client_data",
            conversation_config_override: {
              agent: {
                ...(customParameters?.first_message && { first_message: customParameters.first_message }),
                ...(customParameters?.prompt && { system_prompt: customParameters.prompt })
              },
            },
            dynamic_variables: {
               phone_number: customParameters?.to || "Unknown",
               name: customParameters?.name || "Unknown",
               contact_name: customParameters?.name || "Unknown", // Keep both for safety
               call_sid: callSid || "Unknown",
               campaign_id: customParameters?.campaignId || null,
               contact_id: customParameters?.contactId || null
            }
          };
          proxyServer.log.debug('[WS Proxy] Sending initial config to ElevenLabs');
          elevenLabsWs.send(JSON.stringify(initialConfig));
          return; // Don't process metadata further
        }

        // Process Subsequent Messages
        if (!initialConfigSent) {
           proxyServer.log.warn('[WS Proxy] Received message before initial metadata/config sent. Ignoring.');
           return;
        }

        // Capture conversation_id if missed
        if (message && !conversationId && message.conversation_id) {
           conversationId = message.conversation_id;
           proxyServer.log.info(`[WS Proxy] Received conversation_id ${conversationId} from subsequent message`);
           // Cannot update DB from here
        }

        if (message) {
            if (isConversationComplete(message)) {
              proxyServer.log.info(`[WS Proxy] Conversation complete detected, terminating call ${callSid}`);
              if (callSid && twilioClient) { terminateCall(twilioClient, callSid); }
              // No need to close ws here, ElevenLabs close event will handle it
              return;
            }

            switch (message.type) {
              case "audio":
                if (streamSid && message.audio?.chunk) {
                  // Forward audio back to Twilio
                  connection.socket.send(JSON.stringify({ event: "media", streamSid, media: { payload: message.audio.chunk } }));
                }
                break;
              case "interruption":
                if (streamSid) connection.socket.send(JSON.stringify({ event: "clear", streamSid }));
                break;
              case "ping":
                if (message.ping_event?.event_id) {
                  elevenLabsWs.send(JSON.stringify({ type: "pong", event_id: message.ping_event.event_id }));
                }
                break;
              case "transcript_update":
                // Log transcript locally if needed for proxy debugging, but don't save to DB or emit via Socket.IO
                const transcriptMsg = message.transcript_update;
                if (transcriptMsg && transcriptMsg.message) {
                   proxyServer.log.debug(`[WS Proxy] Transcript: ${transcriptMsg.role}: ${transcriptMsg.message.substring(0,50)}...`);
                }
                // Removed DB logging and Socket.IO emit
                break;
              default:
                 // Log other events for debugging if necessary
                 proxyServer.log.debug(`[WS Proxy] Received ElevenLabs message type: ${message.type}`);
                 // Removed DB logging
            }
        }
      });

      elevenLabsWs.on("error", (error) => {
        proxyServer.log.error('[WS Proxy] ElevenLabs WebSocket error', error);
        // Attempt to close Twilio connection on ElevenLabs error
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
      });

      elevenLabsWs.on("close", () => {
        proxyServer.log.info('[WS Proxy] ElevenLabs WebSocket disconnected');
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        // Terminate call if ElevenLabs disconnects unexpectedly (unless already handled by conversation complete)
        if (callSid && twilioClient) {
           proxyServer.log.info(`[WS Proxy] ElevenLabs WS closed. Ensuring call ${callSid} is terminated.`);
           terminateCall(twilioClient, callSid); // Assuming terminateCall handles already completed calls gracefully
        }
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); // Close Twilio connection
      });

    } catch (error) {
      proxyServer.log.error('[WS Proxy] ElevenLabs setup error', error);
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
    }
  };

  // Listen for messages from Twilio
  connection.socket.on("message", (message) => {
    updateActivity();
    try {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid;
          callSid = msg.start.callSid;
          // Extract custom parameters passed from TwiML
          customParameters = msg.start.customParameters || {};
          proxyServer.log.info(`[WS Proxy] Received TwiML Parameters:`, customParameters);
          proxyServer.log.info(`[WS Proxy] Twilio Stream started`, { streamSid, callSid });
          // Cannot update activeCalls map here
          startInactivityTimer();
          // Setup connection to ElevenLabs *after* receiving start message from Twilio
          setupElevenLabs();
          break;
        case "media":
          // Forward Twilio audio to ElevenLabs
          if (elevenLabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) {
            const audioMessage = { user_audio_chunk: msg.media.payload };
            elevenLabsWs.send(JSON.stringify(audioMessage));
          }
          break;
        case "stop":
          proxyServer.log.info(`[WS Proxy] Twilio Stream ended`, { streamSid });
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
          // No need to close connection.socket here, the close event handler below will fire
          break;
        case "mark":
          proxyServer.log.debug(`[WS Proxy] Twilio Mark: ${msg.mark?.name}`);
          break;
        default:
          proxyServer.log.debug(`[WS Proxy] Unhandled Twilio event: ${msg.event}`);
      }
    } catch (error) {
      proxyServer.log.error('[WS Proxy] Error processing Twilio message', error);
      // Attempt to clean up
      if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
    }
  });

  connection.socket.on("close", () => {
    proxyServer.log.info('[WS Proxy] Twilio WebSocket disconnected');
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
    // Terminate call if Twilio disconnects unexpectedly
    if (callSid && twilioClient) {
       proxyServer.log.info(`[WS Proxy] Twilio WS closed. Ensuring call ${callSid} is terminated.`);
       terminateCall(twilioClient, callSid); // Assuming terminateCall handles already completed calls gracefully
    }
  });
});
// --- End WebSocket Proxy Handler ---


// --- Server Start ---
const startProxy = async () => {
  try {
    // Railway provides the PORT env var
    const port = process.env.PORT || 8001; // Default to 8001 for local testing
    const host = '0.0.0.0'; // Listen on all interfaces
    await proxyServer.listen({ port, host });
    // Note: Fastify logs the listening address automatically with logger: true
  } catch (err) {
    proxyServer.log.error(err);
    process.exit(1);
  }
};

startProxy();

export default proxyServer; // Optional export