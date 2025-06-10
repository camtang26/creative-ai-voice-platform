/**
 * Twilio-based CRM Webhook Integration
 * 
 * This module handles sending call data to the CRM after Twilio call completion,
 * combining Twilio metadata with ElevenLabs conversation summaries.
 */
import fetch from 'node-fetch';
import { getCallBySid } from '../../db/repositories/call.repository.js';
import { getTranscriptByCallSid } from '../../db/repositories/transcript.repository.js';
import { getCampaignById } from '../../db/repositories/campaign.repository.js';
import { logEvent } from '../../db/repositories/callEvent.repository.js';

/**
 * Fetch conversation summary from ElevenLabs API
 * @param {string} conversationId - ElevenLabs conversation ID
 * @returns {Promise<Object>} Conversation data with summary
 */
async function fetchElevenLabsConversation(conversationId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !conversationId) {
    console.log('[Twilio CRM] Missing API key or conversation ID for ElevenLabs fetch');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': apiKey }
      }
    );

    if (!response.ok) {
      console.error(`[Twilio CRM] ElevenLabs API error (${response.status})`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Twilio CRM] Error fetching from ElevenLabs:', error.message);
    return null;
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

    // 4. Try to get conversation summary from ElevenLabs
    let summary = 'No summary available';
    let elevenLabsData = null;

    // First check if we have a transcript in MongoDB
    try {
      const transcript = await getTranscriptByCallSid(callSid);
      if (transcript && transcript.analysis && transcript.analysis.transcript_summary) {
        summary = transcript.analysis.transcript_summary;
        console.log('[Twilio CRM] Found summary in MongoDB transcript');
      } else if (callDocument.conversationId) {
        // If not in DB, try fetching from ElevenLabs API
        console.log('[Twilio CRM] Fetching summary from ElevenLabs API');
        elevenLabsData = await fetchElevenLabsConversation(callDocument.conversationId);
        if (elevenLabsData && elevenLabsData.analysis && elevenLabsData.analysis.transcript_summary) {
          summary = elevenLabsData.analysis.transcript_summary;
        }
      }
    } catch (error) {
      console.warn('[Twilio CRM] Could not fetch conversation summary:', error.message);
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

  // Add a small delay to ensure ElevenLabs data might be available
  if (CallStatus === 'completed') {
    console.log('[Twilio CRM] Waiting 2 seconds for ElevenLabs data...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return await sendTwilioCallToCRM(CallSid, twilioCallbackData);
}