/**
 * Enhanced Server with MongoDB Integration (Main App Service)
 * 
 * Key Improvements:
 * 1. Enhanced Twilio data collection
 * 2. Robust call recording
 * 3. Automatic call termination
 * 4. Improved architecture
 * 5. Socket.IO real-time updates
 * 6. Standardized API responses and error handling
 * 7. API authentication for sensitive operations
 * 8. MongoDB database integration for persistent storage
 */
import 'dotenv/config';
import fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io'; // Import the socket.io plugin
import fastifyWebsocket from '@fastify/websocket'; // ADDED: Import websocket plugin
import WebSocket from 'ws'; // ADDED: Import ws library
import fastifyFormBody from '@fastify/formbody';
import fetch from 'node-fetch';
import crypto from 'crypto';
import Twilio from 'twilio';
import {
  registerOutboundRoutes,
  activeCalls,
  getSignedUrl, // ADDED BACK: Needed by merged WS handler
  isConversationComplete, // ADDED BACK: Needed by merged WS handler
  terminateCall, // Keep if needed by webhooks/API directly
  // setDynamicVariables // Keep commented unless needed directly by main server logic
} from './outbound.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';
import enhancedCallHandler from './enhanced-call-handler.js';
import recordingHandler from './recording-handler.js';
import callQualityMetrics from './call-quality-metrics.js';
import { registerApiRoutes } from './api-routes.js';
import { registerApiMiddleware } from './api-middleware.js';
import {
  initializeSocketServer,
  emitCallUpdate,
  emitActiveCallsList,
  handleCallStatusChange,
  setActiveCallsReference,
  emitTranscriptMessage 
} from './socket-server.js';

// Import MongoDB integration
import {
  initializeMongoDB,
  getEnhancedWebhookHandler,
  getCallRepository,
  getRecordingRepository,
  getTranscriptRepository, 
  getCallEventRepository, 
  getAnalyticsRepository
} from './db/index.js';
import { verifyWebhookSignature } from './db/webhook-handler-db.js'; 

// Get Twilio credentials from environment
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

// Create Twilio client
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    region: 'au1' 
  });
  console.log("[Twilio] Server initialized Twilio client with Australia region (au1)");
}

// Initialize Fastify
const server = fastify({ 
  logger: true,
  trustProxy: true, // Trust proxy headers like X-Forwarded-Proto
  http: {
    connectionTimeout: 30000,       
    keepAliveTimeout: 30000,        
    maxRequestsPerSocket: 0,        
    headersTimeout: 30000,          
    requestTimeout: 30000,          
    tcpKeepAlive: true,             
    tcpNoDelay: true                
  },
  genReqId: req => {
    return `req-${crypto.randomBytes(8).toString('hex')}`;
  }
});

// Register plugins
// IMPORTANT: Register fastify-socket.io FIRST
server.register(fastifySocketIO, {
  allowEIO3: true, // Add for broader compatibility
  cors: {
    origin: '*', // Allow all origins for simplicity, restrict in production
    methods: ['GET', 'POST']
  },
  // Force WebSocket transport only
  transports: ['websocket'], 
  path: '/socket.io/', // Original path for frontend connection
  pingInterval: 10000,
  pingTimeout: 5000,
  connectTimeout: 5000,
  perMessageDeflate: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5
});

// ADDED: Register @fastify/websocket
server.register(fastifyWebsocket, {
  options: {
    perMessageDeflate: false,
    maxPayload: 64 * 1024,
    // Add other relevant options if needed from original media-proxy setup
  }
});
server.register(fastifyFormBody);

// Register API middleware
registerApiMiddleware(server);

// Register outbound calling routes (will need MEDIA_PROXY_SERVICE_URL env var)
registerOutboundRoutes(server, { skipCallStatusCallback: true });

// Register additional API routes
registerApiRoutes(server, twilioClient, activeCalls);

// Add a simple health check endpoint for Railway
server.get('/healthz', async (request, reply) => {
  // Optionally add checks for database connection, etc.
  return { status: 'ok', timestamp: new Date().toISOString() };
});
console.log('[Server] Registered /healthz endpoint');

// Share the active calls map with handlers
setActiveCallsReference(activeCalls);
enhancedCallHandler.setActiveCallsReference(activeCalls);
enhancedCallHandler.setTwilioClientReference(twilioClient);
recordingHandler.setActiveCallsReference(activeCalls);
recordingHandler.setTwilioClientReference(twilioClient);
callQualityMetrics.setActiveCallsReference(activeCalls);
callQualityMetrics.setTwilioClientReference(twilioClient);

// Start the call monitoring heartbeat
enhancedCallHandler.startCallMonitoringHeartbeat(5000); 

// Helper function to verify webhook signature (kept for ElevenLabs webhook)
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

// --- WebSocket Proxy Handler Removed (Moved to media-proxy-server.js) ---

// Simple debug webhook
server.post('/webhooks/elevenlabs-debug', (request, reply) => {
  console.log('[Webhook Debug] Received webhook with headers:', JSON.stringify(request.headers, null, 2));
  const bodyStr = JSON.stringify(request.body, null, 2);
  console.log('[Webhook Debug] Request body (truncated):', bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr);
  return reply.code(200).send({ status: 'success', message: 'Webhook received and logged' });
});

// MongoDB-enhanced webhook handler
let enhancedWebhookHandler;

// Main webhook handler
server.post('/webhooks/elevenlabs', async (request, reply) => {
  try {
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    const crmEndpoint = process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is';
    const signature = request.headers['elevenlabs-signature']; 
    console.log('[Webhook] Received ElevenLabs webhook');
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(request.body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature received from ElevenLabs');
        return reply.code(200).send({ success: false, error: 'Invalid signature' }); 
      }
      console.log('[Webhook] ElevenLabs signature verified successfully');
    } else {
      console.warn('[Webhook] Skipping ElevenLabs signature verification (no secret or signature)');
    }
    if (!enhancedWebhookHandler) {
        enhancedWebhookHandler = getEnhancedWebhookHandler();
    }
    const result = await enhancedWebhookHandler.handleElevenLabsWebhook(request, webhookSecret, crmEndpoint, twilioClient);
    return reply.code(200).send(result);
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return reply.code(200).send({ status: 'error', message: error.message });
  }
});

// Fallback TwiML endpoint
server.all('/fallback-twiml', async (request, reply) => {
  const { CallSid, ErrorCode } = request.body;
  console.log(`[Fallback] Received fallback for call ${CallSid}, error code: ${ErrorCode}`);
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're sorry, but there was a problem connecting your call. Please try again later.</Say><Hangup/></Response>`;
  if (activeCalls.has(CallSid)) {
    const callInfo = activeCalls.get(CallSid);
    callInfo.errorCode = ErrorCode; callInfo.status = 'failed'; callInfo.endTime = new Date();
    callInfo.error = 'Call failed and routed to fallback URL';
    activeCalls.set(CallSid, callInfo);
    handleCallStatusChange(CallSid, 'failed', callInfo);
    try {
      await getCallRepository().updateCallStatus(CallSid, 'failed', { errorCode: ErrorCode, endTime: new Date(), error: 'Call failed and routed to fallback URL' });
    } catch (error) { console.error(`[MongoDB] Error updating call in fallback handler:`, error); }
  }
  return reply.type("text/xml").send(twimlResponse);
});

// Recording status callback
server.post('/recording-status-callback', async (request, reply) => {
  try {
    console.log('[Recording] Received recording status callback. Event:', request.body.RecordingStatus);
    const result = recordingHandler.processRecordingCallback(request.body);
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'recording_update', { recordingStatus: request.body.RecordingStatus, recordingSid: request.body.RecordingSid, ...result });
    }
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration, RecordingChannels } = request.body;
      if (CallSid && RecordingSid) {
        await getRecordingRepository().saveRecording({
          recordingSid: RecordingSid, callSid: CallSid, url: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : null,
          channels: RecordingChannels ? parseInt(RecordingChannels) : 1,
          status: RecordingStatus || 'completed'
        });
        console.log(`[MongoDB] Saved recording ${RecordingSid} for call ${CallSid}`);
      }
    } catch (error) { console.error(`[MongoDB] Error storing recording data:`, error); }
    return reply.code(200).send({ success: true, message: 'Recording status update received', ...result });
  } catch (error) {
    console.error('[Recording] Error processing recording callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// AMD status callback
server.post('/amd-status-callback', async (request, reply) => {
  try {
    console.log('[AMD] Received answering machine detection callback');
    const { CallSid, AnsweredBy, CallStatus, MachineBehavior, Timestamp, ...rest } = request.body;
    console.log(`[AMD] Call ${CallSid} answered by: ${AnsweredBy}, status: ${CallStatus}`);
    const amdData = { CallSid, AnsweredBy, MachineBehavior, CallStatus, Timestamp: Timestamp || new Date().toISOString(), ...rest };
    enhancedCallHandler.processMachineDetection(amdData);
    emitCallUpdate(CallSid, 'machine_detection', { answeredBy: AnsweredBy, machineBehavior: MachineBehavior, status: CallStatus });
    try {
      await getCallRepository().updateCallStatus(CallSid, CallStatus, { answeredBy: AnsweredBy, machineBehavior: MachineBehavior });
      console.log(`[MongoDB] Updated call ${CallSid} with machine detection data`);
    } catch (error) { console.error(`[MongoDB] Error updating call with machine detection data:`, error); }
    // Optional termination logic based on AnsweredBy...
    return reply.code(200).send({ success: true, message: 'AMD status update received', answeredBy: AnsweredBy, callSid: CallSid });
  } catch (error) {
    console.error('[AMD] Error processing AMD callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// Enhanced call status callback
server.post('/call-status-callback', async (request, reply) => {
  try {
    const { CallSid, CallStatus, RecordingUrl, RecordingSid } = request.body;
    console.log(`[Twilio Callback] Call ${CallSid} status: ${CallStatus}`);
    try {
      await getCallRepository().updateCallStatus(CallSid, CallStatus, request.body);
      console.log(`[MongoDB] Updated call ${CallSid} status to ${CallStatus}`);
    } catch (error) { console.error(`[MongoDB] Error updating call status:`, error); }
    try {
      await getCallEventRepository().logEvent(CallSid, 'status_change', { status: CallStatus, source: 'twilio', timestamp: new Date().toISOString(), body: request.body });
      console.log(`[MongoDB] Logged status_change event for call ${CallSid}`);
    } catch (error) { console.error(`[MongoDB] Error logging call event:`, error); }
    const callInfo = activeCalls.get(CallSid) || { sid: CallSid, startTime: new Date(), recordings: [] };
    const previousStatus = callInfo.status;
    callInfo.status = CallStatus;
    callInfo.from = request.body.From || callInfo.from || 'unknown';
    callInfo.to = request.body.To || callInfo.to || 'unknown';
    if (['completed', 'failed', 'canceled', 'busy', 'no-answer'].includes(CallStatus)) {
      callInfo.endTime = new Date();
      if (callInfo.startTime) { callInfo.duration = Math.round((callInfo.endTime - new Date(callInfo.startTime)) / 1000); }
    }
    activeCalls.set(CallSid, callInfo);
    if (previousStatus !== CallStatus) { handleCallStatusChange(CallSid, CallStatus, callInfo); }
    enhancedCallHandler.updateCallActivity(CallSid);
    if (RecordingUrl && RecordingSid) { recordingHandler.processRecordingCallback({ ...request.body, RecordingUrl, RecordingSid, CallSid }); }
    return reply.code(200).send({ success: true, message: "Status update received" });
  } catch (error) {
    console.error('[Call Status] Error processing callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// Quality insights callback
server.post('/quality-insights-callback', async (request, reply) => {
  try {
    console.log('[Quality] Received call quality metrics callback');
    const result = callQualityMetrics.processQualityData(request.body);
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'quality_update', { metrics: result.metrics });
    }
    try {
      const { CallSid } = request.body;
      if (CallSid && result && result.metrics) {
        await getCallRepository().updateCallStatus(CallSid, null, { qualityMetrics: result.metrics });
        console.log(`[MongoDB] Updated call ${CallSid} with quality metrics`);
        await getCallEventRepository().logEvent(CallSid, 'call_quality', { metrics: result.metrics, source: 'twilio', timestamp: new Date().toISOString() });
        console.log(`[MongoDB] Logged call_quality event for call ${CallSid}`);
      }
    } catch (error) { console.error(`[MongoDB] Error storing quality metrics:`, error); }
    return reply.code(200).send({ success: true, message: 'Quality metrics received', ...result });
  } catch (error) {
    console.error('[Quality] Error processing metrics callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// --- ADDED: WebSocket Proxy Handler (from media-proxy-server.js) ---
server.get('/outbound-media-stream', { websocket: true }, (connection, req) => {
  // Note: 'connection' is the stream from @fastify/websocket

  server.log.info('[WS Proxy] Twilio connected to /outbound-media-stream');

  // --- Send Connected message after a short delay ---
  // This is required by the Twilio Media Streams protocol
  // Adding delay to potentially allow socket to stabilize
  setTimeout(() => {
    try {
      server.log.info('[WS Proxy] Attempting to send "connected" event after delay...');
      connection.socket.send(JSON.stringify({ event: "connected" }), (err) => {
        if (err) {
          server.log.error('[WS Proxy] ERROR sending "connected" event after delay:', err);
          if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
        } else {
          server.log.info('[WS Proxy] Successfully sent "connected" event after delay.');
        }
      });
    } catch (err) {
      server.log.error('[WS Proxy] EXCEPTION sending "connected" event after delay:', err);
      // Close connection if we can't even send the first message
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
      // No return here, let the main handler continue (though it might fail later)
    }
  }, 100); // 100ms delay
  // -----------------------------------------

  // Now integrate DB repository access if needed for logging/updates
  // --- WebSocket Handler Logic Continues Here ---
  const callRepository = getCallRepository(); // Get repository instance
  const callEventRepository = getCallEventRepository(); // Get repository instance

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
      server.log.warn(`[WS Proxy] Inactivity detected for call ${callSid}, terminating call`);
      // Use the twilioClient initialized in server-mongodb.js
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
    server.log.error('[WS Proxy] Twilio WebSocket error', error);
    // Attempt to clean up ElevenLabs connection on Twilio error
     if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
  });

  const setupElevenLabs = async () => {
    try {
      // Assuming getSignedUrl is available in scope (imported from outbound.js)
      const { signed_url } = await getSignedUrl();

      server.log.info('[WS Proxy] Creating ElevenLabs WebSocket connection');
      elevenLabsWs = new WebSocket(signed_url);

      elevenLabsWs.on("open", () => {
        server.log.info('[WS Proxy] Connected to ElevenLabs. Waiting for metadata...');
        updateActivity();
      });

      elevenLabsWs.on("message", (data) => {
        updateActivity();
        let message = null;
        const rawData = data.toString();
        // server.log.info('[WS Proxy] Received message RAW from ElevenLabs:', rawData); // Verbose

        try {
          message = JSON.parse(rawData);
          // server.log.info('[WS Proxy] Parsed message JSON from ElevenLabs:', JSON.stringify(message, null, 2)); // Verbose
        } catch (parseError) {
           server.log.error('[WS Proxy] Could not parse message from ElevenLabs as JSON:', parseError.message, { rawData });
           if (!initialConfigSent) return; // Critical if first message fails
        }

        // Handle Initial Metadata & Send Config
        if (message?.type === "conversation_initiation_metadata" && !initialConfigSent) {
          initialConfigSent = true;
          const metadataEvent = message.conversation_initiation_metadata_event;
          server.log.info('[WS Proxy] Received conversation_initiation_metadata');

          if (metadataEvent?.conversation_id) {
            conversationId = metadataEvent.conversation_id;
            server.log.info(`[WS Proxy] Extracted conversation_id ${conversationId} from metadata`);
            // Update the call record in MongoDB with the conversation ID
            if (callSid && callRepository) {
               callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
                 .catch(err => server.log.error(`[WS Proxy][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
            }
          } else {
             server.log.warn('[WS Proxy] conversation_initiation_metadata missing conversation_id');
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
          server.log.debug('[WS Proxy] Sending initial config to ElevenLabs');
          elevenLabsWs.send(JSON.stringify(initialConfig));
          return; // Don't process metadata further
        }

        // Process Subsequent Messages
        if (!initialConfigSent) {
           server.log.warn('[WS Proxy] Received message before initial metadata/config sent. Ignoring.');
           return;
        }

        // Capture conversation_id if missed
        if (message && !conversationId && message.conversation_id) {
           conversationId = message.conversation_id;
           server.log.info(`[WS Proxy] Received conversation_id ${conversationId} from subsequent message`);
           // Update the call record in MongoDB
           if (callSid && callRepository) {
              callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
                .catch(err => server.log.error(`[WS Proxy][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
           }
        }

        if (message) {
            // Assuming isConversationComplete is available in scope (imported from outbound.js)
            if (isConversationComplete(message)) {
              server.log.info(`[WS Proxy] Conversation complete detected, terminating call ${callSid}`);
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
                // Log transcript and potentially save/emit
                const transcriptMsg = message.transcript_update;
                if (transcriptMsg && transcriptMsg.message) {
                   server.log.debug(`[WS Proxy] Transcript: ${transcriptMsg.role}: ${transcriptMsg.message.substring(0,50)}...`);
                   // Optionally log to DB events
                   if (callSid && callEventRepository) {
                      callEventRepository.logEvent(callSid, 'transcript_segment', {
                        role: transcriptMsg.role,
                        text: transcriptMsg.message,
                        timestamp: new Date().toISOString()
                      }, { source: 'elevenlabs_stream' })
                      .catch(err => server.log.error(`[WS Proxy][DB] Error logging transcript segment for ${callSid}:`, err));
                   }
                   // Optionally emit via Socket.IO (ensure emitTranscriptMessage is imported/available)
                   if (callSid && typeof emitTranscriptMessage === 'function') {
                      emitTranscriptMessage(callSid, transcriptMsg.role, transcriptMsg.message);
                   }
                }
                break;
              default:
                 // Log other events for debugging if necessary
                 server.log.debug(`[WS Proxy] Received ElevenLabs message type: ${message.type}`);
                 // Optionally log to DB events
                 if (callSid && callEventRepository) {
                    callEventRepository.logEvent(callSid, message.type, message, { source: 'elevenlabs_stream' })
                    .catch(err => server.log.error(`[WS Proxy][DB] Error logging event type ${message.type} for ${callSid}:`, err));
                 }
            }
        }
      });

      elevenLabsWs.on("error", (error) => {
        server.log.error('[WS Proxy] ElevenLabs WebSocket error', error);
        // Attempt to close Twilio connection on ElevenLabs error
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
      });

      elevenLabsWs.on("close", () => {
        server.log.info('[WS Proxy] ElevenLabs WebSocket disconnected');
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        // Terminate call if ElevenLabs disconnects unexpectedly (unless already handled by conversation complete)
        if (callSid && twilioClient) {
           server.log.info(`[WS Proxy] ElevenLabs WS closed. Ensuring call ${callSid} is terminated.`);
           terminateCall(twilioClient, callSid); // Assuming terminateCall handles already completed calls gracefully
        }
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); // Close Twilio connection
      });

    } catch (error) {
      server.log.error('[WS Proxy] ElevenLabs setup error', error);
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
          server.log.info(`[WS Proxy] Received TwiML Parameters:`, customParameters);
          server.log.info(`[WS Proxy] Twilio Stream started`, { streamSid, callSid });
          // Update activeCalls map (if still needed, or rely solely on DB)
          if (activeCalls.has(callSid)) {
             const callInfo = activeCalls.get(callSid);
             callInfo.streamSid = streamSid; // Add streamSid if useful
             activeCalls.set(callSid, callInfo);
          }
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
          server.log.info(`[WS Proxy] Twilio Stream ended`, { streamSid });
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
          // No need to close connection.socket here, the close event handler below will fire
          break;
        case "mark":
          server.log.debug(`[WS Proxy] Twilio Mark: ${msg.mark?.name}`);
          break;
        default:
          server.log.debug(`[WS Proxy] Unhandled Twilio event: ${msg.event}`);
      }
    } catch (error) {
      server.log.error('[WS Proxy] Error processing Twilio message', error);
      // Attempt to clean up
      if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close();
    }
  });

  connection.socket.on("close", () => {
    server.log.info('[WS Proxy] Twilio WebSocket disconnected');
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
    // Terminate call if Twilio disconnects unexpectedly
    if (callSid && twilioClient) {
       server.log.info(`[WS Proxy] Twilio WS closed. Ensuring call ${callSid} is terminated.`);
       terminateCall(twilioClient, callSid); // Assuming terminateCall handles already completed calls gracefully
    }
  });
});
// --- End WebSocket Proxy Handler ---

// Initialize MongoDB
let mongodbIntegration = null;

// Function to initialize MongoDB
async function initializeDatabase() {
  console.log('[Server] Starting MongoDB initialization...');
  console.log(`[Server] MongoDB URI: ${process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set'}`);
  try {
    console.log('[Server] Calling initializeMongoDB...');
    mongodbIntegration = await initializeMongoDB(server, { activeCalls, syncExistingCalls: true });
    console.log('[Server] MongoDB initialized, getting enhanced webhook handler...');
    enhancedWebhookHandler = getEnhancedWebhookHandler();
    console.log('[Server] MongoDB integration initialized successfully');
    return true;
  } catch (error) {
    console.error('[Server] MongoDB initialization error:', error);
    console.log('[Server] Error stack:', error.stack);
    console.log('[Server] Continuing without MongoDB integration');
    enhancedWebhookHandler = { handleElevenLabsWebhook: async () => ({ success: false, error: 'Database connection failed' }) };
    return false;
  }
}

// Start the server
const start = async () => {
  console.log('[Server] Starting server initialization...');
  try {
    await initializeDatabase();
    
    const port = process.env.PORT || 8000; // Use PORT from Railway, default to 8000 locally
    const host = '0.0.0.0';
    console.log(`[Server] Attempting to listen on ${host}:${port}...`);
    await server.listen({ port, host }); // Start listening first
    // Note: Fastify logs the listening address automatically with logger: true

    // Initialize our Socket.IO logic AFTER server is listening AND plugin is registered
    try {
      initializeSocketServer(server, activeCalls); 
      console.log('[Server] Socket.IO logic initialized using fastify-socket.io');
    } catch (socketErr) {
       console.error('[Server] Socket.IO logic initialization failed:', socketErr);
    }
    
    // Removed custom WebSocket server initialization - moved to media-proxy-server.js

    console.log('[Server] Enhanced features activated.'); 
    
  } catch (err) {
    console.error('[Server] Error starting server:', err);
    console.error('[Server] Error stack:', err.stack);
    server.log.error(err);
    enhancedCallHandler.stopCallMonitoringHeartbeat();
    process.exit(1);
  }
};

// Handle graceful shutdown
function cleanup() {
  console.log('\n[Server] Shutting down...');
  enhancedCallHandler.stopCallMonitoringHeartbeat();
  if (mongodbIntegration) {
    try {
      mongodbIntegration.closeConnection();
      console.log('[MongoDB] Connection closed');
    } catch (error) {
      console.error('[MongoDB] Error closing connection:', error);
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('[Server] Starting server...');
start();

export default server;
