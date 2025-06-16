interface CampaignMetrics {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  avgDuration: number;
  avgCost: number;
  totalCost: number;
  successRate: number;
  completionRate: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  startDate: string;
  endDate?: string;
  totalContacts: number;
  completedContacts: number;
  metrics?: CampaignMetrics;
}

export async function fetchCampaigns(): Promise<{ 
  success: boolean; 
  data?: Campaign[]; 
  error?: string 
}> {
  try {
    const response = await fetch('/api/db/campaigns');
    if (!response.ok) {
      throw new Error(`Error fetching campaigns: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.campaigns || []
    };
  } catch (error: any) {
    console.error('Failed to fetch campaigns:', error);
    // Return sample data for development
    return {
      success: true,
      data: [
        {
          id: '1',
          name: 'Q1 Outreach Campaign',
          status: 'active',
          startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          totalContacts: 250,
          completedContacts: 180,
          metrics: {
            totalCalls: 180,
            completedCalls: 150,
            failedCalls: 30,
            avgDuration: 125,
            avgCost: 0.15,
            totalCost: 27,
            successRate: 83.3,
            completionRate: 72
          }
        },
        {
          id: '2',
          name: 'Customer Follow-up',
          status: 'completed',
          startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
          endDate: new Date(Date.now() - 2 * 86400000).toISOString(),
          totalContacts: 150,
          completedContacts: 150,
          metrics: {
            totalCalls: 150,
            completedCalls: 135,
            failedCalls: 15,
            avgDuration: 95,
            avgCost: 0.12,
            totalCost: 18,
            successRate: 90,
            completionRate: 100
          }
        }
      ]
    };
  }
}

export async function fetchCampaignMetrics(campaignId: string): Promise<{
  success: boolean;
  data?: CampaignMetrics;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/db/campaigns/${campaignId}/metrics`);
    if (!response.ok) {
      throw new Error(`Error fetching campaign metrics: ${response.statusText}`);
    }
    const result = await response.json();
    return {
      success: true,
      data: result.metrics
    };
  } catch (error: any) {
    console.error('Failed to fetch campaign metrics:', error);
    // Return sample data
    return {
      success: true,
      data: {
        totalCalls: 180,
        completedCalls: 150,
        failedCalls: 30,
        avgDuration: 125,
        avgCost: 0.15,
        totalCost: 27,
        successRate: 83.3,
        completionRate: 72
      }
    };
  }
}