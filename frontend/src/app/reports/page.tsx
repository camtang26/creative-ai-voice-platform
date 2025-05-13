"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  FileText, 
  Download, 
  Clock, 
  BarChart, 
  FileSpreadsheet, 
  ArrowUpRight,
  UserCircle,
  Mail,
  RefreshCw,
  Calendar
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportConfig } from '@/lib/types'
import { fetchReports, generateReport } from '@/lib/api'

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetchReports()
      
      if (response.success) {
        setReports(response.data)
      } else {
        setError(response.error || 'Failed to load reports')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (reportId: string, format: string = 'pdf') => {
    setGeneratingReport(reportId)
    
    try {
      const response = await generateReport(reportId, format)
      
      if (!response.success) {
        setError(`Failed to generate report: ${response.error}`)
      }
    } catch (err) {
      setError('An error occurred while generating the report')
      console.error(err)
    } finally {
      setGeneratingReport(null)
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

  const displayReports = reports.length > 0 ? reports : sampleReports

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Reports"
          description="Create, schedule, and manage reports."
        />
        <Link href="/reports/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => loadReports()}
          >
            Retry
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="campaign">Campaign</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                View and manage all your reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : (
                <ReportsTable 
                  reports={displayReports} 
                  generatingReport={generatingReport}
                  onGenerateReport={handleGenerateReport}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Reports</CardTitle>
              <CardDescription>
                Reports focused on analytics and performance metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : (
                <ReportsTable 
                  reports={displayReports.filter(r => r.type === 'analytics')} 
                  generatingReport={generatingReport}
                  onGenerateReport={handleGenerateReport}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="campaign" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Reports</CardTitle>
              <CardDescription>
                Reports specific to calling campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : (
                <ReportsTable 
                  reports={displayReports.filter(r => r.type === 'campaign')} 
                  generatingReport={generatingReport}
                  onGenerateReport={handleGenerateReport}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Reports that are scheduled for automatic generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : (
                <ReportsTable 
                  reports={displayReports.filter(r => r.schedule?.recurring)} 
                  generatingReport={generatingReport}
                  onGenerateReport={handleGenerateReport}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ReportsTableProps {
  reports: ReportConfig[]
  generatingReport: string | null
  onGenerateReport: (reportId: string, format: string) => Promise<void>
}

function ReportsTable({ reports, generatingReport, onGenerateReport }: ReportsTableProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 mb-2" />
        <p>No reports found</p>
      </div>
    )
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Report Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Timeframe</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">
              <Link 
                href={`/reports/${report.id}`}
                className="flex items-center hover:underline"
              >
                {report.name}
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
              {report.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {report.description}
                </p>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {report.type === 'analytics' && <BarChart className="mr-1 h-3 w-3" />}
                {report.type === 'campaign' && <FileSpreadsheet className="mr-1 h-3 w-3" />}
                {report.type === 'custom' && <FileText className="mr-1 h-3 w-3" />}
                {report.type}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(report.timeframe.start_date).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                to {new Date(report.timeframe.end_date).toLocaleDateString()}
              </div>
            </TableCell>
            <TableCell>
              {report.schedule?.recurring ? (
                <div className="text-sm flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {report.schedule.frequency === 'daily' && 'Daily'}
                  {report.schedule.frequency === 'weekly' && 'Weekly'}
                  {report.schedule.frequency === 'monthly' && 'Monthly'}
                  
                  {report.schedule.recipients && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Mail className="mr-1 h-3 w-3" />
                      {report.schedule.recipients.length} recipient(s)
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Not scheduled</span>
              )}
            </TableCell>
            <TableCell>
              {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    if (report.id) {
                      onGenerateReport(report.id, 'pdf');
                    }
                  }}
                  disabled={!report.id || generatingReport === report.id}
                >
                  {generatingReport === report.id ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
