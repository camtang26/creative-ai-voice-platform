/**
 * Analytics API service for the ElevenLabs/Twilio MongoDB integration
 */
import { AnalyticsFilters, AgentPerformance } from './types';
import { getApiUrl } from './api'; // Import the central helper

// Helper function to handle API errors
const handleApiError = (error: any, errorMessage: string) => {
  console.error(errorMessage, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    data: null
  };
};

/**
 * Fetch call duration statistics by time period
 * @param {string} period - Time period (day, week, month)
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchCallDurationStats(period = 'day', options: {
  startDate?: string;
  endDate?: string;
  limit?: number;
} = {}) {
  try {
    if (!period || !['day', 'week', 'month'].includes(period)) {
      throw new Error('Valid period is required (day, week, month)');
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.limit) params.append('limit', options.limit.toString());
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/duration/${period}?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching call duration stats: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `Failed to fetch call duration stats for ${period}:`);
  }
}

/**
 * Fetch call outcome distribution
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchCallOutcomeDistribution(options: {
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/outcomes?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching call outcome distribution: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch call outcome distribution:');
  }
}

/**
 * Fetch machine detection statistics
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchMachineDetectionStats(options: {
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/machine-detection?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching machine detection stats: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch machine detection stats:');
  }
}

/**
 * Fetch conversation sentiment analysis
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchConversationSentiment(options: {
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/sentiment?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching conversation sentiment: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch conversation sentiment:');
  }
}

/**
 * Fetch dashboard summary data
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data: any}>}
 */
export async function fetchDashboardSummary(options: {
  period?: string;
  days?: number;
} = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.days) params.append('days', options.days.toString());
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/dashboard?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching dashboard summary: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch dashboard summary:');
  }
}

/**
 * Fetch agent performance metrics
 * @param {AnalyticsFilters} filters - Analytics filters
 * @returns {Promise<{success: boolean, data: AgentPerformance[]}>}
 */
export async function fetchAgentPerformance(filters: AnalyticsFilters) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters.timeframe) {
      params.append('startDate', filters.timeframe.start_date);
      params.append('endDate', filters.timeframe.end_date);
      params.append('resolution', filters.timeframe.resolution);
    }
    
    if (filters.agent_ids && filters.agent_ids.length > 0) {
      params.append('agent_ids', filters.agent_ids.join(','));
    }
    
    if (filters.minimum_quality_score) {
      params.append('min_quality', filters.minimum_quality_score.toString());
    }
    
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/analytics/agent-performance?${params.toString()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error fetching agent performance: ${response.statusText} for URL: ${apiUrl}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, 'Failed to fetch agent performance:');
  }
}

export default {
  fetchCallDurationStats,
  fetchCallOutcomeDistribution,
  fetchMachineDetectionStats,
  fetchConversationSentiment,
  fetchDashboardSummary,
  fetchAgentPerformance
};
