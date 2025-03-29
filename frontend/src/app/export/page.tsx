"use client"

import { useState } from 'react'
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  Filter,
  Calendar,
  BarChart
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckboxItem, CheckboxTrigger } from '@/components/ui/checkbox'
import { DateRangePicker } from '@/components/date-range-picker'
import { exportData } from '@/lib/api'
import { DateRange } from 'react-day-picker'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/components/ui/use-toast'

export default function ExportPage() {
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  const callDataSchema = z.object({
    format: z.enum(['csv', 'json', 'excel']),
    filename: z.string().optional(),
    includeRecordings: z.boolean().default(false),
    includeTranscripts: z.boolean().default(false),
    includeMetrics: z.boolean().default(true)
  })

  const callDataForm = useForm<z.infer<typeof callDataSchema>>({
    resolver: zodResolver(callDataSchema),
    defaultValues: {
      format: 'csv',
      includeRecordings: false,
      includeTranscripts: false,
      includeMetrics: true
    }
  })

  const analyticsDataSchema = z.object({
    format: z.enum(['csv', 'json', 'excel']),
    filename: z.string().optional(),
    reportType: z.enum(['conversation_quality', 'agent_performance', 'call_volume', 'custom']),
    metrics: z.array(z.string()).min(1, "Select at least one metric")
  })

  const analyticsDataForm = useForm<z.infer<typeof analyticsDataSchema>>({
    resolver: zodResolver(analyticsDataSchema),
    defaultValues: {
      format: 'excel',
      reportType: 'conversation_quality',
      metrics: ['quality_score', 'success_rate']
    }
  })

  const campaignDataSchema = z.object({
    format: z.enum(['csv', 'json', 'excel']),
    filename: z.string().optional(),
    campaignId: z.string().optional(),
    includeContactList: z.boolean().default(true),
    includeCallResults: z.boolean().default(true)
  })

  const campaignDataForm = useForm<z.infer<typeof campaignDataSchema>>({
    resolver: zodResolver(campaignDataSchema),
    defaultValues: {
      format: 'excel',
      includeContactList: true,
      includeCallResults: true
    }
  })

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
  }

  const handleExportCallData = async (data: z.infer<typeof callDataSchema>) => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Date range required",
        description: "Please select a date range for the export",
        variant: "destructive"
      })
      return
    }

    setExportLoading('calls')
    try {
      const exportOptions = {
        ...data,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        filename: data.filename || `call-data-export-${new Date().toISOString().slice(0, 10)}`
      }

      const result = await exportData('calls', exportOptions)
      
      if (result.success) {
        toast({
          title: "Export successful",
          description: "Your data has been exported successfully"
        })
      } else {
        toast({
          title: "Export failed",
          description: result.error || "An error occurred during export",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportAnalyticsData = async (data: z.infer<typeof analyticsDataSchema>) => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Date range required",
        description: "Please select a date range for the export",
        variant: "destructive"
      })
      return
    }

    setExportLoading('analytics')
    try {
      const exportOptions = {
        ...data,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        filename: data.filename || `analytics-export-${data.reportType}-${new Date().toISOString().slice(0, 10)}`
      }

      const result = await exportData('analytics', exportOptions)
      
      if (result.success) {
        toast({
          title: "Export successful",
          description: "Your analytics data has been exported successfully"
        })
      } else {
        toast({
          title: "Export failed",
          description: result.error || "An error occurred during export",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportCampaignData = async (data: z.infer<typeof campaignDataSchema>) => {
    setExportLoading('campaigns')
    try {
      const exportOptions = {
        ...data,
        filename: data.filename || `campaign-export-${new Date().toISOString().slice(0, 10)}`
      }

      const result = await exportData('campaigns', exportOptions)
      
      if (result.success) {
        toast({
          title: "Export successful",
          description: "Your campaign data has been exported successfully"
        })
      } else {
        toast({
          title: "Export failed",
          description: result.error || "An error occurred during export",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setExportLoading(null)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader 
        heading="Export Data" 
        text="Export call data, analytics, and campaign information." 
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Call Exports
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Export call data including recordings, transcripts, and metrics.
            </p>
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <a href="#call-data">Export Call Data</a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Analytics Exports
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Export analytics data and metrics for reporting.
            </p>
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <a href="#analytics-data">Export Analytics</a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Campaign Exports
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Export campaign data including contacts and results.
            </p>
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <a href="#campaign-data">Export Campaign Data</a>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Date Range</CardTitle>
              <CardDescription>
                Select the date range for your export
              </CardDescription>
            </div>
            <DateRangePicker
              onChange={handleDateRangeChange}
            />
          </div>
        </CardHeader>
      </Card>
      
      <div id="call-data" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Call Data Export</CardTitle>
            <CardDescription>
              Export call records, recordings, transcripts, and metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...callDataForm}>
              <form onSubmit={callDataForm.handleSubmit(handleExportCallData)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={callDataForm.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={callDataForm.control}
                    name="filename"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filename (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="call-data-export" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={callDataForm.control}
                    name="includeMetrics"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <CheckboxTrigger
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Metrics
                          </FormLabel>
                          <FormDescription>
                            Call quality and performance metrics
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={callDataForm.control}
                    name="includeRecordings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <CheckboxTrigger
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Recordings
                          </FormLabel>
                          <FormDescription>
                            URLs to call recordings
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={callDataForm.control}
                    name="includeTranscripts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <CheckboxTrigger
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Transcripts
                          </FormLabel>
                          <FormDescription>
                            Call conversation transcripts
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="mt-4"
                  disabled={exportLoading === 'calls'}
                >
                  {exportLoading === 'calls' ? (
                    <>Exporting...</>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Call Data
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <div id="analytics-data" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Data Export</CardTitle>
            <CardDescription>
              Export analytics data and metrics for reporting and analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...analyticsDataForm}>
              <form onSubmit={analyticsDataForm.handleSubmit(handleExportAnalyticsData)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={analyticsDataForm.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={analyticsDataForm.control}
                    name="filename"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filename (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="analytics-export" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={analyticsDataForm.control}
                  name="reportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conversation_quality">Conversation Quality</SelectItem>
                          <SelectItem value="agent_performance">Agent Performance</SelectItem>
                          <SelectItem value="call_volume">Call Volume</SelectItem>
                          <SelectItem value="custom">Custom Metrics</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={analyticsDataForm.control}
                  name="metrics"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Metrics to Include</FormLabel>
                        <FormDescription>
                          Select the metrics to include in your export
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={analyticsDataForm.control}
                          name="metrics"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <CheckboxTrigger
                                  checked={field.value?.includes('quality_score')}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, 'quality_score'])
                                      : field.onChange(field.value?.filter(
                                          (value) => value !== 'quality_score'
                                        ))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Quality Score
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={analyticsDataForm.control}
                          name="metrics"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <CheckboxTrigger
                                  checked={field.value?.includes('success_rate')}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, 'success_rate'])
                                      : field.onChange(field.value?.filter(
                                          (value) => value !== 'success_rate'
                                        ))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Success Rate
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={analyticsDataForm.control}
                          name="metrics"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <CheckboxTrigger
                                  checked={field.value?.includes('completion_rate')}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, 'completion_rate'])
                                      : field.onChange(field.value?.filter(
                                          (value) => value !== 'completion_rate'
                                        ))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Completion Rate
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={analyticsDataForm.control}
                          name="metrics"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <CheckboxTrigger
                                  checked={field.value?.includes('call_duration')}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, 'call_duration'])
                                      : field.onChange(field.value?.filter(
                                          (value) => value !== 'call_duration'
                                        ))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Call Duration
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="mt-4"
                  disabled={exportLoading === 'analytics'}
                >
                  {exportLoading === 'analytics' ? (
                    <>Exporting...</>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Analytics Data
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <div id="campaign-data" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Data Export</CardTitle>
            <CardDescription>
              Export campaign data including contact lists and results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...campaignDataForm}>
              <form onSubmit={campaignDataForm.handleSubmit(handleExportCampaignData)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={campaignDataForm.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignDataForm.control}
                    name="filename"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filename (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="campaign-export" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={campaignDataForm.control}
                  name="campaignId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select campaign (or export all)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All Campaigns</SelectItem>
                          <SelectItem value="camp_1">March Re-Engagement Campaign</SelectItem>
                          <SelectItem value="camp_2">New Feature Announcement</SelectItem>
                          <SelectItem value="camp_3">Feedback Collection</SelectItem>
                          <SelectItem value="camp_4">ASX200 Strategy Outreach</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave empty to export all campaigns
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={campaignDataForm.control}
                    name="includeContactList"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <CheckboxTrigger
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Contact List
                          </FormLabel>
                          <FormDescription>
                            The list of contacts in the campaign
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignDataForm.control}
                    name="includeCallResults"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <CheckboxTrigger
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Include Call Results
                          </FormLabel>
                          <FormDescription>
                            The outcomes and metrics for each call
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="mt-4"
                  disabled={exportLoading === 'campaigns'}
                >
                  {exportLoading === 'campaigns' ? (
                    <>Exporting...</>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Campaign Data
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
