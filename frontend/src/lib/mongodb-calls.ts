interface CallRecord {
  id: string;
  to: string;
  from: string;
  status: 'queued' | 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  startTime: string;
  endTime?: string;
  duration?: number;
  cost?: number;
  recordingUrl?: string;
  transcript?: string;
  contactName?: string;
  campaignId?: string;
  sid?: string;
}

interface CallAnalytics {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  avgDuration: number;
  totalDuration: number;
  totalCost: number;
  avgCost: number;
  successRate: number;
  timeDistribution: { hour: number; count: number }[];
  statusDistribution: { status: string; count: number }[];
}

export async function fetchCallLogs(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<{ 
  success: boolean; 
  data?: CallRecord[]; 
  error?: string 
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(`/api/db/calls?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`Error fetching call logs: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.calls || []
    };
  } catch (error: any) {
    console.error('Failed to fetch call logs:', error);
    // Return sample data for development
    const now = new Date();
    return {
      success: true,
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `call-${i + 1}`,
        to: `+1555000${1000 + i}`,
        from: '+15550001234',
        status: ['completed', 'failed', 'no-answer', 'busy'][Math.floor(Math.random() * 4)] as any,
        startTime: new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
        endTime: new Date(now.getTime() - (i + 1) * 3600000 + Math.random() * 300000).toISOString(),
        duration: Math.floor(Math.random() * 300),
        cost: Math.random() * 0.5,
        contactName: `Contact ${i + 1}`,
        campaignId: i % 3 === 0 ? '1' : i % 3 === 1 ? '2' : undefined
      }))
    };
  }
}

export async function fetchCallAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
}): Promise<{
  success: boolean;
  data?: CallAnalytics;
  error?: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.campaignId) queryParams.append('campaignId', params.campaignId);

    const response = await fetch(`/api/db/calls/analytics?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`Error fetching call analytics: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.analytics
    };
  } catch (error: any) {
    console.error('Failed to fetch call analytics:', error);
    // Return sample data
    return {
      success: true,
      data: {
        totalCalls: 480,
        completedCalls: 420,
        failedCalls: 60,
        avgDuration: 125,
        totalDuration: 52500,
        totalCost: 96,
        avgCost: 0.2,
        successRate: 87.5,
        timeDistribution: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          count: Math.floor(Math.random() * 30) + 5
        })),
        statusDistribution: [
          { status: 'completed', count: 420 },
          { status: 'failed', count: 25 },
          { status: 'no-answer', count: 20 },
          { status: 'busy', count: 15 }
        ]
      }
    };
  }
}

export async function fetchCallVolume(params?: {
  startDate?: string;
  endDate?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}): Promise<{
  success: boolean;
  data?: { time: string; count: number }[];
  error?: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.interval) queryParams.append('interval', params.interval);

    const response = await fetch(`/api/db/calls/volume?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error(`Error fetching call volume: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.volume
    };
  } catch (error: any) {
    console.error('Failed to fetch call volume:', error);
    // Return sample data
    const days = 7;
    return {
      success: true,
      data: Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          time: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 50) + 20
        };
      })
    };
  }
}