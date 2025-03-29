"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSocket } from '@/lib/socket-context'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface CampaignProgressChartProps {
  campaignId: string
  initialData?: any
}

export function CampaignProgressChart({ campaignId, initialData }: CampaignProgressChartProps) {
  const { socket, isConnected, subscribeToCampaign } = useSocket()
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Initialize chart data from initialData if available
  useEffect(() => {
    if (initialData?.stats) {
      const { stats } = initialData
      setChartData([
        { name: 'Total', value: stats.totalContacts || 0, fill: '#8884d8' },
        { name: 'Placed', value: stats.callsPlaced || 0, fill: '#82ca9d' },
        { name: 'Answered', value: stats.callsAnswered || 0, fill: '#4caf50' },
        { name: 'Completed', value: stats.callsCompleted || 0, fill: '#2196f3' },
        { name: 'Successful', value: stats.successfulCalls || 0, fill: '#00bcd4' },
        { name: 'Failed', value: stats.failedCalls || 0, fill: '#f44336' }
      ])
      setLoading(false)
    }
  }, [initialData])

  // Subscribe to campaign updates
  useEffect(() => {
    if (!socket || !isConnected || !campaignId) return

    // Subscribe to campaign updates
    console.log(`[Campaign Progress Chart] Subscribing to campaign ${campaignId}`)
    subscribeToCampaign(campaignId)

    const handleCampaignData = (data: any) => {
      console.log('[Campaign Progress Chart] Received campaign data:', data)
      if (data.campaignId === campaignId && data.stats) {
        updateChartData(data.stats)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    }

    const handleCampaignUpdate = (update: any) => {
      console.log('[Campaign Progress Chart] Received campaign update:', update)
      if (update.campaignId === campaignId) {
        if (update.type === 'progress_update' && update.data?.stats) {
          updateChartData(update.data.stats)
          setLastUpdate(new Date().toLocaleTimeString())
        }
      }
    }

    // Function to update chart data from stats
    const updateChartData = (stats: any) => {
      setChartData([
        { name: 'Total', value: stats.totalContacts || 0, fill: '#8884d8' },
        { name: 'Placed', value: stats.callsPlaced || 0, fill: '#82ca9d' },
        { name: 'Answered', value: stats.callsAnswered || 0, fill: '#4caf50' },
        { name: 'Completed', value: stats.callsCompleted || 0, fill: '#2196f3' },
        { name: 'Successful', value: stats.successfulCalls || 0, fill: '#00bcd4' },
        { name: 'Failed', value: stats.failedCalls || 0, fill: '#f44336' }
      ])
      setLoading(false)
    }

    // Register event listeners
    socket.on('campaign_data', handleCampaignData)
    socket.on('campaign_update', handleCampaignUpdate)

    // Cleanup
    return () => {
      socket.off('campaign_data', handleCampaignData)
      socket.off('campaign_update', handleCampaignUpdate)
    }
  }, [socket, isConnected, campaignId])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-2 shadow-sm">
          <p className="font-medium">{`${label} : ${payload[0].value}`}</p>
        </div>
      )
    }
  
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Progress</CardTitle>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdate}
          </p>
        )}
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="value" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
