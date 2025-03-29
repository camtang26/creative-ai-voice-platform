"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSocket } from '@/lib/socket-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Phone,
  PhoneCall,
  PhoneIncoming,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  PlayCircle,
  PauseCircle,
  StopCircle,
  PieChart,
  RefreshCw,
  Signal,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchRealTimeCallStats } from '@/lib/mongodb-api-enhanced'

export function RealTimeDashboard() {
  const { 
    isConnected, 
    activeCalls, 
    activeCampaigns,
    lastMessage,
    lastCampaignUpdate
  } = useSocket()
  
  const [callMetrics, setCallMetrics] = useState({
    totalCalls: 0,
    activeCalls: 0,
    completedCalls: 0,
    failedCalls: 0,
    successfulCalls: 0,
    averageDuration: 0,
    callsPerHour: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    isConnected ? 'connected' : 'disconnected'
  )
  
  // Update connection status when Socket.IO connection changes
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected')
  }, [isConnected])
  
  // Load initial call metrics
  useEffect(() => {
    fetchCallMetrics()
  }, [])
  
  // Update call metrics when active calls change
  useEffect(() => {
    if (isConnected) {
      // Update active calls count from Socket.IO data
      setCallMetrics(prev => ({
        ...prev,
        activeCalls: activeCalls.length
      }))
    }
  }, [activeCalls, isConnected])
  
  // Fetch call metrics from API
  const fetchCallMetrics = async () => {
    setLoading(true)
    
    try {
      const response = await fetchRealTimeCallStats()
      
      if (response.success && response.data) {
        setCallMetrics({
          totalCalls: response.data.totalCalls || 0,
          activeCalls: activeCalls.length || response.data.activeCalls || 0,
          completedCalls: response.data.completedCalls || 0,
          failedCalls: response.data.failedCalls || 0,
          successfulCalls: response.data.successfulCalls || 0,
          averageDuration: response.data.averageDuration || 0,
          callsPerHour: response.data.callsPerHour || 0
        })
        setError(null)
      } else {
        setError('Failed to load call statistics')
      }
    } catch (err) {
      console.error('Error fetching call metrics:', err)
      setError('An error occurred while loading call statistics')
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }
  
  // Handle refresh
  const handleRefresh = () => {
    fetchCallMetrics()
  }
  
  // Visual indicator functions
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'disconnected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  // Calculate completion rate
  const getCompletionRate = () => {
    const total = callMetrics.completedCalls + callMetrics.failedCalls
    if (total === 0) return 0
    return Math.round((callMetrics.completedCalls / total) * 100)
  }
  
  // Calculate success rate
  const getSuccessRate = () => {
    if (callMetrics.completedCalls === 0) return 0
    return Math.round((callMetrics.successfulCalls / callMetrics.completedCalls) * 100)
  }
  
  return (
    <div className="space-y-6">
      {/* Title and refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Real-Time Dashboard</h2>
          <p className="text-muted-foreground">
            Live monitoring of calls and campaigns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center mr-2">
            <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()} mr-1`}></div>
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 
               'Disconnected'}
            </span>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/campaigns/live-monitor">
              <Signal className="h-4 w-4 mr-2" />
              Live Monitor
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900">
          <CardContent className="p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
            <div>
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-red-200 hover:bg-red-100 text-red-800 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/30"
                onClick={handleRefresh}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Metrics overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className={cn(
          activeCalls.length > 0 ? "border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm" : ""
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Calls
            </CardTitle>
            <PhoneIncoming className={cn(
              "h-4 w-4",
              activeCalls.length > 0 ? "text-primary" : "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              activeCalls.length > 0 ? "text-primary" : ""
            )}>
              {loading ? <Skeleton className="h-8 w-16" /> : callMetrics.activeCalls}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCalls.length > 0 
                ? 'Live calls in progress' 
                : 'No active calls at the moment'}
            </p>
            {activeCalls.length > 0 && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs mt-1" 
                asChild
              >
                <Link href="/live-calls">
                  View active calls
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                activeCampaigns.filter(c => c.status === 'in-progress').length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCampaigns.filter(c => c.status === 'in-progress').length > 0 
                ? 'Campaigns currently active' 
                : 'No active campaigns'}
            </p>
            {activeCampaigns.filter(c => c.status === 'in-progress').length > 0 && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs mt-1" 
                asChild
              >
                <Link href="/campaigns">
                  View active campaigns
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Call Volume
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : callMetrics.totalCalls}
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                {callMetrics.callsPerHour.toFixed(1)} calls/hour
              </p>
              <p className="text-xs text-muted-foreground">
                Avg: {Math.floor(callMetrics.averageDuration / 60)}:{(callMetrics.averageDuration % 60).toString().padStart(2, '0')} min
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active campaign cards */}
      {activeCampaigns.filter(c => c.status === 'in-progress').length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Active Campaigns</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeCampaigns
              .filter(c => c.status === 'in-progress')
              .map(campaign => (
                <Card key={campaign.id} className="border border-primary/20 bg-primary/5 dark:bg-primary/10">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription>
                          <span className="flex items-center">
                            <span className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                            Active Campaign
                          </span>
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-primary/10">
                        {campaign.progress}% Complete
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-4">
                      <Progress value={campaign.progress} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted p-2 rounded-md">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-medium">{campaign.stats?.totalContacts || 0}</p>
                        </div>
                        <div className="bg-muted p-2 rounded-md">
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="font-medium">{campaign.stats?.callsCompleted || 0}</p>
                        </div>
                        <div className="bg-muted p-2 rounded-md">
                          <p className="text-xs text-muted-foreground">In Progress</p>
                          <p className="font-medium">{campaign.stats?.inProgressCalls || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full"
                      asChild
                    >
                      <Link href={`/campaigns/${campaign.id}`}>
                        View Campaign Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </div>
      )}
      
      {/* Success metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Completion Rate</CardTitle>
            <CardDescription>
              Percentage of calls that complete successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-5xl font-bold">{getCompletionRate()}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {callMetrics.completedCalls} completed / {callMetrics.completedCalls + callMetrics.failedCalls} total
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Call Success Rate</CardTitle>
            <CardDescription>
              Percentage of completed calls that achieved their goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-5xl font-bold">{getSuccessRate()}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {callMetrics.successfulCalls} successful / {callMetrics.completedCalls} completed
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent active calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Active Calls</CardTitle>
          <CardDescription>
            List of recent and ongoing calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCalls.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <PhoneCall className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>No active calls at the moment</p>
              <p className="text-sm">Active calls will appear here in real-time</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCalls.slice(0, 5).map((call) => (
                    <TableRow key={call.sid}>
                      <TableCell className="font-mono text-xs">
                        {call.sid.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={call.status === 'in-progress' ? 'default' : 'outline'}
                          className="capitalize"
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.to}</TableCell>
                      <TableCell>
                        {call.duration ? 
                          `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 
                          '--:--'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/call-details/${call.sid}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {activeCalls.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" asChild>
                <Link href="/live-calls">
                  View All {activeCalls.length} Active Calls
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer with last refresh information */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Last refreshed: {lastRefresh.toLocaleTimeString()}
          {!isConnected && (
            <span className="text-red-500 ml-2">
              (Socket disconnected - real-time updates paused)
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
