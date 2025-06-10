/**
 * Twilio-based CRM Webhook Integration
 * 
 * This module handles sending call data to the CRM after Twilio call completion.
 * Attempts to fetch AI summaries from ElevenLabs API, with fallback to simple summaries.
 */
import fetch from 'node-fetch';
import { getCallBySid } from '../../db/repositories/call.repository.js';
import { getCampaignById } from '../../db/repositories/campaign.repository.js';
import { logEvent } from '../../db/repositories/callEvent.repository.js';

/**
 * Fetch conversation details from ElevenLabs API
 * @param {string} conversationId - ElevenLabs conversation ID
 * @param {number} retryCount - Number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<Object|null>} Conversation data with analysis or null
 */
async function fetchElevenLabsConversation(conversationId, retryCount = 3, retryDelay = 2000) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !conversationId) {
    console.log('[Twilio CRM] Missing API key or conversation ID for ElevenLabs fetch');
    return null;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`[Twilio CRM] Fetching ElevenLabs conversation (attempt ${attempt}/${retryCount})`);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: 'GET',
          headers: { 'xi-api-key': apiKey }
        }
      );

      if (!response.ok) {
        console.error(`[Twilio CRM] ElevenLabs API error (${response.status})`);
        if (attempt < retryCount) {
          console.log(`[Twilio CRM] Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        return null;
      }

      const data = await response.json();
      
      // Check if analysis is ready
      if (data.status === 'done' && data.analysis?.transcript_summary) {
        console.log('[Twilio CRM] Successfully fetched conversation with AI summary');
        return data;
      } else if (data.status === 'processing') {
        console.log('[Twilio CRM] Conversation still processing...');
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
      
      return data; // Return whatever we have
    } catch (error) {
      console.error(`[Twilio CRM] Error fetching from ElevenLabs (attempt ${attempt}):`, error.message);
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Generate a simple call summary based on call metadata
 * @param {Object} callData - Call information
 * @param {string} status - Call status
 * @param {number} duration - Call duration in seconds
 * @returns {string} Generated summary
 */
function generateCallSummary(callData, status, duration) {
  if (status === 'held' && duration > 0) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    return `Call completed successfully. Duration: ${durationText}. Contact: ${callData.contactName || 'Unknown'}.`;
  } else if (status === 'voicemail') {
    return `Call reached voicemail/answering machine.`;
  } else if (status === 'no answer') {
    return `Call was not answered.`;
  } else {
    return `Call could not be connected.`;
  }
}

/**
 * Send call data to CRM webhook after Twilio call completion
 * @param {string} callSid - Twilio call SID
 * @param {Object} twilioCallData - Call data from Twilio callback
 * @returns {Promise<Object>} Result of CRM webhook send
 */
export async function sendTwilioCallToCRM(callSid, twilioCallData = {}) {
  const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;
  const enableCrmWebhook = process.env.ENABLE_CRM_WEBHOOK === 'true';

  if (!enableCrmWebhook) {
    console.log('[Twilio CRM] CRM webhook is disabled');
    return { success: true, message: 'CRM webhook disabled' };
  }

  if (!crmWebhookUrl) {
    console.error('[Twilio CRM] CRM_WEBHOOK_URL not configured');
    return { success: false, error: 'CRM webhook URL not configured' };
  }

  try {
    console.log(`[Twilio CRM] Processing call ${callSid} for CRM webhook`);

    // 1. Get call data from MongoDB
    const callDocument = await getCallBySid(callSid);
    if (!callDocument) {
      console.error(`[Twilio CRM] Call not found in database: ${callSid}`);
      return { success: false, error: 'Call not found' };
    }

    // 2. Determine call status
    let status = 'no connection';
    const twilioStatus = twilioCallData.CallStatus || callDocument.status;
    
    // Map Twilio statuses to Craig's expected values
    if (twilioStatus === 'completed' && callDocument.duration > 0) {
      status = 'held';
    } else if (twilioStatus === 'no-answer' || twilioStatus === 'busy') {
      status = 'no answer';
    } else if (twilioStatus === 'failed' || twilioStatus === 'canceled') {
      status = 'no connection';
    }

    // Check if it was voicemail based on machine detection
    if (callDocument.answeredBy === 'machine' || callDocument.answeredBy === 'voicemail') {
      status = 'voicemail';
    }

    // 3. Get campaign info for subject
    let subject = 'Outbound Call';
    if (callDocument.campaignId) {
      try {
        const campaign = await getCampaignById(callDocument.campaignId);
        if (campaign) {
          subject = campaign.name || campaign.description || subject;
        }
      } catch (error) {
        console.warn('[Twilio CRM] Could not fetch campaign:', error.message);
      }
    }

    // 4. Try to get AI summary from ElevenLabs, fallback to simple summary
    let summary = generateCallSummary(callDocument, status, callDocument.duration || 0);
    
    // If we have a conversationId and this was a completed call, try to fetch AI summary
    if (callDocument.conversationId && status === 'held') {
      console.log(`[Twilio CRM] Attempting to fetch AI summary for conversation ${callDocument.conversationId}`);
      
      try {
        const elevenLabsData = await fetchElevenLabsConversation(callDocument.conversationId);
        
        if (elevenLabsData?.analysis?.transcript_summary) {
          summary = elevenLabsData.analysis.transcript_summary;
          console.log('[Twilio CRM] Using AI-generated summary from ElevenLabs');
        } else {
          console.log('[Twilio CRM] No AI summary available, using fallback summary');
        }
      } catch (error) {
        console.warn('[Twilio CRM] Error fetching ElevenLabs summary, using fallback:', error.message);
      }
    }

    // 5. Calculate duration (prefer Twilio data)
    const duration = twilioCallData.CallDuration 
      ? parseInt(twilioCallData.CallDuration) 
      : (callDocument.duration || 0);

    // 6. Prepare CRM payload
    const crmPayload = {
      type: "conversationAICall",
      subject: subject,
      to: callDocument.to || twilioCallData.To || 'Unknown',
      name: callDocument.contactName || 'Unknown',
      summary: summary,
      status: status,
      duration: duration
    };

    // 7. Send to CRM
    console.log('[Twilio CRM] Sending to CRM:', JSON.stringify(crmPayload, null, 2));
    
    const response = await fetch(crmWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(crmPayload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    if (response.ok) {
      console.log(`[Twilio CRM] Successfully sent to CRM. Status: ${response.status}`);
      
      // Log success event
      await logEvent(callSid, 'crm_webhook_sent', {
        crmUrl: crmWebhookUrl,
        payload: crmPayload,
        responseStatus: response.status,
        responseData: responseData
      });

      return {
        success: true,
        message: 'Successfully sent to CRM',
        payload: crmPayload,
        response: responseData
      };
    } else {
      console.error(`[Twilio CRM] CRM webhook failed. Status: ${response.status}, Response:`, responseData);
      
      // Log failure event
      await logEvent(callSid, 'crm_webhook_failed', {
        crmUrl: crmWebhookUrl,
        payload: crmPayload,
        responseStatus: response.status,
        responseData: responseData,
        error: `HTTP ${response.status}`
      });

      return {
        success: false,
        error: `CRM webhook failed with status ${response.status}`,
        response: responseData
      };
    }

  } catch (error) {
    console.error('[Twilio CRM] Error sending to CRM:', error);
    
    // Log error event
    try {
      await logEvent(callSid, 'crm_webhook_error', {
        error: error.message,
        stack: error.stack
      });
    } catch (logError) {
      console.error('[Twilio CRM] Could not log error event:', logError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle Twilio status callback for call completion
 * This should be called from the Twilio status callback endpoint
 * @param {Object} twilioCallbackData - Data from Twilio status callback
 * @returns {Promise<Object>} Processing result
 */
export async function handleTwilioCallCompletion(twilioCallbackData) {
  const { CallSid, CallStatus } = twilioCallbackData;

  // Only process completed calls
  if (!['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
    return {
      success: true,
      message: `Skipping CRM webhook for status: ${CallStatus}`
    };
  }

  console.log(`[Twilio CRM] Processing ${CallStatus} call for CRM: ${CallSid}`);

  // Add a delay for completed calls to give ElevenLabs time to process
  if (CallStatus === 'completed') {
    console.log('[Twilio CRM] Waiting 3 seconds for ElevenLabs processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return await sendTwilioCallToCRM(CallSid, twilioCallbackData);
}