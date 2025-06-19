"use client";

import { DashboardHeader } from '@/components/dashboard-header'
import { ModernStatsDashboard } from '@/components/modern-stats-dashboard'
import { ModernRealTimeDashboard } from '@/components/modern-realtime-dashboard'
import { EnhancedCallsChart } from '@/components/enhanced-calls-chart'
import { EnhancedRecentCalls } from '@/components/enhanced-recent-calls'
import { ActiveCampaigns } from '@/components/active-campaigns'

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="Dashboard"
        description="Real-time overview of your calling system"
      />
      
      {/* Modern Stats Dashboard with Glassmorphism and Animations */}
      <ModernStatsDashboard />
      
      {/* Modern Real-time Activity Monitor */}
      <ModernRealTimeDashboard />
      
      {/* Active Campaigns Monitor */}
      <ActiveCampaigns />
      
      {/* Call Activity and Recent Calls */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <EnhancedCallsChart />
        </div>
        <div className="col-span-3">
          <EnhancedRecentCalls />
        </div>
      </div>
    </div>
  )
}
