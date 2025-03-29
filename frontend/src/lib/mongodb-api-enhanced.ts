/**
 * Enhanced MongoDB API Client
 * Provides expanded functions for interacting with the MongoDB database
 * with real-time updates and improved error handling
 */
import { getApiUrl } from './api'; // Import the central helper

// Remove local API Base URL constant

/**
* Fetch active campaigns
 * Retrieves all campaigns with status 'in-progress' or 'paused'
 * @returns {Promise<any>}
 */
export async function fetchActiveCampaigns() {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/campaigns?status=in-progress,paused&limit=20`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch active campaigns: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Fetch real-time call statistics
 * Used for dashboard real-time metrics
 * @returns {Promise<any>}
 */
export async function fetchRealTimeCallStats() {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/call-stats/real-time`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch real-time call stats: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching real-time call stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Fetch campaign progress
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<any>}
 */
export async function fetchCampaignProgress(campaignId: string) { // Add type annotation
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/campaigns/${campaignId}/progress`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch campaign progress: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching campaign progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Fetch active calls for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<any>}
 */
export async function fetchCampaignActiveCalls(campaignId: string) { // Add type annotation
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/campaigns/${campaignId}/active-calls`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch campaign active calls: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching campaign active calls:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Fetch recent campaign events
 * @param {string} campaignId - Campaign ID
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<any>}
 */
export async function fetchCampaignEvents(campaignId: string, limit = 10) { // Add type annotation
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/campaigns/${campaignId}/events?limit=${limit}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch campaign events: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching campaign events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Fetch call transcript for real-time monitoring
 * @param {string} callSid - Call SID
 * @returns {Promise<any>}
 */
export async function fetchLiveTranscript(callSid: string) { // Add type annotation
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/calls/${callSid}/live-transcript`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch live transcript: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching live transcript:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Poll for call updates (for use when Socket.IO is unavailable)
 * @param {string} callSid - Call SID
 * @returns {Promise<any>}
 */
export async function pollCallUpdates(callSid: string) { // Add type annotation
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/calls/${callSid}/poll`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to poll call updates: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error polling call updates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Update campaign settings during an active campaign
 * (only certain settings can be updated while a campaign is active)
 * @param {string} campaignId - Campaign ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<any>}
 */
export async function updateLiveCampaignSettings(campaignId: string, settings: any) { // Add type annotations
  try {
    // Use getApiUrl with the correct full path
    // Use getApiUrl with the correct full path - This seems already correct from previous attempt, just ensuring consistency
    const apiUrl = getApiUrl(`/api/campaigns/${campaignId}/live-settings`);
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update campaign settings: ${errorText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating campaign settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export default {
  fetchActiveCampaigns,
  fetchRealTimeCallStats,
  fetchCampaignProgress,
  fetchCampaignActiveCalls,
  fetchCampaignEvents,
  fetchLiveTranscript,
  pollCallUpdates,
  updateLiveCampaignSettings
};
