"use client"

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnalyticsFilters, AgentPerformance } from '@/lib/types'
import { fetchAgentPerformance } from '@/lib/mongodb-analytics'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { Badge } from './ui/badge'

interface AgentPerformanceTableProps {
  filters?: AnalyticsFilters
}

export function AgentPerformanceTable({ filters }: AgentPerformanceTableProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AgentPerformance[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchAgentPerformance(filters || {
          timeframe: {
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            resolution: 'day'
          }
        })
        
        if (response.success) {
          setData(response.data)
        } else {
          setError(response.error || 'Failed to load agent performance data')
        }
      } catch (err) {
        setError('An error occurred while loading data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [filters])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full p-6">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  // Format minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Table>
      <TableCaption>Agent performance metrics for the selected time period</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Agent</TableHead>
          <TableHead className="text-right">Calls</TableHead>
          <TableHead className="text-right">Success Rate</TableHead>
          <TableHead className="text-right">Avg. Duration</TableHead>
          <TableHead className="text-right">Quality Score</TableHead>
          <TableHead>Top Topics</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((agent) => (
          <TableRow key={agent.agent_id}>
            <TableCell className="font-medium">{agent.agent_name}</TableCell>
            <TableCell className="text-right">{agent.calls_count}</TableCell>
            <TableCell className="text-right">{agent.success_rate.toFixed(1)}%</TableCell>
            <TableCell className="text-right">{formatDuration(agent.average_duration)}</TableCell>
            <TableCell className="text-right">{agent.average_quality_score.toFixed(1)}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {agent.topics_covered.slice(0, 3).map((topic, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {topic.name} ({topic.count})
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
