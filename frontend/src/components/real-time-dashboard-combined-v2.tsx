"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/lib/socket-context'
import { 
  PhoneCall, 
  RefreshCw, 
  Activity, 
  PhoneOff, 
  ArrowUpRightFromSquare, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Loader2
} from 'lucide-react'
import { cn, formatDate, formatPhoneNumber } from '@/lib/utils'
import Link from 'next/link'
import { colors, statusColors, formatDuration } from '@/lib/design-system'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RealTimeDashboardCombinedV2Props {
  campaignId?: string
  showBothTabs?: boolean
  className?: string
}

export function RealTimeDashboardCombinedV2({ 
  campaignId, 
  showBothTabs = true, 
  className 
}: RealTimeDashboardCombinedV2Props) {
  const { isConnected, activeCalls, refreshActiveCalls, lastMessage } = useSocket()
  const [activeTab, setActiveTab] = useState<'calls' | 'campaign'>(
    campaignId ? 'campaign' : 'calls'
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [realTimeStatus, setRealTimeStatus] = useState<{
    status: 'connected' | 'connecting' | 'disconnected' | 'inactive'
    lastUpdate: Date | null
    lastEvent: string | null
  }>({
    status: isConnected ? 'connected' : 'disconnected',
    lastUpdate: null,
    lastEvent: null
  })
  
  // Keep track of active calls count
  const [activeCampaignsCount, setActiveCampaignsCount] = useState<number>(0)
  const [activeCallsCount, setActiveCallsCount] = useState<number>(0)
  
  // Listen for socket connection changes
  useEffect(() => {
    setRealTimeStatus(prev => ({
      ...prev,
      status: isConnected ? 'connected' : 'disconnected'
    }))
  }, [isConnected])
  
  // Update active call count when calls change
  useEffect(() => {
    const inProgressCalls = activeCalls.filter(
      call => ['in-progress', 'ringing', 'queued', 'initiated'].includes(call.status)
    ).length
    
    setActiveCallsCount(inProgressCalls)
    
    // Update last activity time if we have calls
    if (activeCalls.length > 0) {
      setRealTimeStatus(prev => ({
        ...prev,
        lastUpdate: new Date(),
        lastEvent: 'calls_update'
      }))
    }
  }, [activeCalls])
  
  // Handle data refresh - for campaigns and calls
  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshActiveCalls()
    
    // Update status
    setRealTimeStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      lastEvent: 'manual_refresh'
    }))
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      'initiated': 'bg-blue-100 text-blue-800 border-blue-200',
      'ringing': 'bg-amber-100 text-amber-800 border-amber-200',
      'in-progress': 'bg-green-100 text-green-800 border-green-200',
      'completed': 'bg-neutral-100 text-neutral-800 border-neutral-200',
      'failed': 'bg-red-100 text-red-800 border-red-200',
      'busy': 'bg-red-100 text-red-800 border-red-200',
      'no-answer': 'bg-amber-100 text-amber-800 border-amber-200',
      'canceled': 'bg-neutral-100 text-neutral-800 border-neutral-200',
    }
    
    return statusMap[status] || 'bg-neutral-100 text-neutral-800 border-neutral-200'
  }
  
  // Get status icon
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === 'in-progress') return <Activity className="h-4 w-4 text-amber-500" />
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />
    if (status === 'ringing') return <PhoneCall className="h-4 w-4 text-amber-500" />
    if (status === 'initiated') return <PhoneCall className="h-4 w-4 text-blue-500" />
    
    return <AlertCircle className="h-4 w-4 text-neutral-500" />
  }
  
  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              Real-Time Monitor
              {realTimeStatus.lastEvent === 'calls_update' && (
                <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
                  New activity
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Monitor active campaigns and calls in real-time
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "px-2 py-1 h-7",
                        isConnected 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-red-100 text-red-800 border-red-200"
                      )}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isConnected 
                    ? 'Real-time updates are active' 
                    : 'Connection lost. Updates paused.'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Activity metadata row */}
        <div className="flex justify-between items-center pt-2 text-sm text-muted-foreground">
          <div className="flex space-x-4">
            <div className="flex items-center">
              <PhoneCall className="h-4 w-4 mr-1" />
              <span>{activeCallsCount} active calls</span>
            </div>
            {campaignId && (
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                <span>Campaign monitoring active</span>
              </div>
            )}
          </div>
          <div>
            {realTimeStatus.lastUpdate && (
              <span>Last updated: {realTimeStatus.lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {showBothTabs ? (
          <Tabs 
            defaultValue={campaignId ? 'campaign' : 'calls'}
            onValueChange={(value) => setActiveTab(value as 'calls' | 'campaign')}
          >
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="calls" className="flex-1" disabled={!isConnected}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Active Calls
                {activeCallsCount > 0 && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">{activeCallsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="campaign" className="flex-1" disabled={!isConnected || !campaignId}>
                <Activity className="h-4 w-4 mr-2" />
                Campaign Monitor
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="calls" className="m-0">
              {activeCalls.length > 0 ? (
                <div className="space-y-4">
                  {activeCalls.slice(0, 5).map((call) => (
                    <div 
                      key={call.sid} 
                      className="flex flex-col p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <PhoneCall size={18} className="text-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatPhoneNumber(call.to)}</span>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn("px-2 py-0.5 text-xs flex items-center gap-1", 
                                  getStatusBadgeClass(call.status)
                                )}
                              >
                                <StatusIcon status={call.status} />
                                <span>{call.status.charAt(0).toUpperCase() + call.status.slice(1)}</span>
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {call.startTime ? new Date(call.startTime).toLocaleTimeString() : 'Unknown time'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.status === 'in-progress' && (
                            <Button variant="destructive" size="sm" className="h-8">
                              <PhoneOff size={16} className="mr-1" />
                              End
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-8" asChild>
                            <Link href={`/call-details/${call.sid}`}>
                              Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Duration: {formatDuration(call.duration || 0)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          From: {formatPhoneNumber(call.from)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {activeCalls.length > 5 && (
                    <div className="flex justify-center mt-2">
                      <Button variant="outline" asChild>
                        <Link href="/call-logs">
                          <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                          View All Calls ({activeCalls.length})
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PhoneOff className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">No Active Calls</h3>
                  <p className="text-muted-foreground max-w-md">
                    There are currently no active calls. Start a new call or check again later.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/make-call">
                      Make a Call
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="campaign" className="m-0">
              {campaignId ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="bg-primary/10 p-3 rounded-full mb-2">
                            <PhoneCall className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold">0</h3>
                          <p className="text-sm text-muted-foreground">Active Calls</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="bg-primary/10 p-3 rounded-full mb-2">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold">0</h3>
                          <p className="text-sm text-muted-foreground">Contacts Remaining</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="bg-primary/10 p-3 rounded-full mb-2">
                            <Clock className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold">0m</h3>
                          <p className="text-sm text-muted-foreground">Avg. Call Duration</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Campaign Progress</h3>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0 completed</span>
                      <span>0 total contacts</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button variant="outline" asChild>
                      <Link href={`/campaigns/${campaignId}`}>
                        <ArrowUpRightFromSquare className="mr-2 h-4 w-4" />
                        View Campaign Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">No Campaign Selected</h3>
                  <p className="text-muted-foreground max-w-md">
                    Select a campaign to monitor or start a new campaign to see real-time updates.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/campaigns">
                      View Campaigns
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : campaignId ? (
          // Show only campaign monitoring
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 p-3 rounded-full mb-2">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">0</h3>
                    <p className="text-sm text-muted-foreground">Active Calls</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 p-3 rounded-full mb-2">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">0</h3>
                    <p className="text-sm text-muted-foreground">Contacts Remaining</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 p-3 rounded-full mb-2">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">0m</h3>
                    <p className="text-sm text-muted-foreground">Avg. Call Duration</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Show only call monitoring
          <div>
            {activeCalls.length > 0 ? (
              <div className="space-y-4">
                {activeCalls.slice(0, 8).map((call) => (
                  <div 
                    key={call.sid} 
                    className="flex flex-col p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <PhoneCall size={18} className="text-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{formatPhoneNumber(call.to)}</span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn("px-2 py-0.5 text-xs flex items-center gap-1", 
                                getStatusBadgeClass(call.status)
                              )}
                            >
                              <StatusIcon status={call.status} />
                              <span>{call.status.charAt(0).toUpperCase() + call.status.slice(1)}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {call.startTime ? new Date(call.startTime).toLocaleTimeString() : 'Unknown time'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.status === 'in-progress' && (
                          <Button variant="destructive" size="sm" className="h-8">
                            <PhoneOff size={16} className="mr-1" />
                            End
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8" asChild>
                          <Link href={`/call-details/${call.sid}`}>
                            Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Duration: {formatDuration(call.duration || 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        From: {formatPhoneNumber(call.from)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PhoneOff className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Active Calls</h3>
                <p className="text-muted-foreground max-w-md">
                  There are currently no active calls. Start a new call or check again later.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/make-call">
                    Make a Call
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {isConnected ? (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              Real-time updates active
            </span>
          ) : (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
              Connection lost
            </span>
          )}
        </div>
        
        <Button variant="outline" size="sm" asChild>
          <Link href="/call-logs">
            View All Calls
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}