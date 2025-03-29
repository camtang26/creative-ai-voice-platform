"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/date-range-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DateRange } from 'react-day-picker'
import { 
  BarChart,
  LineChart,
  PieChart,
  Table2,
  BarChartHorizontal,
  ChevronLeft,
  Mail,
  Repeat,
  Save
} from 'lucide-react'
import { saveReport } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

export default function CreateReportPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportType, setReportType] = useState<'analytics' | 'campaign' | 'custom'>('analytics')
  const [visualizationType, setVisualizationType] = useState<'table' | 'bar' | 'line' | 'pie'>('line')
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [resolution, setResolution] = useState<'day' | 'week' | 'month'>('day')
  const [metrics, setMetrics] = useState<string[]>([
    'call_volume',
    'success_rate'
  ])
  const [hasSchedule, setHasSchedule] = useState(false)
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [emailRecipients, setEmailRecipients] = useState('')

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange)
  }

  const toggleMetric = (metric: string) => {
    setMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Validate form
      if (!reportName.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Report name is required',
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }
      
      if (metrics.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'At least one metric must be selected',
          variant: 'destructive'
        })
        setIsSubmitting(false)
        return
      }
      
      // Prepare report config
      const reportConfig = {
        name: reportName,
        description: reportDescription,
        type: reportType,
        timeframe: {
          start_date: dateRange.from?.toISOString().split('T')[0] || '',
          end_date: dateRange.to?.toISOString().split('T')[0] || '',
          resolution
        },
        metrics,
        visualization_type: visualizationType,
        ...(hasSchedule && {
          schedule: {
            recurring: true,
            frequency: scheduleFrequency,
            recipients: emailRecipients.split(',').map(email => email.trim()).filter(Boolean)
          }
        })
      }
      
      // Save report
      const response = await saveReport(reportConfig)
      
      if (response.success) {
        toast({
          title: 'Report Created',
          description: 'Your report has been created successfully',
          variant: 'default'
        })
        
        router.push('/reports')
      } else {
        throw new Error(response.error || 'Failed to create report')
      }
    } catch (error) {
      console.error('Failed to create report:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create report',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          heading="Create New Report" 
          text="Configure a new report with customized metrics and visualizations." 
        />
        <Button 
          variant="outline"
          onClick={() => router.push('/reports')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>
                Configure the basic settings for your report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel htmlFor="name">Report Name</FormLabel>
                <Input 
                  id="name" 
                  placeholder="Enter report name" 
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <FormLabel htmlFor="description">Description (Optional)</FormLabel>
                <Textarea 
                  id="description" 
                  placeholder="Enter report description" 
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <FormLabel>Report Type</FormLabel>
                <RadioGroup 
                  defaultValue="analytics" 
                  className="flex space-x-4"
                  onValueChange={(value) => setReportType(value as any)}
                  value={reportType}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="analytics" id="analytics" />
                    <FormLabel htmlFor="analytics" className="cursor-pointer">Analytics Report</FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="campaign" id="campaign" />
                    <FormLabel htmlFor="campaign" className="cursor-pointer">Campaign Report</FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <FormLabel htmlFor="custom" className="cursor-pointer">Custom Report</FormLabel>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Date Range</FormLabel>
                <DateRangePicker onChange={handleDateRangeChange} />
              </div>
              
              <div className="space-y-2">
                <FormLabel htmlFor="resolution">Data Resolution</FormLabel>
                <Select 
                  value={resolution} 
                  onValueChange={(value) => setResolution(value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  How data should be grouped in the report
                </FormDescription>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Metrics & Visualization</CardTitle>
              <CardDescription>
                Select the metrics to include and visualization type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Select Metrics</FormLabel>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="call_volume" 
                      checked={metrics.includes('call_volume')} 
                      onCheckedChange={() => toggleMetric('call_volume')}
                    />
                    <label
                      htmlFor="call_volume"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Call Volume
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="success_rate" 
                      checked={metrics.includes('success_rate')} 
                      onCheckedChange={() => toggleMetric('success_rate')}
                    />
                    <label
                      htmlFor="success_rate"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Success Rate
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="completion_rate" 
                      checked={metrics.includes('completion_rate')} 
                      onCheckedChange={() => toggleMetric('completion_rate')}
                    />
                    <label
                      htmlFor="completion_rate"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Completion Rate
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="quality_score" 
                      checked={metrics.includes('quality_score')} 
                      onCheckedChange={() => toggleMetric('quality_score')}
                    />
                    <label
                      htmlFor="quality_score"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Quality Score
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="avg_duration" 
                      checked={metrics.includes('avg_duration')} 
                      onCheckedChange={() => toggleMetric('avg_duration')}
                    />
                    <label
                      htmlFor="avg_duration"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Average Duration
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Visualization Type</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={visualizationType === 'table' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center p-4 h-24"
                    onClick={() => setVisualizationType('table')}
                  >
                    <Table2 className="h-8 w-8 mb-1" />
                    <span>Table</span>
                  </Button>
                  <Button
                    type="button"
                    variant={visualizationType === 'bar' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center p-4 h-24"
                    onClick={() => setVisualizationType('bar')}
                  >
                    <BarChartHorizontal className="h-8 w-8 mb-1" />
                    <span>Bar Chart</span>
                  </Button>
                  <Button
                    type="button"
                    variant={visualizationType === 'line' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center p-4 h-24"
                    onClick={() => setVisualizationType('line')}
                  >
                    <LineChart className="h-8 w-8 mb-1" />
                    <span>Line Chart</span>
                  </Button>
                  <Button
                    type="button"
                    variant={visualizationType === 'pie' ? 'default' : 'outline'}
                    className="flex flex-col items-center justify-center p-4 h-24"
                    onClick={() => setVisualizationType('pie')}
                  >
                    <PieChart className="h-8 w-8 mb-1" />
                    <span>Pie Chart</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Schedule (Optional)</CardTitle>
            <CardDescription>
              Set up automatic report generation and delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has_schedule" 
                checked={hasSchedule} 
                onCheckedChange={(checked) => setHasSchedule(checked as boolean)}
              />
              <label
                htmlFor="has_schedule"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Schedule recurring report generation
              </label>
            </div>
            
            {hasSchedule && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 border-t pt-4 mt-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="frequency">Frequency</FormLabel>
                  <Select 
                    value={scheduleFrequency} 
                    onValueChange={(value) => setScheduleFrequency(value as any)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <FormLabel htmlFor="recipients">Email Recipients</FormLabel>
                  <Input 
                    id="recipients" 
                    placeholder="email1@example.com, email2@example.com" 
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                  <FormDescription>
                    Comma-separated list of email addresses
                  </FormDescription>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button 
              variant="outline"
              onClick={() => router.push('/reports')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Repeat className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
