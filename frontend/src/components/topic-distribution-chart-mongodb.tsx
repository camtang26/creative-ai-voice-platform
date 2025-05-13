"use client"

import { useEffect, useState } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { AnalyticsFilters } from '@/lib/types'
import { fetchTopicDistribution, TopicDistributionData } from '@/lib/mongodb-analytics' // Import TopicDistributionData
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

interface TopicDistributionChartProps {
  filters?: AnalyticsFilters
}

export function TopicDistributionChart({ filters }: TopicDistributionChartProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TopicDistributionData[]>([]) // Changed state type

  // Colors for the pie chart slices
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B8E23', '#48D1CC'];

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchTopicDistribution(filters)
        
        if (response.success) {
          setData(response.data || []) // Added fallback for undefined
        } else {
          setError(response.error || 'Failed to load topic distribution data')
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
      { name: 'Product Features', value: 35 },
      { name: 'Pricing', value: 25 },
      { name: 'Technical Support', value: 20 },
      { name: 'Billing Issues', value: 12 },
      { name: 'Returns', value: 8 }
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
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`${value}`, 'Conversations']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
