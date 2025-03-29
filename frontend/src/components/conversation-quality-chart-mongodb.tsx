"use client"

import { useEffect, useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { AnalyticsFilters } from '@/lib/types'
import { fetchConversationQualityAnalytics } from '@/lib/mongodb-analytics'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

interface ConversationQualityChartProps {
  filters?: AnalyticsFilters
}

export function ConversationQualityChart({ filters }: ConversationQualityChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchConversationQualityAnalytics(filters)
        
        if (response.success) {
          // Data is already in the right format
          setData(response.data)
        } else {
          setError(response.error || 'Failed to load conversation quality data')
          setData(generateSampleData())
        }
      } catch (err) {
        setError('An error occurred while loading data')
        console.error(err)
        setData(generateSampleData())
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [filters])

  // Generate sample data for fallback
  function generateSampleData() {
    return [
      { date: '2025-03-01', score: 82.5 },
      { date: '2025-03-02', score: 83.1 },
      { date: '2025-03-03', score: 84.2 },
      { date: '2025-03-04', score: 85.0 },
      { date: '2025-03-05', score: 84.7 },
      { date: '2025-03-06', score: 86.2 },
      { date: '2025-03-07', score: 87.1 },
      { date: '2025-03-08', score: 86.9 },
      { date: '2025-03-09', score: 87.5 },
      { date: '2025-03-10', score: 88.2 },
      { date: '2025-03-11', score: 87.8 },
      { date: '2025-03-12', score: 88.5 },
      { date: '2025-03-13', score: 89.1 },
      { date: '2025-03-14', score: 89.7 },
    ]
  }

  if (loading) {
    return <Skeleton className="w-full h-[400px]" />
  }

  if (error) {
    return (
      <Card className="w-full h-[400px] flex items-center justify-center">
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date"
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }}
        />
        <YAxis
          domain={[0, 100]} 
          tickFormatter={(value) => `${value}`} 
        />
        <Tooltip 
          formatter={(value: number) => [`${value.toFixed(1)}`, 'Quality Score']}
          labelFormatter={(label) => {
            const date = new Date(label)
            return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="score"
          name="Quality Score"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
