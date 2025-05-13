"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Download, 
  FileText, 
  ChevronLeft, 
  RefreshCw, 
  Clock, 
  Calendar, 
  BarChart,
  Mail,
  FileSpreadsheet,
  Pencil
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportConfig } from '@/lib/types'
import { fetchReport, generateReport } from '@/lib/api'
import { ConversationQualityChart } from '@/components/conversation-quality-chart'
import { AgentPerformanceTable } from '@/components/agent-performance-table'
import { ConversationVolumeChart } from '@/components/conversation-volume-chart'
import { SuccessRateChart } from '@/components/success-rate-chart'
import { TopicDistributionChart } from '@/components/topic-distribution-chart'

export default function ReportDetailPage({ params }: { params: { id: string }}) {
  const router = useRouter()
  const { id } = params
  const [report, setReport] = useState<ReportConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // In a real implementation, this would fetch from the API
      // const response = await fetchReport(id)
      
      // For now, use sample data
      setTimeout(() => {
        // Check if the ID matches one of our sample IDs
        const reportData = sampleReports.find(r => r.id === id) || sampleReports[0]
        setReport(reportData)
        setLoading(false)
      }, 1000)
    } catch (err) {
      setError('An error occurred while loading the report')
      console.error(err)
      setLoading(false)
    }
  }

  const handleGenerateReport = async (format: string = 'pdf') => {
    setGeneratingReport(true)
    
    try {
      const response = await generateReport(id, format)
      
      if (!response.success) {
        setError(`Failed to generate report: ${response.error}`)
      }
    } catch (err) {
      setError('An error occurred while generating the report')
      console.error(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  // Sample data for demonstration
  const sampleReports: ReportConfig[] = [
    {
      id: 'rep_1',
      name: 'Monthly Call Performance',
      description: 'Summary of call volumes and success rates for the past month',
      type: 'analytics',
      timeframe: {
        start_date: '2025-02-24',
        end_date: '2025-03-24',
        resolution: 'day'
      },
      metrics: ['call_volume', 'success_rate', 'completion_rate', 'quality_score'],
      visualization_type: 'line',
      created_at: '2025-03-01T09:00:00Z',
      schedule: {
        recurring: true,
        frequency: 'monthly',
        day_of_month: 1,
        time: '08:00',
        recipients: ['team@investorsignals.com']
      }
    },
    {
      id: 'rep_2',
      name: 'Agent Performance Comparison',
      description: 'Comparison of different agent configurations and their performance metrics',
      type: 'analytics',
      timeframe: {
        start_date: '2025-01-01',
        end_date: '2025-03-24',
        resolution: 'week'
      },
      metrics: ['success_rate', 'quality_score', 'conversation_duration'],
      visualization_type: 'bar',
      created_at: '2025-02-15T14:30:00Z'
    },
    {
      id: 'rep_3',
      name: 'March Re-Engagement Campaign Results',
      description: 'Results and performance metrics for the March re-engagement campaign',
      type: 'campaign',
      timeframe: {
        start_date: '2025-03-15',
        end_date: '2025-03-24',
        resolution: 'day'
      },
      metrics: ['call_volume', 'success_rate', 'completion_rate', 'quality_score'],
      visualization_type: 'table',
      created_at: '2025-03-20T16:45:00Z'
    },
    {
      id: 'rep_4',
      name: 'Weekly Activity Summary',
      description: 'Summary of call activities and performance for the past week',
      type: 'custom',
      timeframe: {
        start_date: '2025-03-17',
        end_date: '2025-03-24',
        resolution: 'day'
      },
      metrics: ['call_volume', 'success_rate', 'average_duration'],
      visualization_type: 'table',
      created_at: '2025-03-18T09:15:00Z',
      schedule: {
        recurring: true,
        frequency: 'weekly',
        day_of_week: 1, // Monday
        time: '08:00',
        recipients: ['team@investorsignals.com']
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[30vh]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <DashboardHeader title="Report Error" description="An error occurred while loading the report." />
          <Button 
            variant="outline"
            onClick={() => router.push('/reports')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-red-500">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => loadReport()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <DashboardHeader title="Report Not Found" description="The requested report could not be found." />
          <Button 
            variant="outline"
            onClick={() => router.push('/reports')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </div>
      </div>
    )
  }

  // Create filters object for chart components
  const filters = {
    timeframe: {
      start_date: report.timeframe.start_date,
      end_date: report.timeframe.end_date,
      resolution: report.timeframe.resolution
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title={report.name}
          description={report.description || 'View report details and visualizations'}
        />
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/reports')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => router.push(`/reports/${id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Report Type
            </CardTitle>
            {report.type === 'analytics' && <BarChart className="h-4 w-4 text-muted-foreground" />}
            {report.type === 'campaign' && <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />}
            {report.type === 'custom' && <FileText className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold capitalize">{report.type}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Timeframe
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {new Date(report.timeframe.start_date).toLocaleDateString()} - {new Date(report.timeframe.end_date).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {report.timeframe.resolution} resolution
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Schedule
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {report.schedule?.recurring ? (
                <Badge variant="secondary" className="text-xs capitalize">
                  {report.schedule.frequency}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  On-demand
                </Badge>
              )}
            </div>
            {report.schedule?.recipients && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Mail className="mr-1 h-3 w-3" />
                {report.schedule.recipients.length} recipient(s)
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Export
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleGenerateReport('pdf')}
                disabled={generatingReport}
              >
                {generatingReport ? (
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3 w-3" />
                )}
                PDF
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleGenerateReport('excel')}
                disabled={generatingReport}
              >
                <Download className="mr-2 h-3 w-3" />
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Visualization</CardTitle>
          <CardDescription>
            Visualization of report data based on selected metrics and timeframe.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[500px]">
          {/* Render different visualizations based on the report type and visualization type */}
          {report.type === 'analytics' && report.visualization_type === 'line' && (
            <ConversationQualityChart filters={filters} />
          )}
          
          {report.type === 'analytics' && report.visualization_type === 'bar' && (
            <AgentPerformanceTable filters={filters} />
          )}
          
          {report.type === 'campaign' && report.visualization_type === 'line' && (
            <ConversationVolumeChart />
          )}
          
          {report.type === 'campaign' && report.visualization_type === 'bar' && (
            <SuccessRateChart />
          )}
          
          {report.visualization_type === 'pie' && (
            <TopicDistributionChart filters={filters} />
          )}
          
          {/* Fallback for other combinations */}
          {!(['line', 'bar', 'pie'].includes(report.visualization_type)) && (
            <div className="text-center py-10 text-muted-foreground">
              <p>This visualization type is not available for preview.</p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-4"
                onClick={() => handleGenerateReport('pdf')}
                disabled={generatingReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Generate Report to View
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
