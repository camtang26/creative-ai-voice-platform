import WebSocket from "ws";
import Twilio from "twilio";

// Configuration for optimizations - can be toggled
const OPTIMIZATIONS = {
  DISABLE_WEBSOCKET_COMPRESSION: true,  // Reduces CPU overhead for real-time audio
  INCREASE_MAX_PAYLOAD: true,           // Allows larger audio chunks
  OPTIMIZE_AUDIO_PARSING: true,         // Faster audio processing
  LATENCY_LOGGING: true,                // Add detailed latency measurements
  LOW_LATENCY_MODE: true                // Prioritize latency over quality
};

export function registerOutboundRoutes(fastify) {
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

  console.log("[OPTIMIZED] Using optimized WebSocket handling for lower latency");
  console.log("[OPTIMIZED] Active optimizations:", Object.entries(OPTIMIZATIONS)
    .filter(([_, value]) => value)
    .map(([key]) => key)
    .join(", ")
  );

  // Initialize Twilio client
  const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Get the base URL for callbacks (use SERVER_URL if available, otherwise fallback to host header)
  const getBaseUrl = (request) => {
    if (SERVER_URL) {
      return SERVER_URL.replace(/\/$/, ''); // Remove trailing slash if present
    }
    return `https://${request.headers.host}`;
  };

  // Helper function to get signed URL for authenticated conversations
  async function getSignedUrl() {
    try {
      // Add latency tracking for API requests
      const startTime = Date.now();
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          }
        }
      );

      if (OPTIMIZATIONS.LATENCY_LOGGING) {
        console.log(`[LATENCY] ElevenLabs API request took ${Date.now() - startTime}ms`);
      }

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      return data.signed_url;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      throw error;
    }
  }

  // Route to initiate outbound calls
  fastify.post("/outbound-call", async (request, reply) => {
    const { number, prompt, first_message } = request.body;

    if (!number) {
      return reply.code(400).send({ error: "Phone number is required" });
    }

    try {
      // Build URL with both prompt and first_message parameters
      const baseUrl = getBaseUrl(request);
      const twimlUrl = `${baseUrl}/outbound-call-twiml?prompt=${encodeURIComponent(prompt || '')}`;
      const urlWithFirstMessage = first_message ? 
        `${twimlUrl}&first_message=${encodeURIComponent(first_message)}` : 
        twimlUrl;
      
      // Add low latency parameter if enabled
      const finalUrl = OPTIMIZATIONS.LOW_LATENCY_MODE ? 
        `${urlWithFirstMessage}&optimize_latency=true` : 
        urlWithFirstMessage;
      
      console.log(`[Outbound Call] Initiating call to ${number} with URL: ${finalUrl}`);
      
      // Add latency tracking for Twilio API calls
      const startTime = Date.now();
      
      const call = await twilioClient.calls.create({
        from: TWILIO_PHONE_NUMBER,
        to: number,
        url: finalUrl
      });

      if (OPTIMIZATIONS.LATENCY_LOGGING) {
        console.log(`[LATENCY] Twilio API request took ${Date.now() - startTime}ms`);
      }

      console.log(`[Outbound Call] Call initiated successfully. Call SID: ${call.sid}`);
      
      reply.send({ 
        success: true, 
        message: "Call initiated", 
        callSid: call.sid 
      });
    } catch (error) {
      console.error("Error initiating outbound call:", error);
      // Include detailed error information in the response
      reply.code(500).send({ 
        success: false, 
        error: "Failed to initiate call",
        details: error.message || "Unknown error",
        code: error.code,
        statusCode: error.statusCode,
        moreInfo: error.moreInfo
      });
    }
  });

  // TwiML route for outbound calls
  fastify.all("/outbound-call-twiml", async (request, reply) => {
    const prompt = request.query.prompt || '';
    const first_message = request.query.first_message || '';
    const optimizeLatency = request.query.optimize_latency === 'true';
    const baseUrl = getBaseUrl(request);

    // TwiML response with optimized settings if latency optimization is enabled
    let twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="wss://${baseUrl.replace('https://', '')}/outbound-media-stream">
            <Parameter name="prompt" value="${prompt}" />
            <Parameter name="first_message" value="${first_message}" />`;
            
    // Add optimization parameters if enabled
    if (optimizeLatency || OPTIMIZATIONS.LOW_LATENCY_MODE) {
      twimlResponse += `
            <Parameter name="optimize_latency" value="true" />`;
    }
    
    twimlResponse += `
          </Stream>
        </Connect>
      </Response>`;

    reply.type("text/xml").send(twimlResponse);
  });

  // WebSocket route for handling media streams
  fastify.register(async (fastifyInstance) => {
    fastifyInstance.get("/outbound-media-stream", { websocket: true }, (ws, req) => {
      console.info("[Server] Twilio connected to outbound media stream");

      // Variables to track the call and performance
      let streamSid = null;
      let callSid = null;
      let elevenLabsWs = null;
      let customParameters = null;
      
      // Latency tracking variables
      const latencyData = {
        lastSentAudio: 0,
        lastReceivedAudio: 0,
        audioRoundTrips: [],
        messageCount: 0
      };

      // Handle WebSocket errors
      ws.on('error', console.error);

      // Set up ElevenLabs connection
      const setupElevenLabs = async () => {
        try {
          const signedUrl = await getSignedUrl();
          
          // Configure WebSocket with optimized settings
          const wsOptions = {};
          
          if (OPTIMIZATIONS.DISABLE_WEBSOCKET_COMPRESSION) {
            wsOptions.perMessageDeflate = false;
          }
          
          if (OPTIMIZATIONS.INCREASE_MAX_PAYLOAD) {
            wsOptions.maxPayload = 64 * 1024; // 64KB for more efficient chunks
          }
          
          // Allow setting shorter timeouts for faster connection problems detection
          wsOptions.handshakeTimeout = 5000; // 5 seconds
          wsOptions.timeout = 30000; // 30 seconds overall timeout
          
          // Create WebSocket with optimized options
          elevenLabsWs = new WebSocket(signedUrl, wsOptions);

          elevenLabsWs.on("open", () => {
            console.log("[ElevenLabs] Connected to Conversational AI");

            // Send initial configuration with first message only, don't override the agent's prompt
            const initialConfig = {
              type: "conversation_initiation_client_data",
              conversation_config_override: {
                agent: {
                  // Don't override the agent's system prompt
                  first_message: customParameters?.first_message || "Hello, this is Investor Signals AI assistant in training. May I please speak with you?",
                },
                // Add latency optimization parameters if enabled
                ...(OPTIMIZATIONS.LOW_LATENCY_MODE ? {
                  audio: {
                    optimize_latency: true,
                    stream_chunk_size: 512 // Smaller chunk size for faster processing
                  }
                } : {})
              }
            };

            console.log("[ElevenLabs] Using first message:", initialConfig.conversation_config_override.agent.first_message);
            
            // Add streaming configuration
            if (OPTIMIZATIONS.LOW_LATENCY_MODE && customParameters?.optimize_latency === 'true') {
              console.log("[OPTIMIZED] Using low latency audio configuration");
            }

            // Send the configuration to ElevenLabs
            elevenLabsWs.send(JSON.stringify(initialConfig));
          });

          elevenLabsWs.on("message", (data) => {
            // OPTIMIZATION: Track when we receive messages for latency measurement
            if (OPTIMIZATIONS.LATENCY_LOGGING) {
              latencyData.lastReceivedAudio = Date.now();
              if (latencyData.lastSentAudio > 0) {
                const roundTrip = latencyData.lastReceivedAudio - latencyData.lastSentAudio;
                latencyData.audioRoundTrips.push(roundTrip);
                
                // Log every 5th message for readability
                latencyData.messageCount++;
                if (latencyData.messageCount % 5 === 0) {
                  const avgRoundTrip = latencyData.audioRoundTrips.reduce((a, b) => a + b, 0) / 
                    latencyData.audioRoundTrips.length;
                  console.log(`[LATENCY] Audio round trip: ${roundTrip}ms, Avg: ${avgRoundTrip.toFixed(2)}ms`);
                }
              }
            }
            
            // OPTIMIZATION: Faster processing path for audio messages
            if (OPTIMIZATIONS.OPTIMIZE_AUDIO_PARSING && streamSid && 
                (typeof data === 'string' && data.includes('"type":"audio"'))) {
              try {
                // Use a simplified approach for the common audio case
                const audioData = {
                  event: "media",
                  streamSid,
                  media: {
                    payload: JSON.parse(data).audio?.chunk || ""
                  }
                };
                
                ws.send(JSON.stringify(audioData));
                return; // Skip the more expensive processing below
              } catch (e) {
                // If optimization fails, fall back to regular parsing
                console.error("[OPTIMIZED] Fast path failed, using standard path");
              }
            }
            
            // Standard processing path (fallback)
            try {
              const message = JSON.parse(data);

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

                default:
                  console.log(`[ElevenLabs] Unhandled message type: ${message.type}`);
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
            
            // Log latency statistics at the end of the call
            if (OPTIMIZATIONS.LATENCY_LOGGING && latencyData.audioRoundTrips.length > 0) {
              const avgRoundTrip = latencyData.audioRoundTrips.reduce((a, b) => a + b, 0) / 
                latencyData.audioRoundTrips.length;
              const minRoundTrip = Math.min(...latencyData.audioRoundTrips);
              const maxRoundTrip = Math.max(...latencyData.audioRoundTrips);
              
              console.log("\n[LATENCY] Call Performance Summary:");
              console.log(`  - Average round trip: ${avgRoundTrip.toFixed(2)}ms`);
              console.log(`  - Minimum round trip: ${minRoundTrip}ms`);
              console.log(`  - Maximum round trip: ${maxRoundTrip}ms`);
              console.log(`  - Total audio messages: ${latencyData.messageCount}`);
              console.log("");
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
        try {
          const msg = JSON.parse(message);
          
          // Only log non-media events for cleaner logs
          if (msg.event !== 'media') {
            console.log(`[Twilio] Received event: ${msg.event}`);
          }

          switch (msg.event) {
            case "start":
              streamSid = msg.start.streamSid;
              callSid = msg.start.callSid;
              customParameters = msg.start.customParameters;  // Store parameters
              console.log(`[Twilio] Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}`);
              console.log('[Twilio] Start parameters:', customParameters);
              break;

            case "media":
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                // OPTIMIZATION: Track when we send audio for latency measurement
                if (OPTIMIZATIONS.LATENCY_LOGGING) {
                  latencyData.lastSentAudio = Date.now();
                }
                
                // OPTIMIZATION: Avoid redundant base64 conversions
                // The payload is already base64, so don't decode and re-encode
                const audioMessage = {
                  user_audio_chunk: msg.media.payload
                };
                
                elevenLabsWs.send(JSON.stringify(audioMessage));
              }
              break;

            case "stop":
              console.log(`[Twilio] Stream ${streamSid} ended`);
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                elevenLabsWs.close();
              }
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
        if (elevenLabsWs?.readyState === WebSocket.OPEN) {
          elevenLabsWs.close();
        }
      });
    });
  });
}