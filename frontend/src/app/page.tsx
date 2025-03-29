"use client";

import { DashboardHeader } from '@/components/dashboard-header'
import { EnhancedStatsCardsV2 } from '@/components/enhanced-stats-cards-v2'
import { EnhancedCallsChart } from '@/components/enhanced-calls-chart'
import { EnhancedRecentCalls } from '@/components/enhanced-recent-calls'
import { RealTimeDashboardCombinedV2 } from '@/components/real-time-dashboard-combined-v2'

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="Dashboard"
        description="Real-time overview of your calling system"
      />
      
      {/* Enhanced Stats Cards - MongoDB Integrated */}
      <EnhancedStatsCardsV2 />
      
      {/* Real-time Activity Monitor */}
      <RealTimeDashboardCombinedV2 />
      
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
