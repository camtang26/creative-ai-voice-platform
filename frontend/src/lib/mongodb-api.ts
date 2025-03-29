// MongoDB API service for communicating with the backend MongoDB API endpoints
import {
  CallInfo,
  RecordingInfo,
  CallMetrics,
  TranscriptData,
  CampaignConfig,
  CampaignStats,
  ConversationAnalytics,
  AgentPerformance,
  AnalyticsFilters
} from './types';
import { getApiUrl } from './api'; // Import the central helper

// Default error response
const defaultErrorResponse = {
  success: false,
  error: 'Unknown error occurred',
  data: null
};

// Default pagination parameters
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

// Helper function to handle API errors
const handleApiError = (error: any, errorMessage: string) => {
  console.error(errorMessage, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    data: null // Note: This might cause type issues if caller expects undefined
  };
};

/**
 * Fetch recent calls from MongoDB with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: {calls: CallInfo[], total: number, page: number, limit: number}}>}
 */
export async function fetchCalls(options: {
  limit?: number;
  page?: number;
  status?: string;
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.status) params.append('status', options.status);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    // Handle response
    if (!response.ok) {
      throw new Error(`Error fetching calls: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    // Type assertion might be needed if handleApiError's return type is problematic
    return handleApiError(error, 'Failed to fetch calls:') as any; 
  }
}

/**
 * Fetch active calls from MongoDB
 * @returns {Promise<{success: boolean, data: {calls: CallInfo[], count: number}}>}
 */
export async function fetchActiveCalls() {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/active`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching active calls: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch active calls:') as any;
  }
}

/**
 * Fetch a specific call by SID from MongoDB
 * @param {string} callSid - The Twilio Call SID
 * @returns {Promise<{success: boolean, data: CallInfo}>}
 */
export async function fetchCall(callSid: string) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching call: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch call ${callSid}:`) as any;
  }
}

/**
 * Fetch recordings for a specific call from MongoDB
 * @param {string} callSid - The Twilio Call SID
 * @returns {Promise<{success: boolean, data: {recordings: RecordingInfo[], count: number, callSid: string}}>}
 */
export async function fetchCallRecordings(callSid: string) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}/recordings`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching recordings: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch recordings for call ${callSid}:`) as any;
  }
}

/**
 * Fetch a specific recording by SID
 * @param {string} recordingSid - The recording SID
 * @returns {Promise<{success: boolean, data: RecordingInfo}>}
 */
export async function fetchRecording(recordingSid: string) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/recordings/${recordingSid}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching recording: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch recording ${recordingSid}:`) as any;
  }
}

/**
 * Update recording processing status
 * @param {string} recordingSid - The recording SID
 * @param {string} status - The processing status (pending, processing, completed, failed)
 * @returns {Promise<{success: boolean, data: RecordingInfo}>}
 */
export async function updateRecordingProcessingStatus(recordingSid: string, status: string) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    if (!status || !['pending', 'processing', 'completed', 'failed'].includes(status)) {
      throw new Error('Valid processing status is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/recordings/${recordingSid}/processing-status`);
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error(`Error updating recording processing status: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to update recording processing status for ${recordingSid}:`) as any;
  }
}

/**
 * Fetch transcript for a specific call from MongoDB
 * @param {string} callSid - The Twilio Call SID
 * @returns {Promise<{success: boolean, data: TranscriptData}>}
 */
export async function fetchCallTranscript(callSid: string) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}/transcript`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching transcript: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch transcript for call ${callSid}:`) as any;
  }
}

/**
 * Fetch transcript by conversation ID
 * @param {string} conversationId - The ElevenLabs conversation ID
 * @returns {Promise<{success: boolean, data: TranscriptData}>}
 */
export async function fetchTranscriptByConversationId(conversationId: string) {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/transcripts/conversation/${conversationId}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching transcript: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch transcript for conversation ${conversationId}:`) as any;
  }
}

/**
 * Search transcripts for a specific term
 * @param {string} query - The search term
 * @param {Object} options - Search options
 * @returns {Promise<{success: boolean, data: {results: any[], total: number, page: number, limit: number}}>}
 */
export async function searchTranscripts(query: string, options: { limit?: number; page?: number } = {}) {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }
    
    const params = new URLSearchParams();
    params.append('q', query);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/transcripts/search?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error searching transcripts: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to search transcripts for "${query}":`) as any;
  }
}

/**
 * Get transcripts by sentiment
 * @param {string} sentiment - The sentiment (positive, negative, neutral)
 * @param {Object} options - Search options
 * @returns {Promise<{success: boolean, data: {results: TranscriptData[], total: number, page: number, limit: number}}>}
 */
export async function getTranscriptsBySentiment(
  sentiment: 'positive' | 'negative' | 'neutral',
  options: { limit?: number; page?: number } = {}
) {
  try {
    if (!sentiment || !['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error('Valid sentiment is required (positive, negative, neutral)');
    }
    
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/transcripts/sentiment/${sentiment}?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching transcripts by sentiment: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch transcripts with ${sentiment} sentiment:`) as any;
  }
}

/**
 * Save a new transcript
 * @param {Object} transcriptData - The transcript data
 * @returns {Promise<{success: boolean, data: TranscriptData}>}
 */
export async function saveTranscript(transcriptData: any) {
  try {
    if (!transcriptData) {
      throw new Error('Transcript data is required');
    }
    
    if (!transcriptData.callSid) {
      throw new Error('Call SID is required');
    }
    
    if (!transcriptData.messages || !Array.isArray(transcriptData.messages) || transcriptData.messages.length === 0) {
      throw new Error('Transcript messages are required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/transcripts`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcriptData)
    });
    
    if (!response.ok) {
      throw new Error(`Error saving transcript: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to save transcript:') as any;
  }
}

/**
 * Fetch call metrics from MongoDB
 * @param {string} callSid - The Twilio Call SID
 * @returns {Promise<{success: boolean, data: CallMetrics}>}
 */
export async function fetchCallMetrics(callSid: string) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}/metrics`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching metrics: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch metrics for call ${callSid}:`) as any;
  }
}

/**
 * Fetch call statistics from MongoDB
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchCallStats() {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/stats`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching call stats: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch call stats:') as any;
  }
}

/**
 * Fetch sentiment analysis for a specific call
 * @param {string} callSid - The Twilio Call SID
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchCallSentiment(callSid: string) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}/sentiment`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching sentiment: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch sentiment for call ${callSid}:`) as any;
  }
}

/**
 * Fetch overall sentiment analysis for all calls
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchOverallSentiment() {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/sentiment/overall`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching overall sentiment: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch overall sentiment:') as any;
  }
}

/**
 * Update call status
 * @param {string} callSid - The Twilio Call SID
 * @param {string} status - The new call status
 * @param {Object} metadata - Additional metadata to update
 * @returns {Promise<{success: boolean, data: CallInfo}>}
 */
export async function updateCallStatus(callSid: string, status: string, metadata: any = {}) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    if (!status) {
      throw new Error('Status is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/calls/${callSid}/status`);
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, ...metadata })
    });
    
    if (!response.ok) {
      throw new Error(`Error updating call status: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to update status for call ${callSid}:`) as any;
  }
}

// Campaign Management API Functions

/**
 * Fetch all campaigns with filtering and pagination
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: {campaigns: CampaignConfig[], total: number, page: number, limit: number}}>}
 */
export async function fetchCampaigns(options: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: number;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.search) params.append('search', options.search);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder.toString());
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    // Handle response
    if (!response.ok) {
      throw new Error(`Error fetching campaigns: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch campaigns:') as any;
  }
}

/**
 * Fetch a specific campaign by ID
 * @param {string} campaignId - The campaign ID
 * @returns {Promise<{success: boolean, data: CampaignConfig}>}
 */
export async function fetchCampaign(campaignId: string) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch campaign ${campaignId}:`) as any;
  }
}

/**
 * Create a new campaign
 * @param {CampaignConfig} campaignData - The campaign data
 * @returns {Promise<{success: boolean, data: CampaignConfig}>}
 */
export async function createCampaign(campaignData: CampaignConfig) {
  try {
    if (!campaignData) {
      throw new Error('Campaign data is required');
    }
    
    if (!campaignData.name) {
      throw new Error('Campaign name is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });
    
    if (!response.ok) {
      throw new Error(`Error creating campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to create campaign:') as any;
  }
}

/**
 * Update an existing campaign
 * @param {string} campaignId - The campaign ID
 * @param {Partial<CampaignConfig>} updateData - The data to update
 * @returns {Promise<{success: boolean, data: CampaignConfig}>}
 */
export async function updateCampaign(campaignId: string, updateData: Partial<CampaignConfig>) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    if (!updateData) {
      throw new Error('Update data is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}`);
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Error updating campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to update campaign ${campaignId}:`) as any;
  }
}

/**
 * Delete a campaign
 * @param {string} campaignId - The campaign ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteCampaign(campaignId: string) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}`);
    const response = await fetch(apiUrl, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to delete campaign ${campaignId}:`) as any;
  }
}

/**
 * Start a campaign
 * @param {string} campaignId - The campaign ID
 * @returns {Promise<{success: boolean, data: CampaignConfig, message: string}>}
 */
export async function startCampaign(campaignId: string) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}/start`);
    const response = await fetch(apiUrl, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error starting campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to start campaign ${campaignId}:`) as any;
  }
}

/**
 * Pause a campaign
 * @param {string} campaignId - The campaign ID
 * @returns {Promise<{success: boolean, data: CampaignConfig, message: string}>}
 */
export async function pauseCampaign(campaignId: string) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}/pause`);
    const response = await fetch(apiUrl, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error pausing campaign: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to pause campaign ${campaignId}:`) as any;
  }
}

/**
 * Get campaign statistics
 * @param {string} campaignId - The campaign ID
 * @returns {Promise<{success: boolean, data: CampaignStats}>}
 */
export async function getCampaignStats(campaignId: string) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}/stats`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching campaign stats: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch stats for campaign ${campaignId}:`) as any;
  }
}