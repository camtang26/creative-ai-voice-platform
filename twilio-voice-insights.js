/**
 * Twilio Voice Insights Integration
 * Fetches detailed call metrics including who hung up
 */

import axios from 'axios';

/**
 * Fetch Voice Insights data for a call
 * @param {Object} twilioClient - Twilio client instance
 * @param {string} callSid - The call SID
 * @returns {Promise<Object>} Voice Insights data
 */
export async function fetchVoiceInsights(twilioClient, callSid) {
  try {
    const accountSid = twilioClient.accountSid;
    const authToken = twilioClient.username; // In Twilio client, username is the auth token
    
    // Voice Insights API endpoint
    const url = `https://insights.twilio.com/v1/Voice/${callSid}/Summary`;
    
    const response = await axios.get(url, {
      auth: {
        username: accountSid,
        password: authToken
      }
    });
    
    return response.data;
  } catch (error) {
    // Voice Insights might not be available for all calls immediately
    if (error.response && error.response.status === 404) {
      console.log(`[Voice Insights] Data not yet available for call ${callSid}`);
      return null;
    }
    console.error(`[Voice Insights] Error fetching data for ${callSid}:`, error.message);
    return null;
  }
}

/**
 * Extract who hung up from Voice Insights data
 * @param {Object} insightsData - Voice Insights response
 * @returns {string|null} Who hung up: 'user', 'agent', 'system', or null
 */
export function extractWhoHungUp(insightsData) {
  if (!insightsData) return null;
  
  // Voice Insights provides various metrics
  const { 
    call_state,
    processing_state,
    attributes,
    metrics
  } = insightsData;
  
  // Check if processing is complete
  if (processing_state !== 'complete') {
    return null;
  }
  
  // Look for disconnect initiator in attributes
  if (attributes) {
    // Twilio typically provides disconnect_initiator
    if (attributes.disconnect_initiator) {
      switch (attributes.disconnect_initiator) {
        case 'caller':
          return 'agent'; // For outbound calls, caller is the AI agent
        case 'callee':
          return 'user'; // For outbound calls, callee is the recipient
        case 'system':
        case 'carrier':
          return 'system';
        default:
          console.log(`[Voice Insights] Unknown disconnect_initiator: ${attributes.disconnect_initiator}`);
      }
    }
    
    // Alternative attribute names Twilio might use
    if (attributes.who_hung_up) {
      switch (attributes.who_hung_up.toLowerCase()) {
        case 'caller':
          return 'agent';
        case 'callee':
          return 'user';
        case 'system':
          return 'system';
      }
    }
  }
  
  // Check metrics for additional clues
  if (metrics && metrics.carrier) {
    // If carrier metrics show issues, it was likely system terminated
    if (metrics.carrier.connection_failures > 0) {
      return 'system';
    }
  }
  
  return null;
}

/**
 * Get termination details from Voice Insights
 * @param {Object} twilioClient - Twilio client instance
 * @param {string} callSid - The call SID
 * @returns {Promise<Object>} Termination details
 */
export async function getTerminationFromVoiceInsights(twilioClient, callSid) {
  const insightsData = await fetchVoiceInsights(twilioClient, callSid);
  
  if (!insightsData) {
    return {
      available: false,
      whoHungUp: null,
      reason: 'Voice Insights data not available'
    };
  }
  
  const whoHungUp = extractWhoHungUp(insightsData);
  
  return {
    available: true,
    whoHungUp,
    processingState: insightsData.processing_state,
    callState: insightsData.call_state,
    attributes: insightsData.attributes,
    metrics: insightsData.metrics
  };
}