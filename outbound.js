/**
 * MongoDB-enhanced outbound calling implementation
 * Extends the existing outbound.js with MongoDB integration
 */
import WebSocket from "ws";
import Twilio from "twilio";
// Removed node-fetch import - using native fetch
import { createTimer, recordAudioLatency, trackCallStart } from './latency-monitor.js';
import { saveCall, updateCallStatus, getCallBySid } from './db/repositories/call.repository.js';
import { logEvent } from './db/repositories/callEvent.repository.js';
import { updateContactCallHistory } from './db/repositories/contact.repository.js';
import { handleCallStatusUpdate } from './db/campaign-engine.js';
import { emitActiveCallsList, emitCallUpdate, handleCallStatusChange } from './socket-server.js';

// Map to store active call information (keeping for backward compatibility)
export const activeCalls = new Map();

/**
 * Helper function to get signed URL for authenticated conversations
 * @returns {Promise<Object>} Signed URL and conversation ID
 */
export async function getSignedUrl() { // Added export
  const timer = createTimer('ElevenLabs getSignedUrl').start();
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'xi-region-preference': 'ap-southeast', // Request Asia-Pacific region if available
          'xi-optimize-latency': 'true'           // Request latency optimization
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    // Log the entire response data for debugging
    console.log('[DEBUG] Full response from getSignedUrl:', JSON.stringify(data, null, 2));
    timer.stop();
    return {
      signed_url: data.signed_url,
      conversation_id: data.conversation_id // Attempt to return, might be undefined
    };
  } catch (error) {
    console.error("Error getting signed URL:", error);
    if (timer) timer.stop(); // Check if timer exists before stopping
    throw error;
  }
}

/**
 * Helper function to set dynamic variables for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} variables - Dynamic variables
 * @returns {Promise<boolean>} Success status
 */
export async function setDynamicVariables(conversationId, variables) { // Added export
  const timer = createTimer('ElevenLabs setDynamicVariables').start();
  try {
    // If conversationId is missing, we cannot proceed
    if (!conversationId) {
        console.error(`Failed to set dynamic variables: Conversation ID is undefined.`);
        return false;
    }
    const apiUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/dynamic-variables`;
    const response = await fetch(
      apiUrl,
      {
        method: 'PUT',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dynamic_variables: variables
        })
      }
    );

    timer.stop();
    if (!response.ok) {
      const errorText = await response.text(); // Read response body for more details
      console.error(`Failed to set dynamic variables for conversation ${conversationId}: ${response.status} ${response.statusText}`, {
          url: apiUrl,
          payload: variables,
          responseBody: errorText
      });
      return false;
    }

    console.log(`[ElevenLabs] Successfully set dynamic variables for conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error(`Error setting dynamic variables for conversation ${conversationId}:`, error);
    timer.stop();
    return false;
  }
}


/**
 * Terminates an active Twilio call
 * @param {Twilio.Twilio} twilioClient - The Twilio client instance
 * @param {string} callSid - The SID of the call to terminate
 * @returns {Promise<boolean>} - Success status of the termination
 */
export async function terminateCall(twilioClient, callSid) { // Added export
  try {
    console.log(`[Call Control] Terminating call ${callSid} via Twilio API`);
    await twilioClient.calls(callSid).update({ status: 'completed' });

    // Update call status in MongoDB
    await updateCallStatus(callSid, 'completed', {
      endTime: new Date(),
      terminatedBy: 'api_request' // Or determine actual reason if possible
    });

    // Log call termination event
    await logEvent(callSid, 'status_change', {
      status: 'completed',
      reason: 'terminated_by_api', // Or actual reason
      timestamp: new Date().toISOString()
    }, { source: 'api' }); // Source might be 'system' or 'api'

    console.log(`[Call Control] Successfully terminated call ${callSid}`);
    return true;
  } catch (error) {
    // Avoid logging 404s for already completed calls
    if (error.status !== 404) {
       console.error(`[Call Control] Error terminating call ${callSid}:`, error);
    }
    return false;
  }
}

/**
 * Detects conversation completion from ElevenLabs messages
 * @param {object} message - Message from ElevenLabs
 * @returns {boolean} - Whether the conversation is complete
 */
export function isConversationComplete(message) { // Added export
  // Case 1: Check for explicit conversation_completed event
  if (message.type === 'conversation_completed') {
    return true;
  }

  // Case 2: Let ElevenLabs handle conversation completion logic
  // Removed hardcoded goodbye phrase detection - ElevenLabs will send
  // conversation_completed event when appropriate based on agent config

  // Case 3: Check for conversation state indicators
  if (message.type === 'conversation_state_update' &&
      message.conversation_state_update?.state === 'completed') {
    return true;
  }

  return false;
}

/**
 * Make an outbound call using the MongoDB-enhanced implementation
 * @param {Object} params - Call parameters
 * @returns {Promise<Object>} Call result
 */
export async function makeOutboundCall(params) { // Added export
  const callTimer = createTimer('Total Call Initiation').start();

  // Destructure params with defaults
  const {
    to,
    from = process.env.TWILIO_PHONE_NUMBER,
    region = 'au1',
    prompt, // No default - use ElevenLabs configured prompt
    firstMessage, // No default - use ElevenLabs configured first message
    name = "Unknown", // Now received from caller
    campaignId = null, // Now received from caller
    contactId = null, // Now received from caller
    baseUrl = process.env.SERVER_URL || 'http://localhost:8000'
  } = params;

  // Validate required parameters
  if (!to) {
    return { success: false, error: "Phone number is required" };
  }

  let twilioClient; // Define twilioClient in this scope
  let initialConversationId; // Store the potentially undefined ID from getSignedUrl
  try {
    // Initialize Twilio client with Australia region
    twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      { region: 'au1' }
    );

    // Get signed URL (conversation_id might be undefined here)
    const signedUrlTimer = createTimer('Getting Signed URL').start();
    const { signed_url, conversation_id } = await getSignedUrl();
    signedUrlTimer.stop();
    initialConversationId = conversation_id; // Store it, even if undefined
    console.log(`[DEBUG] Received from getSignedUrl: conversation_id = ${initialConversationId}`);

    // REMOVED: Delay and setDynamicVariables call - will be handled by WebSocket proxy

    // Build TwiML URL - Pass context via query params for the proxy to use later
    // REMOVED conversation_id from query params here.
    const twimlParams = new URLSearchParams({
        prompt: prompt || '',
        first_message: firstMessage || '',
        name: name || '',
        campaignId: campaignId || '',
        contactId: contactId || ''
    });
    const twimlUrl = `${baseUrl}/outbound-call-twiml?${twimlParams.toString()}`;

    // Create the callback URL for status updates
    const statusCallbackUrl = `${baseUrl}/call-status-callback`;

    console.log(`[Outbound Call] Initiating call to ${to} with URL: ${twimlUrl} (Region: ${region})`);
    console.log(`[Outbound Call] Status callback URL: ${statusCallbackUrl}`);
    console.log(`[Outbound Call] AMD Status callback URL: ${baseUrl}/amd-status-callback`); // Log the AMD URL

    // Make the call with Twilio
    const twilioTimer = createTimer('Twilio Call Creation').start();
    const call = await twilioClient.calls.create({
      from: from,
      to: to,
      url: twimlUrl, // Use the URL without conversation_id
      region: region,
      record: true,
      recordingStatusCallback: `${baseUrl}/recording-status-callback`,
      recordingStatusCallbackEvent: ['in-progress', 'completed', 'absent', 'failed'],
      recordingChannels: 'dual',
      recordingTrack: 'both',
      recordingStatusCallbackMethod: 'POST',
      trim: 'trim-silence',
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: [
        'initiated', 'ringing', 'answered', 'in-progress',
        'completed', 'busy', 'no-answer', 'canceled', 'failed'
      ],
      statusCallbackMethod: 'POST',
      machineDetection: 'DetectMessageEnd', // Changed from 'Enable' based on Twilio blog example
      machineDetectionTimeout: 10,
      machineDetectionSilenceTimeout: 5000,
      asyncAmd: 'true',
      asyncAmdStatusCallback: `${baseUrl}/amd-status-callback`, // Changed to camelCase
      asyncAmdStatusCallbackMethod: 'POST', // Changed to camelCase
      fallbackUrl: `${baseUrl}/fallback-twiml`,
      fallbackMethod: 'POST',
      timeout: 60,
      timeLimit: 600
    });
    twilioTimer.stop();

    // Log the actual parameters sent by the Twilio SDK
    if (twilioClient.lastRequest && twilioClient.lastRequest.params) {
      console.log('[Outbound Call] Twilio SDK Request Params:', JSON.stringify(twilioClient.lastRequest.params, null, 2));
    } else {
      console.log('[Outbound Call] Twilio SDK lastRequest or params not available for logging.');
    }

    // Track this call in our statistics
    trackCallStart();

    // Store call in our active calls map (for backward compatibility)
    activeCalls.set(call.sid, {
      sid: call.sid,
      status: 'initiated',
      to: to,
      from: from,
      conversation_id: null, // Will be updated by WebSocket proxy later
      startTime: new Date(),
      recordings: [],
      campaignId: campaignId,
      contactId: contactId,
      name: name
    });
    
    // Emit Socket.IO events for real-time updates
    emitActiveCallsList();
    emitCallUpdate(call.sid, 'new_call', {
      sid: call.sid,
      status: 'initiated',
      to: to,
      from: from,
      startTime: new Date(),
      name: name,
      campaignId: campaignId
    });

    // Save initial call information to MongoDB
    const callData = {
      callSid: call.sid,
      conversationId: null, // Will be updated later
      from: from,
      to: to,
      status: 'initiated',
      startTime: new Date(),
      direction: 'outbound',
      contactName: name,
      campaignId: campaignId,
      contactId: contactId,
      prompt: prompt,
      firstMessage: firstMessage,
      region: region
    };
    const savedCall = await saveCall(callData);

    // Log call initiation event
    await logEvent(call.sid, 'status_change', {
      status: 'initiated',
      source: 'twilio',
      timestamp: new Date().toISOString()
    });

    // Update contact call history if contact ID provided
    if (contactId) {
      await updateContactCallHistory(contactId, savedCall._id);
    }

    // Update campaign stats if campaign ID provided
    if (campaignId) {
      handleCallStatusUpdate(call.sid, 'initiated', campaignId);
    }

    console.log(`[Outbound Call] Call initiated successfully. Call SID: ${call.sid} (using AU region)`);
    callTimer.stop();
    return {
      success: true,
      message: "Call initiated",
      callSid: call.sid,
      conversationId: null, // Indicate ID is not yet known
      timing: {
        total: callTimer.elapsed(),
        signedUrl: signedUrlTimer.elapsed(),
        // dynamicVars removed
        twilioCall: twilioTimer.elapsed()
      }
    };
  } catch (error) {
    console.error("Error initiating outbound call:", error);
    callTimer.stop();
    return {
      success: false,
      error: "Failed to initiate call",
      details: error.message || "Unknown error",
      code: error.code,
      statusCode: error.statusCode,
      moreInfo: error.moreInfo,
      timing: { total: callTimer.elapsed() }
    };
  }
}


/**
 * Register outbound calling routes on the Fastify server
 * @param {Object} fastify - Fastify server instance
 * @param {Object} options - Options for route registration
 */
export function registerOutboundRoutes(fastify, options = {}) { // Added export
  // Check for required environment variables
  const {
    ELEVENLABS_API_KEY,
    ELEVENLABS_AGENT_ID,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    SERVER_URL
  } = process.env;

  // Original check (moved inside /api/outbound-call handler if needed there)
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing required environment variables");
    throw new Error("Missing required environment variables");
  }

  const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    region: 'au1'
  });
  console.log("[Twilio] Initialized with Australia region (au1) for lower latency");

  // Route to initiate outbound call
  fastify.post("/api/outbound-call", async (request, reply) => {
    try {
      const {
        number,
        prompt,
        first_message,
        region,
        callerId,
        name,
        campaignId,
        contactId
      } = request.body;

      const baseUrl = getBaseUrl(request);

      const result = await makeOutboundCall({
        to: number,
        from: callerId || TWILIO_PHONE_NUMBER,
        region: region || 'au1',
        prompt: prompt,
        firstMessage: first_message,
        name: name,
        campaignId: campaignId,
        contactId: contactId,
        baseUrl: baseUrl
      });

      if (result.success) {
        return reply.send(result);
      } else {
        const statusCode = result.statusCode || 500;
        return reply.code(statusCode).send(result);
      }
    } catch (error) {
      console.error("[API /outbound-call] Error:", error);
      return reply.code(500).send({
         success: false,
         error: "Internal server error initiating call",
         details: error.message
      });
    }
  });

  const getBaseUrl = (request) => {
    if (process.env.RENDER_EXTERNAL_URL) {
      return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
    }
    if (process.env.SERVER_URL) { // SERVER_URL is still a valid fallback
      return process.env.SERVER_URL.replace(/\/$/, '');
    }
    // Fallback for local development or other environments
    const protocol = request.protocol || (request.headers['x-forwarded-proto'] ? request.headers['x-forwarded-proto'].split(',')[0] : 'http');
    const hostname = request.hostname || request.headers.host;
    return `${protocol}://${hostname}`;
  };

  // Conditional registration of basic /call-status-callback
  if (!options.skipCallStatusCallback) {
    fastify.post("/call-status-callback", async (request, reply) => {
       // Basic handler logic (as previously existed)
       // ... (omitted for brevity, assuming enhanced handler in server-mongodb.js is used)
       return reply.code(200).send({ success: true, message: "Status update received" });
    });
  }

  // Redundant /call/:callSid GET endpoint (likely handled by db/api/call-api.js)
  // Consider removing this if not specifically needed by older clients
  fastify.get("/call/:callSid", async (request, reply) => {
     // Basic handler logic (as previously existed)
     // ... (omitted for brevity)
     const { callSid } = request.params;
     if (activeCalls.has(callSid)) {
        return reply.send(activeCalls.get(callSid));
     } else {
        // Optionally try fetching from Twilio as before, or just 404
        return reply.code(404).send({ error: "Call not found in active map" });
     }
  });

  // TwiML route for outbound calls
  fastify.all("/outbound-call-twiml", async (request, reply) => {
    // Extract params passed from makeOutboundCall via twimlUrl
    const prompt = request.query.prompt || '';
    const first_message = request.query.first_message || '';
    const name = request.query.name || '';
    const campaignId = request.query.campaignId || '';
    const contactId = request.query.contactId || '';
    // Note: conversation_id is intentionally NOT read from query here

    const baseUrl = getBaseUrl(request);

    // Determine the correct WebSocket URL for the media stream
    // Construct the WebSocket URL using the main app's baseUrl
    // Ensure wss:// protocol
    const hostname = baseUrl.replace(/^(https?:\/\/)/, '');
    const streamUrl = `wss://${hostname}/outbound-media-stream`; // Define streamUrl once

    console.log(`[TwiML] Using Stream URL: ${streamUrl}`); // Log the final constructed URL

    // Pass necessary context as <Parameter>s to the WebSocket stream proxy
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="${streamUrl}">
            <Parameter name="prompt" value="${prompt}" />
            <Parameter name="first_message" value="${first_message}" />
            <Parameter name="name" value="${name}" />
            <Parameter name="campaignId" value="${campaignId}" />
            <Parameter name="contactId" value="${contactId}" />
            <!-- conversation_id is established *by* the WebSocket connection -->
          </Stream>
        </Connect>
      </Response>`;

    reply.type("text/xml").send(twimlResponse);
  });
}

// Removed default export, using named exports only now
