"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSocket } from '@/lib/socket-context'

interface StatusIndicatorProps {
  label?: string
  showAlert?: boolean
  className?: string
  subscriptionType?: 'calls' | 'campaign' | 'transcript'
  resourceId?: string
}

export function RealTimeStatusIndicator({
  label = 'Real-time Status',
  showAlert = false,
  className,
  subscriptionType,
  resourceId
}: StatusIndicatorProps) {
  const { socket, isConnected } = useSocket()
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'inactive'
  >(isConnected ? 'connected' : 'disconnected')
  const [alertVisible, setAlertVisible] = useState(false)
  const [indicatorPulse, setIndicatorPulse] = useState(false)

  // Handle connection state changes
  useEffect(() => {
    setConnectionState(isConnected ? 'connected' : 'disconnected')
    
    if (isConnected && connectionState === 'disconnected') {
      // Connection was restored
      if (showAlert) {
        setAlertVisible(true)
        // Hide alert after 5 seconds
        const timer = setTimeout(() => setAlertVisible(false), 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [isConnected, connectionState, showAlert])

  // Set up socket activity listeners
  useEffect(() => {
    if (!socket) return

    // Event types to listen for based on subscription type
    const eventTypes: string[] = []
    
    switch(subscriptionType) {
      case 'calls':
        eventTypes.push('call_update', 'active_calls')
        break
      case 'campaign':
        eventTypes.push('campaign_update', 'campaign_data')
        break
      case 'transcript':
        eventTypes.push('transcript_update', 'transcript_message')
        break
      default:
        // Listen for all update types
        eventTypes.push('call_update', 'campaign_update', 'transcript_update')
        break
    }

    // Function to handle activity
    const handleActivity = (data: any) => {
      // Only process events related to the specific resource if resourceId is provided
      if (resourceId) {
        const eventResourceId = 
          data.callSid || data.campaignId || (data.data && (data.data.callSid || data.data.campaignId))
        
        if (eventResourceId !== resourceId) return
      }
      
      // Update last activity time
      setLastActivity(new Date())
      
      // Pulse the indicator
      setIndicatorPulse(true)
      setTimeout(() => setIndicatorPulse(false), 1000)
      
      // Update connection state if inactive
      if (connectionState === 'inactive') {
        setConnectionState('connected')
      }
    }

    // Register activity listeners
    eventTypes.forEach(eventType => {
      socket.on(eventType, handleActivity)
    })

    // Inactivity timer - set status to inactive after 30 seconds without events
    const inactivityTimer = setInterval(() => {
      if (lastActivity && isConnected) {
        const elapsedTime = new Date().getTime() - lastActivity.getTime()
        if (elapsedTime > 30000 && connectionState !== 'inactive') {
          setConnectionState('inactive')
        }
      }
    }, 10000)

    // Cleanup
    return () => {
      eventTypes.forEach(eventType => {
        socket.off(eventType, handleActivity)
      })
      clearInterval(inactivityTimer)
    }
  }, [socket, subscriptionType, resourceId, connectionState, lastActivity, isConnected])

  // Get status elements based on connection state
  const getStatusElements = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          text: 'Live',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200'
        }
      case 'connecting':
        return {
          icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
          text: 'Connecting',
          variant: 'outline' as const,
          className: 'text-amber-700 border-amber-200 bg-amber-50'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3 mr-1" />,
          text: 'Disconnected',
          variant: 'destructive' as const,
          className: ''
        }
      case 'inactive':
        return {
          icon: <Wifi className="h-3 w-3 mr-1" />,
          text: 'Idle',
          variant: 'secondary' as const,
          className: 'text-muted-foreground'
        }
    }
  }

  const statusElements = getStatusElements()

  return (
    <>
      <div className={cn("flex items-center", className)}>
        {label && <span className="mr-2 text-sm">{label}</span>}
        <Badge 
          variant={statusElements.variant}
          className={cn(
            statusElements.className,
            indicatorPulse && 'animate-pulse'
          )}
        >
          {statusElements.icon}
          {statusElements.text}
        </Badge>
        
        {lastActivity && connectionState === 'connected' && (
          <span className="ml-2 text-xs text-muted-foreground">
            Last update: {lastActivity.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      {alertVisible && showAlert && connectionState === 'connected' && (
        <Alert className="mt-2 bg-green-50 border-green-200 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Connection restored</AlertTitle>
          <AlertDescription>
            Real-time updates have been re-established.
          </AlertDescription>
        </Alert>
      )}
      
      {alertVisible && showAlert && connectionState === 'disconnected' && (
        <Alert className="mt-2 bg-red-50 border-red-200 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection lost</AlertTitle>
          <AlertDescription>
            Real-time updates are currently unavailable. Reconnecting...
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
