/**
 * Enhanced Webhook Handler with MongoDB Integration
 * Processes webhooks from ElevenLabs and stores data in MongoDB
 */
import crypto from 'crypto';
import fetch from 'node-fetch';
import getRawBody from 'raw-body'; // Import raw-body
import Twilio from 'twilio';
import { saveCall, updateCallStatus, getCallBySid } from './repositories/call.repository.js';
// Import the new function for saving full ElevenLabs data
import { createOrUpdateTranscriptFromElevenLabs } from './repositories/transcript.repository.js';
import { logEvent } from './repositories/callEvent.repository.js';
import { emitTranscriptUpdate, emitTranscriptMessage } from '../socket-server.js';
import mongoose from 'mongoose'; // Import mongoose for error checking

// Reference to the active calls map (will be kept for backward compatibility)
let activeCalls = null;

/**
 * Set the activeCalls reference for data sharing between modules
 * @param {Map} callsMap - Map of active calls
 */
export function setActiveCallsReference(callsMap) {
  activeCalls = callsMap;
}

/**
 * Verify the webhook signature from ElevenLabs
 * @param {Object|string|null} payload - Parsed payload (can be null if verification uses raw body)
 * @param {string} signature - Webhook signature header (e.g., "t=17...,v0=...")
 * @param {string} secret - Webhook secret
 * @param {string} secret - Webhook secret
 * @param {string} rawBodyString - The raw request body as a string.
 * @returns {boolean} Whether the signature is valid
 */
 // Accepts rawBodyString, removed request param, made synchronous
 export function verifyWebhookSignature(payload, signature, secret, rawBodyString) { // Changed params, removed async
   try {
     if (!secret || !signature) {
       console.log('[Webhook] No secret or signature provided, skipping validation');
      return true; // Skip validation if no secret provided
    }

    // Extract timestamp and hash from the signature
    const parts = signature.split(',');
    if (parts.length < 2) {
        console.error('[Webhook Verify] Invalid signature format:', signature);
        return false;
    }
    const timestampPart = parts.find(part => part.startsWith('t='));
    const hashPart = parts.find(part => part.startsWith('v0='));

    if (!timestampPart || !hashPart) {
        console.error('[Webhook Verify] Could not extract timestamp or hash from signature:', signature);
        return false;
    }

    const timestamp = timestampPart.replace('t=', '');
    const receivedHash = hashPart.replace('v0=', '');

    // --- Removed internal raw body reading ---

    // Calculate the expected hash using the provided RAW body string
    // Ensure rawBodyString is provided (it should be, as it's read in the handler now)
    if (rawBodyString === undefined || rawBodyString === null) {
       console.error('[Webhook Verify] CRITICAL: rawBodyString was not provided to verifyWebhookSignature.');
       return false; // Fail verification if raw body is missing
    }
    const fullPayloadToSign = `${timestamp}.${rawBodyString}`; // Use the parameter directly
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = hmac.digest('hex'); // Get just the hex hash

    // --- START DEBUG LOGGING ---
    console.log(`[Webhook Verify] Timestamp: ${timestamp}`);
    console.log(`[Webhook Verify] Received Hash: ${receivedHash}`);
    console.log(`[Webhook Verify] Calculated Hash: ${calculatedHash}`);
    // Log start/end of payload string to check for subtle differences without logging secrets
    const payloadStart = fullPayloadToSign.substring(0, 50);
    const payloadEnd = fullPayloadToSign.substring(fullPayloadToSign.length - 50);
    console.log(`[Webhook Verify] Payload to Sign (Start): ${payloadStart}...`);
    console.log(`[Webhook Verify] Payload to Sign (End): ...${payloadEnd}`);
    // --- END DEBUG LOGGING ---

    // Compare the hashes
    const isValid = crypto.timingSafeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(calculatedHash, 'hex'));
    if (!isValid) {
       console.warn(`[Webhook Verify] HASH MISMATCH! Received: ${receivedHash}, Calculated: ${calculatedHash}`);
    }
    return isValid;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

/**
 * Determine call status from webhook data (or API response data)
 * @param {Object} data - Webhook data.data or API response data
 * @returns {string} Call status
 */
export function determineCallStatus(data) {
  try {
    const { transcript, analysis } = data || {};

    // If analysis has a call_successful field, use that
    if (analysis && analysis.call_successful) {
      // Map to your application's status terms if needed
      return analysis.call_successful === 'success' ? 'completed' : 'failed';
    }

    // If there are user messages in the transcript, assume completed (held)
    if (transcript && transcript.some(msg => msg.role === 'user' && msg.message)) {
      return 'completed'; // Or 'held' if you have that status
    }

    // Check for voicemail indicators in the last agent message
    const voicemailIndicators = ['voicemail', 'leave a message', 'after the tone'];
    const lastAgentMessage = transcript ?
      transcript.filter(msg => msg.role === 'agent').pop()?.message : '';

    if (lastAgentMessage &&
        voicemailIndicators.some(indicator =>
          lastAgentMessage.toLowerCase().includes(indicator))) {
      return 'voicemail';
    }

    // If no user messages and not voicemail, assume no answer
    return 'no-answer';
  } catch (error) {
    console.error('[Webhook] Error determining call status:', error);
    return 'unknown';
  }
}

/**
 * Extract name from conversation data
 * @param {Object} data - Webhook data.data or API response data
 * @returns {string} Contact name
 */
export function extractName(data) {
  try {
    // Try to get name from dynamic variables (might be in metadata now)
    const dynamicVars = data?.metadata?.conversation_initiation_client_data?.dynamic_variables ||
                        data?.conversation_initiation_client_data?.dynamic_variables; // Fallback
    if (dynamicVars?.name) return dynamicVars.name;
    if (dynamicVars?.contact_name) return dynamicVars.contact_name;

    // Fallback to extracting name from transcript (less reliable)
    if (data?.transcript) {
      for (const message of data.transcript) {
        if (message.role === 'agent' && message.message) {
          const nameMatch = message.message.match(/(?:hello|hi|hey|greetings)[,\s]+([a-zA-Z]+)/i);
          if (nameMatch?.[1]) return nameMatch[1];
        }
      }
    }
    return 'Unknown';
  } catch (error) {
    console.error('[Webhook] Error extracting name:', error);
    return 'Unknown';
  }
}

/**
 * Extract phone number from conversation data
 * @param {Object} data - Webhook data.data or API response data
 * @returns {string} Phone number
 */
export function extractPhoneNumber(data) {
  try {
    // Try to get phone from dynamic variables (might be in metadata now)
     const dynamicVars = data?.metadata?.conversation_initiation_client_data?.dynamic_variables ||
                         data?.conversation_initiation_client_data?.dynamic_variables; // Fallback
    if (dynamicVars?.phone_number) return dynamicVars.phone_number;

    return 'Unknown';
  } catch (error) {
    console.error('[Webhook] Error extracting phone number:', error);
    return 'Unknown';
  }
}

/**
 * Extract conversation ID from webhook data or API response data
 * @param {Object} data - Webhook data or API response data
 * @returns {string|null} Conversation ID
 */
export function extractConversationId(data) {
  try {
    if (data?.conversation_id) return data.conversation_id; // Top level
    if (data?.data?.conversation_id) return data.data.conversation_id; // Nested under data
    if (data?.metadata?.conversation_id) return data.metadata.conversation_id; // Nested under metadata
    const dynamicVars = data?.metadata?.conversation_initiation_client_data?.dynamic_variables ||
                        data?.data?.conversation_initiation_client_data?.dynamic_variables; // Nested under data.metadata
    if (dynamicVars?.conversation_id) return dynamicVars.conversation_id;

    return null;
  } catch (error) {
    console.error('[Webhook] Error extracting conversation ID:', error);
    return null;
  }
}

/**
 * Extract call SID from webhook data or API response data
 * @param {Object} data - Webhook data or API response data
 * @returns {string|null} Call SID
 */
export function extractCallSid(data) {
  try {
    if (data?.callSid) return data.callSid; // If passed directly
    if (data?.CallSid) return data.CallSid; // Twilio format
    if (data?.data?.metadata?.call_sid) return data.data.metadata.call_sid; // Nested under data.metadata
    const dynamicVars = data?.metadata?.conversation_initiation_client_data?.dynamic_variables ||
                        data?.data?.conversation_initiation_client_data?.dynamic_variables; // Nested under data.metadata
    if (dynamicVars?.call_sid) return dynamicVars.call_sid;

    return null;
  } catch (error) {
    console.error('[Webhook] Error extracting call SID:', error);
    return null;
  }
}


/**
 * Find call SID by conversation ID in active calls map
 * @param {string} conversationId - Conversation ID
 * @returns {string|null} Call SID
 */
function findCallSidByConversationId(conversationId) {
  if (!activeCalls || !conversationId) return null;
  for (const [callSid, callInfo] of activeCalls.entries()) {
    if (callInfo.conversation_id === conversationId || callInfo.conversationId === conversationId) {
      return callSid;
    }
  }
  return null;
}

/**
 * Terminate a call via Twilio API
 * @param {Object} twilioClient - Twilio client
 * @param {string} callSid - Call SID
 * @returns {Promise<boolean>} Whether the call was terminated
 */
export async function terminateCall(twilioClient, callSid) {
  try {
    console.log(`[Webhook] Terminating call ${callSid} after conversation completion`);
    await twilioClient.calls(callSid).update({ status: 'completed' });

    // Update call status in MongoDB
    await updateCallStatus(callSid, 'completed', {
      endTime: new Date(),
      terminatedBy: 'conversation_completed'
    });

    // Log call termination event
    await logEvent(callSid, 'status_change', {
      status: 'completed',
      reason: 'terminated_by_system',
      terminatedBy: 'conversation_completed',
      timestamp: new Date().toISOString()
    }, { source: 'system' });

    return true;
  } catch (error) {
    // Ignore 404 errors if call already ended
    if (error.status === 404 || error.code === 20404) {
        console.warn(`[Webhook] Call ${callSid} already ended, cannot terminate again.`);
        return true; // Consider it successful if already ended
    }
    console.error(`[Webhook] Error terminating call ${callSid}:`, error);
    return false;
  }
}

/**
 * Process final call data after completion: Fetch from ElevenLabs API and save to DB.
 * @param {string} callSid - Call SID
 * @param {string} conversationId - ElevenLabs Conversation ID
 * @returns {Promise<Object>} Processing result with { success, call?, transcript?, error? }
 */
async function processFinalCallData(callSid, conversationId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error(`[Webhook Process] Cannot process final data for call ${callSid}: Missing ELEVENLABS_API_KEY.`);
    return { success: false, error: 'Missing ElevenLabs API Key' };
  }
  if (!callSid || !conversationId) {
     console.error(`[Webhook Process] Cannot process final data: Missing callSid (${callSid}) or conversationId (${conversationId}).`);
     return { success: false, error: 'Missing callSid or conversationId' };
  }

  // --- Fetch Full Conversation Details from ElevenLabs API ---
  const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
  let elevenLabsFullData;
  try {
    console.log(`[Webhook Process] Fetching full conversation details from ElevenLabs for ${conversationId} (Call SID: ${callSid})`);
    const response = await fetch(elevenLabsUrl, {
      method: 'GET',
      headers: { 'xi-api-key': apiKey }
    });
    elevenLabsFullData = await response.json();

    if (!response.ok) {
      console.error(`[Webhook Process] ElevenLabs API error fetching conversation ${conversationId} (${response.status}):`, elevenLabsFullData);
      throw new Error(`ElevenLabs API error: ${response.status} - ${elevenLabsFullData?.detail?.message || 'Unknown error'}`);
    }
    console.log(`[Webhook Process] Successfully fetched full conversation details for ${conversationId}`);

  } catch (fetchError) {
    console.error(`[Webhook Process] Error fetching conversation details from ElevenLabs for ${conversationId}:`, fetchError);
    return { success: false, error: `Failed to fetch from ElevenLabs: ${fetchError.message}` };
  }
  // --- End Fetch ---

  // --- Update Call Status in DB (using data from API response) ---
  const status = determineCallStatus(elevenLabsFullData); // Use helper on API data
  const duration = elevenLabsFullData.metadata?.call_duration_secs || 0;
  // Extract name/phone from metadata if available, otherwise might need fallback
  const name = extractName(elevenLabsFullData);
  const phoneNumber = extractPhoneNumber(elevenLabsFullData);

  const callData = {
    callSid,
    conversationId, // Ensure this is saved
    status: status, // Use status derived from API response
    outcome: status, // Use the same derived status for outcome
    to: phoneNumber !== 'Unknown' ? phoneNumber : undefined,
    contactName: name !== 'Unknown' ? name : undefined,
    duration: duration > 0 ? duration : undefined,
    endTime: new Date() // Mark end time when processing
  };

  let updatedCall;
  try {
    updatedCall = await updateCallStatus(callSid, callData.status, callData);
    console.log(`[MongoDB] Updated call status for ${callSid} based on ElevenLabs API data.`);
  } catch (callUpdateError) {
     console.error(`[MongoDB] Error updating call status for ${callSid}:`, callUpdateError);
     // Decide if we should continue or throw
     return { success: false, error: `Failed to update call status: ${callUpdateError.message}` };
  }
  // --- End Call Update ---

  // --- Save Full Transcript/Analysis to DB ---
  let savedTranscript;
  try {
    // Use the repository function with the full data fetched from the API
    savedTranscript = await createOrUpdateTranscriptFromElevenLabs(callSid, elevenLabsFullData);
    console.log(`[MongoDB] Saved/Updated transcript from ElevenLabs API for call ${callSid}`);

    // Log transcript event (using data from the saved document)
    await logEvent(callSid, 'transcript_saved', {
      transcriptId: savedTranscript._id,
      conversationId: savedTranscript.conversationId,
      status: savedTranscript.status,
      analysisStatus: savedTranscript.analysis?.call_successful || 'unknown',
      messageCount: savedTranscript.transcript?.length || 0,
    }, { source: 'elevenlabs_api' });

    // Emit transcript update via Socket.IO using the saved data
    emitTranscriptUpdate(callSid, savedTranscript);

  } catch (transcriptError) {
    console.error(`[MongoDB] Error saving transcript from ElevenLabs API for call ${callSid}:`, transcriptError);
    // Decide if this is fatal or if we can return partial success
    return { success: false, error: `Failed to save transcript: ${transcriptError.message}`, call: updatedCall };
  }
  // --- End Transcript Save ---

  return {
    success: true,
    callSid,
    status: updatedCall.status, // Return the final status saved to DB
    conversationId,
    call: updatedCall,
    transcript: savedTranscript
  };
}


/**
 * Main function to handle webhooks with MongoDB integration
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 * @param {string} secret - Webhook secret
 * @param {string} crmEndpoint - CRM endpoint URL
 * @param {Object} twilioClient - Twilio client
 * @returns {Promise<void>} Sends response via reply object
 */
 export async function handleElevenLabsWebhook(request, reply, secret, crmEndpoint, twilioClient = null) {
   let callSid = null; // Initialize callSid
   let conversationId = null; // Initialize conversationId
   let rawBodyString = ''; // Initialize rawBodyString
   try {
     // --- Read Raw Body FIRST (since disableBodyParser is true) ---
     try {
       rawBodyString = await getRawBody(request.raw, {
         length: request.headers['content-length'],
         limit: '5mb', // Match limit in verify function if needed
         encoding: 'utf-8'
       });
       console.log('[Webhook] Raw body read successfully in handler.');
     } catch (readError) {
       console.error('[Webhook] Failed to read raw body in handler:', readError);
       // Send 400 Bad Request if body cannot be read
       return reply.code(400).send({ success: false, error: 'Invalid request body (cannot read)' });
     }
     // --- End Raw Body Read ---
 
     // --- START DEBUG LOGGING ---
     console.log('[Webhook] Received request. Headers:', JSON.stringify(request.headers, null, 2));
     // --- END DEBUG LOGGING ---
 
     // --- Verify Signature ---
     const signature = request.headers['elevenlabs-signature'];
     console.log('[Webhook] Processing webhook from ElevenLabs');
     console.log('[Webhook] Signature:', signature ? 'Present' : 'Missing');
     if (secret && signature) {
       // Pass the rawBodyString read earlier to the verification function
       // Note: verifyWebhookSignature is now synchronous
       const isValid = verifyWebhookSignature(null, signature, secret, rawBodyString); // Pass rawBodyString, removed await
       if (!isValid) {
         console.error('[Webhook] Invalid signature');
         return reply.code(200).send({ success: false, error: 'Invalid signature' }); // Return 200 OK
       }
       console.log('[Webhook] Signature verified successfully');
     } else {
       console.log('[Webhook] Skipping signature verification (no secret or signature)');
     }
     // --- End Verification ---
 
     // --- Manually parse the rawBodyString AFTER verification ---
     let webhookData;
     try {
       webhookData = JSON.parse(rawBodyString);
       console.log('[Webhook] Raw body parsed successfully in handler.');
     } catch (parseError) {
       console.error('[Webhook] Failed to parse raw body JSON in handler:', parseError);
       // Send 400 Bad Request if JSON is invalid
       return reply.code(400).send({ success: false, error: 'Invalid request body (JSON parse failed)' });
     }
 
     if (!webhookData || typeof webhookData !== 'object') {
        console.error('[Webhook] Parsed webhook data is missing or not an object.');
        return reply.code(400).send({ success: false, error: 'Invalid webhook data structure' });
     }
     // --- End Manual Parse ---
     
     // Handle different webhook types using the parsed data
     const webhookType = webhookData.type || 'unknown';
     console.log(`[Webhook] Determined webhook type: ${webhookType}`);

     // Extract IDs early for logging/association
     conversationId = extractConversationId(webhookData);
     callSid = extractCallSid(webhookData);
     if (conversationId && !callSid && activeCalls) {
       callSid = findCallSidByConversationId(conversationId);
       console.log(`[Webhook] Found call SID ${callSid} for conversation ID ${conversationId} from active calls map.`);
     }

     // Update call with conversation ID if possible
     if (callSid && conversationId) {
       try {
         await updateCallStatus(callSid, null, { conversationId });
         console.log(`[Webhook] Updated call ${callSid} with conversation ID ${conversationId}`);
         await logEvent(callSid, 'custom', { webhookType, conversationId, timestamp: new Date().toISOString() }, { source: 'elevenlabs' });
       } catch (error) {
         console.error(`[Webhook] Error updating call ${callSid} with conversation ID:`, error);
       }
     } else {
        console.warn(`[Webhook] Could not associate webhook (Type: ${webhookType}, ConvID: ${conversationId}) with a Call SID.`);
     }

     // --- Handle Specific Webhook Types ---
     if (webhookType === 'conversation_completed' || webhookType === 'post_call_transcription') {
       console.log(`[Webhook] Processing ${webhookType} event for conversation ${conversationId}`);

       if (!callSid) {
          console.error(`[Webhook] Cannot process ${webhookType} for conversation ${conversationId}: Call SID is missing.`);
          // Still reply OK to ElevenLabs
          return reply.code(200).send({ success: false, error: 'Missing Call SID for completed conversation' });
       }

       // Log event
       await logEvent(callSid, 'status_change', {
         status: 'completed', // Assume completed for both events
         reason: webhookType,
         conversationId,
         timestamp: new Date().toISOString()
       }, { source: 'elevenlabs' });

       // Terminate Twilio call if still active
       if (twilioClient) {
         await terminateCall(twilioClient, callSid);
       }

       // Process final data (fetch from API, save transcript/analysis)
       const processResult = await processFinalCallData(callSid, conversationId);

       // Optional: Forward to CRM only after successful processing
       if (processResult.success && crmEndpoint && processResult.transcript) {
          // Construct CRM payload using processResult.call and processResult.transcript
          const crmPayload = { /* ... construct payload ... */ };
          console.log('[Webhook] Sending to CRM endpoint...');
          try {
             const crmResponse = await fetch(crmEndpoint, { /* ... fetch options ... */ });
             // ... handle CRM response ...
             console.log('[Webhook] Successfully sent to CRM endpoint.');
          } catch (crmError) {
             console.error('[Webhook] Error sending to CRM endpoint:', crmError);
             // Log error but don't fail the webhook response to ElevenLabs
          }
       } else if (!processResult.success) {
          console.error(`[Webhook] Failed to process final data for call ${callSid}: ${processResult.error}`);
          // Decide if this should be a 500 or still 200 OK to ElevenLabs
       }

       // Reply 200 OK to ElevenLabs regardless of CRM outcome, but reflect processing success
       return reply.code(200).send({
          success: processResult.success,
          message: processResult.success ? `${webhookType} processed successfully.` : `Error processing ${webhookType}: ${processResult.error}`,
          callSid: callSid,
          conversationId: conversationId
       });

     } else {
       console.log(`[Webhook] Ignoring event type: ${webhookType}`);
       return reply.code(200).send({ success: true, message: 'Event type ignored' });
     }

   } catch (error) {
     console.error('[Webhook] Unhandled processing error:', error);
     // Ensure reply is sent even on unexpected errors
     if (!reply.sent) {
        return reply.code(500).send({ success: false, error: `Internal server error: ${error.message}` });
     }
   }
 }

export default {
  handleElevenLabsWebhook,
  setActiveCallsReference,
  verifyWebhookSignature,
  determineCallStatus,
  extractName,
  extractPhoneNumber,
  extractConversationId,
  extractCallSid,
  terminateCall
};