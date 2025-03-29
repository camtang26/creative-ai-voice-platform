"use client"

import { useState, useEffect } from 'react'
import { useSocket } from '@/lib/socket-context'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Phone,
  User,
  Clock,
  PhoneIncoming,
  PhoneOff,
  PhoneMissed,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  PulseIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CallData {
  sid: string;
  status: string;
  from: string;
  to: string;
  startTime: string;
  duration?: number;
  answeredBy?: string;
  recordingCount?: number;
}

export function RealTimeCallMonitor() {
  const { 
    socket, 
    isConnected, 
    activeCalls,
    lastMessage, 
    refreshActiveCalls 
  } = useSocket()
  
  const [updatingCallSid, setUpdatingCallSid] = useState<string | null>(null)
  const [recentUpdates, setRecentUpdates] = useState<Array<{
    callSid: string;
    status: string;
    timestamp: string;
  }>>([])
  
  // Update recent updates when call status changes
  useEffect(() => {
    if (lastMessage && lastMessage.callSid) {
      setUpdatingCallSid(lastMessage.callSid)
      
      // Reset the visual update indicator after a delay
      setTimeout(() => {
        setUpdatingCallSid(null)
      }, 1500)
      
      // Add to recent updates
      setRecentUpdates(prev => {
        const status = lastMessage.type === 'call_ended' 
          ? 'completed' 
          : lastMessage.data?.status || 'unknown'
        
        const newUpdate = {
          callSid: lastMessage.callSid,
          status,
          timestamp: lastMessage.timestamp
        }
        
        // Keep only the 5 most recent updates
        return [newUpdate, ...prev].slice(0, 5)
      })
    }
  }, [lastMessage])
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ''
    }
  }
  
  // Calculate call duration in MM:SS format
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Get relative time (e.g., "2m ago")
  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`
    } else {
      return `${Math.floor(diffSeconds / 3600)}h ago`
    }
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <PhoneIncoming className="h-5 w-5 mr-2 text-primary" />
              Active Calls
              {!isConnected && <Badge variant="outline" className="ml-2">Offline</Badge>}
            </CardTitle>
            <CardDescription>
              Real-time monitoring of ongoing calls
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshActiveCalls}
            disabled={!isConnected}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Socket connection is offline</p>
            <p className="text-sm text-muted-foreground mt-1">Waiting for connection...</p>
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mt-4" />
          </div>
        ) : activeCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Phone className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No active calls</p>
            <p className="text-sm text-muted-foreground mt-1">Active calls will appear here in real-time</p>
          </div>
        ) : (
          <div className="border-b">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCalls.map((call) => (
                  <TableRow 
                    key={call.sid} 
                    className={cn(
                      updatingCallSid === call.sid ? "bg-primary/5" : "",
                      "transition-colors duration-500"
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium text-sm flex items-center">
                          <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {call.to || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {call.sid.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CallStatusBadge status={call.status} />
                      {call.status === 'in-progress' && (
                        <div className="flex items-center mt-1">
                          <PulseIcon className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <span className="tabular-nums">
                          {formatDuration(call.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatTime(call.startTime)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/call-details/${call.sid}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Recent updates section */}
        <div className="p-3">
          <h4 className="text-sm font-medium flex items-center mb-2">
            <Clock className="h-4 w-4 mr-1" />
            Recent Updates
          </h4>
          
          {recentUpdates.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground">
              No recent updates
            </div>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((update, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted">
                  <div className="flex items-center">
                    <CallStatusIcon status={update.status} className="h-4 w-4 mr-2" />
                    <div>
                      <span className="font-medium">Call {update.callSid.substring(0, 8)}...</span>
                      <span className="text-muted-foreground ml-1">changed to</span>
                      <span className="font-medium ml-1 capitalize">{update.status}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getRelativeTime(update.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-3 flex justify-between">
        <div className="text-sm text-muted-foreground">
          {activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center text-sm">
          <div className="flex items-center mr-4">
            <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/live-calls">View All</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

function CallStatusBadge({ status }: { status: string }) {
  let variant: 'outline' | 'secondary' | 'default' | 'destructive' = 'outline'
  
  switch (status) {
    case 'in-progress':
      variant = 'default'
      break
    case 'ringing':
      variant = 'secondary'
      break
    case 'queued':
    case 'initiated':
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
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

function CallStatusIcon({ status, className }: { status: string, className?: string }) {
  switch (status) {
    case 'in-progress':
      return <PhoneIncoming className={className} />
    case 'completed':
      return <CheckCircle className={className} />
    case 'failed':
    case 'busy':
    case 'no-answer':
      return <PhoneMissed className={className} />
    case 'canceled':
      return <PhoneOff className={className} />
    default:
      return <Phone className={className} />
  }
}
