/**
 * WebSocket Media Proxy Handler
 * Handles the dual WebSocket connection between Twilio and ElevenLabs
 * Processes transcript messages and emits them via Socket.IO
 */
import WebSocket from 'ws';
import { getSignedUrl, isConversationComplete, terminateCall, activeCalls } from './outbound.js';
import { createTimer, recordAudioLatency } from './latency-monitor.js';
import { getTranscriptRepository } from './db/index.js';
import { emitTranscriptTypewriter } from './socket-server.js';

/**
 * Register WebSocket proxy handler on the Fastify server
 * @param {Object} fastify - Fastify server instance
 * @param {Object} options - Options including twilioClient
 */
export function registerWebSocketProxy(fastify, options = {}) {
  const { twilioClient } = options;
  
  if (!twilioClient) {
    throw new Error('[WebSocket Proxy] Twilio client is required');
  }

  // WebSocket route for handling media streams
  fastify.register(async (fastifyInstance) => {
    fastifyInstance.get("/outbound-media-stream", { websocket: true }, (ws, req) => {
      console.info("[WebSocket Proxy] Twilio connected to outbound media stream");

      // Variables to track the call
      let streamSid = null;
      let callSid = null;
      let elevenLabsWs = null;
      let customParameters = null;
      let conversationId = null;
      let inactivityTimeout = null;
      let lastActivity = Date.now();
      
      // Set an inactivity handler
      const startInactivityTimer = () => {
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        
        inactivityTimeout = setTimeout(() => {
          console.log(`[WebSocket Proxy] Inactivity detected for call ${callSid}, terminating call`);
          if (callSid) {
            terminateCall(twilioClient, callSid);
          }
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
          const { signed_url, conversation_id } = await getSignedUrl();
          
          // Store conversation ID
          conversationId = conversation_id;
          console.log(`[WebSocket Proxy] Got conversation ID: ${conversationId}`);
          
          // Update active call with conversation ID
          if (callSid && activeCalls.has(callSid)) {
            const callInfo = activeCalls.get(callSid);
            callInfo.conversation_id = conversationId;
            activeCalls.set(callSid, callInfo);
          }
          
          // Configure WebSocket with optimized settings
          const wsOptions = {
            perMessageDeflate: false,
            maxPayload: 64 * 1024,
            handshakeTimeout: 5000,
            timeout: 30000,
            fragmentOutgoingMessages: false,
          };
          
          console.log("[WebSocket Proxy] Creating ElevenLabs WebSocket with optimized settings");
          elevenLabsWs = new WebSocket(signed_url, wsOptions);

          elevenLabsWs.on("open", () => {
            wsSetupTimer.stop();
            console.log("[WebSocket Proxy] Connected to ElevenLabs Conversational AI");

            // Send initial configuration
            const initialConfig = {
              type: "conversation_initiation_client_data",
              conversation_config_override: {
                agent: {
                  first_message: customParameters?.first_message || "Hello, this is an AI assistant. How can I help you today?",
                },
                audio: {
                  optimize_latency: true,
                  stream_chunk_size: 512,
                  sample_rate: 16000,
                  silence_threshold: 0.1
                }
              },
              dynamic_variables: {
                phone_number: customParameters?.to || "Unknown",
                call_sid: callSid || "Unknown",
                conversation_id: conversationId || "Unknown",
                server_location: process.env.SERVER_LOCATION || "Unknown"
              }
            };

            console.log("[WebSocket Proxy] Sending initial config to ElevenLabs");
            elevenLabsWs.send(JSON.stringify(initialConfig));
            
            updateActivity();
          });

          elevenLabsWs.on("message", async (data) => {
            updateActivity();
            
            // Track latency
            const receivedTime = Date.now();
            if (lastSentAudio > 0 && data.toString().includes('"type":"audio"')) {
              const roundTrip = receivedTime - lastSentAudio;
              totalLatency += roundTrip;
              messageCount++;
              minLatency = Math.min(minLatency, roundTrip);
              maxLatency = Math.max(maxLatency, roundTrip);
              
              recordAudioLatency(roundTrip);
              
              if (messageCount % 5 === 0) {
                const avgRoundTrip = (totalLatency / messageCount).toFixed(2);
                console.log(`[WebSocket Proxy] Audio latency - RT: ${roundTrip}ms, Avg: ${avgRoundTrip}ms`);
              }
            }
            
            try {
              const message = JSON.parse(data);
              
              // Check if conversation is complete
              if (isConversationComplete(message)) {
                console.log(`[WebSocket Proxy] Conversation complete detected. Terminating call ${callSid}`);
                if (callSid) {
                  terminateCall(twilioClient, callSid);
                }
              }

              switch (message.type) {
                case "conversation_initiation_metadata":
                  console.log("[WebSocket Proxy] Received initiation metadata");
                  break;

                case "audio":
                  if (streamSid) {
                    if (message.audio?.chunk) {
                      ws.send(JSON.stringify({
                        event: "media",
                        streamSid,
                        media: { payload: message.audio.chunk }
                      }));
                    } else if (message.audio_event?.audio_base_64) {
                      ws.send(JSON.stringify({
                        event: "media",
                        streamSid,
                        media: { payload: message.audio_event.audio_base_64 }
                      }));
                    }
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
                  
                case "user_transcript":
                  if (message.user_transcript_event?.user_transcript) {
                    const transcript = message.user_transcript_event.user_transcript;
                    console.log(`[WebSocket Proxy] User transcript: ${transcript.substring(0, 100)}...`);
                    
                    // Save to database and emit via Socket.IO
                    if (callSid) {
                      try {
                        const transcriptRepo = getTranscriptRepository();
                        await transcriptRepo.appendRealtimeTranscriptMessage(
                          callSid,
                          conversationId,
                          'user',
                          transcript,
                          Math.floor((Date.now() - lastActivity) / 1000)
                        );
                        console.log(`[WebSocket Proxy] Saved and emitted user transcript for call ${callSid}`);
                      } catch (error) {
                        console.error(`[WebSocket Proxy] Error saving user transcript:`, error);
                      }
                    }
                  }
                  break;
                  
                case "agent_response":
                  if (message.agent_response_event?.agent_response) {
                    const response = message.agent_response_event.agent_response;
                    console.log(`[WebSocket Proxy] Agent response: ${response.substring(0, 100)}...`);
                    
                    // Save to database and emit via Socket.IO
                    if (callSid) {
                      try {
                        const transcriptRepo = getTranscriptRepository();
                        await transcriptRepo.appendRealtimeTranscriptMessage(
                          callSid,
                          conversationId,
                          'assistant',
                          response,
                          Math.floor((Date.now() - lastActivity) / 1000)
                        );
                        console.log(`[WebSocket Proxy] Saved and emitted agent response for call ${callSid}`);
                      } catch (error) {
                        console.error(`[WebSocket Proxy] Error saving agent response:`, error);
                      }
                    }
                  }
                  break;

                default:
                  // Log unhandled message types for debugging
                  if (!['audio', 'interruption', 'ping'].includes(message.type)) {
                    console.log(`[WebSocket Proxy] Unhandled message type: ${message.type}`);
                  }
              }
            } catch (error) {
              console.error("[WebSocket Proxy] Error processing ElevenLabs message:", error);
            }
          });

          elevenLabsWs.on("error", (error) => {
            console.error("[WebSocket Proxy] ElevenLabs WebSocket error:", error);
          });

          elevenLabsWs.on("close", () => {
            console.log("[WebSocket Proxy] ElevenLabs WebSocket closed");
          });
        } catch (error) {
          console.error("[WebSocket Proxy] Error setting up ElevenLabs:", error);
        }
      };

      // Handle messages from Twilio
      ws.on("message", async (message) => {
        updateActivity();
        
        try {
          const msg = JSON.parse(message);

          switch (msg.event) {
            case "start":
              streamSid = msg.start.streamSid;
              callSid = msg.start.callSid;
              customParameters = msg.start.customParameters || {};
              
              console.log(`[WebSocket Proxy] Stream started - SID: ${streamSid}, Call: ${callSid}`);
              console.log(`[WebSocket Proxy] Custom parameters:`, customParameters);
              
              // Set up ElevenLabs connection
              await setupElevenLabs();
              break;

            case "media":
              if (elevenLabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) {
                lastSentAudio = Date.now();
                
                const audioMessage = {
                  type: "audio",
                  audio: {
                    chunk: msg.media.payload
                  }
                };
                elevenLabsWs.send(JSON.stringify(audioMessage));
              }
              break;

            case "stop":
              console.log("[WebSocket Proxy] Stream stop received");
              if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
              }
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                elevenLabsWs.close();
              }
              break;
              
            default:
              console.log(`[WebSocket Proxy] Unhandled Twilio event: ${msg.event}`);
          }
        } catch (error) {
          console.error("[WebSocket Proxy] Error processing Twilio message:", error);
        }
      });

      // Handle WebSocket closure
      ws.on("close", () => {
        console.log("[WebSocket Proxy] Twilio WebSocket disconnected");
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        if (elevenLabsWs?.readyState === WebSocket.OPEN) {
          elevenLabsWs.close();
        }
        if (callSid) {
          console.log(`[WebSocket Proxy] WebSocket closed. Ensuring call ${callSid} is terminated.`);
          terminateCall(twilioClient, callSid);
        }
      });
    });
  });

  console.log('[WebSocket Proxy] Registered WebSocket proxy handler at /outbound-media-stream');
}