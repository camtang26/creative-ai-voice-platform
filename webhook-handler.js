import crypto from 'crypto';
import fetch from 'node-fetch';
import Twilio from 'twilio';
import { sendCallToCRM } from '../integrations/crm-webhook.js';
import {
  callRepository,
  campaignRepository,
  contactRepository,
  transcriptRepository
} from '../db/index.js';

// Reference to the active calls map from outbound.js (will be set by server.js)
let activeCalls = null;

// Set the activeCalls reference for data sharing between modules
export function setActiveCallsReference(callsMap) {
  activeCalls = callsMap;
}

// Helper function to verify the webhook signature from ElevenLabs
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
    
    // Verify the hash
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

// Helper function to determine call status
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
    return 'no answer';
  } catch (error) {
    console.error('[Webhook] Error determining call status:', error);
    return 'unknown';
  }
}

// Helper function to extract the name from conversation data
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

// Helper function to extract phone number from conversation data
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

// Extract the conversation ID from webhook data
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

// Extract call SID information from webhook data
export function extractCallSid(webhookData) {
  try {
    // Try to get call SID from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.call_sid) {
      return dynamicVars.call_sid;
    }
    
    // If we don't have it, return null
    return null;
  } catch (error) {
    console.error('[Webhook] Error extracting call SID:', error);
    return null;
  }
}

// Function to find call SID by conversation ID in active calls
function findCallSidByConversationId(conversationId) {
  if (!activeCalls || !conversationId) return null;
  
  for (const [callSid, callInfo] of activeCalls.entries()) {
    if (callInfo.conversation_id === conversationId) {
      return callSid;
    }
  }
  
  return null;
}

// Function to terminate a call via Twilio API
export async function terminateCall(twilioClient, callSid) {
  try {
    console.log(`[Webhook] Terminating call ${callSid} after conversation completion`);
    await twilioClient.calls(callSid).update({ status: 'completed' });
    return true;
  } catch (error) {
    console.error(`[Webhook] Error terminating call ${callSid}:`, error);
    return false;
  }
}

// Main function to handle webhooks
export async function handleElevenLabsWebhook(request, secret, crmEndpoint, twilioClient = null) {
  try {
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
    console.log(`[Webhook] Processing webhook type: ${webhookType}`);
    
    // Extract conversation ID and call SID - regardless of webhook type
    const conversationId = extractConversationId(webhookData);
    let callSid = extractCallSid(webhookData);
    
    // If we have a conversation ID but no call SID, try to find it in active calls
    if (conversationId && !callSid && activeCalls) {
      callSid = findCallSidByConversationId(conversationId);
      console.log(`[Webhook] Found call SID ${callSid} for conversation ID ${conversationId}`);
    }
    
    // Store additional information in call tracking map if needed
    if (callSid && activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      
      // Update with conversationId if we have it
      if (conversationId && !callInfo.conversation_id) {
        callInfo.conversation_id = conversationId;
        activeCalls.set(callSid, callInfo);
      }
    }
    
    // Special handling for conversation_completed events
    if (webhookType === 'conversation_completed') {
      console.log(`[Webhook] Conversation completed event received for conversation ${conversationId}`);
      
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
    
    // Extract key identifiers from the webhook
    const webhookSummary = webhookData.data?.analysis?.transcript_summary || 'No summary available';
    const webhookDuration = webhookData.data?.metadata?.call_duration_secs || 0;
    // Note: status, name, phoneNumber will be preferably fetched from our DB records.

    if (!callSid) {
      console.warn('[CRM Webhook] No callSid found in post_call_transcription webhook. Cannot reliably link to CRM.');
      return { success: false, error: 'Missing callSid for CRM webhook processing' };
    }

    try {
      // Fetch the full Call document
      const callDocument = await callRepository.getCallBySid(callSid);
      if (!callDocument) {
        console.error(`[CRM Webhook] Call document not found for callSid: ${callSid}`);
        return { success: false, error: `Call not found for callSid ${callSid}` };
      }

      // Fetch associated Campaign to get the subject
      let campaignName = "Outbound Call"; // Default subject
      if (callDocument.campaignId) {
        const campaignDocument = await campaignRepository.getCampaignById(callDocument.campaignId);
        if (campaignDocument) {
          campaignName = campaignDocument.name;
        }
      }
      
      // Fetch associated Contact (if contactId is on callDocument, or use phoneNumber to find)
      // For simplicity, we'll rely on callDocument.contactName or the extracted name for now.
      // A more robust solution might involve looking up contact by callDocument.to (phone number)
      // if callDocument.contactId is not populated.
      const contactName = callDocument.contactName || extractName(webhookData);
      const finalTo = callDocument.to || extractPhoneNumber(webhookData);

      const callDetailsForCRM = {
        subject: campaignName,
        to: finalTo,
        name: contactName,
        summary: webhookSummary, // Use summary from webhook as it's specific to this event
        status: callDocument.status || determineCallStatus(webhookData), // Prefer DB status
        duration: callDocument.duration || webhookDuration // Prefer DB duration
      };

      await sendCallToCRM(callDetailsForCRM);
      
      return {
        success: true,
        message: 'Successfully processed post_call_transcription and triggered CRM webhook'
      };

    } catch (dbError) {
      console.error(`[CRM Webhook] Error fetching data from DB for callSid ${callSid}:`, dbError);
      return {
        success: false,
        error: 'Database error during CRM webhook processing',
        details: dbError.message
      };
    }
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return { success: false, error: error.message };
  }
}
