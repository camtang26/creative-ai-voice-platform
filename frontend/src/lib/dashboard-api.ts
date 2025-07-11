import { getApiUrl } from './api'; // Correct import path

// Base API URL - No longer needed here, use getApiUrl directly in fetches

// Types for dashboard data
export interface DashboardSummary {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  trend: {
    calls: number;
    duration: number;
    success: number;
  };
}

export interface CallVolumeData {
  date: string;
  count: number;
}

export interface CallDurationData {
  date: string;
  duration: number;
}

export interface CallOutcomeData {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  callVolume: CallVolumeData[];
  callDuration: CallDurationData[];
  callOutcomes: CallOutcomeData[];
  sentimentAnalysis?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface RealtimeDashboard {
  activeCallCount: number;
  activeCampaignCount: number;
  recentCalls: any[];
  queuedCalls: number;
}

export interface CallActivityData {
  period: string;
  callVolume: number;
  callDuration: number;
}

/**
 * Fetch dashboard overview data
 */
export async function fetchDashboardOverview(days: number = 7): Promise<DashboardOverview> {
  try {
    // Use the correct backend endpoint path
    const apiUrl = getApiUrl(`/api/db/analytics/dashboard?days=${days}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`Dashboard API error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
      throw new Error(`Failed to fetch dashboard data: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if the response has the expected structure
    if (!result.success || !result.data) {
      console.error('Invalid dashboard data format:', result);
      throw new Error('Invalid dashboard data format');
    }
    
    // Transform backend data to match frontend expectations
    const backendData = result.data;
    
    // Calculate derived values
    const totalCalls = backendData.calls?.total || 0;
    const completedCalls = backendData.calls?.byStatus?.find((s: any) => s.status === 'completed')?.count || 0;
    const failedCalls = backendData.calls?.byStatus?.find((s: any) => s.status === 'failed')?.count || 0;
    const activeCalls = backendData.calls?.byStatus?.find((s: any) => s.status === 'in-progress')?.count || 0;
    
    const transformedData: DashboardOverview = {
      summary: {
        totalCalls: totalCalls,
        activeCalls: activeCalls,
        completedCalls: completedCalls,
        failedCalls: failedCalls,
        totalDuration: backendData.calls?.totalDuration || 0,
        averageDuration: backendData.calls?.avgDuration || 0,
        successRate: backendData.calls?.successRate || 0,
        trend: {
          calls: backendData.calls?.trend?.calls || 0,
          duration: backendData.calls?.trend?.duration || 0,
          success: backendData.calls?.trend?.success || 0
        }
      },
      callVolume: [], // TODO: Add when backend provides this data
      callDuration: [], // TODO: Add when backend provides this data
      callOutcomes: backendData.calls?.byStatus?.map((status: any) => ({
        status: status.status,
        count: status.count,
        percentage: totalCalls > 0 ? (status.count / totalCalls) * 100 : 0
      })) || [],
      sentimentAnalysis: backendData.sentiment ? {
        positive: backendData.sentiment.find((s: any) => s.sentiment === 'positive')?.count || 0,
        neutral: backendData.sentiment.find((s: any) => s.sentiment === 'neutral')?.count || 0,
        negative: backendData.sentiment.find((s: any) => s.sentiment === 'negative')?.count || 0
      } : undefined
    };
    
    return transformedData;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch realtime dashboard data
 */
export async function fetchRealtimeDashboard(): Promise<RealtimeDashboard> {
  try {
    // Pass the CORRECT path starting with /api/
    const apiUrl = getApiUrl(`/api/db/dashboard/realtime`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`Realtime dashboard API error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
      throw new Error(`Failed to fetch realtime data: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if the response has the expected structure
    if (!result.success || !result.data) {
      console.error('Invalid realtime dashboard data format:', result);
      throw new Error('Invalid realtime dashboard data format');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error loading realtime data:', error);
    // Return default data to prevent UI errors
    return {
      activeCallCount: 0,
      activeCampaignCount: 0,
      recentCalls: [],
      queuedCalls: 0
    };
  }
}

/**
 * Fetch call activity data
 */
export async function fetchCallActivity(period: 'hour' | 'day' | 'week' | 'month' = 'day', days: number = 30): Promise<CallActivityData[]> {
  try {
    // Pass the CORRECT path starting with /api/
    const apiUrl = getApiUrl(`/api/db/dashboard/activity?period=${period}&days=${days}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`Call activity API error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
      throw new Error(`Failed to fetch call activity data: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if the response has the expected structure
    if (!result.success || !result.data) {
      console.error('Invalid call activity data format:', result);
      throw new Error('Invalid call activity data format');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error loading call activity data:', error);
    // Return empty array to prevent UI errors
    return [];
  }
}
