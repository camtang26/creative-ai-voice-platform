"use client"

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { AnalyticsFilters } from '@/lib/types'
import { fetchSuccessRateAnalytics } from '@/lib/mongodb-analytics'
import { Skeleton } from './ui/skeleton'

interface SuccessRateChartProps {
  filters?: AnalyticsFilters
}

export function SuccessRateChart({ filters }: SuccessRateChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchSuccessRateAnalytics(filters)
        
        if (response.success && Array.isArray(response.data)) {
          // Data is already in the correct format
          setData(response.data)
        } else {
          console.error('Unexpected response format:', response)
          setError('Unexpected response format from server')
          // Use sample data as fallback
          setData(generateSampleData())
        }
      } catch (err) {
        console.error('Error fetching success rate data:', err)
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
    let baseRate = 67.0
    
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(today.getDate() - 13 + i)
      
      // Random walk for success rate
      baseRate += (Math.random() - 0.4) * 1.2
      baseRate = Math.max(60, Math.min(85, baseRate))
      
      return {
        date: date.toISOString().split('T')[0],
        success: parseFloat(baseRate.toFixed(1))
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
        <LineChart
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
          <YAxis 
            domain={[
              (dataMin: number) => Math.max(0, Math.floor(dataMin - 5)),
              (dataMax: number) => Math.min(100, Math.ceil(dataMax + 5))
            ]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Success Rate"]}
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
          <Line
            type="monotone"
            dataKey="success"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  )
}
