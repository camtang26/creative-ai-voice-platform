"use client"

import { useState, useEffect, useRef } from 'react'
import { 
  PhoneCall, 
  PhoneIncoming,
  PhoneOff,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Bot,
  Headphones,
  PauseCircle,
  PlayCircle,
  Volume2,
  Zap
} from 'lucide-react'
import { useSocket } from '@/lib/socket-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { RealTimeStatusIndicator } from '@/components/real-time-status-indicator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface EnhancedCallMonitoringProps {
  campaignId?: string
  maxCalls?: number
  className?: string
}

export function EnhancedCallMonitoring({ campaignId, maxCalls = 5, className }: EnhancedCallMonitoringProps) {
  const { socket, isConnected, activeCalls, subscribeToCall, refreshActiveCalls } = useSocket()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredCalls, setFilteredCalls] = useState<any[]>([])
  const [subscribedCalls, setSubscribedCalls] = useState<Set<string>>(new Set())
  const [callActivity, setCallActivity] = useState<Record<string, { lastActivity: Date, pulseAnimation: boolean }>>({})
  const [selectedCallSid, setSelectedCallSid] = useState<string | null>(null)
  const [callTranscripts, setCallTranscripts] = useState<Record<string, Array<{ role: string, text: string, timestamp: string }>>>({})
  
  // Refs for audio elements
  const audioPlayerRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  // Initialize component and refresh active calls
  useEffect(() => {
    if (socket && isConnected) {
      refreshActiveCalls()
      setLoading(false)
    } else {
      setLoading(true)
    }

    return () => {
      // Unsubscribe from all calls
      subscribedCalls.forEach(callSid => {
        // Logic to unsubscribe - this would be implemented in your context
      })
    }
  }, [socket, isConnected, refreshActiveCalls])

  // Filter calls by campaign ID if provided
  useEffect(() => {
    if (activeCalls.length > 0) {
      const filtered = campaignId
        ? activeCalls.filter(call => call.campaign_id === campaignId)
        : activeCalls

      // Sort by status priority (in-progress first, then ringing, etc.)
      const sortedCalls = [...filtered].sort((a, b) => {
        const statusPriority = { 'in-progress': 0, 'ringing': 1, 'queued': 2, 'initiated': 3 }
        const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 10
        const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 10
        return aPriority - bPriority
      })

      // Limit to maxCalls
      setFilteredCalls(sortedCalls.slice(0, maxCalls))
      setLoading(false)
    } else {
      setFilteredCalls([])
      setLoading(socket && !isConnected) // Only show loading if socket exists but not connected
    }
  }, [activeCalls, campaignId, maxCalls, socket, isConnected])

  // Subscribe to call updates for any new calls
  useEffect(() => {
    filteredCalls.forEach(call => {
      const callSid = call.sid

      if (!subscribedCalls.has(callSid) && socket && isConnected) {
        // Subscribe to the call with transcript updates
        subscribeToCall(callSid, { withTranscript: true })
        
        // Track the subscription
        setSubscribedCalls(prev => {
          const updated = new Set(prev)
          updated.add(callSid)
          return updated
        })

        // Initialize call activity tracking
        setCallActivity(prev => ({
          ...prev,
          [callSid]: { 
            lastActivity: new Date(),
            pulseAnimation: true
          }
        }))
        
        // Stop animation after 2 seconds
        setTimeout(() => {
          setCallActivity(prev => ({
            ...prev,
            [callSid]: { 
              ...prev[callSid],
              pulseAnimation: false
            }
          }))
        }, 2000)
      }
    })
  }, [filteredCalls, subscribedCalls, socket, isConnected, subscribeToCall])

  // Handle socket events for call updates and transcripts
  useEffect(() => {
    if (!socket) return

    const handleCallUpdate = (data: any) => {
      if (data.callSid && data.type) {
        // Update call activity timestamp
        setCallActivity(prev => ({
          ...prev,
          [data.callSid]: { 
            lastActivity: new Date(),
            pulseAnimation: true
          }
        }))
        
        // Stop animation after 2 seconds
        setTimeout(() => {
          setCallActivity(prev => {
            if (!prev[data.callSid]) return prev
            
            return {
              ...prev,
              [data.callSid]: { 
                ...prev[data.callSid],
                pulseAnimation: false
              }
            }
          })
        }, 2000)
      }
    }

    const handleTranscriptUpdate = (data: any) => {
      if (data.callSid && data.type === 'message' && data.data) {
        // Add the message to the transcript
        setCallTranscripts(prev => {
          const currentTranscript = prev[data.callSid] || []
          
          // Check if the message already exists to avoid duplicates
          const messageExists = currentTranscript.some(
            msg => msg.text === data.data.text && msg.role === data.data.role
          )
          
          if (messageExists) return prev
          
          return {
            ...prev,
            [data.callSid]: [
              ...currentTranscript,
              {
                role: data.data.role,
                text: data.data.text,
                timestamp: data.data.timestamp || new Date().toISOString()
              }
            ]
          }
        })
        
        // Update call activity
        setCallActivity(prev => ({
          ...prev,
          [data.callSid]: { 
            lastActivity: new Date(),
            pulseAnimation: true
          }
        }))
        
        // Stop animation after 2 seconds
        setTimeout(() => {
          setCallActivity(prev => {
            if (!prev[data.callSid]) return prev
            
            return {
              ...prev,
              [data.callSid]: { 
                ...prev[data.callSid],
                pulseAnimation: false
              }
            }
          })
        }, 2000)
      } else if (data.callSid && data.type === 'full_transcript' && data.data) {
        // Replace the entire transcript
        setCallTranscripts(prev => ({
          ...prev,
          [data.callSid]: data.data.messages || []
        }))
      }
    }

    // Register event listeners
    socket.on('call_update', handleCallUpdate)
    socket.on('transcript_update', handleTranscriptUpdate)

    // Cleanup
    return () => {
      socket.off('call_update', handleCallUpdate)
      socket.off('transcript_update', handleTranscriptUpdate)
    }
  }, [socket])

  // Function to get status icon based on call status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress':
        return <PhoneCall className="h-4 w-4 text-green-500" />
      case 'ringing':
        return <PhoneIncoming className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'busy':
      case 'no-answer':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'canceled':
        return <PhoneOff className="h-4 w-4 text-amber-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Helper to check if call is active (for filtering)
  const isActiveCall = (status: string) => {
    return ['in-progress', 'ringing', 'queued', 'initiated'].includes(status)
  }

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get a clean phone number for display
  const formatPhoneNumber = (phoneNumber?: string) => {
    if (!phoneNumber) return 'Unknown'
    
    // Basic phone formatting - adjust as needed for your locale
    const cleaned = phoneNumber.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`
    }
    return phoneNumber
  }

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true)
    refreshActiveCalls()
    setTimeout(() => setLoading(false), 500)
  }

  // Handle call selection for details view
  const handleCallSelect = (callSid: string) => {
    setSelectedCallSid(callSid === selectedCallSid ? null : callSid)
  }

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Active Calls</CardTitle>
            <RealTimeStatusIndicator 
              subscriptionType="calls" 
            />
          </div>
          <CardDescription>
            Real-time call monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Calls</CardTitle>
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
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Active Calls</CardTitle>
          <div className="flex items-center space-x-2">
            <RealTimeStatusIndicator 
              subscriptionType="calls" 
            />
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
        </div>
        <CardDescription>
          {filteredCalls.filter(call => isActiveCall(call.status)).length} active calls
        </CardDescription>
      </CardHeader>

      <CardContent>
        {filteredCalls.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <PhoneOff className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No active calls</p>
            <p className="text-sm">Active calls will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List of active calls */}
            {filteredCalls.map(call => (
              <div 
                key={call.sid}
                className={cn(
                  "border rounded-lg p-4 transition-all",
                  selectedCallSid === call.sid ? "border-primary" : "border-border",
                  callActivity[call.sid]?.pulseAnimation ? "bg-amber-50" : "",
                  "hover:border-primary cursor-pointer"
                )}
                onClick={() => handleCallSelect(call.sid)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={cn(
                      "mr-3 p-2 rounded-full",
                      call.status === 'in-progress' ? "bg-green-100" :
                      call.status === 'ringing' ? "bg-blue-100" :
                      call.status === 'completed' ? "bg-gray-100" :
                      "bg-amber-100"
                    )}>
                      {getStatusIcon(call.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">{call.contactName || 'Unknown Contact'}</h4>
                      <p className="text-sm text-muted-foreground">{formatPhoneNumber(call.to)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      call.status === 'in-progress' ? 'default' :
                      call.status === 'ringing' ? 'secondary' :
                      call.status === 'completed' ? 'outline' :
                      'destructive'
                    }>
                      {call.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(call.duration)}
                    </div>
                  </div>
                </div>

                {/* Call Details (expanded when selected) */}
                {selectedCallSid === call.sid && (
                  <div className="mt-4 pt-4 border-t">
                    <Tabs defaultValue="transcript">
                      <TabsList>
                        <TabsTrigger value="transcript">
                          <Bot className="h-4 w-4 mr-2" />
                          Transcript
                        </TabsTrigger>
                        <TabsTrigger value="details">
                          <Zap className="h-4 w-4 mr-2" />
                          Details
                        </TabsTrigger>
                        <TabsTrigger value="audio">
                          <Headphones className="h-4 w-4 mr-2" />
                          Audio
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="transcript" className="mt-2">
                        {!callTranscripts[call.sid] || callTranscripts[call.sid].length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No transcript available yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                            {callTranscripts[call.sid].map((message, index) => (
                              <div 
                                key={index} 
                                className={cn(
                                  "flex items-start space-x-2",
                                  message.role === 'assistant' || message.role === 'agent' ? "justify-start" : "justify-end"
                                )}
                              >
                                {(message.role === 'assistant' || message.role === 'agent') && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      AI
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={cn(
                                  "rounded-lg p-2 max-w-[85%] text-sm",
                                  message.role === 'assistant' || message.role === 'agent'
                                    ? "bg-muted text-foreground" 
                                    : "bg-primary text-primary-foreground"
                                )}>
                                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                                  {message.timestamp && (
                                    <p className="text-xs mt-1 opacity-70">
                                      {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                                {(message.role === 'user' || message.role === 'customer') && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      U
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="details" className="mt-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Call SID</p>
                            <p className="font-mono">{call.sid}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">From</p>
                            <p>{formatPhoneNumber(call.from)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start Time</p>
                            <p>{new Date(call.startTime).toLocaleTimeString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Duration</p>
                            <p>{formatDuration(call.duration)}</p>
                          </div>
                          {call.answeredBy && (
                            <div>
                              <p className="text-muted-foreground">Answered By</p>
                              <p className="capitalize">{call.answeredBy}</p>
                            </div>
                          )}
                          {call.campaign_id && (
                            <div>
                              <p className="text-muted-foreground">Campaign</p>
                              <p>{call.campaign_id}</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="audio" className="mt-2">
                        {call.status !== 'in-progress' ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Audio not available</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center">
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-10 w-10 rounded-full"
                              >
                                <PlayCircle className="h-6 w-6" />
                              </Button>
                            </div>
                            <p className="text-center text-sm text-muted-foreground">
                              Live audio streaming not available yet
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between text-sm text-muted-foreground border-t pt-4">
        <div>
          Total active: {filteredCalls.filter(call => isActiveCall(call.status)).length}
        </div>
        <div>
          {callActivity[selectedCallSid]?.lastActivity && (
            <span>Last activity: {new Date(callActivity[selectedCallSid].lastActivity).toLocaleTimeString()}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
