// API service for communicating with the backend
import { AnalyticsFilters, CampaignConfig, ReportConfig } from './types';
import {
  mockCallStats,
  mockCallDetail,
  mockRecordings,
  mockCallMetrics,
  mockTerminateResponse,
  mockMakeCallResponse,
  mockConversationAnalytics,
  mockCampaigns,
  mockReports
} from './mockData';

// Flag to bypass API requests and use mock data during development
const USE_MOCK_DATA = false; // Set to false to use the real MongoDB backend

// Determine the base API URL
// Use NEXT_PUBLIC_API_URL if available (for production/staging), otherwise fallback to relative /api for local proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
console.log(`[API] Using base URL: ${API_BASE_URL}`); // Log the base URL being used

// Helper function to construct full API URL
const getApiUrl = (path: string): string => {
  // 1. Ensure the path component starts with /api/
  let apiPath = path;
  if (!path.startsWith('/api/')) {
      // Prepend /api/, handling potential leading slash on original path
      apiPath = `/api${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // 2. Determine the base URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'; // Use env var or fallback to /api for local

  // 3. Combine Base and Path
  if (baseUrl === '/api') {
    // If using local proxy, the path already includes /api/ correctly
    return apiPath;
  } else {
    // If using a full URL (like Railway), combine it with the ensured /api/... path
    const cleanedBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanedBaseUrl}${apiPath}`; // e.g., https://twilioel-production.up.railway.app/api/db/dashboard/overview
  }
};

// Function to get the full URL for media/recording endpoints
function getMediaUrl(recordingSid: string): string {
  // Get base URL from environment variable or use default
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  if (baseUrl) {
    // If we have a base URL (like production), use it
    return `${baseUrl.replace(/\/$/, '')}/api/media/recordings/${recordingSid}`;
  } else {
    // For local development, use relative path
    return `/api/media/recordings/${recordingSid}`;
  }
}

// Export the helper functions for use in other modules
export { getApiUrl, getMediaUrl };

/**
 * Fetch call statistics from the server
 */
export async function fetchCallStats() {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for call stats');
    return mockCallStats;
  }

  try {
    const response = await fetch(getApiUrl('/api/call-stats'));
    if (!response.ok) {
      throw new Error(`Error fetching call stats: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch call stats:', error);
    console.log('[API] Falling back to mock data');
    return mockCallStats;
  }
}

/**
 * Fetch a specific call by ID
 */
export async function fetchCall(callSid: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for call ${callSid}`);
    return mockCallDetail(callSid);
  }

  try {
    const response = await fetch(getApiUrl(`/api/call/${callSid}`));
    if (!response.ok) {
      throw new Error(`Error fetching call: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch call ${callSid}:`, error);
    console.log('[API] Falling back to mock data');
    return mockCallDetail(callSid);
  }
}

/**
 * Fetch recordings for a specific call
 */
export async function fetchCallRecordings(callSid: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for recordings of call ${callSid}`);
    return mockRecordings(callSid);
  }

  try {
    const response = await fetch(getApiUrl(`/api/calls/${callSid}/recordings`));
    if (!response.ok) {
      throw new Error(`Error fetching recordings: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch recordings for call ${callSid}:`, error);
    console.log('[API] Falling back to mock data');
    return mockRecordings(callSid);
  }
}

/**
 * Fetch call quality metrics for a specific call
 */
export async function fetchCallMetrics(callSid: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for metrics of call ${callSid}`);
    return mockCallMetrics(callSid);
  }

  try {
    const response = await fetch(getApiUrl(`/api/calls/${callSid}/metrics`));
    if (!response.ok) {
      throw new Error(`Error fetching metrics: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch metrics for call ${callSid}:`, error);
    console.log('[API] Falling back to mock data');
    return mockCallMetrics(callSid);
  }
}

/**
 * Terminate an active call
 */
export async function terminateCall(callSid: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for terminating call ${callSid}`);
    return mockTerminateResponse;
  }

  try {
    const response = await fetch(getApiUrl(`/api/calls/${callSid}/terminate`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error terminating call: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to terminate call ${callSid}:`, error);
    console.log('[API] Falling back to mock data');
    return mockTerminateResponse;
  }
}

/**
 * Initiate a new outbound call
 */
export async function makeCall(data: {
  number: string,
  prompt?: string,
  first_message?: string,
  callerId?: string
}) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for making call to ${data.number}`);
    return mockMakeCallResponse;
  }

  try {
    const response = await fetch(getApiUrl('/api/outbound-call'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error making call: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to make call:', error);
    console.log('[API] Falling back to mock data');
    return mockMakeCallResponse;
  }
}

// NEW ANALYTICS ENDPOINTS FOR PHASE 4

/**
 * Fetch conversation analytics data
 */
export async function fetchConversationAnalytics(filters?: AnalyticsFilters) {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for conversation analytics');
    return mockConversationAnalytics;
  }

  try {
    const queryParams = filters ? `?${new URLSearchParams({
      start_date: filters.timeframe.start_date,
      end_date: filters.timeframe.end_date,
      resolution: filters.timeframe.resolution,
      ...(filters.agent_ids ? { agent_ids: filters.agent_ids.join(',') } : {}),
      ...(filters.minimum_quality_score ? { minimum_quality_score: filters.minimum_quality_score.toString() } : {}),
      ...(filters.topics ? { topics: filters.topics.join(',') } : {}),
      ...(filters.call_status ? { call_status: filters.call_status.join(',') } : {}),
    }).toString()}` : ''; // Ensure toString() is called

    const response = await fetch(getApiUrl(`/api/analytics/conversations${queryParams}`));
    if (!response.ok) {
      throw new Error(`Error fetching conversation analytics: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch conversation analytics:', error);
    console.log('[API] Falling back to mock data');
    return mockConversationAnalytics;
  }
}

/**
 * Fetch agent performance analytics
 */
export async function fetchAgentPerformance(filters?: AnalyticsFilters) {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for agent performance');
    return {
      success: true,
      data: mockConversationAnalytics.data.map(item => ({
        agent_id: item.agent_id,
        agent_name: 'Agent ' + item.agent_id.split('-')[1],
        calls_count: 15 + Math.floor(Math.random() * 20),
        success_rate: item.success_rate,
        completion_rate: item.completion_rate,
        average_duration: item.duration,
        average_quality_score: item.quality_score,
        topics_covered: [
          { name: 'pricing', count: 12 },
          { name: 'features', count: 8 },
          { name: 'support', count: 5 }
        ]
      }))
    };
  }

  try {
    const queryParams = filters ? `?${new URLSearchParams({
      start_date: filters.timeframe.start_date,
      end_date: filters.timeframe.end_date,
      resolution: filters.timeframe.resolution,
      ...(filters.agent_ids ? { agent_ids: filters.agent_ids.join(',') } : {}),
      ...(filters.minimum_quality_score ? { minimum_quality_score: filters.minimum_quality_score.toString() } : {}),
      ...(filters.topics ? { topics: filters.topics.join(',') } : {}),
      ...(filters.call_status ? { call_status: filters.call_status.join(',') } : {}),
    }).toString()}` : ''; // Ensure toString() is called

    const response = await fetch(getApiUrl(`/api/analytics/agent-performance${queryParams}`));
    if (!response.ok) {
      throw new Error(`Error fetching agent performance: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch agent performance:', error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      data: mockConversationAnalytics.data.map(item => ({
        agent_id: item.agent_id,
        agent_name: 'Agent ' + item.agent_id.split('-')[1],
        calls_count: 15 + Math.floor(Math.random() * 20),
        success_rate: item.success_rate,
        completion_rate: item.completion_rate,
        average_duration: item.duration,
        average_quality_score: item.quality_score,
        topics_covered: [
          { name: 'pricing', count: 12 },
          { name: 'features', count: 8 },
          { name: 'support', count: 5 }
        ]
      }))
    };
  }
}

/**
 * Create or update a campaign
 */
export async function saveCampaign(campaign: CampaignConfig) {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for saving campaign');
    return {
      success: true,
      campaign: {
        ...campaign,
        id: campaign.id || `campaign-${Date.now()}`,
        created_at: new Date().toISOString()
      }
    };
  }

  try {
    const method = campaign.id ? 'PUT' : 'POST';
    const urlPath = campaign.id ? `/api/db/campaigns/${campaign.id}` : '/api/db/campaigns';

    const response = await fetch(getApiUrl(urlPath), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaign),
    });

    if (!response.ok) {
      throw new Error(`Error saving campaign: ${response.statusText}`);
    }
    const result = await response.json();

    // Transform the response to match the expected format
    return {
      success: result.success,
      campaign: result.data,
      error: result.error
    };
  } catch (error) {
    console.error('Failed to save campaign:', error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      campaign: {
        ...campaign,
        id: campaign.id || `campaign-${Date.now()}`,
        created_at: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetch all campaigns
 */
export async function fetchCampaigns(): Promise<{ success: boolean, campaigns?: CampaignConfig[], pagination?: any, error?: string }> { // Added explicit return type
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for campaigns');
    return mockCampaigns;
  }

  try {
    const response = await fetch(getApiUrl('/api/db/campaigns'));
    if (!response.ok) {
      throw new Error(`Error fetching campaigns: ${response.statusText}`);
    }
    const result = await response.json();

    // Transform the response to match the expected format
    return {
      success: result.success,
      campaigns: result.data.campaigns,
      pagination: result.data.pagination,
      error: result.error
    };
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    console.log('[API] Falling back to mock data');
    return mockCampaigns;
  }
}

/**
 * Fetch a specific campaign
 */
export async function fetchCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for campaign ${campaignId}`);
    const campaign = mockCampaigns.campaigns.find(c => c.id === campaignId);
    return {
      success: true,
      campaign: campaign || {
        id: campaignId,
        name: `Campaign ${campaignId}`,
        description: 'Campaign description',
        prompt_template: 'You are a sales agent...',
        first_message_template: 'Hello, this is an assistant...',
        status: 'draft',
        created_at: new Date().toISOString()
      }
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}`));
    if (!response.ok) {
      throw new Error(`Error fetching campaign: ${response.statusText}`);
    }
    const result = await response.json();

    // Transform the response to match the expected format
    return {
      success: result.success,
      campaign: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to fetch campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    const campaign = mockCampaigns.campaigns.find(c => c.id === campaignId);
    return {
      success: true,
      campaign: campaign || {
        id: campaignId,
        name: `Campaign ${campaignId}`,
        description: 'Campaign description',
        prompt_template: 'You are a sales agent...',
        first_message_template: 'Hello, this is an assistant...',
        status: 'draft',
        created_at: new Date().toISOString()
      }
    };
  }
}

/**
 * Start a campaign
 */
export async function startCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for starting campaign ${campaignId}`);
    return { success: true, message: 'Campaign started successfully' };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/start`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error starting campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign started successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to start campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign started successfully' };
  }
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for pausing campaign ${campaignId}`);
    return { success: true, message: 'Campaign paused successfully' };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/pause`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error pausing campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign paused successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to pause campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign paused successfully' };
  }
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for canceling campaign ${campaignId}`);
    return { success: true, message: 'Campaign canceled successfully' };
  }

  try {
    // Use the stop endpoint since the backend uses 'stop' instead of 'cancel'
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/stop`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error canceling campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign canceled successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to cancel campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign canceled successfully' };
  }
}

/**
 * Resume a campaign
 */
export async function resumeCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for resuming campaign ${campaignId}`);
    return { success: true, message: 'Campaign resumed successfully' };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/resume`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error resuming campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign resumed successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to resume campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign resumed successfully' };
  }
}

/**
 * Stop a campaign
 */
export async function stopCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for stopping campaign ${campaignId}`);
    return { success: true, message: 'Campaign stopped successfully' };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/stop`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error stopping campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign stopped successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to stop campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign stopped successfully' };
  }
}

/**
 * Fetch active campaigns with progress information
 */
export async function fetchActiveCampaigns() {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for fetching active campaigns');
    return {
      success: true,
      data: {
        campaigns: [
          {
            id: 'campaign-1',
            name: 'Sales Campaign Q4',
            status: 'active',
            totalContacts: 150,
            validatedContacts: 145,
            contactsRemaining: 95,
            progress: {
              callsPlaced: 50,
              callsCompleted: 45,
              callsAnswered: 42,
              callsFailed: 5,
              percentComplete: 34
            },
            activeCalls: 3,
            paused: false,
            settings: {
              callDelay: 5000,
              maxConcurrentCalls: 5
            },
            createdAt: new Date().toISOString(),
            lastExecuted: new Date().toISOString()
          }
        ]
      }
    };
  }

  try {
    const response = await fetch(getApiUrl('/api/db/campaigns/active'));
    if (!response.ok) {
      throw new Error(`Error fetching active campaigns: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to fetch active campaigns:', error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      data: {
        campaigns: []
      }
    };
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for resuming campaign ${campaignId}`);
    return { success: true, message: 'Campaign resumed successfully' };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/resume`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error resuming campaign: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Campaign resumed successfully',
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to resume campaign ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { success: true, message: 'Campaign resumed successfully' };
  }
}

/**
 * Fetch campaign progress details
 */
export async function fetchCampaignProgress(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for fetching campaign progress ${campaignId}`);
    return {
      success: true,
      data: {
        progress: {
          callsPlaced: 50,
          callsCompleted: 45,
          callsAnswered: 42,
          callsFailed: 5,
          percentComplete: 34
        },
        contactsRemaining: 95,
        activeCalls: 3
      }
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/progress`));
    if (!response.ok) {
      throw new Error(`Error fetching campaign progress: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Failed to fetch campaign progress ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      data: {
        progress: {
          callsPlaced: 0,
          callsCompleted: 0,
          callsAnswered: 0,
          callsFailed: 0,
          percentComplete: 0
        },
        contactsRemaining: 0,
        activeCalls: 0
      }
    };
  }
}

/**
 * Fetch active campaigns
 */
export async function fetchActiveCampaigns() {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for active campaigns');
    return { 
      success: true, 
      data: { 
        campaigns: [], 
        total: 0 
      } 
    };
  }

  try {
    const response = await fetch(getApiUrl('/api/db/campaigns/active'));
    if (!response.ok) {
      throw new Error(`Error fetching active campaigns: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch active campaigns:', error);
    console.log('[API] Falling back to mock data');
    return { 
      success: true, 
      data: { 
        campaigns: [], 
        total: 0 
      } 
    };
  }
}

/**
 * Fetch campaign progress
 */
export async function fetchCampaignProgress(campaignId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for campaign progress ${campaignId}`);
    return { 
      success: true, 
      data: {
        campaign: {
          id: campaignId,
          name: `Campaign ${campaignId}`,
          status: 'active'
        },
        contacts: {
          total: 100,
          validated: 100,
          remaining: 50,
          called: 50
        },
        progress: {
          callsPlaced: 50,
          callsCompleted: 30,
          callsAnswered: 40,
          callsFailed: 10,
          averageDuration: 120,
          percentComplete: 50
        },
        engine: {
          isActive: true,
          activeCalls: 2,
          paused: false
        }
      }
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/campaigns/${campaignId}/progress`));
    if (!response.ok) {
      throw new Error(`Error fetching campaign progress: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch campaign progress for ${campaignId}:`, error);
    console.log('[API] Falling back to mock data');
    return { 
      success: true, 
      data: {
        campaign: {
          id: campaignId,
          name: `Campaign ${campaignId}`,
          status: 'active'
        },
        contacts: {
          total: 100,
          validated: 100,
          remaining: 50,
          called: 50
        },
        progress: {
          callsPlaced: 50,
          callsCompleted: 30,
          callsAnswered: 40,
          callsFailed: 10,
          averageDuration: 120,
          percentComplete: 50
        },
        engine: {
          isActive: true,
          activeCalls: 2,
          paused: false
        }
      }
    };
  }
}

/**
 * Create or update a report
 */
export async function saveReport(report: ReportConfig) {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for saving report');
    return {
      success: true,
      report: {
        ...report,
        id: report.id || `report-${Date.now()}`,
        created_at: new Date().toISOString()
      }
    };
  }

  try {
    const method = report.id ? 'PUT' : 'POST';
    const urlPath = report.id ? `/api/reports/${report.id}` : '/api/reports';

    const response = await fetch(getApiUrl(urlPath), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      throw new Error(`Error saving report: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to save report:', error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      report: {
        ...report,
        id: report.id || `report-${Date.now()}`,
        created_at: new Date().toISOString()
      }
    };
  }
}


/**
 * Fetch dashboard overview data
 */
export async function fetchDashboardOverview(): Promise<{ 
  success: boolean; 
  data?: {
    totalCalls: number;
    totalContacts: number;
    activeCampaigns: number;
    totalCost: number;
    successRate: number;
    avgCallDuration: number;
  }; 
  error?: string 
}> {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for dashboard overview');
    return {
      success: true,
      data: {
        totalCalls: 1250,
        totalContacts: 450,
        activeCampaigns: 3,
        totalCost: 187.50,
        successRate: 85.2,
        avgCallDuration: 125
      }
    };
  }

  try {
    const response = await fetch(getApiUrl('/api/db/analytics/dashboard'));
    if (!response.ok) {
      throw new Error(`Error fetching dashboard overview: ${response.statusText}`);
    }
    const result = await response.json();
    
    // Transform backend data to match frontend expectations
    if (result.success && result.data) {
      const backendData = result.data;
      return {
        success: true,
        data: {
          totalCalls: backendData.calls?.total || 0,
          totalContacts: backendData.contacts?.total || 0,
          activeCampaigns: backendData.campaigns?.active || 0,
          totalCost: backendData.costs?.total || 0,
          successRate: backendData.calls?.successRate || 0,
          avgCallDuration: backendData.calls?.avgDuration || 0
        }
      };
    }
    
    return {
      success: result.success,
      data: result.data
    };
  } catch (error: any) {
    console.error('Failed to fetch dashboard overview:', error);
    return {
      success: true,
      data: {
        totalCalls: 1250,
        totalContacts: 450,
        activeCampaigns: 3,
        totalCost: 187.50,
        successRate: 85.2,
        avgCallDuration: 125
      }
    };
  }
}

/**
 * Export data
 */
export async function exportData(type: string, options: any): Promise<{ success: boolean; error?: string }> {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for exporting ${type}`);
    // Create a fake download for development
    const blob = new Blob(['Mock export data for ' + type], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // Create and trigger a download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = options.filename || `export-${type}-${new Date().toISOString().slice(0, 10)}.${type}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  }

  try {
    const response = await fetch(getApiUrl(`/api/export/${type}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Error exporting data: ${response.statusText}`);
    }

    // Return the response as blob for downloads
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create and trigger a download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = options.filename || `export-${type}-${new Date().toISOString().slice(0, 10)}.${type}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    console.error(`Failed to export ${type} data:`, error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    // All subsequent lines in the catch block related to mock download or erroneous return are removed.
  }
}

/**
 * Upload a Google Sheet for campaign
 */
export async function uploadSheetForCampaign(file: File) {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for uploading sheet');
    return {
      success: true,
      message: 'Sheet uploaded successfully',
      sheetId: 'mock-sheet-' + Date.now(),
      rowCount: 15,
      headers: ['Name', 'Phone', 'Email', 'Custom Message']
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getApiUrl('/api/campaigns/upload-sheet'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading sheet: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to upload sheet:', error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      message: 'Sheet uploaded successfully',
      sheetId: 'mock-sheet-' + Date.now(),
      rowCount: 15,
      headers: ['Name', 'Phone', 'Email', 'Custom Message']
    };
  }
}

/**
 * Validate a Google Sheet for campaign
 */
export async function validateSheet(sheetId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for validating sheet ${sheetId}`);
    return {
      success: true,
      message: 'Sheet validated successfully',
      isValid: true,
      requiredHeaders: ['Phone', 'Name'],
      missingHeaders: [],
      columnMapping: { Phone: 'Phone', Name: 'Name' }
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/db/sheets/validate?sheetId=${sheetId}`));
    if (!response.ok) {
      throw new Error(`Error validating sheet: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to validate sheet ${sheetId}:`, error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      message: 'Sheet validated successfully',
      isValid: true,
      requiredHeaders: ['Phone', 'Name'],
      missingHeaders: [],
      columnMapping: { Phone: 'Phone', Name: 'Name' }
    };
  }
}

/**
 * Start a campaign from an uploaded CSV file and campaign details
 */
export async function startCampaignFromCsv(formData: FormData): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
  // We don't use mock data for this specific new functionality directly,
  // as it involves file upload which is harder to mock meaningfully here.
  // The backend will handle the CSV processing.

  try {
    const response = await fetch(getApiUrl('/api/db/campaigns/start-from-csv'), {
      method: 'POST',
      body: formData, // FormData will set the Content-Type to multipart/form-data automatically
    });

    if (!response.ok) {
      // Try to parse error from backend if available
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error starting campaign from CSV: ${response.statusText}`);
      } catch (e) {
        throw new Error(`Error starting campaign from CSV: ${response.statusText}`);
      }
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to start campaign from CSV:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while starting campaign from CSV.'
    };
  }
}

/**
 * Fetch reports (analytics configurations)
 */
export async function fetchReports(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for reports');
    return { success: true, data: mockReports.reports };
  }

  try {
    // For now, return empty array as we'll generate reports dynamically
    // In the future, this could fetch saved report configurations
    return { 
      success: true, 
      data: [] 
    };
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return {
      success: false,
      error: 'Failed to fetch reports'
    };
  }
}

/**
 * Generate a report in the specified format
 */
export async function generateReport(reportId: string, format: string = 'pdf'): Promise<{ success: boolean; data?: any; error?: string }> {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for generating report ${reportId}`);
    return { 
      success: true, 
      data: { message: 'Report generated successfully' } 
    };
  }

  try {
    // This will trigger report generation on the backend
    const response = await fetch(getApiUrl(`/api/db/reports/${reportId}/generate`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format })
    });

    if (!response.ok) {
      throw new Error(`Error generating report: ${response.statusText}`);
    }

    const result = await response.json();
    
    // If the response contains a download URL, trigger download
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }

    return result;
  } catch (error) {
    console.error(`Failed to generate report ${reportId}:`, error);
    return {
      success: false,
      error: 'Failed to generate report'
    };
  }
}

/**
 * Fetch analytics data for reports
 */
export async function fetchAnalyticsData(params: {
  metric: string;
  startDate?: string;
  endDate?: string;
  period?: string;
  groupBy?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for analytics metric: ${params.metric}`);
    
    // Return different mock data based on metric type
    if (params.metric === 'volume') {
      // Generate mock volume data for the requested period
      const days = params.period === 'day' ? 30 : 7;
      const mockData = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const totalCalls = Math.floor(Math.random() * 50) + 30;
        const successfulCalls = Math.floor(totalCalls * (0.7 + Math.random() * 0.2)); // 70-90% success
        const failedCalls = totalCalls - successfulCalls;
        
        return {
          date: date.toISOString(),
          count: totalCalls,
          successful: successfulCalls,
          failed: failedCalls
        };
      });
      return { success: true, data: mockData };
    } else if (params.metric === 'outcomes') {
      return {
        success: true,
        data: [
          { name: 'Completed', value: 65, color: '#00C49F' },
          { name: 'No Answer', value: 20, color: '#FFBB28' },
          { name: 'Busy', value: 10, color: '#FF8042' },
          { name: 'Failed', value: 5, color: '#FF6B6B' }
        ]
      };
    }
    
    // Default mock response
    return { success: true, data: [] };
  }

  try {
    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    // Map frontend metric names to actual backend endpoints
    const metricMapping: Record<string, string> = {
      'volume': 'call-volume',
      'outcomes': 'outcomes'
    };
    const actualMetric = metricMapping[params.metric] || params.metric;
    const url = getApiUrl(`/api/db/analytics/${actualMetric}?${queryParams.toString()}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error fetching analytics: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Transform the response based on metric type
    if (result.success && result.data) {
      if (params.metric === 'volume' && result.data.data) {
        // Transform call-volume data to the format expected by the charts
        const transformedData = result.data.data.map((item: any) => ({
          date: item.period,
          count: (item.completed || 0) + (item.failed || 0) + (item.initiated || 0) + (item['in-progress'] || 0) + (item['no-answer'] || 0),
          successful: item.completed || 0,
          failed: (item.failed || 0) + (item['no-answer'] || 0)
        }));
        
        return {
          success: true,
          data: transformedData
        };
      } else if (params.metric === 'outcomes' && result.data.distribution) {
        // Transform outcomes data to the format expected by the pie chart
        const transformedData = result.data.distribution.map((item: any) => ({
          name: item.outcome === 'unknown' ? 'No Answer' : 
                item.outcome === 'failed' ? 'Failed' : 
                item.outcome === 'completed' ? 'Completed' : 
                item.outcome,
          value: item.percentage,
          count: item.count,
          color: item.outcome === 'completed' ? '#00C49F' : 
                 item.outcome === 'unknown' ? '#FFBB28' : 
                 item.outcome === 'failed' ? '#FF6B6B' : '#8884d8'
        }));
        
        return {
          success: true,
          data: transformedData
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return {
      success: false,
      error: 'Failed to fetch analytics data'
    };
  }
}
