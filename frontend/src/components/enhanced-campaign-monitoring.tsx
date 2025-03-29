"use client"

import { useState, useEffect, useRef } from 'react'
import { 
  PhoneCall, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Phone,
  BarChart3,
  Activity
} from 'lucide-react'
import { useSocket } from '@/lib/socket-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { RealTimeStatusIndicator } from '@/components/real-time-status-indicator'
import { CampaignProgressChart } from '@/components/campaign-progress-chart'

interface EnhancedCampaignMonitoringProps {
  campaignId: string
  initialData?: any
}

export function EnhancedCampaignMonitoring({ campaignId, initialData }: EnhancedCampaignMonitoringProps) {
  const { socket, isConnected, subscribeToCampaign, unsubscribeFromCampaign } = useSocket()
  const [campaignData, setCampaignData] = useState<any>(initialData || null)
  const [loading, setLoading] = useState(true)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  const [stateChangeIndicator, setStateChangeIndicator] = useState<string | null>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [callRate, setCallRate] = useState<number>(0) // calls per minute

  // Subscribe to campaign updates
  useEffect(() => {
    if (socket && isConnected && campaignId && !isSubscribed) {
      console.log(`Subscribing to campaign ${campaignId}`)
      subscribeToCampaign(campaignId)
      setIsSubscribed(true)
      setLoading(false)
      setLastActivity(new Date())
      
      // Show state change indicator
      setStateChangeIndicator('connected')
      setTimeout(() => setStateChangeIndicator(null), 3000)
    }

    // Cleanup on unmount
    return () => {
      if (socket && isSubscribed) {
        console.log(`Unsubscribing from campaign ${campaignId}`)
        unsubscribeFromCampaign(campaignId)
        setIsSubscribed(false)
      }
    }
  }, [socket, isConnected, campaignId, isSubscribed, subscribeToCampaign, unsubscribeFromCampaign])

  // Handle campaign data updates
  useEffect(() => {
    if (!socket) return

    const handleCampaignData = (data: any) => {
      console.log('Received campaign data:', data)
      if (data.campaignId === campaignId) {
        setCampaignData(prevData => ({
          ...prevData,
          ...data
        }))
        setLoading(false)
        setLastActivity(new Date())
        
        // Calculate call rate if we have stats
        if (data.stats?.callsPlaced && data.startTime) {
          const startTime = new Date(data.startTime).getTime()
          const elapsedMinutes = (Date.now() - startTime) / (1000 * 60)
          if (elapsedMinutes > 0) {
            const rate = data.stats.callsPlaced / elapsedMinutes
            setCallRate(parseFloat(rate.toFixed(1)))
          }
        }
      }
    }

    const handleCampaignUpdate = (update: any) => {
      console.log('Received campaign update:', update)
      if (update.campaignId === campaignId) {
        // Handle different update types
        if (update.type === 'status_update') {
          setCampaignData(prevData => ({
            ...prevData,
            status: update.data.status,
            ...update.data
          }))
          setLastActivity(new Date())
          setStateChangeIndicator('status_changed')
          setTimeout(() => setStateChangeIndicator(null), 3000)
        } else if (update.type === 'progress_update') {
          setCampaignData(prevData => ({
            ...prevData,
            progress: update.data.progress,
            stats: update.data.stats,
            lastUpdated: update.timestamp
          }))
          setLastActivity(new Date())
          
          // Calculate call rate if we have stats
          if (update.data.stats?.callsPlaced && campaignData?.startTime) {
            const startTime = new Date(campaignData.startTime).getTime()
            const elapsedMinutes = (Date.now() - startTime) / (1000 * 60)
            if (elapsedMinutes > 0) {
              const rate = update.data.stats.callsPlaced / elapsedMinutes
              setCallRate(parseFloat(rate.toFixed(1)))
            }
          }
        } else if (update.type === 'call_update') {
          // Handle new call event
          if (update.data.call) {
            setRecentCalls(prev => {
              // Add new call to the beginning and limit to 10
              const updated = [update.data.call, ...prev].slice(0, 10)
              return updated
            })
            setLastActivity(new Date())
            
            // Pulse the state change indicator
            setStateChangeIndicator('new_call')
            setTimeout(() => setStateChangeIndicator(null), 2000)
          }
        }
      }
    }

    // Set up activity timeout to show inactive state
    activityTimeoutRef.current = setInterval(() => {
      if (lastActivity) {
        const now = new Date()
        const diffInSeconds = (now.getTime() - lastActivity.getTime()) / 1000
        if (diffInSeconds > 60) {
          // Mark as inactive after 60 seconds with no updates
          setStateChangeIndicator('inactive')
        }
      }
    }, 30000) // Check every 30 seconds
    
    // Register event listeners
    socket.on('campaign_data', handleCampaignData)
    socket.on('campaign_update', handleCampaignUpdate)

    // Cleanup
    return () => {
      socket.off('campaign_data', handleCampaignData)
      socket.off('campaign_update', handleCampaignUpdate)
      
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [socket, campaignId, lastActivity, campaignData])

  // Function to format timestamps
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }
  
  // Format duration in seconds to mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Manual refresh function
  const handleRefresh = () => {
    if (socket && isConnected) {
      setLoading(true)
      setStateChangeIndicator('refreshing')
      // Re-subscribe to trigger fresh data
      unsubscribeFromCampaign(campaignId)
      setTimeout(() => {
        subscribeToCampaign(campaignId)
        setIsSubscribed(true)
        setLoading(false)
      }, 300)
    }
  }

  // Render a skeleton while loading
  if (loading && !campaignData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Campaign Monitoring</h3>
          <RealTimeStatusIndicator 
            subscriptionType="campaign" 
            resourceId={campaignId} 
          />
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Refreshing
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
        
        <Skeleton className="h-[200px]" />
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Connection Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-lg font-medium">Campaign Monitoring</h3>
          <RealTimeStatusIndicator 
            subscriptionType="campaign" 
            resourceId={campaignId} 
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>
      
      {/* State Change Visual Indicator */}
      {stateChangeIndicator && (
        <div className={cn(
          "p-2 border rounded-md transition-all duration-500",
          stateChangeIndicator === 'connected' && "bg-green-50 border-green-200 text-green-700",
          stateChangeIndicator === 'status_changed' && "bg-blue-50 border-blue-200 text-blue-700",
          stateChangeIndicator === 'new_call' && "bg-amber-50 border-amber-200 text-amber-700 animate-pulse",
          stateChangeIndicator === 'inactive' && "bg-gray-50 border-gray-200 text-gray-500",
          stateChangeIndicator === 'refreshing' && "bg-purple-50 border-purple-200 text-purple-700"
        )}>
          {stateChangeIndicator === 'connected' && (
            <p className="flex items-center text-sm"><CheckCircle className="h-4 w-4 mr-2" /> Connected to campaign monitoring</p>
          )}
          {stateChangeIndicator === 'status_changed' && (
            <p className="flex items-center text-sm"><Activity className="h-4 w-4 mr-2" /> Campaign status updated</p>
          )}
          {stateChangeIndicator === 'new_call' && (
            <p className="flex items-center text-sm"><Phone className="h-4 w-4 mr-2" /> New call initiated</p>
          )}
          {stateChangeIndicator === 'inactive' && (
            <p className="flex items-center text-sm"><AlertCircle className="h-4 w-4 mr-2" /> No recent campaign activity</p>
          )}
          {stateChangeIndicator === 'refreshing' && (
            <p className="flex items-center text-sm"><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Refreshing campaign data</p>
          )}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(
          lastActivity && (new Date().getTime() - lastActivity.getTime() < 5000) ? 'border-green-200 animate-pulse' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignData?.progress || 0}%</div>
            <Progress 
              value={campaignData?.progress || 0} 
              className="h-2 mt-2" 
            />
            {campaignData?.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-2">
                Last update: {formatTime(campaignData.lastUpdated)}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className={cn(
          campaignData?.stats?.callsPlaced && campaignData.stats.callsPlaced > 0 ? 'border-blue-200' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignData?.stats?.totalContacts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {campaignData?.stats?.callsPlaced || 0} calls placed
              {callRate > 0 && (
                <span className="ml-1">({callRate} calls/min)</span>
              )}
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(
          campaignData?.stats?.successfulCalls && campaignData.stats.successfulCalls > 0 ? 'border-green-200' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Successful Calls
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignData?.stats?.successfulCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {campaignData?.stats?.successRate || 0}% success rate
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(
          campaignData?.stats?.averageDuration && campaignData.stats.averageDuration > 0 ? 'border-blue-200' : ''
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Duration
            </CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaignData?.stats?.averageDuration 
                ? formatDuration(campaignData.stats.averageDuration)
                : '0:00'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {campaignData?.stats?.callsCompleted || 0} completed calls
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Campaign Progress Chart */}
        <CampaignProgressChart 
          campaignId={campaignId} 
          initialData={campaignData} 
        />
        
        {/* Recent Calls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              Last {recentCalls.length} calls in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No recent calls</p>
                <p className="text-sm">Call activity will appear here in real-time</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCalls.map((call, index) => (
                      <TableRow 
                        key={call.sid || index}
                        className={cn(
                          index === 0 && lastActivity && new Date().getTime() - new Date(lastActivity).getTime() < 10000 ? 'bg-amber-50' : ''
                        )}
                      >
                        <TableCell>
                          {call.contactName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {call.phoneNumber}
                        </TableCell>
                        <TableCell>
                          <CallStatusBadge status={call.status} />
                        </TableCell>
                        <TableCell>
                          {formatTime(call.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Component to handle the call status badge
interface CallStatusBadgeProps {
  status: string
}

function CallStatusBadge({ status }: CallStatusBadgeProps) {
  let variant: 'destructive' | 'default' | 'secondary' | 'outline' = 'outline'
  
  switch (status) {
    case 'initiated':
    case 'queued':
      variant = 'outline'
      break
    case 'ringing':
      variant = 'secondary'
      break
    case 'in-progress':
      variant = 'default'
      break
    case 'completed':
      variant = 'outline'
      break
    case 'failed':
    case 'busy':
    case 'no-answer':
    case 'canceled':
      variant = 'destructive'
      break
  }
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        'capitalize',
        variant === 'outline' ? 'border border-solid' : ''
      )}
    >
      {status === 'in-progress' ? 'active' : status}
    </Badge>
  )
}
