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
import { registerWebSockets, closeWebSockets } from './websocket-registry.js';
import { trackTermination } from './call-termination-tracker.js';

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
            // Track timeout termination
            trackTermination(callSid, 'system', 'inactivity', {
              lastActivityAge: Date.now() - lastActivity,
              conversationId
            });
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
          
          // CRITICAL: Save conversation ID to database immediately
          if (callSid && conversationId) {
            try {
              const { updateCallStatus } = await import('./db/repositories/call.repository.js');
              await updateCallStatus(callSid, null, { conversationId });
              console.log(`[WebSocket Proxy] Saved conversation ID ${conversationId} to database for call ${callSid}`);
            } catch (dbError) {
              console.error(`[WebSocket Proxy] ERROR: Failed to save conversation ID to database for call ${callSid}:`, dbError);
              // Continue anyway - the webhook handler might save it later
            }
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
            
            // Register WebSockets in global registry
            if (callSid) {
              registerWebSockets(callSid, {
                twilioWs: ws,
                elevenLabsWs: elevenLabsWs
              });
              console.log(`[WebSocket Proxy] Registered WebSockets for call ${callSid} in global registry`);
            }

            // Send initial configuration
            const initialConfig = {
              type: "conversation_initiation_client_data",
              conversation_config_override: {
                // Only override agent settings if explicitly provided, otherwise let ElevenLabs handle it
                ...(customParameters?.first_message && {
                  agent: {
                    first_message: customParameters.first_message
                  }
                }),
                audio: {
                  optimize_latency: true,
                  stream_chunk_size: 512,
                  sample_rate: 16000,
                  silence_threshold: 0.1,
                  // Improve audio quality for better transcription
                  encoding: 'pcmu',  // Use G.711 μ-law for better quality
                  channels: 1,       // Mono audio
                  bit_depth: 16      // 16-bit audio
                },
                // Enable real-time transcript events
                transcript: {
                  enable_real_time: true,
                  send_user_transcripts: true,
                  send_agent_responses: true
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
              
              // Log all message types for debugging real-time transcripts
              if (message.type !== 'audio' && message.type !== 'ping') {
                console.log(`[WebSocket Proxy] Received ElevenLabs message type: ${message.type}`);
              }
              
              // Check if conversation is complete
              if (isConversationComplete(message)) {
                console.log(`[WebSocket Proxy] Conversation complete detected. Terminating call ${callSid}`);
                if (callSid) {
                  // Track that agent/conversation completed normally
                  trackTermination(callSid, 'elevenlabs', 'conversation_completed', {
                    conversationId,
                    messageType: message.type
                  });
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
                          'agent',  // Changed from 'assistant' to match ElevenLabs schema
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
              
              // Track stream stop - could be user hangup
              if (callSid) {
                trackTermination(callSid, 'twilio', 'stream_stop', {
                  conversationId,
                  conversationActive: elevenLabsWs?.readyState === WebSocket.OPEN
                });
              }
              
              // Use registry to close WebSockets
              if (callSid) {
                closeWebSockets(callSid, 'stream_stop');
              } else if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                // Fallback if no callSid
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
        
        // Track disconnection - likely user hung up
        if (callSid) {
          trackTermination(callSid, 'websocket', 'twilio_disconnected', {
            conversationId,
            elevenLabsActive: elevenLabsWs?.readyState === WebSocket.OPEN
          });
        }
        
        // Use registry to close WebSockets
        if (callSid) {
          closeWebSockets(callSid, 'twilio_disconnected');
          console.log(`[WebSocket Proxy] WebSocket closed. Ensuring call ${callSid} is terminated.`);
          terminateCall(twilioClient, callSid);
        } else if (elevenLabsWs?.readyState === WebSocket.OPEN) {
          // Fallback if no callSid
          elevenLabsWs.close();
        }
      });
    });
  });

  console.log('[WebSocket Proxy] Registered WebSocket proxy handler at /outbound-media-stream');
}