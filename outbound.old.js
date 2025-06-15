import WebSocket from "ws";
import Twilio from "twilio";
// Removed node-fetch import - using native fetch
import { createTimer, recordAudioLatency, trackCallStart } from './latency-monitor.js';

// Map to store active call information
export const activeCalls = new Map();

/**
 * Terminates an active Twilio call
 * @param {Twilio.Twilio} twilioClient - The Twilio client instance
 * @param {string} callSid - The SID of the call to terminate
 * @returns {Promise<boolean>} - Success status of the termination
 */
async function terminateCall(twilioClient, callSid) {
  try {
    console.log(`[Call Control] Terminating call ${callSid} via Twilio API`);
    await twilioClient.calls(callSid).update({ status: 'completed' });
    console.log(`[Call Control] Successfully terminated call ${callSid}`);
    return true;
  } catch (error) {
    console.error(`[Call Control] Error terminating call ${callSid}:`, error);
    return false;
  }
}

/**
 * Detects conversation completion from ElevenLabs messages
 * @param {object} message - Message from ElevenLabs
 * @returns {boolean} - Whether the conversation is complete
 */
function isConversationComplete(message) {
  // Case 1: Check for explicit conversation_completed event
  if (message.type === 'conversation_completed') {
    return true;
  }
  
  // Case 2: Check if the agent says a closing statement
  if (message.type === 'transcript_update' && message.transcript_update?.role === 'agent') {
    const text = message.transcript_update.message.toLowerCase();
    const goodbyePhrases = [
      'goodbye', 'thank you for your time', 'have a good day', 
      'thanks for speaking', 'thank you for speaking', 'have a nice day',
      'have a great day', 'thank you and goodbye', 'thanks for your time'
    ];
    
    if (goodbyePhrases.some(phrase => text.includes(phrase))) {
      console.log('[ElevenLabs] Detected conversation end from agent goodbye phrase');
      return true;
    }
  }
  
  // Case 3: Check for conversation state indicators
  if (message.type === 'conversation_state_update' && 
      message.conversation_state_update?.state === 'completed') {
    return true;
  }
  
  return false;
}

export function registerOutboundRoutes(fastify, options = {}) {
  // Check for required environment variables
  const { 
    ELEVENLABS_API_KEY, 
    ELEVENLABS_AGENT_ID,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    SERVER_URL
  } = process.env;

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing required environment variables");
    throw new Error("Missing required environment variables");
  }

  // Initialize Twilio client with Australia region
  const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    region: 'au1'  // Specify Australia region for lower latency
  });
  console.log("[Twilio] Initialized with Australia region (au1) for lower latency");

  // Get the base URL for callbacks (use SERVER_URL if available, otherwise fallback to host header)
  const getBaseUrl = (request) => {
    if (SERVER_URL) {
      return SERVER_URL.replace(/\/$/, ''); // Remove trailing slash if present
    }
    return `https://${request.headers.host}`;
  };

  // Helper function to get signed URL for authenticated conversations
  async function getSignedUrl() {
    const timer = createTimer('ElevenLabs getSignedUrl').start();
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'xi-region-preference': 'ap-southeast', // Request Asia-Pacific region if available
            'xi-optimize-latency': 'true'           // Request latency optimization
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      timer.stop();
      return { 
        signed_url: data.signed_url,
        conversation_id: data.conversation_id 
      };
    } catch (error) {
      console.error("Error getting signed URL:", error);
      timer.stop();
      throw error;
    }
  }

  // Helper function to set dynamic variables for a conversation
  async function setDynamicVariables(conversationId, variables) {
    const timer = createTimer('ElevenLabs setDynamicVariables').start();
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/dynamic-variables`,
        {
          method: 'PUT',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dynamic_variables: variables
          })
        }
      );

      timer.stop();
      if (!response.ok) {
        console.error(`Failed to set dynamic variables: ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error setting dynamic variables:", error);
      timer.stop();
      return false;
    }
  }

  // Define the callback URL for status updates and recordings
  const getCallbackUrl = (baseUrl) => `${baseUrl}/call-status-callback`;
  
  // Add a route to handle call status callbacks from Twilio
  // Skip this route if options.skipCallStatusCallback is true (for enhanced server)
  if (!options.skipCallStatusCallback) {
    fastify.post("/call-status-callback", async (request, reply) => {
      const { CallSid, CallStatus, RecordingUrl, RecordingSid } = request.body;
      
      console.log(`[Twilio Callback] Call ${CallSid} status: ${CallStatus}`);
      
      // Store call information
      if (!activeCalls.has(CallSid)) {
        activeCalls.set(CallSid, {
          sid: CallSid,
          status: CallStatus,
          startTime: new Date(),
          recordings: []
        });
      } else {
        const callInfo = activeCalls.get(CallSid);
        callInfo.status = CallStatus;
        
        // If call completed, add end time
        if (CallStatus === 'completed') {
          callInfo.endTime = new Date();
        }
        
        activeCalls.set(CallSid, callInfo);
      }
      
      // If we got a recording URL, store it
      if (RecordingUrl && RecordingSid) {
        const callInfo = activeCalls.get(CallSid) || { recordings: [] };
        callInfo.recordings.push({
          sid: RecordingSid,
          url: RecordingUrl,
          timestamp: new Date()
        });
        activeCalls.set(CallSid, callInfo);
        console.log(`[Twilio Callback] Recording available for call ${CallSid}: ${RecordingUrl}`);
      }
      
      // Always return success to Twilio
      return reply.code(200).send({
        success: true,
        message: "Status update received"
      });
    });
  }
  
  // Add endpoint to check call status and recordings
  fastify.get("/call/:callSid", async (request, reply) => {
    const { callSid } = request.params;
    
    // If we don't have local info, try to get it from Twilio
    if (!activeCalls.has(callSid)) {
      try {
        const call = await twilioClient.calls(callSid).fetch();
        const recordings = await twilioClient.recordings.list({callSid});
        
        const callInfo = {
          sid: call.sid,
          status: call.status,
          from: call.from,
          to: call.to,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
          recordings: recordings.map(rec => ({
            sid: rec.sid,
            url: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${rec.sid}.mp3`,
            duration: rec.duration,
            timestamp: rec.dateCreated
          }))
        };
        
        // Store for future reference
        activeCalls.set(callSid, callInfo);
        
        return reply.send(callInfo);
      } catch (error) {
        return reply.code(404).send({
          error: "Call not found",
          message: error.message
        });
      }
    }
    
    // Return the call info we have
    return reply.send(activeCalls.get(callSid));
  });

  // Route to initiate outbound calls
  fastify.post("/outbound-call", async (request, reply) => {
    const callTimer = createTimer('Total Call Initiation').start();
    const { number, prompt, first_message, region, callerId, name } = request.body;
    // Use region parameter if provided, otherwise default to au1
    const twilioRegion = region || 'au1';

    if (!number) {
      return reply.code(400).send({ error: "Phone number is required" });
    }

    try {
      // Get signed URL and conversation ID
      const signedUrlTimer = createTimer('Getting Signed URL').start();
      const { signed_url, conversation_id } = await getSignedUrl();
      signedUrlTimer.stop();
      
      // Set dynamic variables for the conversation
      const dynamicVarsTimer = createTimer('Setting Dynamic Variables').start();
      await setDynamicVariables(conversation_id, {
        phone_number: number,
        name: name || "Unknown",
        contact_name: name || "Unknown", // Alternative name field
        conversation_id: conversation_id // Store conversation ID for later use
      });
      dynamicVarsTimer.stop();
      
      console.log(`[ElevenLabs] Set dynamic variables for conversation ${conversation_id}`);
      
      // Build URL with both prompt and first_message parameters
      const baseUrl = getBaseUrl(request);
      const twimlUrl = `${baseUrl}/outbound-call-twiml?prompt=${encodeURIComponent(prompt || '')}`;
      const urlWithFirstMessage = first_message ? 
        `${twimlUrl}&first_message=${encodeURIComponent(first_message)}&conversation_id=${conversation_id}` : 
        `${twimlUrl}&conversation_id=${conversation_id}`;
      
      // Create the callback URL for status updates
      const statusCallbackUrl = getCallbackUrl(baseUrl);
      
      console.log(`[Outbound Call] Initiating call to ${number} with URL: ${urlWithFirstMessage} (Region: ${twilioRegion})`);
      console.log(`[Outbound Call] Status callback URL: ${statusCallbackUrl}`);
      
      // Make the call with Twilio - now with recording enabled
      const twilioTimer = createTimer('Twilio Call Creation').start();
      const call = await twilioClient.calls.create({
        from: callerId || TWILIO_PHONE_NUMBER,
        to: number,
        url: urlWithFirstMessage,
        region: twilioRegion,                    // Use the region from request or default to au1
        
        // Enhanced Recording Options
        record: true,
        recordingStatusCallback: `${baseUrl}/recording-status-callback`,
        recordingStatusCallbackEvent: ['in-progress', 'completed', 'absent', 'failed'],
        recordingChannels: 'dual',               // Record both sides separately
        recordingTrack: 'both',                  // Record both inbound and outbound audio
        recordingStatusCallbackMethod: 'POST',
        trim: 'trim-silence',                    // Remove silence for cleaner recordings
        
        // Enhanced Status Tracking
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: [
          'initiated', 'ringing', 'answered', 'in-progress',
          'completed', 'busy', 'no-answer', 'canceled', 'failed'
        ],
        statusCallbackMethod: 'POST',
        
        // Enhanced Machine Detection
        machineDetection: 'Enable',
        machineDetectionTimeout: 10,             // 10 seconds to analyze call
        machineDetectionSilenceTimeout: 5000,    // 5 seconds silence for detection
        asyncAmd: 'true',                        // Async AMD for better detection
        amdStatusCallback: `${baseUrl}/amd-status-callback`, // Special callback for AMD events
        
        // Enhanced Error Handling
        fallbackUrl: `${baseUrl}/fallback-twiml`,
        fallbackMethod: 'POST',
        
        // Call Limits
        timeout: 60,                             // 60 seconds timeout for connection
        timeLimit: 600                           // 10 minute maximum call duration
      });
      twilioTimer.stop();
      
      // Track this call in our statistics
      trackCallStart();

      // Store call in our active calls map with initial info
      activeCalls.set(call.sid, {
        sid: call.sid,
        status: 'initiated',
        to: number,
        from: callerId || TWILIO_PHONE_NUMBER,
        conversation_id: conversation_id,
        startTime: new Date(),
        recordings: []
      });

      console.log(`[Outbound Call] Call initiated successfully. Call SID: ${call.sid} (using AU region)`);
      
      callTimer.stop();
      reply.send({ 
        success: true, 
        message: "Call initiated", 
        callSid: call.sid,
        conversationId: conversation_id,
        timing: {
          total: callTimer.elapsed(),
          signedUrl: signedUrlTimer.elapsed(),
          dynamicVars: dynamicVarsTimer.elapsed(),
          twilioCall: twilioTimer.elapsed()
        }
      });
    } catch (error) {
      console.error("Error initiating outbound call:", error);
      callTimer.stop();
      // Include detailed error information in the response
      reply.code(500).send({ 
        success: false, 
        error: "Failed to initiate call",
        details: error.message || "Unknown error",
        code: error.code,
        statusCode: error.statusCode,
        moreInfo: error.moreInfo,
        timing: {
          total: callTimer.elapsed()
        }
      });
    }
  });

  // TwiML route for outbound calls
  fastify.all("/outbound-call-twiml", async (request, reply) => {
    const prompt = request.query.prompt || '';
    const first_message = request.query.first_message || '';
    const conversation_id = request.query.conversation_id || '';
    const baseUrl = getBaseUrl(request);

    // Enhanced TwiML with call recording and conversation ID parameter
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="wss://${baseUrl.replace('https://', '')}/outbound-media-stream">
            <Parameter name="prompt" value="${prompt}" />
            <Parameter name="first_message" value="${first_message}" />
            <Parameter name="conversation_id" value="${conversation_id}" />
          </Stream>
        </Connect>
      </Response>`;

    reply.type("text/xml").send(twimlResponse);
  });

  // WebSocket route for handling media streams
  fastify.register(async (fastifyInstance) => {
    fastifyInstance.get("/outbound-media-stream", { websocket: true }, (ws, req) => {
      console.info("[Server] Twilio connected to outbound media stream");

      // Variables to track the call
      let streamSid = null;
      let callSid = null;
      let elevenLabsWs = null;
      let customParameters = null;  // Add this to store parameters
      let conversationId = null;    // Store conversation ID
      let inactivityTimeout = null; // Timeout to detect inactivity
      let lastActivity = Date.now(); // Track last activity
      
      // Set an inactivity handler
      const startInactivityTimer = () => {
        // Clear any existing timeout
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        
        // Set a new timeout - 60 seconds of inactivity will end the call
        inactivityTimeout = setTimeout(() => {
          console.log(`[Call Control] Inactivity detected for call ${callSid}, terminating call`);
          // Terminate the call via Twilio API
          if (callSid) {
            terminateCall(twilioClient, callSid);
          }
          // Close WebSockets
          if (elevenLabsWs?.readyState === WebSocket.OPEN) {
            elevenLabsWs.close();
          }
          ws.close();
        }, 60000); // 60 seconds timeout
      };
      
      // Update activity timestamp
      const updateActivity = () => {
        lastActivity = Date.now();
        startInactivityTimer();
      };

      // Handle WebSocket errors
      ws.on('error', console.error);

      // Variables for latency tracking
      let lastSentAudio = 0;
      let totalLatency = 0;
      let messageCount = 0;
      let minLatency = Number.MAX_VALUE;
      let maxLatency = 0;

      // Set up ElevenLabs connection
      const setupElevenLabs = async () => {
        try {
          const wsSetupTimer = createTimer('WebSocket Setup').start();
          const { signed_url } = await getSignedUrl();
          
          // Configure WebSocket with optimized settings
          const wsOptions = {
            perMessageDeflate: false,       // Disable compression for real-time audio
            maxPayload: 64 * 1024,          // 64KB for more efficient chunks
            handshakeTimeout: 5000,         // 5 seconds
            timeout: 30000,                 // 30 seconds overall timeout
            fragmentOutgoingMessages: false, // Avoid message fragmentation
          };
          
          console.log("[ElevenLabs] Creating WebSocket with optimized settings for lower latency");
          elevenLabsWs = new WebSocket(signed_url, wsOptions);

          elevenLabsWs.on("open", () => {
            wsSetupTimer.stop();
            console.log("[ElevenLabs] Connected to Conversational AI");

            // Send initial configuration with first message only, don't override the agent's prompt
            const initialConfig = {
              type: "conversation_initiation_client_data",
              conversation_config_override: {
                agent: {
                  // Don't override the agent's system prompt
                  first_message: customParameters?.first_message || "Hello, this is Investor Signals AI assistant in training. May I please speak with you?",
                },
                audio: {
                  optimize_latency: true,      // Enable latency optimization
                  stream_chunk_size: 512,      // Smaller chunk size for faster processing
                  sample_rate: 16000,          // Lower sample rate (vs standard 24000)
                  silence_threshold: 0.1       // Adjust silence detection threshold
                }
              },
              // Add dynamic variables for current call - duplicating from earlier but good for redundancy
              dynamic_variables: {
                phone_number: req.headers['to'] || "Unknown",
                call_sid: callSid || "Unknown",
                conversation_id: conversationId || "Unknown",
                server_location: process.env.SERVER_LOCATION || "Unknown"
              }
            };

            console.log("[ElevenLabs] Using first message:", initialConfig.conversation_config_override.agent.first_message);
            console.log("[ElevenLabs] Audio settings optimized for lower latency");
            console.log("[ElevenLabs] Dynamic variables:", initialConfig.dynamic_variables);

            // Send the configuration to ElevenLabs
            elevenLabsWs.send(JSON.stringify(initialConfig));
            
            // Start inactivity timer
            updateActivity();
          });

          elevenLabsWs.on("message", (data) => {
            // Update activity timestamp
            updateActivity();
            
            // Track when we receive messages for latency measurement
            const receivedTime = Date.now();
            if (lastSentAudio > 0 && data.toString().includes('"type":"audio"')) {
              const roundTrip = receivedTime - lastSentAudio;
              totalLatency += roundTrip;
              messageCount++;
              minLatency = Math.min(minLatency, roundTrip);
              maxLatency = Math.max(maxLatency, roundTrip);
              
              // Record in our latency monitor
              recordAudioLatency(roundTrip);
              
              // Log every 5th message for readability
              if (messageCount % 5 === 0) {
                const avgRoundTrip = (totalLatency / messageCount).toFixed(2);
                console.log(`[LATENCY] Audio round trip: ${roundTrip}ms, Avg: ${avgRoundTrip}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`);
              }
            }
            
            try {
              const message = JSON.parse(data);
              
              // Check if conversation is complete
              if (isConversationComplete(message)) {
                console.log(`[ElevenLabs] Conversation complete detected. Terminating call ${callSid}`);
                // Terminate the call via Twilio API
                if (callSid) {
                  terminateCall(twilioClient, callSid);
                }
              }

              switch (message.type) {
                case "conversation_initiation_metadata":
                  console.log("[ElevenLabs] Received initiation metadata");
                  break;

                case "audio":
                  if (streamSid) {
                    if (message.audio?.chunk) {
                      const audioData = {
                        event: "media",
                        streamSid,
                        media: {
                          payload: message.audio.chunk
                        }
                      };
                      ws.send(JSON.stringify(audioData));
                    } else if (message.audio_event?.audio_base_64) {
                      const audioData = {
                        event: "media",
                        streamSid,
                        media: {
                          payload: message.audio_event.audio_base_64
                        }
                      };
                      ws.send(JSON.stringify(audioData));
                    }
                  } else {
                    console.log("[ElevenLabs] Received audio but no StreamSid yet");
                  }
                  break;

                case "interruption":
                  if (streamSid) {
                    ws.send(JSON.stringify({ 
                      event: "clear",
                      streamSid 
                    }));
                  }
                  break;

                case "ping":
                  if (message.ping_event?.event_id) {
                    elevenLabsWs.send(JSON.stringify({
                      type: "pong",
                      event_id: message.ping_event.event_id
                    }));
                  }
                  break;
                  
                case "transcript_update":
                  console.log(`[ElevenLabs] Transcript update: ${message.transcript_update?.role}: ${message.transcript_update?.message?.substring(0, 100)}${message.transcript_update?.message?.length > 100 ? '...' : ''}`);
                  break;

                default:
                  console.log(`[ElevenLabs] Message type: ${message.type}`);
              }
            } catch (error) {
              console.error("[ElevenLabs] Error processing message:", error);
            }
          });

          elevenLabsWs.on("error", (error) => {
            console.error("[ElevenLabs] WebSocket error:", error);
          });

          elevenLabsWs.on("close", () => {
            console.log("[ElevenLabs] Disconnected");
            
            // Clear inactivity timeout
            if (inactivityTimeout) {
              clearTimeout(inactivityTimeout);
            }
            
            // Log latency statistics at the end of the call
            if (messageCount > 0) {
              const avgLatency = (totalLatency / messageCount).toFixed(2);
              console.log(`\n[LATENCY] Call Performance Summary:`);
              console.log(`  - Average round trip: ${avgLatency}ms`);
              console.log(`  - Minimum round trip: ${minLatency}ms`);
              console.log(`  - Maximum round trip: ${maxLatency}ms`);
              console.log(`  - Total audio messages: ${messageCount}`);
              console.log(`  - Server location: ${process.env.SERVER_LOCATION || "Unknown"}`);
              console.log(`\nTIP: Lower numbers indicate better performance. Under 300ms is good for Australia to US connections.`);
            }
            
            // Make sure call is terminated when ElevenLabs connection closes
            if (callSid) {
              console.log(`[Call Control] ElevenLabs connection closed. Ensuring call ${callSid} is terminated.`);
              terminateCall(twilioClient, callSid);
            }
          });

        } catch (error) {
          console.error("[ElevenLabs] Setup error:", error);
        }
      };

      // Set up ElevenLabs connection
      setupElevenLabs();

      // Handle messages from Twilio
      ws.on("message", (message) => {
        // Update activity timestamp
        updateActivity();
        
        try {
          const msg = JSON.parse(message);
          // Only log non-media events to avoid console flooding
          if (msg.event !== 'media') {
            console.log(`[Twilio] Received event: ${msg.event}`);
          }

          switch (msg.event) {
            case "start":
              streamSid = msg.start.streamSid;
              callSid = msg.start.callSid;
              customParameters = msg.start.customParameters;  // Store parameters
              conversationId = customParameters?.conversation_id || null;
              
              console.log(`[Twilio] Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}`);
              console.log('[Twilio] Start parameters:', customParameters);
              
              // Start monitoring call for inactivity
              startInactivityTimer();
              break;

            case "media":
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                // Record the time we send audio for latency tracking
                lastSentAudio = Date.now();
                
                // Optimize media handling - avoid redundant base64 conversion
                const audioMessage = {
                  user_audio_chunk: msg.media.payload // Payload is already base64
                };
                elevenLabsWs.send(JSON.stringify(audioMessage));
              }
              break;

            case "stop":
              console.log(`[Twilio] Stream ${streamSid} ended`);
              // Clear inactivity timeout
              if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
              }
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                elevenLabsWs.close();
              }
              break;

            case "mark":
              console.log(`[Twilio] Mark received: ${msg.mark?.name}`);
              break;
              
            default:
              console.log(`[Twilio] Unhandled event: ${msg.event}`);
          }
        } catch (error) {
          console.error("[Twilio] Error processing message:", error);
        }
      });

      // Handle WebSocket closure
      ws.on("close", () => {
        console.log("[Twilio] Client disconnected");
        // Clear inactivity timeout
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        if (elevenLabsWs?.readyState === WebSocket.OPEN) {
          elevenLabsWs.close();
        }
        // Ensure call is terminated
        if (callSid) {
          console.log(`[Call Control] WebSocket closed. Ensuring call ${callSid} is terminated.`);
          terminateCall(twilioClient, callSid);
        }
      });
    });
  });
  
  // Route to manually terminate a call
  fastify.post("/terminate-call/:callSid", async (request, reply) => {
    const { callSid } = request.params;
    
    if (!callSid) {
      return reply.code(400).send({
        success: false,
        error: "Call SID is required"
      });
    }
    
    try {
      const success = await terminateCall(twilioClient, callSid);
      
      if (success) {
        return reply.send({
          success: true,
          message: `Call ${callSid} terminated successfully`
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: `Failed to terminate call ${callSid}`
        });
      }
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}
