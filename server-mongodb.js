/**
 * Enhanced Server with MongoDB Integration
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
import fastifyWebsocket from '@fastify/websocket'; // Restore this import
import fastifyFormBody from '@fastify/formbody';
import fetch from 'node-fetch';
import crypto from 'crypto';
import Twilio from 'twilio';
import WebSocket from 'ws'; 
import { 
  registerOutboundRoutes, 
  activeCalls, 
  getSignedUrl, 
  terminateCall, 
  isConversationComplete,
  setDynamicVariables 
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
  path: '/socket.io/',
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

// Register @fastify/websocket AFTER fastify-socket.io
server.register(fastifyWebsocket, {
  options: { 
    perMessageDeflate: false,    
    maxPayload: 64 * 1024,       
    handshakeTimeout: 5000,      
    clientTracking: false,       
    clientNoContextTakeover: true,
    serverNoContextTakeover: true 
  }
});
server.register(fastifyFormBody);

// Register API middleware
registerApiMiddleware(server);

// Register outbound calling routes
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

// Helper function to verify webhook signature
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

// --- WebSocket Proxy Handler ---
// Restore the route using @fastify/websocket
server.get('/outbound-media-stream', { websocket: true }, (connection, req) => { 
  server.log.info('[WS Proxy] Twilio connected to outbound media stream');

  const transcriptRepository = getTranscriptRepository();
  const callEventRepository = getCallEventRepository();
  const callRepository = getCallRepository(); 

  let streamSid = null;
  let callSid = null;
  let elevenLabsWs = null;
  let customParameters = {}; 
  let conversationId = null; 
  let initialConfigSent = false; // Flag to ensure we only send config once
  let inactivityTimeout = null; 
  let lastActivity = Date.now(); 

  const startInactivityTimer = () => {
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      server.log.warn(`[WS Proxy] Inactivity detected for call ${callSid}, terminating call`);
      if (callSid && twilioClient) { terminateCall(twilioClient, callSid); }
      if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); 
    }, 60000); 
  };

  const updateActivity = () => {
    lastActivity = Date.now();
    startInactivityTimer();
  };

  connection.socket.on('error', (error) => { 
    server.log.error('[WS Proxy] Twilio WebSocket error', error);
  });

  const setupElevenLabs = async () => {
    try {
      const { signed_url } = await getSignedUrl(); 
      
      server.log.info('[WS Proxy] Creating ElevenLabs WebSocket connection');
      elevenLabsWs = new WebSocket(signed_url); 

      elevenLabsWs.on("open", () => {
        server.log.info('[WS Proxy] Connected to ElevenLabs Conversational AI. Waiting for metadata...');
        updateActivity(); 
      });

      // SINGLE message handler for ElevenLabs WebSocket
      elevenLabsWs.on("message", (data) => {
        updateActivity(); 
        let message = null;
        const rawData = data.toString(); 
        server.log.info('[WS Proxy] Received message RAW from ElevenLabs:', rawData); // Log raw data first

        try {
          message = JSON.parse(rawData);
          // Log the parsed object safely using stringify
          server.log.info('[WS Proxy] Successfully parsed message JSON from ElevenLabs:', JSON.stringify(message, null, 2));
        } catch (parseError) {
           server.log.error('[WS Proxy] Could not parse message from ElevenLabs as JSON:', parseError.message, { rawData });
           // Decide if we should return or try to process based on type if possible
           // For now, we'll return if parsing fails on the first expected message
           if (!initialConfigSent) return; 
        }

        // --- Handle Initial Metadata & Send Minimal Config ---
        // Check if it's the metadata message AND we haven't sent config yet
        if (message?.type === "conversation_initiation_metadata" && !initialConfigSent) {
          initialConfigSent = true; 
          const metadataEvent = message.conversation_initiation_metadata_event;
          server.log.info('[WS Proxy] Received conversation_initiation_metadata:', metadataEvent); 
          
          if (metadataEvent?.conversation_id) {
            conversationId = metadataEvent.conversation_id;
            server.log.info(`[WS Proxy] Extracted conversation_id ${conversationId} from metadata`);
          } else {
             server.log.warn('[WS Proxy] conversation_initiation_metadata missing conversation_id', metadataEvent);
          }

          // Prepare and send config FIRST
          const initialConfig = {
            type: "conversation_initiation_client_data",
            conversation_config_override: {
              agent: {
                ...(customParameters?.first_message && { first_message: customParameters.first_message }),
                ...(customParameters?.prompt && { system_prompt: customParameters.prompt })
              },
              // audio: { optimize_latency: true, stream_chunk_size: 512, sample_rate: 16000, silence_threshold: 0.1 } // Commented out based on outbound guide
            },
            dynamic_variables: {
               phone_number: customParameters?.to || "Unknown",
               name: customParameters?.name || "Unknown",
               contact_name: customParameters?.name || "Unknown",
               call_sid: callSid || "Unknown",
               campaign_id: customParameters?.campaignId || null,
               contact_id: customParameters?.contactId || null
            }
          };
          const messageToLog = initialConfig.conversation_config_override.agent.first_message;
          server.log.debug('[WS Proxy] Sending initial config with dynamic variables to ElevenLabs after receiving metadata', {
              first_message: messageToLog ? messageToLog.substring(0,50) : '<Agent Default>'
          });
          server.log.debug('[WS Proxy] Full initialConfig being sent:', JSON.stringify(initialConfig, null, 2));
          elevenLabsWs.send(JSON.stringify(initialConfig));
          
          // Don't process this metadata message further
          return;
        }
        // --- End of Initial Metadata Handling ---

        // --- Process Subsequent Messages ---
        if (!initialConfigSent) {
           // If we haven't received metadata and sent config yet, ignore other messages
           server.log.warn('[WS Proxy] Received message before initial metadata/config sent. Ignoring.', message);
           return; 
        }

        // Capture conversation_id if missed (redundancy, only if message is valid JSON)
        if (message && !conversationId && message.conversation_id) {
           conversationId = message.conversation_id;
           server.log.info(`[WS Proxy] Received conversation_id ${conversationId} from subsequent message`);
           if (callSid) {
              callRepository.updateCallStatus(callSid, null, { conversationId })
                 .catch(err => server.log.error(`[WS Proxy] Error updating DB with conversationId for ${callSid}:`, err));
           }
        }

        // Only proceed if message was parsed
        if (message) {
            if (isConversationComplete(message)) {
              server.log.info(`[WS Proxy] Conversation complete detected, terminating call ${callSid}`);
              if (callSid && twilioClient) { terminateCall(twilioClient, callSid); }
              return; 
            }

            switch (message.type) {
              case "audio":
                if (streamSid && message.audio?.chunk) {
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
                const transcriptMsg = message.transcript_update;
                if (transcriptMsg && transcriptMsg.message && callSid) {
                   server.log.debug(`[WS Proxy] Transcript: ${transcriptMsg.role}: ${transcriptMsg.message.substring(0,50)}...`);
                   const messageDetails = { role: transcriptMsg.role, message: transcriptMsg.message, timestamp: transcriptMsg.timestamp || new Date().toISOString() };
                   transcriptRepository.addMessageToTranscript(callSid, messageDetails)
                     .catch(err => server.log.error(`[WS Proxy] Error saving transcript message for ${callSid}:`, err));
                   emitTranscriptMessage(callSid, messageDetails);
                   const eventType = messageDetails.role === 'agent' ? 'agent_response' : 'user_message';
                   const eventSource = messageDetails.role === 'agent' ? 'elevenlabs' : 'user';
                   callEventRepository.logEvent(callSid, eventType, messageDetails, { source: eventSource })
                     .catch(err => server.log.error(`[WS Proxy] Error logging transcript event for ${callSid}:`, err));
                }
                break;
              default:
                 // Log other potentially useful events
                 if (callSid && message.type !== 'audio' && message.type !== 'ping' && message.type !== 'conversation_initiation_metadata') { // Avoid re-logging metadata
                    callEventRepository.logEvent(callSid, 'custom', message, { source: 'elevenlabs' })
                      .catch(err => server.log.error(`[WS Proxy] Error logging custom event for ${callSid}:`, err));
                 }
                 server.log.debug(`[WS Proxy] Received ElevenLabs message type: ${message.type}`);
            }
        }
        // --- End Process Subsequent Messages ---
      }); // End of SINGLE on("message") handler

      elevenLabsWs.on("error", (error) => {
        server.log.error('[WS Proxy] ElevenLabs WebSocket error', error);
      });

      elevenLabsWs.on("close", () => {
        server.log.info('[WS Proxy] ElevenLabs WebSocket disconnected');
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        if (callSid && twilioClient) {
           server.log.info(`[WS Proxy] ElevenLabs WS closed. Ensuring call ${callSid} is terminated.`);
           terminateCall(twilioClient, callSid);
        }
        if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); 
      });

    } catch (error) {
      server.log.error('[WS Proxy] ElevenLabs setup error', error);
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.close(); 
    }
  };

  setupElevenLabs(); 

  connection.socket.on("message", (message) => { 
    updateActivity();
    try {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid;
          callSid = msg.start.callSid;
          customParameters = msg.start.customParameters || {}; 
          server.log.info(`[WS Proxy] Received TwiML Parameters:`, customParameters); 
          server.log.info(`[WS Proxy] Twilio Stream started`, { streamSid, callSid });
          if (callSid && activeCalls.has(callSid)) {
             const callInfo = activeCalls.get(callSid);
             callInfo.conversation_id = null; 
             activeCalls.set(callSid, callInfo);
          }
          startInactivityTimer();
          break;
        case "media":
          if (elevenLabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) {
            const audioMessage = { user_audio_chunk: msg.media.payload };
            elevenLabsWs.send(JSON.stringify(audioMessage));
          }
          break;
        case "stop":
          server.log.info(`[WS Proxy] Twilio Stream ended`, { streamSid });
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
          break;
        case "mark":
          server.log.debug(`[WS Proxy] Twilio Mark: ${msg.mark?.name}`);
          break;
        default:
          server.log.debug(`[WS Proxy] Unhandled Twilio event: ${msg.event}`);
      }
    } catch (error) {
      server.log.error('[WS Proxy] Error processing Twilio message', error);
    }
  });

  connection.socket.on("close", () => { 
    server.log.info('[WS Proxy] Twilio WebSocket disconnected');
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close();
    if (callSid && twilioClient) {
       server.log.info(`[WS Proxy] Twilio WS closed. Ensuring call ${callSid} is terminated.`);
       terminateCall(twilioClient, callSid);
    }
  });
}); 
// --- End WebSocket Proxy Handler ---

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
    
    const port = process.env.PORT || 8000;
    const host = '0.0.0.0';
    console.log(`[Server] Attempting to listen on ${host}:${port}...`);
    await server.listen({ port, host }); // Start listening first
    console.log(`[Server] Enhanced server with MongoDB listening on port ${port}`);

    // Initialize our Socket.IO logic AFTER server is listening AND plugin is registered
    try {
      // Pass the Fastify server instance which now has server.io decorated by the plugin
      initializeSocketServer(server, activeCalls); 
      console.log('[Server] Socket.IO logic initialized using fastify-socket.io');
    } catch (socketErr) {
       console.error('[Server] Socket.IO logic initialization failed:', socketErr);
       // Decide if we should exit or continue without Socket.IO
    }
    console.log('[Server] Enhanced features activated: ...'); 
    
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
