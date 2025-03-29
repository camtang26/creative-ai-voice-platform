"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  RefreshCw,
  BarChart3,
  Phone,
  Clock,
  Activity,
  AlertTriangle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { EnhancedCampaignMonitoring } from '@/components/enhanced-campaign-monitoring'
import { RealTimeStatusIndicator } from '@/components/real-time-status-indicator'
import { useSocket } from '@/lib/socket-context'
import { fetchCampaign } from '@/lib/mongodb-api'
import { cn } from '@/lib/utils'

export default function RealTimeMonitorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('id')
  
  const { isConnected } = useSocket()
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>(
    isConnected ? 'connected' : 'disconnected'
  )
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Update connection status when isConnected changes
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected')
  }, [isConnected])

  // Load campaign data
  useEffect(() => {
    // If no campaign ID is provided, show error
    if (!campaignId) {
      setError('No campaign ID provided')
      setLoading(false)
      return
    }
    
    const loadCampaign = async () => {
      try {
        setLoading(true)
        const response = await fetchCampaign(campaignId)
        
        if (response.success && response.campaign) {
          setCampaign(response.campaign)
        } else {
          setError(response.error || 'Failed to load campaign')
        }
      } catch (err) {
        console.error('Error loading campaign:', err)
        setError('Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }
    
    loadCampaign()
  }, [campaignId])

  // Handle refresh
  const handleRefresh = async () => {
    if (!campaignId) return
    
    setLoading(true)
    
    try {
      const response = await fetchCampaign(campaignId)
      
      if (response.success && response.campaign) {
        setCampaign(response.campaign)
        setLastRefresh(new Date())
      } else {
        setError(response.error || 'Failed to refresh campaign')
      }
    } catch (err) {
      console.error('Error refreshing campaign:', err)
      setError('Failed to refresh campaign')
    } finally {
      setLoading(false)
    }
  }

  // Handle manual reconnection
  const handleReconnect = () => {
    setConnectionStatus('reconnecting')
    
    // Simulate reconnection attempt
    setTimeout(() => {
      if (isConnected) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    }, 2000)
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Campaign Monitor</h1>
          <p className="text-muted-foreground">
            {loading 
              ? 'Loading campaign data...' 
              : campaign 
                ? `Monitoring ${campaign.name}` 
                : 'Campaign monitor'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            disabled={!isConnected || connectionStatus !== 'connected'}
            onClick={handleReconnect}
            className="relative"
          >
            <div className={cn(
              "absolute top-0 right-0 w-2 h-2 rounded-full",
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
              connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
              'bg-red-500'
            )} />
            <RefreshCw className={cn(
              "h-4 w-4",
              connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 'animate-spin' : ''
            )} />
          </Button>
          <Button variant="outline" asChild>
            <Link href="/campaigns">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Connection status alert */}
      {connectionStatus === 'disconnected' && (
        <Alert className="bg-red-50 border-red-200 text-red-800 animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection lost. Real-time updates are not available. Attempting to reconnect...
          </AlertDescription>
        </Alert>
      )}
      
      {connectionStatus === 'reconnecting' && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <Activity className="h-4 w-4 animate-pulse" />
          <AlertDescription>
            Reconnecting to real-time updates...
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <div className="flex space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Retry
              </Button>
              <Button asChild>
                <Link href="/campaigns">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Campaigns
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : campaign ? (
        <div className="space-y-4">
          {/* Campaign info header */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle>{campaign.name}</CardTitle>
                <div className="flex space-x-2">
                  <Badge 
                    variant={campaign.status === 'in-progress' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {campaign.status}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{campaign.status}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Start Time</span>
                  <span className="font-medium">
                    {campaign.startTime 
                      ? new Date(campaign.startTime).toLocaleString() 
                      : 'Not started'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Real-Time Status</span>
                  <RealTimeStatusIndicator 
                    subscriptionType="campaign" 
                    resourceId={campaign.id} 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Last Refresh</span>
                  <span className="font-medium">
                    {lastRefresh ? formatTime(lastRefresh) : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Real-time monitoring */}
          <Tabs defaultValue="monitor">
            <TabsList>
              <TabsTrigger value="monitor">
                <Activity className="h-4 w-4 mr-2" />
                Live Monitor
              </TabsTrigger>
              <TabsTrigger value="calls">
                <Phone className="h-4 w-4 mr-2" />
                Active Calls
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="h-4 w-4 mr-2" />
                Campaign Stats
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="monitor" className="mt-4">
              <EnhancedCampaignMonitoring 
                campaignId={campaign.id} 
                initialData={campaign}
              />
            </TabsContent>
            
            <TabsContent value="calls" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center py-10 text-muted-foreground">
                    Active calls monitoring is coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center py-10 text-muted-foreground">
                    Detailed statistics are coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested campaign could not be found.</p>
            <Button className="mt-4" asChild>
              <Link href="/campaigns">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Campaigns
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
