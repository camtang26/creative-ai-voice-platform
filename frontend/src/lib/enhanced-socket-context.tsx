"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useModernToast } from '@/components/modern-toast-notifications';

// Enhanced connection states
export type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'failed'
  | 'unauthorized'

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unstable'

interface ConnectionMetrics {
  latency: number
  packetLoss: number
  reconnectCount: number
  uptime: number
  lastHeartbeat: Date | null
  quality: ConnectionQuality
}

interface ReconnectionOptions {
  enabled: boolean
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  jitter: boolean
}

interface EnhancedSocketContextType {
  socket: Socket | null
  connectionState: ConnectionState
  connectionMetrics: ConnectionMetrics
  isOnline: boolean
  
  // Connection management
  connect: () => void
  disconnect: () => void
  forceReconnect: () => void
  
  // Real-time data
  activeCalls: any[]
  lastMessage: any
  
  // Subscription management
  subscribeToEvents: (events: string[]) => () => void
  unsubscribeFromEvents: (events: string[]) => void
  
  // Advanced features
  setReconnectionOptions: (options: Partial<ReconnectionOptions>) => void
  getConnectionHistory: () => Array<{ timestamp: Date; state: ConnectionState; reason?: string }>
}

const defaultReconnectionOptions: ReconnectionOptions = {
  enabled: true,
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 1.5,
  jitter: true
}

const EnhancedSocketContext = createContext<EnhancedSocketContextType | null>(null)

export function useEnhancedSocket() {
  const context = useContext(EnhancedSocketContext)
  if (!context) {
    throw new Error('useEnhancedSocket must be used within an EnhancedSocketProvider')
  }
  return context
}

export function EnhancedSocketProvider({ 
  children,
  serverUrl = 'http://localhost:8000'
}: { 
  children: React.ReactNode
  serverUrl?: string
}) {
  const toast = useModernToast()
  
  // Core state
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [activeCalls, setActiveCalls] = useState<any[]>([])
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Connection metrics
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    latency: 0,
    packetLoss: 0,
    reconnectCount: 0,
    uptime: 0,
    lastHeartbeat: null,
    quality: 'excellent'
  })

  // Reconnection management
  const [reconnectionOptions, setReconnectionOptionsState] = useState(defaultReconnectionOptions)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<NodeJS.Timeout>()
  const heartbeatInterval = useRef<NodeJS.Timeout>()
  const connectionHistory = useRef<Array<{ timestamp: Date; state: ConnectionState; reason?: string }>>([])
  const connectStartTime = useRef<Date>()

  // Add connection event to history
  const addConnectionEvent = useCallback((state: ConnectionState, reason?: string) => {
    connectionHistory.current.push({
      timestamp: new Date(),
      state,
      reason
    })
    
    // Keep only last 50 events
    if (connectionHistory.current.length > 50) {
      connectionHistory.current = connectionHistory.current.slice(-50)
    }
  }, [])

  // Calculate connection quality based on metrics
  const calculateConnectionQuality = useCallback((latency: number, packetLoss: number): ConnectionQuality => {
    if (latency < 100 && packetLoss < 1) return 'excellent'
    if (latency < 300 && packetLoss < 3) return 'good'
    if (latency < 500 && packetLoss < 5) return 'poor'
    return 'unstable'
  }, [])

  // Enhanced reconnection logic with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!reconnectionOptions.enabled || reconnectAttempts.current >= reconnectionOptions.maxAttempts) {
      setConnectionState('failed')
      addConnectionEvent('failed', 'Max reconnection attempts reached')
      toast.error('Connection Failed', 'Unable to establish connection after multiple attempts')
      return
    }

    const attempt = reconnectAttempts.current
    let delay = Math.min(
      reconnectionOptions.baseDelay * Math.pow(reconnectionOptions.backoffFactor, attempt),
      reconnectionOptions.maxDelay
    )

    // Add jitter to prevent thundering herd
    if (reconnectionOptions.jitter) {
      delay += Math.random() * 1000
    }

    setConnectionState('reconnecting')
    addConnectionEvent('reconnecting', `Attempt ${attempt + 1}/${reconnectionOptions.maxAttempts}`)

    reconnectTimer.current = setTimeout(() => {
      reconnectAttempts.current++
      connect()
    }, delay)

    toast.warning('Reconnecting...', `Attempt ${attempt + 1} in ${Math.round(delay / 1000)}s`)
  }, [reconnectionOptions, toast])

  // Heartbeat system for connection monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current)
    }

    heartbeatInterval.current = setInterval(() => {
      if (socket && connectionState === 'connected') {
        const pingStart = Date.now()
        
        socket.emit('ping', pingStart, (response: any) => {
          const latency = Date.now() - pingStart
          const now = new Date()
          
          setConnectionMetrics(prev => {
            const quality = calculateConnectionQuality(latency, prev.packetLoss)
            return {
              ...prev,
              latency,
              lastHeartbeat: now,
              quality,
              uptime: connectStartTime.current ? now.getTime() - connectStartTime.current.getTime() : 0
            }
          })
        })

        // Timeout detection
        setTimeout(() => {
          setConnectionMetrics(prev => {
            if (prev.lastHeartbeat && Date.now() - prev.lastHeartbeat.getTime() > 10000) {
              return { ...prev, packetLoss: Math.min(prev.packetLoss + 1, 100) }
            }
            return prev
          })
        }, 5000)
      }
    }, 5000)
  }, [socket, connectionState, calculateConnectionQuality])

  // Enhanced connection function
  const connect = useCallback(() => {
    if (socket?.connected) return

    setConnectionState('connecting')
    addConnectionEvent('connecting')
    connectStartTime.current = new Date()

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false, // We handle reconnection ourselves
      forceNew: true
    })

    // Connection success
    newSocket.on('connect', () => {
      setConnectionState('connected')
      addConnectionEvent('connected')
      reconnectAttempts.current = 0
      
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }

      toast.success('Connected', 'Real-time connection established')
      startHeartbeat()
    })

    // Connection error
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      addConnectionEvent('disconnected', error.message)
      
      if (connectionState === 'connecting') {
        scheduleReconnect()
      }
    })

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      setConnectionState('disconnected')
      addConnectionEvent('disconnected', reason)
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }

      // Auto-reconnect unless explicitly disconnected
      if (reason !== 'io client disconnect') {
        toast.warning('Connection Lost', 'Attempting to reconnect...')
        scheduleReconnect()
      }
    })

    // Data events
    newSocket.on('call_update', (data) => {
      setLastMessage(data)
      
      // Update active calls based on the event
      setActiveCalls(prev => {
        switch (data.type) {
          case 'new_call':
            return [...prev, data.data]
          case 'call_ended':
            return prev.filter(call => call.sid !== data.callSid)
          case 'status_update':
            return prev.map(call => 
              call.sid === data.callSid ? { ...call, ...data.data } : call
            )
          default:
            return prev
        }
      })
    })

    newSocket.on('active_calls', (calls) => {
      setActiveCalls(calls)
    })

    setSocket(newSocket)
  }, [serverUrl, connectionState, scheduleReconnect, startHeartbeat, toast])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current)
    }

    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    
    setConnectionState('disconnected')
    addConnectionEvent('disconnected', 'Manual disconnect')
  }, [socket])

  // Force reconnect
  const forceReconnect = useCallback(() => {
    disconnect()
    reconnectAttempts.current = 0
    setTimeout(connect, 1000)
  }, [disconnect, connect])

  // Subscribe to events
  const subscribeToEvents = useCallback((events: string[]) => {
    if (!socket) return () => {}

    events.forEach(event => {
      socket.emit('subscribe', event)
    })

    return () => {
      events.forEach(event => {
        socket.emit('unsubscribe', event)
      })
    }
  }, [socket])

  // Unsubscribe from events
  const unsubscribeFromEvents = useCallback((events: string[]) => {
    if (!socket) return

    events.forEach(event => {
      socket.emit('unsubscribe', event)
    })
  }, [socket])

  // Update reconnection options
  const setReconnectionOptions = useCallback((options: Partial<ReconnectionOptions>) => {
    setReconnectionOptionsState(prev => ({ ...prev, ...options }))
  }, [])

  // Get connection history
  const getConnectionHistory = useCallback(() => {
    return [...connectionHistory.current]
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (connectionState === 'disconnected') {
        toast.info('Back Online', 'Attempting to reconnect...')
        connect()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Offline', 'Internet connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connectionState, connect, toast])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
    }
  }, [])

  const value: EnhancedSocketContextType = {
    socket,
    connectionState,
    connectionMetrics,
    isOnline,
    connect,
    disconnect,
    forceReconnect,
    activeCalls,
    lastMessage,
    subscribeToEvents,
    unsubscribeFromEvents,
    setReconnectionOptions,
    getConnectionHistory
  }

  return (
    <EnhancedSocketContext.Provider value={value}>
      {children}
    </EnhancedSocketContext.Provider>
  )
}