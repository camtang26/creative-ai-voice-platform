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
import { AnalyticsFilters, AgentPerformance } from '@/lib/types'
import { fetchAgentPerformance } from '@/lib/mongodb-analytics'
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
  const [data, setData] = useState<AgentPerformance[]>([])

  useEffect(() => {
    loadData()
  }, [filters])
  
  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetchAgentPerformance(filters)
      
      if (response.success) {
        setData(response.data)
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
  function generateSampleAgentData(): AgentPerformance[] {
    return [
      {
        agent_id: 'agent-1',
        agent_name: 'Sales Agent A',
        calls_count: 248,
        success_rate: 76.2,
        completion_rate: 92.7,
        average_duration: 137,
        average_quality_score: 83.5,
        topics_covered: [
          { name: 'pricing', count: 156 },
          { name: 'features', count: 132 },
          { name: 'support', count: 85 }
        ]
      },
      {
        agent_id: 'agent-2',
        agent_name: 'Technical Agent B',
        calls_count: 187,
        success_rate: 72.8,
        completion_rate: 94.1,
        average_duration: 164,
        average_quality_score: 85.2,
        topics_covered: [
          { name: 'features', count: 149 },
          { name: 'technical', count: 124 },
          { name: 'integrations', count: 93 }
        ]
      },
      {
        agent_id: 'agent-3',
        agent_name: 'Customer Service Agent C',
        calls_count: 267,
        success_rate: 81.5,
        completion_rate: 96.3,
        average_duration: 118,
        average_quality_score: 88.7,
        topics_covered: [
          { name: 'support', count: 213 },
          { name: 'billing', count: 98 },
          { name: 'feedback', count: 76 }
        ]
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
              <TableHead className="text-right">Completion Rate</TableHead>
              <TableHead className="text-right">Avg. Duration</TableHead>
              <TableHead className="text-right">Quality Score</TableHead>
              <TableHead>Top Topics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No agent data available for the selected period
                </TableCell>
              </TableRow>
            ) : (
              data.map((agent) => (
                <TableRow key={agent.agent_id}>
                  <TableCell className="font-medium">{agent.agent_name}</TableCell>
                  <TableCell className="text-right">{agent.calls_count}</TableCell>
                  <TableCell className="text-right">{agent.success_rate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{agent.completion_rate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{formatDuration(agent.average_duration)}</TableCell>
                  <TableCell className="text-right">
                    <QualityScoreBadge score={agent.average_quality_score} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.topics_covered && agent.topics_covered.length > 0 ? (
                        agent.topics_covered.slice(0, 3).map((topic) => (
                          <Badge variant="outline" key={topic.name} className="capitalize">
                            {topic.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No topics</span>
                      )}
                    </div>
                  </TableCell>
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
