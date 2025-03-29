"use client"

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { AnalyticsFilters } from '@/lib/types'
import { fetchConversationAnalytics } from '@/lib/mongodb-analytics'
import { Skeleton } from './ui/skeleton'

interface ConversationVolumeChartProps {
  filters?: AnalyticsFilters
}

export function ConversationVolumeChart({ filters }: ConversationVolumeChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchConversationAnalytics(filters)
        
        if (response.success) {
          // Transform data for the chart if needed
          setData(response.data)
        } else {
          console.error('Failed to fetch conversation volume data:', response.error)
          setError(response.error || 'Failed to load data')
          
          // Use sample data as fallback
          setData(generateSampleData())
        }
      } catch (err) {
        console.error('Error fetching conversation volume data:', err)
        setError('An error occurred loading data')
        
        // Use sample data as fallback
        setData(generateSampleData())
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [filters])
  
  // Generate sample data for fallback
  function generateSampleData() {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(today.getDate() - 13 + i)
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 30) + 20
      }
    })
  }
  
  if (loading) {
    return <Skeleton className="w-full h-[350px]" />
  }

  return (
    <>
      {error && (
        <div className="text-red-500 mb-2 text-sm">{error}</div>
      )}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }}
          />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [value, "Calls"]}
            labelFormatter={(label) => {
              const date = new Date(label)
              return date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  )
}
