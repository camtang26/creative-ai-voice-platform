"use client"

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { AnalyticsFilters } from '@/lib/types'
import { Skeleton } from './ui/skeleton'

interface TopicDistributionChartProps {
  filters: AnalyticsFilters
}

export function TopicDistributionChart({ filters }: TopicDistributionChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // In a real implementation, this would be an API call
        // const response = await fetch...
        
        // For now, use sample data
        setTimeout(() => {
          setData(sampleData)
          setLoading(false)
        }, 1000)
      } catch (err) {
        setError('An error occurred while loading data')
        console.error(err)
        setLoading(false)
      }
    }
    
    fetchData()
  }, [filters])

  if (loading) {
    return <Skeleton className="w-full h-[400px]" />
  }

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Sample data for topic distribution
  const sampleData = [
    { name: 'Free Trial', value: 352, color: '#4f46e5' },
    { name: 'Pricing', value: 245, color: '#10b981' },
    { name: 'Features', value: 198, color: '#f59e0b' },
    { name: 'Technical Issues', value: 165, color: '#ef4444' },
    { name: 'Account Setup', value: 122, color: '#8b5cf6' },
    { name: 'Use Cases', value: 87, color: '#3b82f6' },
    { name: 'Billing', value: 79, color: '#ec4899' },
    { name: 'Other', value: 45, color: '#6b7280' },
  ]

  const displayData = data.length > 0 ? data : sampleData

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={displayData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={150}
          innerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [`${value} conversations`, name]}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  )
}
