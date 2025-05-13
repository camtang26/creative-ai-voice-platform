import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // To load .env variables

const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL;
const ENABLE_CRM_WEBHOOK = process.env.ENABLE_CRM_WEBHOOK === 'true';

/**
 * Sends call data to the external CRM webhook.
 * @param {object} callDetails - Object containing call information.
 * @param {string} callDetails.subject - Campaign name or call subject.
 * @param {string} callDetails.to - The phone number called.
 * @param {string} callDetails.name - Contact's name.
 * @param {string} callDetails.summary - Call summary text.
 * @param {string} callDetails.status - Final call status (e.g., 'completed', 'no-answer').
 * @param {number} callDetails.duration - Call duration in seconds.
 */
export async function sendCallToCRM(callDetails) {
  if (!ENABLE_CRM_WEBHOOK) {
    console.log('[CRM Webhook] CRM webhook is disabled. Skipping.');
    return;
  }

  if (!CRM_WEBHOOK_URL) {
    console.error('[CRM Webhook] CRM_WEBHOOK_URL is not defined in environment variables. Cannot send webhook.');
    return;
  }

  const { subject, to, name, summary, status, duration } = callDetails;

  if (!to || !name || !status || duration === undefined) {
    console.error('[CRM Webhook] Missing required call details for CRM webhook. Payload:', callDetails);
    return; // Or throw an error
  }

  const payload = {
    type: "conversationAICall",
    subject: subject || "N/A", // Provide a default if subject can be missing
    to,
    name,
    summary: summary || "No summary available.", // Provide a default if summary can be missing
    status,
    duration
  };

  try {
    console.log(`[CRM Webhook] Sending call data to CRM: ${CRM_WEBHOOK_URL}`);
    console.log('[CRM Webhook] Payload:', JSON.stringify(payload));
    const response = await axios.post(CRM_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`[CRM Webhook] Successfully sent call data to CRM. Status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[CRM Webhook] Error sending data - Server responded: Status ${error.response.status}`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[CRM Webhook] Error sending data - No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[CRM Webhook] Error sending data - Request setup error:', error.message);
    }
    // console.error('[CRM Webhook] Full error config:', error.config); // Optional: for more detailed debugging
    // TODO: Implement retry logic or dead-letter queue if necessary
  }
}