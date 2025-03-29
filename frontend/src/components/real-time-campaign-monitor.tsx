"use client"

import { EnhancedCampaignMonitoring } from '@/components/enhanced-campaign-monitoring'

interface RealTimeCampaignMonitorProps {
  campaignId: string
  initialData?: any
}

// This is a wrapper component for backward compatibility
export function RealTimeCampaignMonitor({ campaignId, initialData }: RealTimeCampaignMonitorProps) {
  return (
    <EnhancedCampaignMonitoring 
      campaignId={campaignId} 
      initialData={initialData} 
    />
  )
}
