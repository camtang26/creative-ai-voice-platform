"use client"

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { AnalyticsFilters, CampaignConfig } from '@/lib/types'
import { fetchCampaignComparison } from '@/lib/mongodb-analytics'
import { fetchCampaigns } from '@/lib/api'
import { Skeleton } from './ui/skeleton'
import { Button } from './ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { cn } from '@/lib/utils'

interface CampaignComparisonChartProps {
  filters?: AnalyticsFilters
}

interface MetricOption {
  value: string
  label: string
  color: string
  format: (value: number) => string
}

export function CampaignComparisonChart({ filters }: CampaignComparisonChartProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignConfig[]>([])
  const [campaignData, setCampaignData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>({
    value: 'successRate',
    label: 'Success Rate',
    color: '#10b981',
    format: (value) => `${value.toFixed(1)}%`
  })
  
  const metricOptions: MetricOption[] = [
    { value: 'successRate', label: 'Success Rate', color: '#10b981', format: (value) => `${value.toFixed(1)}%` },
    { value: 'callsPerDay', label: 'Calls Per Day', color: '#3b82f6', format: (value) => value.toFixed(1) },
    { value: 'averageDuration', label: 'Avg. Duration (sec)', color: '#6366f1', format: (value) => value.toFixed(0) },
    { value: 'completionRate', label: 'Completion Rate', color: '#f59e0b', format: (value) => `${value.toFixed(1)}%` },
    { value: 'answerRate', label: 'Answer Rate', color: '#ec4899', format: (value) => `${value.toFixed(1)}%` }
  ]

  // Load available campaigns on mount
  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetchCampaigns()
        
        if (response.success) {
          setAvailableCampaigns(response.campaigns || []) // Reverted to response.campaigns
          
          // Auto-select up to 3 campaigns
          const completedCampaigns = (response.campaigns || []) // Reverted to response.campaigns
            .filter((c: CampaignConfig) => c.status === 'completed') // Keep explicit type for safety
            .slice(0, 3)
            .map((c: CampaignConfig) => c.id!) // Added explicit type for c in map
          
          if (completedCampaigns.length > 0) {
            setSelectedCampaigns(completedCampaigns)
          }
        } else {
          setError('Failed to load available campaigns')
        }
      } catch (err) {
        console.error('Error loading campaigns:', err)
        setError('An error occurred loading available campaigns')
      }
    }
    
    loadCampaigns()
  }, [])
  
  // Load campaign comparison data when selected campaigns change
  useEffect(() => {
    async function loadComparisonData() {
      if (selectedCampaigns.length === 0) {
        setCampaignData([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchCampaignComparison(selectedCampaigns)
        
        if (response.success) {
          // Process and transform the data for the chart
          const chartData = processCampaignData(response.data)
          setCampaignData(chartData)
        } else {
          console.error('Failed to fetch campaign comparison data:', response.error)
          setError(response.error || 'Failed to load comparison data')
          setCampaignData(generateSampleData())
        }
      } catch (err) {
        console.error('Error fetching campaign comparison data:', err)
        setError('An error occurred loading comparison data')
        setCampaignData(generateSampleData())
      } finally {
        setLoading(false)
      }
    }
    
    loadComparisonData()
  }, [selectedCampaigns])
  
  // Process campaign data from the API response
  function processCampaignData(data: any[]) {
    if (!Array.isArray(data) || data.length === 0) {
      return generateSampleData()
    }
    
    return data.map(campaign => {
      // Calculate various metrics
      const totalCalls = campaign.stats?.totalCalls || 0
      const completedCalls = campaign.stats?.completedCalls || 0
      const successfulCalls = campaign.stats?.successfulCalls || 0
      const answeredCalls = campaign.stats?.answeredCalls || 0
      const totalDuration = campaign.stats?.totalDuration || 0
      
      // Calculate time range in days
      let daysActive = 1
      if (campaign.stats?.firstCallDate && campaign.stats?.lastCallDate) {
        const first = new Date(campaign.stats.firstCallDate)
        const last = new Date(campaign.stats.lastCallDate)
        daysActive = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)))
      }
      
      return {
        name: campaign.name || `Campaign ${campaign.id.substring(0, 8)}`,
        id: campaign.id,
        successRate: (successfulCalls / Math.max(1, completedCalls)) * 100,
        completionRate: (completedCalls / Math.max(1, totalCalls)) * 100,
        answerRate: (answeredCalls / Math.max(1, totalCalls)) * 100,
        averageDuration: totalDuration / Math.max(1, completedCalls),
        callsPerDay: totalCalls / daysActive,
        totalCalls: totalCalls
      }
    })
  }
  
  // Generate sample data for fallback
  function generateSampleData() {
    return [
      { 
        name: 'March Campaign', 
        id: 'camp-1',
        successRate: 72.5, 
        completionRate: 95.2,
        answerRate: 82.3,
        averageDuration: 145,
        callsPerDay: 27.4,
        totalCalls: 248
      },
      { 
        name: 'April Outreach', 
        id: 'camp-2',
        successRate: 68.3, 
        completionRate: 91.7,
        answerRate: 78.9,
        averageDuration: 132,
        callsPerDay: 31.2,
        totalCalls: 312
      },
      { 
        name: 'May Follow-ups', 
        id: 'camp-3',
        successRate: 76.9, 
        completionRate: 94.3,
        answerRate: 84.6,
        averageDuration: 158,
        callsPerDay: 23.8,
        totalCalls: 186
      }
    ]
  }
  
  // Handle campaign selection
  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId)
      } else {
        // Limit to 5 campaigns max
        if (prev.length >= 5) return prev
        return [...prev, campaignId]
      }
    })
  }
  
  // Get campaign name by ID
  const getCampaignName = (id: string) => {
    const campaign = availableCampaigns.find(c => c.id === id)
    return campaign?.name || id
  }
  
  if (loading && selectedCampaigns.length > 0) {
    return <Skeleton className="w-full h-[500px]" />
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 justify-between">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between w-full sm:w-[250px]"
            >
              Select Campaigns ({selectedCampaigns.length})
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full sm:w-[350px] p-0">
            <Command>
              <CommandInput placeholder="Search campaigns..." />
              <CommandEmpty>No campaigns found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {availableCampaigns.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    No available campaigns found
                  </div>
                ) : (
                  availableCampaigns.map((campaign) => (
                    <CommandItem
                      key={campaign.id}
                      value={campaign.id}
                      onSelect={() => {
                        toggleCampaign(campaign.id!)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCampaigns.includes(campaign.id!) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {campaign.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({campaign.status})
                      </span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        <div className="flex space-x-2">
          {metricOptions.map(metric => (
            <Button
              key={metric.value}
              variant={selectedMetric.value === metric.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMetric(metric)}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      {selectedCampaigns.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg border border-dashed">
          <div className="text-center p-6">
            <h3 className="text-lg font-medium">No Campaigns Selected</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2">
              Select campaigns from the dropdown above to compare their performance metrics.
            </p>
          </div>
        </div>
      ) : campaignData.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg border border-dashed">
          <div className="text-center p-6">
            <h3 className="text-lg font-medium">No Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2">
              There is no comparison data available for the selected campaigns.
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={campaignData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis 
              tickFormatter={(value) => selectedMetric.format(value)}
            />
            <Tooltip 
              formatter={(value) => [selectedMetric.format(value as number), selectedMetric.label]}
            />
            <Legend />
            <Bar 
              dataKey={selectedMetric.value} 
              fill={selectedMetric.color}
            >
              <LabelList 
                dataKey={selectedMetric.value} 
                position="top" 
                formatter={(value: number) => selectedMetric.format(value)} // Added explicit type for value, removed 'as number'
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
