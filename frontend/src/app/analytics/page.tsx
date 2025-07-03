"use client"

import { useState, useEffect } from 'react'
import { type DateRange } from "react-day-picker" // Import DateRange type
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHeader } from '@/components/dashboard-header'
import { DateRangePicker } from '@/components/date-range-picker'
import { ConversationQualityChart } from '@/components/conversation-quality-chart'
import { AgentPerformanceTable } from '@/components/agent-performance-table'
import { ConversationVolumeChart } from '@/components/conversation-volume-chart'
import { TopicDistributionChart } from '@/components/topic-distribution-chart'
import { SuccessRateChart } from '@/components/success-rate-chart'
import { AnalyticsFilters } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { fetchDashboardSummary } from '@/lib/mongodb-analytics'
import { Skeleton } from '@/components/ui/skeleton'
import { CampaignComparisonChart } from '@/components/campaign-comparison-chart'
import { CallTerminationStats } from '@/components/call-termination-stats'
import { AIInsightsCard } from '@/components/ai-insights-card'

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeframe: {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      resolution: 'day'
    }
  })
  
  const [summaryData, setSummaryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard summary data on mount and when filters change
  useEffect(() => {
    loadSummaryData()
  }, [filters.timeframe.start_date, filters.timeframe.end_date])
  
  // Function to load dashboard summary data
  const loadSummaryData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Calculate days between start and end date
      const startDate = new Date(filters.timeframe.start_date)
      const endDate = new Date(filters.timeframe.end_date)
      const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
      
      const response = await fetchDashboardSummary(daysDiff)
      
      if (response.success) {
        setSummaryData(response.data)
      } else {
        setError(response.error || 'Failed to load dashboard data')
      }
    } catch (err) {
      setError('An error occurred loading dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDateRangeChange = (dateRange: DateRange) => { // Use imported DateRange
    if (dateRange?.from && dateRange?.to) {
      setFilters({
        ...filters,
        timeframe: {
          ...filters.timeframe,
          start_date: dateRange.from.toISOString().split('T')[0],
          end_date: dateRange.to.toISOString().split('T')[0]
        }
      });
    } else {
      // Optionally handle cases where only one date is selected or cleared
      // For now, we only update if both are present.
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Analytics"
          description="View and analyze conversation performance metrics."
        />
        
        <div className="flex items-center gap-2">
          <Link href="/analytics/selected-calls">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analyze Selected Calls
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadSummaryData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversation-quality">Conversation Quality</TabsTrigger>
              <TabsTrigger value="agent-performance">Agent Performance</TabsTrigger>
              <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
              <TabsTrigger value="campaigns">Campaign Comparison</TabsTrigger>
              <TabsTrigger value="terminations">Call Terminations</TabsTrigger>
            </TabsList>
            
            <DateRangePicker onChange={handleDateRangeChange} />
          </div>
          
          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[112px] w-full" />
                <Skeleton className="h-[112px] w-full" />
                <Skeleton className="h-[112px] w-full" />
              </div>
            ) : error ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-500">Error Loading Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{error}</p>
                  <Button 
                    onClick={loadSummaryData}
                    className="mt-2" 
                    size="sm"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summaryData?.summary?.totalCalls?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summaryData?.summary?.callsTrend > 0 ? '+' : ''}
                      {summaryData?.summary?.callsTrend?.toFixed(1)}% from previous period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summaryData?.sentiment?.averageScore?.toFixed(1) || '0.0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summaryData?.sentiment?.scoreTrend > 0 ? '+' : ''}
                      {summaryData?.sentiment?.scoreTrend?.toFixed(1)}% from previous period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summaryData?.summary?.successRate?.toFixed(1) || '0.0'}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summaryData?.summary?.successRateTrend > 0 ? '+' : ''}
                      {summaryData?.summary?.successRateTrend?.toFixed(1)}% from previous period
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* AI Insights Section */}
            <div className="grid gap-4">
              <AIInsightsCard 
                timeRange={{
                  start: filters.timeframe.start_date,
                  end: filters.timeframe.end_date
                }}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Conversation Volume</CardTitle>
                  <CardDescription>
                    Number of conversations over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ConversationVolumeChart filters={filters} />
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Success Rate Trend</CardTitle>
                  <CardDescription>
                    Percentage of successful conversations
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <SuccessRateChart filters={filters} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="conversation-quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Quality Scores</CardTitle>
                <CardDescription>
                  Quality scores for conversations over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2 h-[400px]">
                <ConversationQualityChart filters={filters} />
              </CardContent>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Quality Score Distribution</CardTitle>
                  <CardDescription>
                    Distribution of conversation quality scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {/* Add quality score distribution chart here */}
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Quality Factors</CardTitle>
                  <CardDescription>
                    Factors affecting conversation quality
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {/* Add quality factors chart here */}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="agent-performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance Comparison</CardTitle>
                <CardDescription>
                  Compare performance metrics across different agent configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentPerformanceTable filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Topic Distribution</CardTitle>
                <CardDescription>
                  Distribution of conversation topics
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <TopicDistributionChart filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Comparison</CardTitle>
                <CardDescription>
                  Compare performance metrics across different campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <CampaignComparisonChart filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terminations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Termination Analysis</CardTitle>
                <CardDescription>
                  Understand who is ending calls and why
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CallTerminationStats filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
