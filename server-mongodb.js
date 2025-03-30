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
// REMOVED: fastifyWebsocket import
import { WebSocketServer, WebSocket } from 'ws'; // CORRECTED: Import WebSocketServer and WebSocket client
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
import { registerElevenLabsApiRoutes } from './elevenlabs-api-routes.js'; // Import new routes
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
  getTranscriptRepository, // Ensure this is exported from db/index.js
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
  logger: {
    level: 'debug', // Set log level to debug to see timer/message logs
    // Consider adding transport for pretty-printing locally if needed:
    // transport: { target: 'pino-pretty' }
  },
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

// REMOVED: @fastify/websocket registration
server.register(fastifyFormBody);

// Register API middleware
registerApiMiddleware(server);

// Register outbound calling routes (will need MEDIA_PROXY_SERVICE_URL env var)
registerOutboundRoutes(server, { skipCallStatusCallback: true });

// Register additional API routes
registerApiRoutes(server, twilioClient, activeCalls);
registerElevenLabsApiRoutes(server); // Register the new ElevenLabs proxy routes

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

// REMOVED: Old WebSocket Proxy Handler

// --- ADDED: Manual WebSocket Server for Media Stream ---
const wss = new WebSocketServer({ noServer: true }); // CORRECTED: Use WebSocketServer constructor

wss.on('connection', (ws, request) => {
  // This is the main handler logic, copied and adapted from the previous handler
  server.log.info('[WS Manual] Twilio connected via manual upgrade');

  // --- Send Connected message immediately ---
  try {
    server.log.info('[WS Manual] Attempting to send "connected" event immediately...');
    ws.send(JSON.stringify({ event: "connected" }), (err) => {
      if (err) {
        server.log.error('[WS Manual] ERROR sending "connected" event immediately:', err);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      } else {
        server.log.info('[WS Manual] Successfully sent "connected" event immediately.');
      }
    });
  } catch (err) {
    server.log.error('[WS Manual] EXCEPTION sending "connected" event immediately:', err);
    if (ws.readyState === WebSocket.OPEN) ws.close();
    return;
  }
  // -----------------------------------------

  const callRepository = getCallRepository();
  const callEventRepository = getCallEventRepository();

  let streamSid = null;
  let callSid = null;
  let elevenLabsWs = null;
  let customParameters = {}; // Will be populated from 'start' message
  let conversationId = null;
  let initialConfigSent = false;
  let inactivityTimeout = null;
  let lastActivity = Date.now();

  const INACTIVITY_TIMEOUT_MS = 60000; // Reverted to 60 seconds
  let isTimerActive = false; // Flag to control timer execution

  // Flag-based timer logic
  const startInactivityTimer = () => {
    if (!callSid) {
       server.log.debug('[WS Manual][Timer] startInactivityTimer called before callSid is set. Skipping.');
       return;
    }
    
    // Cancel any pending Node.js timer object (best effort)
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
    }

    // REMOVED: server.log.debug(`[WS Manual][Timer] Scheduling inactivity check...`);
    isTimerActive = true; // Set flag *before* scheduling
    inactivityTimeout = setTimeout(() => {
      server.log.warn(`[WS Manual][Timer] Timer callback executed for call ${callSid}.`);
      
      // *** Check the flag ***
      if (!isTimerActive) {
        server.log.info(`[WS Manual][Timer] Timer callback for ${callSid} ignored as flag is inactive (recent activity occurred).`);
        return;
      }

      // If flag is still active, proceed with termination check
      isTimerActive = false; // Deactivate flag before terminating
      const timeSinceLastActivity = Date.now() - lastActivity; // Check time again *inside* callback
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
           server.log.warn(`[WS Manual][Timer] Inactivity confirmed for call ${callSid} (${timeSinceLastActivity}ms >= ${INACTIVITY_TIMEOUT_MS}ms). Terminating.`);
           if (callSid && twilioClient) { terminateCall(twilioClient, callSid); } // Restore termination
           // Also close WebSockets as before
           if (elevenLabsWs?.readyState === WebSocket.OPEN) { server.log.warn('[WS Manual][Timer] Closing ElevenLabs WS due to inactivity.'); elevenLabsWs.close(); }
           if (ws.readyState === WebSocket.OPEN) { server.log.warn('[WS Manual][Timer] Closing Twilio WS due to inactivity.'); ws.close(); }
      } else {
           // This case means activity happened *just* before the timer callback executed, but *after* the flag was last checked/set.
           server.log.warn(`[WS Manual][Timer] Timer callback for ${callSid} executed, but recent activity detected (${timeSinceLastActivity}ms < ${INACTIVITY_TIMEOUT_MS}ms). Not terminating. Another timer should have been scheduled by updateActivity.`);
      }
    }, INACTIVITY_TIMEOUT_MS);
  };

  const updateActivity = () => {
    if (!callSid) {
      server.log.debug('[WS Manual][Timer] updateActivity called before callSid is set. Skipping timer reset.');
      return;
    }
    // REMOVED: server.log.debug(`[WS Manual][Timer] Activity detected...`);
    isTimerActive = false; // Signal that the currently scheduled timer should ignore itself
    lastActivity = Date.now();
    // Schedule the *next* timer check. This replaces the previous one conceptually.
    startInactivityTimer();
  };

  const setupElevenLabs = async () => {
    try {
      const { signed_url } = await getSignedUrl();
      server.log.info('[WS Manual] Creating ElevenLabs WebSocket connection');
      elevenLabsWs = new WebSocket(signed_url);

      elevenLabsWs.on("open", () => {
        server.log.info('[WS Manual] Connected to ElevenLabs. Waiting for metadata...');
        updateActivity();
      });

      elevenLabsWs.on("message", (data) => {
        updateActivity();
        let message = null;
        const rawData = data.toString();
        try { message = JSON.parse(rawData); } catch (parseError) {
          server.log.error('[WS Manual] Could not parse message from ElevenLabs as JSON:', parseError.message, { rawData });
          if (!initialConfigSent) return;
        }

        if (message?.type === "conversation_initiation_metadata" && !initialConfigSent) {
          initialConfigSent = true;
          const metadataEvent = message.conversation_initiation_metadata_event;
          server.log.info('[WS Manual] Received conversation_initiation_metadata');
          if (metadataEvent?.conversation_id) {
            conversationId = metadataEvent.conversation_id;
            server.log.info(`[WS Manual] Extracted conversation_id ${conversationId} from metadata`);
            if (callSid && callRepository) {
              callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
                .catch(err => server.log.error(`[WS Manual][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
            }
          } else { server.log.warn('[WS Manual] conversation_initiation_metadata missing conversation_id'); }

          const initialConfig = { /* ... same config as before ... */
            type: "conversation_initiation_client_data",
            conversation_config_override: { agent: { ...(customParameters?.first_message && { first_message: customParameters.first_message }), ...(customParameters?.prompt && { system_prompt: customParameters.prompt }) } },
            dynamic_variables: { phone_number: customParameters?.to || "Unknown", name: customParameters?.name || "Unknown", contact_name: customParameters?.name || "Unknown", call_sid: callSid || "Unknown", campaign_id: customParameters?.campaignId || null, contact_id: customParameters?.contactId || null }
          };
          server.log.debug('[WS Manual] Sending initial config to ElevenLabs');
          elevenLabsWs.send(JSON.stringify(initialConfig));
          return;
        }

        if (!initialConfigSent) { server.log.warn('[WS Manual] Received message before initial metadata/config sent. Ignoring.'); return; }

        if (message && !conversationId && message.conversation_id) {
          conversationId = message.conversation_id;
          server.log.info(`[WS Manual] Received conversation_id ${conversationId} from subsequent message`);
          if (callSid && callRepository) {
            callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
              .catch(err => server.log.error(`[WS Manual][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
          }
        }

        if (message) {
          if (isConversationComplete(message)) {
            server.log.info(`[WS Manual] Conversation complete detected, terminating call ${callSid}`);
            if (callSid && twilioClient) { terminateCall(twilioClient, callSid); }
            return;
          }
          switch (message.type) {
            case "audio":
              // DOCS CONFIRM: audio_event.audio_base_64 is already Base64 encoded.
              // Do NOT encode it again. Send the received payload directly.
              // Assuming the received message structure is { type: "audio", audio_event: { audio_base_64: "...", event_id: ... } }
              // or potentially { type: "audio", audio: { chunk: "..." } } based on older code? Let's use audio_event based on docs.
              if (streamSid && message.audio_event?.audio_base_64) {
                const payloadBase64 = message.audio_event.audio_base_64;
                const mediaEventToSend = { event: "media", streamSid, media: { payload: payloadBase64 } };
                // Keep the debug log, but use the correct payload variable
                const mediaJsonString = JSON.stringify(mediaEventToSend); // Stringify once
                server.log.debug(`[WS Manual] Sending media event to Twilio. StreamSid: ${streamSid}, Payload (start): ${payloadBase64.substring(0, 20)}... Full Message: ${mediaJsonString.substring(0, 100)}...`);
                ws.send(mediaJsonString, (err) => { // Send the stringified version
                  if (err) {
                     server.log.error(`[WS Manual] ERROR sending media event (StreamSid: ${streamSid}):`, err);
                  }
                });
              } else if (streamSid && message.audio?.chunk) {
                // Fallback for older structure just in case, but log a warning
                server.log.warn('[WS Manual] Received audio chunk in unexpected format (message.audio.chunk). Sending directly.');
                const payloadBase64 = message.audio.chunk; // Assuming it's already base64
                const mediaEventToSend = { event: "media", streamSid, media: { payload: payloadBase64 } };
                const mediaJsonStringFallback = JSON.stringify(mediaEventToSend); // Stringify once
                server.log.debug(`[WS Manual] Sending media event (fallback format) to Twilio. StreamSid: ${streamSid}, Payload (start): ${payloadBase64.substring(0, 20)}... Full Message: ${mediaJsonStringFallback.substring(0, 100)}...`);
                ws.send(mediaJsonStringFallback, (err) => { // Send the stringified version
                  if (err) {
                     server.log.error(`[WS Manual] ERROR sending media event (fallback format) (StreamSid: ${streamSid}):`, err);
                  }
                });
              }
              break;
            case "interruption":
              if (streamSid) {
                const clearEventToSend = { event: "clear", streamSid };
                const clearJsonString = JSON.stringify(clearEventToSend);
                server.log.debug(`[WS Manual] Sending clear event to Twilio. StreamSid: ${streamSid}. Full Message: ${clearJsonString}`);
                ws.send(clearJsonString, (err) => {
                  if (err) {
                    server.log.error(`[WS Manual] ERROR sending clear event (StreamSid: ${streamSid}):`, err);
                  }
                });
              }
              break;
            case "ping": if (message.ping_event?.event_id) { elevenLabsWs.send(JSON.stringify({ type: "pong", event_id: message.ping_event.event_id })); } break;
            case "transcript_update":
              const transcriptMsg = message.transcript_update;
              if (transcriptMsg && transcriptMsg.message) {
                server.log.debug(`[WS Manual] Transcript: ${transcriptMsg.role}: ${transcriptMsg.message.substring(0, 50)}...`);
                if (callSid && callEventRepository) { callEventRepository.logEvent(callSid, 'transcript_segment', { role: transcriptMsg.role, text: transcriptMsg.message, timestamp: new Date().toISOString() }, { source: 'elevenlabs_stream' }).catch(err => server.log.error(`[WS Manual][DB] Error logging transcript segment for ${callSid}:`, err)); }
                if (callSid && typeof emitTranscriptMessage === 'function') { emitTranscriptMessage(callSid, transcriptMsg.role, transcriptMsg.message); }
              } break;
            default:
              server.log.debug(`[WS Manual] Received ElevenLabs message type: ${message.type}`);
              if (callSid && callEventRepository) { callEventRepository.logEvent(callSid, message.type, message, { source: 'elevenlabs_stream' }).catch(err => server.log.error(`[WS Manual][DB] Error logging event type ${message.type} for ${callSid}:`, err)); }
          }
        }
      });

      elevenLabsWs.on("error", (error) => { server.log.error('[WS Manual] ElevenLabs WebSocket error', error); if (ws.readyState === WebSocket.OPEN) ws.close(); });
      elevenLabsWs.on("close", () => { server.log.info('[WS Manual] ElevenLabs WebSocket disconnected'); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (callSid && twilioClient) { server.log.info(`[WS Manual] ElevenLabs WS closed. Ensuring call ${callSid} is terminated.`); terminateCall(twilioClient, callSid); } if (ws.readyState === WebSocket.OPEN) ws.close(); });
    } catch (error) { server.log.error('[WS Manual] ElevenLabs setup error', error); if (ws.readyState === WebSocket.OPEN) ws.close(); }
  };

  ws.on("message", (message) => {
    updateActivity();
    try {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid; callSid = msg.start.callSid; customParameters = msg.start.customParameters || {};
          server.log.info(`[WS Manual] Received TwiML Parameters:`, customParameters); server.log.info(`[WS Manual] Twilio Stream started`, { streamSid, callSid });
          if (activeCalls.has(callSid)) { const callInfo = activeCalls.get(callSid); callInfo.streamSid = streamSid; activeCalls.set(callSid, callInfo); }
          startInactivityTimer(); setupElevenLabs(); break;
        case "media": if (elevenLabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) { elevenLabsWs.send(JSON.stringify({ user_audio_chunk: msg.media.payload })); } break;
        case "stop": server.log.info(`[WS Manual] Twilio Stream ended`, { streamSid }); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); break;
        case "mark": server.log.debug(`[WS Manual] Twilio Mark: ${msg.mark?.name}`); break;
        default: server.log.debug(`[WS Manual] Unhandled Twilio event: ${msg.event}`);
      }
    } catch (error) { server.log.error('[WS Manual] Error processing Twilio message', error); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); if (ws.readyState === WebSocket.OPEN) ws.close(); }
  });

  ws.on('error', (error) => { server.log.error('[WS Manual] Twilio WebSocket error', error); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); });
  ws.on("close", () => { server.log.info('[WS Manual] Twilio WebSocket disconnected'); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); if (callSid && twilioClient) { server.log.info(`[WS Manual] Twilio WS closed. Ensuring call ${callSid} is terminated.`); terminateCall(twilioClient, callSid); } });
});
// --- End Manual WebSocket Server ---

// Initialize MongoDB
let mongodbIntegration = null;

// Function to initialize MongoDB
async function initializeDatabase() {
  console.log('[Server] Starting MongoDB initialization...');
  console.log(`[Server] MongoDB URI: ${process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set'}`);
  try {
    console.log('[Server] Calling initializeMongoDB...');
    // Assuming initializeMongoDB returns an object with repositories or sets them up internally
    const dbIntegrationResult = await initializeMongoDB(server, { activeCalls, syncExistingCalls: true });
    mongodbIntegration = dbIntegrationResult; // Keep if needed elsewhere
    
    // Attach repositories to the server instance for access in routes
    // Assuming the get... functions return the initialized repositories
    server.callRepository = getCallRepository();
    server.recordingRepository = getRecordingRepository();
    server.transcriptRepository = getTranscriptRepository(); // Get and attach
    server.callEventRepository = getCallEventRepository();
    server.analyticsRepository = getAnalyticsRepository();
    
    console.log('[Server] MongoDB initialized, repositories attached.');
    enhancedWebhookHandler = getEnhancedWebhookHandler(); // This likely uses the repositories internally
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

    // --- ADDED: Attach manual WebSocket upgrade handler ---
    server.server.on('upgrade', (request, socket, head) => {
      // Use URL constructor for robust parsing
      // Use http protocol as base, ws/wss is handled by upgrade mechanism
      const { pathname } = new URL(request.url, `http://${request.headers.host}`);

      // *** Only handle the specific path for the Twilio media stream ***
      if (pathname === '/outbound-media-stream') {
        server.log.info(`[Server Upgrade] Handling upgrade request for ${pathname}`);
        // Let our manual WebSocket server handle this specific upgrade
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // *** IMPORTANT: If it's not our path, do nothing. ***
        // This allows other handlers (like fastify-socket.io's internal one)
        // to process the upgrade request for their paths (e.g., /socket.io/).
        // Do NOT destroy the socket here.
        server.log.debug(`[Server Upgrade] Ignoring upgrade request for path ${pathname}, letting other handlers process.`);
      }
    });
    server.log.info('[Server] Attached manual WebSocket upgrade handler');
    // --- End Attach upgrade handler ---

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
