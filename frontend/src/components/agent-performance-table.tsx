"use client"

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnalyticsFilters } from '@/lib/types' // AgentPerformance removed
import { fetchAgentPerformance, AgentPerformanceData } from '@/lib/mongodb-analytics' // AgentPerformanceData imported
import { Skeleton } from './ui/skeleton'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Loader2, RefreshCw } from 'lucide-react'

interface AgentPerformanceTableProps {
  filters: AnalyticsFilters
}

export function AgentPerformanceTable({ filters }: AgentPerformanceTableProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AgentPerformanceData[]>([]) // Changed to AgentPerformanceData

  useEffect(() => {
    loadData()
  }, [filters])
  
  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetchAgentPerformance(filters)
      
      if (response.success) {
        setData(response.data || []) // Provide fallback for undefined data
      } else {
        setError(response.error || 'Failed to load agent performance data')
        // Fallback to sample data
        setData(generateSampleAgentData())
      }
    } catch (err) {
      setError('An error occurred while loading data')
      console.error(err)
      // Fallback to sample data
      setData(generateSampleAgentData())
    } finally {
      setLoading(false)
    }
  }
  
  // Generate sample agent data for fallback
  function generateSampleAgentData(): AgentPerformanceData[] { // Changed return type
    return [
      {
        agent: 'Sales Agent A', // Was agent_id & agent_name
        callsPerDay: 248,       // Was calls_count
        successRate: 76.2,    // Was success_rate
        // completion_rate: 92.7, // Not in AgentPerformanceData
        avgDuration: 137,       // Was average_duration
        qualityScore: 83.5,   // Was average_quality_score
        // topics_covered removed
      },
      {
        agent: 'Technical Agent B',
        callsPerDay: 187,
        successRate: 72.8,
        // completion_rate: 94.1,
        avgDuration: 164,
        qualityScore: 85.2,
      },
      {
        agent: 'Customer Service Agent C',
        callsPerDay: 267,
        successRate: 81.5,
        // completion_rate: 96.3,
        avgDuration: 118,
        qualityScore: 88.7,
      }
    ]
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500 mb-3">{error}</div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadData}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Success Rate</TableHead>
              {/* <TableHead className="text-right">Completion Rate</TableHead> */} {/* Removed Completion Rate header */}
              <TableHead className="text-right">Avg. Duration</TableHead>
              <TableHead className="text-right">Quality Score</TableHead>
              {/* <TableHead>Top Topics</TableHead> */} {/* Removed Top Topics header */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground"> {/* Adjusted colSpan */}
                  No agent data available for the selected period
                </TableCell>
              </TableRow>
            ) : (
              data.map((agent: AgentPerformanceData) => ( // Added explicit type
                <TableRow key={agent.agent}> {/* Use agent.agent for key */}
                  <TableCell className="font-medium">{agent.agent}</TableCell> {/* Use agent.agent for name */}
                  <TableCell className="text-right">{agent.callsPerDay}</TableCell> {/* Use agent.callsPerDay */}
                  <TableCell className="text-right">{agent.successRate.toFixed(1)}%</TableCell> {/* Use agent.successRate */}
                  {/* Removed Completion Rate cell */}
                  <TableCell className="text-right">{formatDuration(agent.avgDuration)}</TableCell> {/* Use agent.avgDuration */}
                  <TableCell className="text-right">
                    <QualityScoreBadge score={agent.qualityScore} /> {/* Use agent.qualityScore */}
                  </TableCell>
                  {/* Removed Top Topics cell */}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

interface QualityScoreBadgeProps {
  score: number
}

function QualityScoreBadge({ score }: QualityScoreBadgeProps) {
  let variant: 'destructive' | 'default' | 'secondary' | 'outline' = 'outline'
  
  if (score >= 90) {
    variant = 'default'
  } else if (score >= 80) {
    variant = 'secondary'
  } else if (score >= 70) {
    variant = 'outline'
  } else {
    variant = 'destructive'
  }
  
  return (
    <Badge variant={variant}>
      {score.toFixed(1)}
    </Badge>
  )
}
