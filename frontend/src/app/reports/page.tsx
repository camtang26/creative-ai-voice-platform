"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  Download, 
  BarChart, 
  TrendingUp,
  PhoneCall,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  FileDown,
  Filter,
  Clock,
  Activity,
  PieChart,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { fetchDashboardOverview, fetchAnalyticsData, fetchCampaigns } from '@/lib/api'
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [callVolumeData, setCallVolumeData] = useState<any[]>([])
  const [campaignData, setCampaignData] = useState<any[]>([])
  const [outcomeData, setOutcomeData] = useState<any[]>([])
  const [costData, setCostData] = useState<any>(null)
  const [qualityData, setQualityData] = useState<any>(null)

  useEffect(() => {
    loadAllData()
  }, [dateRange])

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadDashboardData(),
        loadCallVolumeData(),
        loadCampaignData(),
        loadOutcomeData(),
        loadCostData(),
        loadQualityData()
      ])
    } catch (error) {
      console.error('Error loading reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      // Note: fetchDashboardOverview doesn't take parameters, date filtering would need to be implemented in the API
      const response = await fetchDashboardOverview()
      if (response.success) {
        setDashboardData(response.data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const loadCallVolumeData = async () => {
    try {
      const response = await fetchAnalyticsData({
        metric: 'volume',
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
        period: 'day'
      })
      
      if (response.success && response.data) {
        // Transform data for charts
        const chartData = response.data.map((item: any) => ({
          date: format(new Date(item.date), 'MMM dd'),
          calls: item.count || 0,
          successful: item.successful || 0,
          failed: item.failed || 0
        }))
        setCallVolumeData(chartData)
      }
    } catch (error) {
      console.error('Error loading call volume data:', error)
      // Use sample data as fallback
      const sampleData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i)
        return {
          date: format(date, 'MMM dd'),
          calls: Math.floor(Math.random() * 100) + 50,
          successful: Math.floor(Math.random() * 80) + 40,
          failed: Math.floor(Math.random() * 20) + 5
        }
      })
      setCallVolumeData(sampleData)
    }
  }

  const loadCampaignData = async () => {
    try {
      const response = await fetchCampaigns()
      if (response.success && response.campaigns) {
        // Calculate campaign metrics
        const campaignMetrics = await Promise.all(
          response.campaigns.slice(0, 5).map(async (campaign: any) => {
            // For now, using mock data as we don't have campaign-specific call filtering
            // TODO: Implement campaign-specific call filtering in the API
            const totalCalls = campaign.completedContacts || 0
            const successfulCalls = Math.round(totalCalls * 0.85) // Mock 85% success rate
            const avgDuration = 125 // Mock average duration in seconds
            
            return {
              name: campaign.name,
              calls: totalCalls,
              successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
              avgDuration: Math.round(avgDuration),
              status: campaign.status
            }
          })
        )
        setCampaignData(campaignMetrics)
      }
    } catch (error) {
      console.error('Error loading campaign data:', error)
      // Use sample data
      setCampaignData([
        { name: 'Q1 Outreach', calls: 450, successRate: 72, avgDuration: 185, status: 'completed' },
        { name: 'Product Launch', calls: 380, successRate: 68, avgDuration: 210, status: 'active' },
        { name: 'Customer Survey', calls: 290, successRate: 85, avgDuration: 120, status: 'completed' },
        { name: 'Sales Campaign', calls: 520, successRate: 65, avgDuration: 240, status: 'active' },
        { name: 'Support Follow-up', calls: 180, successRate: 90, avgDuration: 95, status: 'paused' }
      ])
    }
  }

  const loadOutcomeData = async () => {
    try {
      const response = await fetchAnalyticsData({
        metric: 'outcomes',
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      })
      
      if (response.success && response.data) {
        setOutcomeData(response.data)
      }
    } catch (error) {
      console.error('Error loading outcome data:', error)
      // Use sample data
      setOutcomeData([
        { name: 'Completed', value: 65, color: '#00C49F' },
        { name: 'No Answer', value: 20, color: '#FFBB28' },
        { name: 'Busy', value: 10, color: '#FF8042' },
        { name: 'Failed', value: 5, color: '#FF6B6B' }
      ])
    }
  }

  const loadCostData = async () => {
    try {
      // For now, use mock data since we're in development mode
      // TODO: Integrate with real fetchCallLogs when USE_MOCK_DATA is false
      console.log('[Reports] Using mock cost data');
      setCostData({
        totalCalls: 1820,
        totalMinutes: 5460,
        twilioCost: 46.41,
        elevenLabsCost: 245.70,
        totalCost: 292.11
      })
    } catch (error) {
      console.error('Error loading cost data:', error)
      // Use sample data
      setCostData({
        totalCalls: 1820,
        totalMinutes: 5460,
        twilioCost: 46.41,
        elevenLabsCost: 245.70,
        totalCost: 292.11
      })
    }
  }

  const loadQualityData = async () => {
    try {
      // This would fetch sentiment and quality metrics
      setQualityData({
        avgQualityScore: 4.2,
        sentimentDistribution: {
          positive: 65,
          neutral: 25,
          negative: 10
        },
        avgConversationLength: 3.5,
        firstCallResolution: 78
      })
    } catch (error) {
      console.error('Error loading quality data:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
  }

  const handleExport = async (format: string) => {
    // This would trigger export functionality
    console.log(`Exporting report in ${format} format`)
    // For now, show a simple alert
    alert(`Export functionality for ${format} format will be implemented soon!`)
  }

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    let from = new Date()
    
    switch (period) {
      case '7d':
        from = subDays(new Date(), 7)
        break
      case '30d':
        from = subDays(new Date(), 30)
        break
      case '90d':
        from = subDays(new Date(), 90)
        break
      case 'custom':
        return // Don't update date range for custom
    }
    
    setDateRange({ from, to: new Date() })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Analytics & Reports"
          description="Comprehensive insights into your calling operations"
        />
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {selectedPeriod === 'custom' && (
            <DatePickerWithRange
              date={dateRange}
              onDateChange={(range) => range && setDateRange(range)}
            />
          )}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : dashboardData?.totalCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : `${dashboardData?.successRate || 0}%`}
            </div>
            <Progress value={dashboardData?.successRate || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : `${Math.round(dashboardData?.avgCallDuration || 0)}s`}
            </div>
            <p className="text-xs text-muted-foreground">Per conversation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : `$${costData?.totalCost?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Call Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Call Volume Trend</CardTitle>
                <CardDescription>Daily call volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={callVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="calls" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="successful" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                      <Area type="monotone" dataKey="failed" stackId="2" stroke="#ff7c7c" fill="#ff7c7c" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Call Outcomes Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes</CardTitle>
                <CardDescription>Distribution of call results</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
              <CardDescription>Download this report in your preferred format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button onClick={() => handleExport('pdf')} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </Button>
                <Button onClick={() => handleExport('csv')} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as CSV
                </Button>
                <Button onClick={() => handleExport('json')} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Compare performance across your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={campaignData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="calls" fill="#8884d8" name="Total Calls" />
                    <Bar yAxisId="right" dataKey="successRate" fill="#82ca9d" name="Success Rate %" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Campaign Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignData.map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span>{campaign.calls} calls</span>
                        <span>{campaign.successRate}% success</span>
                        <span>{campaign.avgDuration}s avg duration</span>
                      </div>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}>
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData?.avgQualityScore || 0}/5.0</div>
                <Progress value={(qualityData?.avgQualityScore || 0) * 20} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">First Call Resolution</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData?.firstCallResolution || 0}%</div>
                <p className="text-xs text-muted-foreground">Issues resolved on first call</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversation Length</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qualityData?.avgConversationLength || 0} min</div>
                <p className="text-xs text-muted-foreground">Per successful call</p>
              </CardContent>
            </Card>
          </div>

          {/* Success Rate Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Success Rate Trend</CardTitle>
              <CardDescription>Daily success rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={callVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={(data) => data.calls > 0 ? (data.successful / data.calls * 100) : 0} 
                    stroke="#82ca9d" 
                    name="Success Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          {/* Cost Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Service costs for this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PhoneCall className="h-4 w-4 text-muted-foreground" />
                      <span>Twilio (Voice)</span>
                    </div>
                    <span className="font-medium">${costData?.twilioCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>ElevenLabs (AI Voice)</span>
                    </div>
                    <span className="font-medium">${costData?.elevenLabsCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Cost</span>
                      <span className="text-2xl font-bold">${costData?.totalCost?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Efficiency</CardTitle>
                <CardDescription>Cost per successful call</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      ${((costData?.totalCost || 0) / (dashboardData?.totalCalls || 1)).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Per successful call</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Minutes</span>
                      <span>{costData?.totalMinutes || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost per Minute</span>
                      <span>${((costData?.totalCost || 0) / (costData?.totalMinutes || 1)).toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation Sentiment</CardTitle>
              <CardDescription>Sentiment distribution across all conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Positive</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{qualityData?.sentimentDistribution?.positive || 0}%</span>
                    <Progress value={qualityData?.sentimentDistribution?.positive || 0} className="w-32" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Neutral</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{qualityData?.sentimentDistribution?.neutral || 0}%</span>
                    <Progress value={qualityData?.sentimentDistribution?.neutral || 0} className="w-32" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Negative</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{qualityData?.sentimentDistribution?.negative || 0}%</span>
                    <Progress value={qualityData?.sentimentDistribution?.negative || 0} className="w-32" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}