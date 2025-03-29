/**
 * Enhanced Server with Improved Twilio Integration
 * 
 * Key Improvements:
 * 1. Enhanced Twilio data collection
 * 2. Robust call recording
 * 3. Automatic call termination
 * 4. Improved architecture
 * 5. Socket.IO real-time updates
 * 6. Standardized API responses and error handling
 * 7. API authentication for sensitive operations
 */
import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import fetch from 'node-fetch';
import crypto from 'crypto';
import Twilio from 'twilio';
import { registerOutboundRoutes, activeCalls } from './outbound.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';
import { handleElevenLabsWebhook, setActiveCallsReference } from './webhook-handler.js';
import enhancedCallHandler from './enhanced-call-handler-updated.js';
import recordingHandler from './recording-handler.js';
import callQualityMetrics from './call-quality-metrics.js';
import { registerApiRoutes } from './api-routes.js';
import { registerApiMiddleware } from './api-middleware.js';
import { 
  initializeSocketServer, 
  emitCallUpdate, 
  emitActiveCallsList, 
  handleCallStatusChange 
} from './socket-server.js';

// Get Twilio credentials from environment
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

// Create Twilio client
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    region: 'au1'  // Specify Australia region for lower latency
  });
  console.log("[Twilio] Server initialized Twilio client with Australia region (au1)");
}

// Initialize Fastify with optimized TCP settings for lower latency
const server = fastify({ 
  logger: true,
  // Set TCP socket options for lower latency
  http: {
    connectionTimeout: 30000,        // 30 seconds
    keepAliveTimeout: 30000,         // 30 seconds
    maxRequestsPerSocket: 0,         // Unlimited requests per connection
    headersTimeout: 30000,           // 30 seconds
    requestTimeout: 30000,           // 30 seconds
    tcpKeepAlive: true,              // Enable TCP keep-alive
    tcpNoDelay: true                 // Disable Nagle's algorithm
  },
  // Add request ID for better tracking of requests
  genReqId: req => {
    return `req-${crypto.randomBytes(8).toString('hex')}`;
  }
});

// Register plugins with optimized settings for lower latency
server.register(fastifyWebsocket, {
  options: { 
    // Optimize WebSocket for low latency
    perMessageDeflate: false,     // Disable compression for real-time audio
    maxPayload: 64 * 1024,        // Larger payload size (64KB)
    handshakeTimeout: 5000,       // 5 seconds
    clientTracking: false,        // Disable client tracking for better performance
    clientNoContextTakeover: true, // Disable context takeover on client
    serverNoContextTakeover: true  // Disable context takeover on server
  }
});
server.register(fastifyFormBody);

// Register API middleware for standardized responses and error handling
registerApiMiddleware(server);

// Register outbound calling routes - pass option to skip call status callback
registerOutboundRoutes(server, { skipCallStatusCallback: true });

// Register additional API routes for frontend integration
registerApiRoutes(server, twilioClient, activeCalls);

// Share the active calls map with handlers
setActiveCallsReference(activeCalls);
enhancedCallHandler.setActiveCallsReference(activeCalls);
enhancedCallHandler.setTwilioClientReference(twilioClient);
recordingHandler.setActiveCallsReference(activeCalls);
recordingHandler.setTwilioClientReference(twilioClient);
callQualityMetrics.setActiveCallsReference(activeCalls);
callQualityMetrics.setTwilioClientReference(twilioClient);

// Start the call monitoring heartbeat
enhancedCallHandler.startCallMonitoringHeartbeat(5000); // Check every 5 seconds

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

// Simple debug webhook that just logs and returns success
server.post('/webhooks/elevenlabs-debug', (request, reply) => {
  console.log('[Webhook Debug] Received webhook with headers:', JSON.stringify(request.headers, null, 2));
  
  // Log a truncated version of the body to avoid huge logs
  const bodyStr = JSON.stringify(request.body, null, 2);
  console.log('[Webhook Debug] Request body (truncated):', bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr);
  
  // Always return success
  return reply.code(200).send({ status: 'success', message: 'Webhook received and logged' });
});

// Main webhook handler - refactored to use the centralized handler
server.post('/webhooks/elevenlabs', async (request, reply) => {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    // CRM endpoint URL
    const crmEndpoint = process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is';
    
    console.log('[Webhook] Received ElevenLabs webhook');
    
    // Process the webhook using the centralized handler
    const result = await handleElevenLabsWebhook(
      request, 
      webhookSecret, 
      crmEndpoint,
      twilioClient // Pass Twilio client for call control
    );
    
    // Always return 200 status code to ElevenLabs (even for errors)
    // to prevent webhook disabling
    return reply.code(200).send(result);

  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    // Always return 200 to ElevenLabs to prevent disabling the webhook
    return reply.code(200).send({
      status: 'error',
      message: error.message
    });
  }
});

// Fallback TwiML endpoint for error handling
server.all('/fallback-twiml', async (request, reply) => {
  const { CallSid, ErrorCode } = request.body;
  
  console.log(`[Fallback] Received fallback for call ${CallSid}, error code: ${ErrorCode}`);
  
  // Create a simple TwiML response that will gracefully end the call
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>We're sorry, but there was a problem connecting your call. Please try again later.</Say>
      <Hangup/>
    </Response>`;
  
  // Log the error for diagnostics
  if (activeCalls.has(CallSid)) {
    const callInfo = activeCalls.get(CallSid);
    callInfo.errorCode = ErrorCode;
    callInfo.status = 'failed';
    callInfo.endTime = new Date();
    callInfo.error = 'Call failed and routed to fallback URL';
    activeCalls.set(CallSid, callInfo);

    // Emit call status change via Socket.IO
    handleCallStatusChange(CallSid, 'failed', callInfo);
  }
  
  return reply.type("text/xml").send(twimlResponse);
});

// Add new enhanced recording status callback endpoint
server.post('/recording-status-callback', async (request, reply) => {
  try {
    console.log('[Recording] Received recording status callback');
    console.log('[Recording] Event:', request.body.RecordingStatus);
    
    // Process the recording callback
    const result = recordingHandler.processRecordingCallback(request.body);
    
    // Emit recording update via Socket.IO if applicable
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'recording_update', {
        recordingStatus: request.body.RecordingStatus,
        recordingSid: request.body.RecordingSid,
        ...result
      });
    }
    
    // Always return success to Twilio
    return reply.code(200).send({
      success: true,
      message: 'Recording status update received',
      ...result
    });
  } catch (error) {
    console.error('[Recording] Error processing recording callback:', error);
    return reply.code(200).send({
      success: true, // Always return success to Twilio
      status: 'error',
      message: error.message
    });
  }
});

// Add new answering machine detection callback endpoint
server.post('/amd-status-callback', async (request, reply) => {
  try {
    console.log('[AMD] Received answering machine detection callback');
    
    // Extract AMD data
    const { 
      CallSid, 
      AnsweredBy, 
      CallStatus, 
      MachineBehavior, 
      Timestamp,
      From,
      To,
      Direction,
      FromCountry,
      ToCountry
    } = request.body;
    
    console.log(`[AMD] Call ${CallSid} answered by: ${AnsweredBy}, status: ${CallStatus}`);
    console.log(`[AMD] Machine behavior: ${MachineBehavior}`);
    
    // Store complete AMD data
    const amdData = {
      CallSid,
      AnsweredBy,
      MachineBehavior,
      CallStatus,
      Timestamp: Timestamp || new Date().toISOString(),
      From,
      To,
      Direction,
      FromCountry,
      ToCountry
    };
    
    // Process machine detection results using the enhanced handler
    enhancedCallHandler.processMachineDetection(amdData);
    
    // Emit AMD update via Socket.IO
    emitCallUpdate(CallSid, 'machine_detection', {
      answeredBy: AnsweredBy,
      machineBehavior: MachineBehavior,
      status: CallStatus
    });
    
    // Take specific actions based on answeredBy value
    if (AnsweredBy === 'machine_start' || AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_silence') {
      console.log(`[AMD] Call ${CallSid} detected as answering machine`);
      
      // If you want to handle answering machines differently, you can add custom handling here
      // For example, leaving a voicemail message for answering machines
      // Or terminating calls to answering machines
      
      // Uncomment to terminate calls to answering machines:
      // if (twilioClient) {
      //   console.log(`[AMD] Terminating call ${CallSid} to answering machine`);
      //   await twilioClient.calls(CallSid).update({ status: 'completed' });
      // }
    } else if (AnsweredBy === 'human') {
      console.log(`[AMD] Call ${CallSid} answered by human`);
      // Continue with normal call flow
    } else if (AnsweredBy === 'fax' || AnsweredBy === 'unknown') {
      console.log(`[AMD] Call ${CallSid} answered by ${AnsweredBy} - considering termination`);
      // Consider terminating calls to fax machines or unknown answerers
      // Uncomment to enable:
      // if (twilioClient) {
      //   console.log(`[AMD] Terminating call ${CallSid} to ${AnsweredBy}`);
      //   await twilioClient.calls(CallSid).update({ status: 'completed' });
      // }
    }
    
    // Always return success to Twilio
    return reply.code(200).send({
      success: true,
      message: 'AMD status update received',
      answeredBy: AnsweredBy,
      callSid: CallSid
    });
  } catch (error) {
    console.error('[AMD] Error processing AMD callback:', error);
    return reply.code(200).send({
      success: true, // Always return success to Twilio
      status: 'error',
      message: error.message
    });
  }
});

// Enhanced call status callback
server.post('/call-status-callback', async (request, reply) => {
  try {
    const { CallSid, CallStatus, RecordingUrl, RecordingSid } = request.body;
    
    console.log(`[Twilio Callback] Call ${CallSid} status: ${CallStatus}`);
    
    // Store call information
    if (!activeCalls.has(CallSid)) {
      const callInfo = {
        sid: CallSid,
        status: CallStatus,
        startTime: new Date(),
        recordings: [],
        from: request.body.From || 'unknown',
        to: request.body.To || 'unknown'
      };
      
      activeCalls.set(CallSid, callInfo);
      
      // Emit new call event via Socket.IO
      handleCallStatusChange(CallSid, CallStatus, callInfo);
      
    } else {
      const callInfo = activeCalls.get(CallSid);
      const previousStatus = callInfo.status;
      callInfo.status = CallStatus;
      
      // If call completed, add end time
      if (CallStatus === 'completed') {
        callInfo.endTime = new Date();
        // Calculate duration if we have both start and end time
        if (callInfo.startTime) {
          const start = new Date(callInfo.startTime);
          const end = new Date(callInfo.endTime);
          callInfo.duration = Math.round((end - start) / 1000); // in seconds
        }
      }
      
      activeCalls.set(CallSid, callInfo);
      
      // Emit call status change via Socket.IO if status changed
      if (previousStatus !== CallStatus) {
        handleCallStatusChange(CallSid, CallStatus, callInfo);
      }
    }
    
    // Update call activity timestamp
    enhancedCallHandler.updateCallActivity(CallSid);
    
    // If we got a recording URL, process it
    if (RecordingUrl && RecordingSid) {
      recordingHandler.processRecordingCallback({
        ...request.body,
        RecordingUrl,
        RecordingSid,
        CallSid
      });
    }
    
    // Always return success to Twilio
    return reply.code(200).send({
      success: true,
      message: "Status update received"
    });
  } catch (error) {
    console.error('[Call Status] Error processing callback:', error);
    return reply.code(200).send({
      success: true, // Always return success to Twilio
      status: 'error',
      message: error.message
    });
  }
});

// Add callback endpoint for quality insights
server.post('/quality-insights-callback', async (request, reply) => {
  try {
    console.log('[Quality] Received call quality metrics callback');
    
    // Process quality metrics
    const result = callQualityMetrics.processQualityData(request.body);
    
    // Emit quality metrics update via Socket.IO if applicable
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'quality_update', {
        metrics: result.metrics
      });
    }
    
    // Always return success to Twilio
    return reply.code(200).send({
      success: true,
      message: 'Quality metrics received',
      ...result
    });
  } catch (error) {
    console.error('[Quality] Error processing metrics callback:', error);
    return reply.code(200).send({
      success: true, // Always return success to Twilio
      status: 'error',
      message: error.message
    });
  }
});

// Register API route for getting recording data for a call
server.get('/api/call/:callSid', async (request, reply) => {
  const { callSid } = request.params;
  
  try {
    // First check our local cache
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      return reply.send({
        success: true,
        data: { callInfo },
        timestamp: new Date().toISOString()
      });
    }
    
    // If not in cache and we have Twilio client, try to fetch from Twilio
    if (twilioClient) {
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
        
        return reply.send({
          success: true,
          data: { callInfo, source: 'twilio' },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        if (error.status === 404 || error.code === 20404) {
          return reply.code(404).send({
            success: false,
            error: {
              message: `Call not found: ${callSid}`,
              code: 'CALL_NOT_FOUND',
              details: { providedSid: callSid }
            },
            timestamp: new Date().toISOString()
          });
        }
        
        throw error;
      }
    }
    
    // If we don't have info or Twilio client
    return reply.code(404).send({
      success: false,
      error: {
        message: 'Call not found and no Twilio client available',
        code: 'CALL_NOT_FOUND',
        details: { providedSid: callSid, twilioClientAvailable: false }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[API] Error fetching call ${callSid}:`, error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Add Socket.IO route for real-time client-server communication
server.get('/socket.io', { websocket: true }, (connection, req) => {
  console.log('[WebSocket] Client connected via native WebSocket endpoint');
  
  connection.socket.on('message', message => {
    console.log('[WebSocket] Received message:', message.toString());
    
    // This is a simpler alternative to Socket.IO for basic WebSocket communication
    // Most clients should use the Socket.IO endpoint instead
    
    connection.socket.send(JSON.stringify({
      type: 'acknowledgment',
      message: 'Message received',
      timestamp: new Date().toISOString()
    }));
  });
  
  connection.socket.on('close', () => {
    console.log('[WebSocket] Client disconnected from native WebSocket endpoint');
  });
});

// Enhanced API endpoint to access recordings for a specific call
server.get('/api/calls/:callSid/recordings', async (request, reply) => {
  const { callSid } = request.params;
  
  try {
    // Use the recording handler to get recordings
    const result = await recordingHandler.getCallRecordings(callSid);
    
    if (result.success) {
      return reply.send({
        success: true,
        data: {
          callSid,
          recordingCount: result.recordings.length,
          recordings: result.recordings,
          fromCache: result.fromCache || false,
          fromTwilio: result.fromTwilio || false
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return reply.code(404).send({
        success: false,
        error: {
          message: result.error || 'No recordings found',
          code: 'RECORDINGS_NOT_FOUND',
          details: { callSid }
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`[API] Error fetching recordings for call ${callSid}:`, error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Add API endpoint for call quality metrics 
server.get('/api/calls/:callSid/metrics', async (request, reply) => {
  const { callSid } = request.params;
  
  try {
    // Use the call quality metrics handler to get metrics
    const result = await callQualityMetrics.getCallQualityMetrics(callSid);
    
    if (result.success) {
      return reply.send({
        success: true,
        data: {
          callSid,
          metrics: result.metrics,
          fromCache: result.fromCache || false,
          fromTwilio: result.fromTwilio || false
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return reply.code(404).send({
        success: false,
        error: {
          message: result.error || 'No metrics available',
          code: 'METRICS_NOT_FOUND',
          details: { callSid }
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`[API] Error fetching call metrics for ${callSid}:`, error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Add API endpoint for active calls list
server.get('/api/calls/active', async (request, reply) => {
  try {
    if (!activeCalls) {
      return reply.send({
        success: true,
        data: {
          calls: [],
          count: 0
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const activeCallsList = Array.from(activeCalls.entries())
      .filter(([_, call]) => ['initiated', 'ringing', 'in-progress'].includes(call.status))
      .map(([sid, call]) => ({
        sid,
        status: call.status,
        to: call.to || 'unknown',
        from: call.from || 'unknown',
        startTime: call.startTime,
        duration: call.duration || 0,
        answeredBy: call.answeredBy || 'unknown',
        recordingCount: call.recordings ? call.recordings.length : 0
      }));
    
    return reply.send({
      success: true,
      data: {
        calls: activeCallsList,
        count: activeCallsList.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching active calls:', error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Register email routes
server.post('/api/email/send', {
  handler: async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      
      // Validate auth header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ 
          success: false, 
          error: {
            message: 'Missing or invalid Authorization header',
            code: 'UNAUTHORIZED',
            details: null
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const apiKey = authHeader.split(' ')[1];
      if (apiKey !== process.env.EMAIL_API_KEY) {
        return reply.code(401).send({ 
          success: false, 
          error: {
            message: 'Invalid API key',
            code: 'UNAUTHORIZED',
            details: 'The provided authorization key is invalid'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate request body
      const { to_email, subject, content, customer_name } = request.body;
      
      if (!to_email || !subject || !content) {
        return reply.code(400).send({
          success: false,
          error: {
            message: 'Missing required fields',
            code: 'VALIDATION_ERROR',
            details: 'Email address, subject, and content are required'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        // First try the newer REST API implementation
        console.log('[API] Attempting to send email via Investor Signals API...');
        const result = await sendEmail({
          to_email,
          subject,
          content,
          customer_name
        });
        
        console.log('[API] Email sent successfully via Investor Signals API');
        return {
          success: true,
          data: {
            messageId: result.messageId
          },
          message: 'Email sent successfully',
          timestamp: new Date().toISOString()
        };
      } catch (apiError) {
        console.error('[API] Investor Signals API Error:', apiError.message);
        
        // Fall back to SES if the API fails
        try {
          console.log('[API] Falling back to AWS SES...');
          const sesResult = await sendSESEmail({
            to_email,
            subject,
            content,
            customer_name
          });
          
          console.log('[API] Email sent successfully via SES fallback');
          return {
            success: true,
            data: {
              messageId: sesResult.messageId,
              provider: 'aws-ses'
            },
            message: 'Email sent successfully (via SES fallback)',
            timestamp: new Date().toISOString()
          };
        } catch (sesError) {
          // Both methods failed
          console.error('[API] SES Email Error:', sesError.message);
          
          // Log details about what we tried to send
          console.log('\n=== FAILED EMAIL ATTEMPT ===');
          console.log(`To: ${to_email}`);
          console.log(`Subject: ${subject}`);
          console.log(`Customer: ${customer_name || 'Not provided'}`);
          console.log('==============================\n');
          
          // Return a proper error response
          return reply.code(500).send({
            success: false,
            error: {
              message: 'Email sending failed',
              code: 'EMAIL_DELIVERY_FAILED',
              details: {
                apiError: apiError.message,
                sesError: sesError.message,
                additionalInfo: 'There was an issue with all email services. Please contact support.'
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('[API] Unexpected error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          message: 'Server error',
          code: 'INTERNAL_ERROR',
          details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
        },
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Add health check endpoint
server.get('/api/email/health', async (request, reply) => {
  try {
    const diagnostics = {
      status: 'ok',
      service: 'email-service',
      serverVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      emailConfiguration: {
        primaryProvider: 'Investor Signals API',
        backupProvider: 'AWS SES',
        region: process.env.SES_REGION || 'ap-southeast-2',
        fromEmail: 'info@investorsignals.com', // API always uses this address
        fallbackEnabled: process.env.EMAIL_FALLBACK_ENABLED === 'true',
        apiKeyConfigured: !!process.env.EMAIL_API_KEY
      }
    };
    
    return reply.send({
      success: true,
      data: diagnostics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Health check error:', error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Add webhook health check endpoint
server.get('/webhooks/elevenlabs/health', async (request, reply) => {
  return reply.send({
    success: true,
    data: {
      status: 'ok',
      service: 'elevenlabs-webhook',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      configured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
      webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET ? 'configured' : 'not configured',
      crmEndpoint: process.env.CRM_WEBHOOK_URL || 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is'
    },
    timestamp: new Date().toISOString()
  });
});

// Enhanced API endpoint to manually terminate a call
server.post('/api/calls/:callSid/terminate', async (request, reply) => {
  const { callSid } = request.params;
  const { force = false, reason = 'api-request' } = request.body || {};
  
  try {
    // Verify API key for this sensitive operation
    const apiKey = process.env.API_KEY;
    const authHeader = request.headers.authorization;
    let isAuthorized = false;
    
    if (apiKey) {
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === apiKey) {
        isAuthorized = true;
      } else if (request.query.api_key && request.query.api_key === apiKey) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized && apiKey) {
      return reply.code(401).send({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
          details: 'Valid API key required for call termination'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Use the enhanced call handler to terminate the call
    const result = await enhancedCallHandler.terminateCall(callSid, { force, reason });
    
    // Emit call ended event via Socket.IO
    handleCallStatusChange(callSid, 'completed', { status: 'completed', endTime: new Date() });
    
    return reply.send({
      success: true,
      data: result,
      message: `Call ${callSid} terminated successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Check if this is already an ApiError
    if (error.name === 'ApiError') {
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: {
          message: error.message,
          code: error.errorCode || 'INTERNAL_ERROR',
          details: error.details || null
        },
        timestamp: new Date().toISOString()
      });
    }
    
    console.error(`[API] Error terminating call ${callSid}:`, error);
    return reply.code(500).send({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Root route
server.get('/', async (request, reply) => {
  const response = { 
    success: true,
    data: {
      status: 'Server is running (Enhanced Version with Socket.IO and API Security)',
      webhookConfigured: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
      twilioConfigured: !!twilioClient,
      socketIoEnabled: true,
      apiAuthentication: !!process.env.API_KEY,
      enhancedFeatures: {
        callMonitoring: true,
        callRecording: true,
        autoTermination: true,
        machineDetection: true,
        detailedCallMetrics: true,
        comprehensiveStatusTracking: true,
        realTimeUpdates: true,
        secureApiEndpoints: true,
        standardizedResponses: true
      },
      availableRoutes: [
        'GET /api/email/health',
        'POST /api/email/send',
        'POST /webhooks/elevenlabs',
        'POST /webhooks/elevenlabs-debug',
        'GET /api/call/:callSid',
        'GET /api/calls/:callSid/recordings',
        'GET /api/calls/:callSid/metrics',
        'GET /api/calls/active',
        'POST /api/calls/:callSid/terminate',
        'GET /api/call-stats',
        'GET /webhooks/elevenlabs/health',
        'POST /recording-status-callback',
        'POST /amd-status-callback',
        'POST /call-status-callback',
        'POST /quality-insights-callback',
        'POST /fallback-twiml',
        'WebSocket /socket.io'
      ]
    },
    version: '3.0.0',
    timestamp: new Date().toISOString()
  };
  
  return reply.send(response);
});

// Start the server
const start = async () => {
  try {
    // Use environment port (for Railway) or default to 8000
    const port = process.env.PORT || 8000;
    const host = '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`[Server] Enhanced server listening on port ${port}`);
    
    // Initialize Socket.IO server
    initializeSocketServer(server, activeCalls);
    console.log('[Server] Socket.IO server initialized for real-time call updates');
    
    console.log('[Server] Enhanced features activated:');
    console.log('  - Automatic call termination');
    console.log('  - Enhanced recording management');
    console.log('  - Call activity monitoring');
    console.log('  - Machine detection handling');
    console.log('  - Comprehensive call metric tracking');
    console.log('  - Fallback error handling');
    console.log('  - Call quality insights');
    console.log('  - Real-time updates via Socket.IO');
    console.log('  - Standardized API responses');
    console.log('  - API authentication for sensitive operations');
    
  } catch (err) {
    server.log.error(err);
    // Clean up heartbeat on error
    enhancedCallHandler.stopCallMonitoringHeartbeat();
    process.exit(1);
  }
};

// Handle graceful shutdown
function cleanup() {
  console.log('\n[Server] Shutting down...');
  enhancedCallHandler.stopCallMonitoringHeartbeat();
  process.exit(0);
}

// Listen for termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server when this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

// Export for testing or importing
export { server, start };
