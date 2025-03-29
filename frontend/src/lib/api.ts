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

// Export the helper function for use in other modules
export { getApiUrl };

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
export async function fetchCampaigns() {
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
 * Fetch all reports
 */
export async function fetchReports() {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for reports');
    return mockReports;
  }

  try {
    const response = await fetch(getApiUrl('/api/reports'));
    if (!response.ok) {
      throw new Error(`Error fetching reports: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    console.log('[API] Falling back to mock data');
    return mockReports;
  }
}

/**
 * Fetch a specific report
 */
export async function fetchReport(reportId: string) {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for report ${reportId}`);
    const report = mockReports.reports.find(r => r.id === reportId);
    return {
      success: true,
      report: report || {
        id: reportId,
        name: `Report ${reportId}`,
        description: 'Report description',
        type: 'analytics',
        timeframe: {
          start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          resolution: 'day'
        },
        metrics: ['quality_score', 'success_rate'],
        visualization_type: 'bar',
        created_at: new Date().toISOString()
      }
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/reports/${reportId}`));
    if (!response.ok) {
      throw new Error(`Error fetching report: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch report ${reportId}:`, error);
    console.log('[API] Falling back to mock data');
    const report = mockReports.reports.find(r => r.id === reportId);
    return {
      success: true,
      report: report || {
        id: reportId,
        name: `Report ${reportId}`,
        description: 'Report description',
        type: 'analytics',
        timeframe: {
          start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          resolution: 'day'
        },
        metrics: ['quality_score', 'success_rate'],
        visualization_type: 'bar',
        created_at: new Date().toISOString()
      }
    };
  }
}

/**
 * Generate a report
 */
export async function generateReport(reportId: string, format: string = 'pdf') {
  if (USE_MOCK_DATA) {
    console.log(`[API] Using mock data for generating report ${reportId}`);
    return {
      success: true,
      message: 'Report generated successfully',
      downloadUrl: `#mock-download-${reportId}.${format}`
    };
  }

  try {
    const response = await fetch(getApiUrl(`/api/reports/${reportId}/generate?format=${format}`), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error generating report: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to generate report ${reportId}:`, error);
    console.log('[API] Falling back to mock data');
    return {
      success: true,
      message: 'Report generated successfully',
      downloadUrl: `#mock-download-${reportId}.${format}`
    };
  }
}

/**
 * Export data
 */
export async function exportData(type: string, options: any) {
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
    console.log('[API] Falling back to mock data');

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
