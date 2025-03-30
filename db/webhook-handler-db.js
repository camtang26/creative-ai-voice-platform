/**
 * Enhanced Webhook Handler with MongoDB Integration
 * Processes webhooks from ElevenLabs and stores data in MongoDB
 */
import crypto from 'crypto';
import fetch from 'node-fetch';
import Twilio from 'twilio';
import { saveCall, updateCallStatus, getCallBySid } from './repositories/call.repository.js';
// Import the new function for saving full ElevenLabs data
import { createOrUpdateTranscriptFromElevenLabs } from './repositories/transcript.repository.js';
import { logEvent } from './repositories/callEvent.repository.js';
import { emitTranscriptUpdate, emitTranscriptMessage } from '../socket-server.js';

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
 * @param {Object|string} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @param {string} secret - Webhook secret
 * @returns {boolean} Whether the signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret) {
  try {
    if (!secret || !signature) {
      console.log('[Webhook] No secret or signature provided, skipping validation');
      return true; // Skip validation if no secret provided
    }
    
    // Extract timestamp and hash from the signature
    const [timestampPart, hashPart] = signature.split(',');
    const timestamp = timestampPart.replace('t=', '');
    const receivedHash = hashPart.replace('v0=', '');
    
    // Calculate the expected hash
    const fullPayloadToSign = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = 'v0=' + hmac.digest('hex');

    // --- START DEBUG LOGGING ---
    console.log(`[Webhook Verify] Timestamp: ${timestamp}`);
    console.log(`[Webhook Verify] Received Hash: v0=${receivedHash}`);
    console.log(`[Webhook Verify] Calculated Hash: ${calculatedHash}`);
    // Log start/end of payload string to check for subtle differences without logging secrets
    const payloadStart = fullPayloadToSign.substring(0, 50);
    const payloadEnd = fullPayloadToSign.substring(fullPayloadToSign.length - 50);
    console.log(`[Webhook Verify] Payload to Sign (Start): ${payloadStart}...`);
    console.log(`[Webhook Verify] Payload to Sign (End): ...${payloadEnd}`);
    // --- END DEBUG LOGGING ---
    
    // Verify the hash
    const isValid = receivedHash === calculatedHash.replace('v0=',''); // Ensure we compare hash values correctly
    if (!isValid) {
       console.warn(`[Webhook Verify] HASH MISMATCH! Received: v0=${receivedHash}, Calculated: ${calculatedHash}`);
    }
    return isValid;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

/**
 * Determine call status from webhook data
 * @param {Object} webhookData - Webhook data
 * @returns {string} Call status
 */
export function determineCallStatus(webhookData) {
  try {
    const { transcript, analysis } = webhookData.data || {};
    
    // If analysis has a call_successful field, use that
    if (analysis && analysis.call_successful) {
      return analysis.call_successful === 'success' ? 'held' : 'failed';
    }
    
    // If there are user messages in the transcript, the call was held
    if (transcript && transcript.some(msg => msg.role === 'user' && msg.message)) {
      return 'held';
    }
    
    // Check for voicemail or no answer
    const voicemailIndicators = ['voicemail', 'leave a message', 'after the tone'];
    const lastAgentMessage = transcript ? 
      transcript.filter(msg => msg.role === 'agent').pop()?.message : '';
    
    if (lastAgentMessage && 
        voicemailIndicators.some(indicator => 
          lastAgentMessage.toLowerCase().includes(indicator))) {
      return 'voicemail';
    }
    
    // If there are no user messages and it's not identified as voicemail, it's no answer
    return 'no-answer';
  } catch (error) {
    console.error('[Webhook] Error determining call status:', error);
    return 'unknown';
  }
}

/**
 * Extract name from conversation data
 * @param {Object} webhookData - Webhook data
 * @returns {string} Contact name
 */
export function extractName(webhookData) {
  try {
    // Try to get name from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.name) {
      return dynamicVars.name;
    }
    
    if (dynamicVars && dynamicVars.contact_name) {
      return dynamicVars.contact_name;
    }
    
    // Fall back to extracting name from transcript
    if (webhookData.data?.transcript) {
      // Look for greeting patterns like "Hello, John" in the agent messages
      for (const message of webhookData.data.transcript) {
        if (message.role === 'agent' && message.message) {
          // Simple regex to try to find names in greetings
          const nameMatch = message.message.match(/(?:hello|hi|hey|greetings)[,\s]+([a-zA-Z]+)/i);
          if (nameMatch && nameMatch[1]) {
            return nameMatch[1];
          }
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
 * @param {Object} webhookData - Webhook data
 * @returns {string} Phone number
 */
export function extractPhoneNumber(webhookData) {
  try {
    // Try to get phone from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.phone_number) {
      return dynamicVars.phone_number;
    }
    
    // If we don't have it, return unknown
    return 'Unknown';
  } catch (error) {
    console.error('[Webhook] Error extracting phone number:', error);
    return 'Unknown';
  }
}

/**
 * Extract conversation ID from webhook data
 * @param {Object} webhookData - Webhook data
 * @returns {string|null} Conversation ID
 */
export function extractConversationId(webhookData) {
  try {
    // Try to get conversation ID from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.conversation_id) {
      return dynamicVars.conversation_id;
    }
    
    // If not found, try to get it from the metadata
    if (webhookData.data?.metadata?.conversation_id) {
      return webhookData.data.metadata.conversation_id;
    }
    
    // If still not found, check for the conversation ID in the top level
    if (webhookData.conversation_id) {
      return webhookData.conversation_id;
    }
    
    return null;
  } catch (error) {
    console.error('[Webhook] Error extracting conversation ID:', error);
    return null;
  }
}

/**
 * Extract call SID from webhook data
 * @param {Object} webhookData - Webhook data
 * @returns {string|null} Call SID
 */
export function extractCallSid(webhookData) {
  try {
    // Try to get call SID from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.call_sid) {
      return dynamicVars.call_sid;
    }
    
    // If not found, try to get it from the metadata
    if (webhookData.data?.metadata?.call_sid) {
      return webhookData.data.metadata.call_sid;
    }
    
    // If we don't have it, return null
    return null;
  } catch (error) {
    console.error('[Webhook] Error extracting call SID:', error);
    return null;
  }
}

/**
 * Find call SID by conversation ID in active calls
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
    console.error(`[Webhook] Error terminating call ${callSid}:`, error);
    return false;
  }
}

/**
 * Process transcript data and store in MongoDB
 * @param {string} callSid - Call SID
 * @param {Object} webhookData - Webhook data
 * @returns {Promise<Object>} Processing result
 */
async function processTranscriptData(callSid, webhookData) {
 try {
   const conversationId = extractConversationId(webhookData);
   const apiKey = process.env.ELEVENLABS_API_KEY;

   if (!conversationId) {
     console.error(`[Webhook] Cannot process transcript for call ${callSid}: Missing conversationId in webhook data.`);
     throw new Error('Missing conversationId');
   }
   if (!apiKey) {
     console.error(`[Webhook] Cannot process transcript for call ${callSid}: Missing ELEVENLABS_API_KEY environment variable.`);
     throw new Error('Missing ElevenLabs API Key');
   }

   // --- Fetch Full Conversation Details from ElevenLabs API ---
   const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
   let elevenLabsFullData;
   try {
     console.log(`[Webhook] Fetching full conversation details from ElevenLabs for ${conversationId} (Call SID: ${callSid})`);
     const response = await fetch(elevenLabsUrl, {
       method: 'GET',
       headers: { 'xi-api-key': apiKey }
     });
     elevenLabsFullData = await response.json();

     if (!response.ok) {
       console.error(`[Webhook] ElevenLabs API error fetching conversation ${conversationId} (${response.status}):`, elevenLabsFullData);
       throw new Error(`ElevenLabs API error: ${response.status} - ${elevenLabsFullData?.detail?.message || 'Unknown error'}`);
     }
     console.log(`[Webhook] Successfully fetched full conversation details for ${conversationId}`);

   } catch (fetchError) {
     console.error(`[Webhook] Error fetching conversation details from ElevenLabs for ${conversationId}:`, fetchError);
     throw fetchError; // Propagate error
   }
   // --- End Fetch ---

   // --- Update Call Status in DB (using data from API response) ---
   // Determine status based on the fetched data (more reliable than webhook payload)
   const status = elevenLabsFullData.analysis?.call_successful === 'success' ? 'completed' :
                  (elevenLabsFullData.analysis?.call_successful === 'failure' ? 'failed' : 'unknown'); // Or derive more nuanced status if needed
   const duration = elevenLabsFullData.metadata?.call_duration_secs || 0;
   const name = extractName(webhookData); // Still rely on webhook for initial name/phone if needed
   const phoneNumber = extractPhoneNumber(webhookData);

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
      throw callUpdateError;
   }
   // --- End Call Update ---


   // --- Save Full Transcript/Analysis to DB ---
   let savedTranscript;
   try {
     // Use the new repository function with the full data fetched from the API
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
     throw transcriptError; // Make it fatal for now
   }
   // --- End Transcript Save ---

   // --- Optional: Send to CRM (using fetched data) ---
   // (Keep existing CRM logic but adapt it to use elevenLabsFullData if needed)
   // ... CRM logic here ...

   return {
     success: true,
     callSid,
     status: updatedCall.status, // Return the final status saved to DB
     conversationId,
     call: updatedCall,
     transcript: savedTranscript
   };

 } catch (error) {
   console.error(`[Webhook] Error processing transcript data for call ${callSid}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to handle webhooks with MongoDB integration
 * @param {Object} request - HTTP request
 * @param {string} secret - Webhook secret
 * @param {string} crmEndpoint - CRM endpoint URL
 * @param {Object} twilioClient - Twilio client
 * @returns {Promise<Object>} Processing result
 */
 export async function handleElevenLabsWebhook(request, secret, crmEndpoint, twilioClient = null) {
   try {
     // --- START DEBUG LOGGING ---
     console.log('[Webhook] Received request. Headers:', JSON.stringify(request.headers, null, 2));
     console.log('[Webhook] Received request. Body:', JSON.stringify(request.body, null, 2));
     // --- END DEBUG LOGGING ---

     // Get the signature header
     const signature = request.headers['elevenlabs-signature'];
     
     // Log the received webhook
     console.log('[Webhook] Processing webhook from ElevenLabs');
     console.log('[Webhook] Signature:', signature ? 'Present' : 'Missing');
     
     // Get the body
    const webhookData = request.body;
    
    // Verify the signature if a secret is provided
    if (secret && signature) {
      const isValid = verifyWebhookSignature(webhookData, signature, secret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return { success: false, error: 'Invalid signature' };
      }
      console.log('[Webhook] Signature verified successfully');
    } else {
      console.log('[Webhook] Skipping signature verification (no secret or signature)');
    }
    
    // Handle different webhook types
    const webhookType = webhookData.type || 'unknown';
    // --- START DEBUG LOGGING ---
    console.log(`[Webhook] Determined webhook type: ${webhookType}`);
    // --- END DEBUG LOGGING ---
    
    // Extract conversation ID and call SID - regardless of webhook type
    const conversationId = extractConversationId(webhookData);
    let callSid = extractCallSid(webhookData);
    
    // If we have a conversation ID but no call SID, try to find it in active calls
    if (conversationId && !callSid && activeCalls) {
      callSid = findCallSidByConversationId(conversationId);
      console.log(`[Webhook] Found call SID ${callSid} for conversation ID ${conversationId}`);
    }
    
    // If we have a call SID, update the call in MongoDB with conversation ID
    if (callSid && conversationId) {
      try {
        await updateCallStatus(callSid, null, { conversationId });
        console.log(`[Webhook] Updated call ${callSid} with conversation ID ${conversationId}`);
        
        // Log webhook event
        await logEvent(callSid, 'custom', {
          webhookType,
          conversationId,
          timestamp: new Date().toISOString()
        }, { source: 'elevenlabs' });
      } catch (error) {
        console.error(`[Webhook] Error updating call with conversation ID:`, error);
      }
    }
    
    // Special handling for conversation_completed events
    if (webhookType === 'conversation_completed') {
      console.log(`[Webhook] Conversation completed event received for conversation ${conversationId}`);
      
      // Log conversation completed event
      if (callSid) {
        await logEvent(callSid, 'status_change', {
          status: 'completed',
          reason: 'conversation_completed',
          conversationId,
          timestamp: new Date().toISOString()
        }, { source: 'elevenlabs' });
      }
      
      // If we have a call SID and Twilio client, terminate the call
      if (callSid && twilioClient) {
        await terminateCall(twilioClient, callSid);
      }
      
      return {
        success: true,
        message: 'Conversation completed event processed',
        conversationId,
        callSid
      };
    }
    
    // Skip if this is not a post-call transcription event
    if (webhookType !== 'post_call_transcription') {
      console.log(`[Webhook] Ignoring event type: ${webhookType}`);
      return { success: true, message: 'Event type ignored' };
    }
    
    // Process transcript data and update MongoDB
    if (callSid) {
      const processResult = await processTranscriptData(callSid, webhookData);
      
      // If processing was successful, forward to CRM endpoint
      if (processResult.success && crmEndpoint) {
        // Extract the required data
        const status = determineCallStatus(webhookData);
        const name = extractName(webhookData);
        const phoneNumber = extractPhoneNumber(webhookData);
        const summary = webhookData.data?.analysis?.transcript_summary || 'No summary available';
        const duration = webhookData.data?.metadata?.call_duration_secs || 0;
        
        // Get transcripts for enhanced data
        const transcripts = webhookData.data?.transcript || [];
        
        // Construct the payload for CRM endpoint
        const crmPayload = {
          "type": "conversationAICall",
          "subject": "Invitation to re-trial",
          "to": phoneNumber,
          "name": name,
          "summary": summary,
          "status": status,
          "duration": duration,
          "conversationId": conversationId,
          "callSid": callSid,
          // Add enhanced data
          "enhanced": {
            "messageCount": transcripts.length,
            "userMessageCount": transcripts.filter(msg => msg.role === 'user').length,
            "agentMessageCount": transcripts.filter(msg => msg.role === 'agent').length,
            "transcript": transcripts.map(msg => ({
              role: msg.role,
              message: msg.message,
              timestamp: msg.timestamp || null
            }))
          }
        };
        
        // If we have recording info for this call, include it
        if (callSid && activeCalls && activeCalls.has(callSid)) {
          const callInfo = activeCalls.get(callSid);
          if (callInfo.recordings && callInfo.recordings.length > 0) {
            crmPayload.enhanced.recordings = callInfo.recordings;
          }
        }
        
        console.log('[Webhook] Sending to CRM endpoint:', JSON.stringify(crmPayload, null, 2));
        
        try {
          // Send to CRM endpoint
          const response = await fetch(crmEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(crmPayload)
          });
          
          let responseText = '';
          try {
            responseText = await response.text();
          } catch (e) {
            responseText = 'No response body';
          }
          
          if (!response.ok) {
            console.error(`[Webhook] CRM endpoint error (${response.status}): ${responseText}`);
            return { 
              success: false, 
              error: 'CRM endpoint error', 
              status: response.status,
              details: responseText
            };
          }
          
          console.log('[Webhook] Successfully sent to CRM endpoint. Response:', responseText);
          
          return { 
            success: true, 
            message: 'Successfully processed webhook and sent to CRM',
            crmResponse: responseText,
            mongodbResult: processResult
          };
        } catch (fetchError) {
          console.error('[Webhook] Error sending to CRM endpoint:', fetchError);
          return {
            success: false,
            error: 'Failed to send to CRM endpoint',
            details: fetchError.message,
            mongodbResult: processResult
          };
        }
      }
      
      return processResult;
    }
    
    return {
      success: false,
      error: 'No call SID found for this webhook',
      conversationId
    };
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return { success: false, error: error.message };
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