/**
 * Enhanced Webhook Handler with MongoDB Integration
 * Processes webhooks from ElevenLabs and stores data in MongoDB
 */
import crypto from 'crypto';
import fetch from 'node-fetch';
import Twilio from 'twilio';
import { saveCall, updateCallStatus, getCallBySid } from './repositories/call.repository.js';
import { saveTranscript } from './repositories/transcript.repository.js';
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
    
    // Verify the hash
    return receivedHash === calculatedHash;
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
    const status = determineCallStatus(webhookData);
    const name = extractName(webhookData);
    const phoneNumber = extractPhoneNumber(webhookData);
    const summary = webhookData.data?.analysis?.transcript_summary || 'No summary available';
    const duration = webhookData.data?.metadata?.call_duration_secs || 0;
    const conversationId = extractConversationId(webhookData);
    
    // Get transcripts
    const transcripts = webhookData.data?.transcript || [];
    
    // Update call in MongoDB
    const callData = {
      callSid,
      conversationId,
      status: status === 'held' ? 'completed' : status,
      outcome: status,
      to: phoneNumber !== 'Unknown' ? phoneNumber : undefined,
      contactName: name !== 'Unknown' ? name : undefined,
      duration: duration > 0 ? duration : undefined,
      endTime: new Date()
    };
    
    // Update the call in MongoDB
    const updatedCall = await updateCallStatus(callSid, callData.status, callData);
    
    // Store transcript in MongoDB if we have transcript data
    if (transcripts.length > 0) {
      try {
        // Prepare transcript data according to the refined schema
        const analysisData = webhookData.data?.analysis || {};
        const transcriptData = {
          callSid,
          conversationId,
          messages: transcripts, // Renamed from transcript to messages for clarity
          analysis: {
            transcript_summary: analysisData.transcript_summary || summary, // Use extracted summary
            sentiment: analysisData.sentiment || determineSentiment(transcripts.map(m=>m.message).join(' ')), // Use analysis sentiment or calculate
            topics: analysisData.topics || extractTopics(transcripts.map(m=>m.message).join(' ')), // Use analysis topics or calculate
            callSuccessful: analysisData.call_successful === 'success',
            criteria: {
              // Map criteria results - adjust field names if different in webhook
              confused: analysisData.criteria?.confused || analysisData.confused || null,
              interested: analysisData.criteria?.interested || analysisData.interested || null,
              no_call_back: analysisData.criteria?.no_call_back || analysisData.no_call_back || null,
            },
            customFields: analysisData.custom_fields || {}
          },
          // Keep raw data if needed for debugging, otherwise remove
          // data: webhookData.data
        };
        // Save transcript to MongoDB
        const savedTranscript = await saveTranscript(transcriptData);
        console.log(`[MongoDB] Saved transcript for call ${callSid}`);
        
        // Log transcript event
        await logEvent(callSid, 'transcript', {
          transcriptId: savedTranscript._id,
          summary: summary,
          messageCount: transcripts.length,
          userMessageCount: transcripts.filter(msg => msg.role === 'user').length,
          agentMessageCount: transcripts.filter(msg => msg.role === 'agent').length,
          sentiment: savedTranscript.analysis?.sentiment || 'neutral',
          topics: savedTranscript.analysis?.topics || []
        }, { source: 'elevenlabs' });
        
        // Emit transcript update via Socket.IO
        emitTranscriptUpdate(callSid, savedTranscript); // Emit the final, complete transcript
        
        // REMOVED: Redundant emission of individual messages and logging
        // Real-time messages are now handled by webSocketService.js
        
        return {
          success: true,
          callSid,
          status,
          conversationId,
          call: updatedCall,
          transcript: savedTranscript
        };
      } catch (transcriptError) {
        console.error('[MongoDB] Error saving transcript:', transcriptError);
        // Continue even if transcript saving fails
      }
    }
    
    return {
      success: true,
      callSid,
      status,
      conversationId,
      call: updatedCall
    };
  } catch (error) {
    console.error('[Webhook] Error processing transcript data:', error);
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