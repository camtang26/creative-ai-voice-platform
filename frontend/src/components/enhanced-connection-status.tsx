"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Signal,
  Clock,
  Activity,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEnhancedSocket, ConnectionState, ConnectionQuality } from '@/lib/enhanced-socket-context'

interface EnhancedConnectionStatusProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export function EnhancedConnectionStatus({ 
  className, 
  showDetails = false, 
  compact = false 
}: EnhancedConnectionStatusProps) {
  const { 
    connectionState, 
    connectionMetrics, 
    isOnline, 
    forceReconnect,
    getConnectionHistory 
  } = useEnhancedSocket()

  const [showHistory, setShowHistory] = useState(false)
  const [connectionHistory, setConnectionHistory] = useState<any[]>([])

  useEffect(() => {
    if (showHistory) {
      setConnectionHistory(getConnectionHistory())
    }
  }, [showHistory, getConnectionHistory])

  // Auto-refresh history every 5 seconds when visible
  useEffect(() => {
    if (!showHistory) return

    const interval = setInterval(() => {
      setConnectionHistory(getConnectionHistory())
    }, 5000)

    return () => clearInterval(interval)
  }, [showHistory, getConnectionHistory])

  const getStateConfig = (state: ConnectionState) => {
    switch (state) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400/30',
          label: 'Connected',
          description: 'Real-time connection active'
        }
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-400/30',
          label: 'Connecting',
          description: 'Establishing connection...'
        }
      case 'reconnecting':
        return {
          icon: Loader2,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-400/30',
          label: 'Reconnecting',
          description: 'Attempting to reconnect...'
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-400/30',
          label: 'Disconnected',
          description: 'No connection'
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-400/30',
          label: 'Failed',
          description: 'Connection failed'
        }
      case 'unauthorized':
        return {
          icon: AlertTriangle,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-400/30',
          label: 'Unauthorized',
          description: 'Authentication required'
        }
    }
  }

  const getQualityConfig = (quality: ConnectionQuality) => {
    switch (quality) {
      case 'excellent':
        return { color: 'text-green-400', bars: 4 }
      case 'good':
        return { color: 'text-blue-400', bars: 3 }
      case 'poor':
        return { color: 'text-yellow-400', bars: 2 }
      case 'unstable':
        return { color: 'text-red-400', bars: 1 }
    }
  }

  const stateConfig = getStateConfig(connectionState)
  const qualityConfig = getQualityConfig(connectionMetrics.quality)
  const Icon = stateConfig.icon

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-2", className)}
      >
        <motion.div
          animate={{ 
            rotate: connectionState === 'connecting' || connectionState === 'reconnecting' ? 360 : 0 
          }}
          transition={{ 
            duration: 1, 
            repeat: connectionState === 'connecting' || connectionState === 'reconnecting' ? Infinity : 0,
            ease: "linear" 
          }}
          className={cn("p-1 rounded-full", stateConfig.bgColor)}
        >
          <Icon className={cn("h-4 w-4", stateConfig.color)} />
        </motion.div>
        <span className={cn("text-sm font-medium", stateConfig.color)}>
          {stateConfig.label}
        </span>
        {!isOnline && (
          <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">
            Offline
          </Badge>
        )}
      </motion.div>
    )
  }

  return (
    <Card className={cn("glass-panel border-white/10", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <motion.div
              animate={{ 
                rotate: connectionState === 'connecting' || connectionState === 'reconnecting' ? 360 : 0 
              }}
              transition={{ 
                duration: 1, 
                repeat: connectionState === 'connecting' || connectionState === 'reconnecting' ? Infinity : 0,
                ease: "linear" 
              }}
            >
              <Icon className={cn("h-5 w-5", stateConfig.color)} />
            </motion.div>
            Connection Status
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Signal quality indicator */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: i < qualityConfig.bars ? 1 : 0.3,
                    backgroundColor: i < qualityConfig.bars ? qualityConfig.color : 'rgb(107 114 128)'
                  }}
                  className="w-1 h-3 rounded-full"
                  style={{ 
                    height: `${8 + i * 2}px`,
                  }}
                />
              ))}
            </div>
            
            <Button
              onClick={forceReconnect}
              variant="outline"
              size="sm"
              disabled={connectionState === 'connecting' || connectionState === 'reconnecting'}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Reconnect
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main status */}
        <div className={cn("p-4 rounded-xl border", stateConfig.bgColor, stateConfig.borderColor)}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={cn("font-medium", stateConfig.color)}>
                {stateConfig.label}
              </h3>
              <p className="text-sm text-white/60">
                {stateConfig.description}
              </p>
            </div>
            {!isOnline && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Connection metrics */}
        {showDetails && connectionState === 'connected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="glass-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Latency</span>
              </div>
              <p className="text-lg font-bold text-blue-400">
                {connectionMetrics.latency}ms
              </p>
              <p className="text-xs text-white/60 capitalize">
                {connectionMetrics.quality}
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Uptime</span>
              </div>
              <p className="text-lg font-bold text-green-400">
                {formatUptime(connectionMetrics.uptime)}
              </p>
              <p className="text-xs text-white/60">
                {connectionMetrics.reconnectCount} reconnects
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Heartbeat</span>
              </div>
              <p className="text-lg font-bold text-purple-400">
                {connectionMetrics.lastHeartbeat ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-white/60">
                {connectionMetrics.lastHeartbeat?.toLocaleTimeString() || 'No data'}
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Signal className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Packet Loss</span>
              </div>
              <p className="text-lg font-bold text-yellow-400">
                {connectionMetrics.packetLoss}%
              </p>
              <p className="text-xs text-white/60">
                Network quality
              </p>
            </div>
          </motion.div>
        )}

        {/* Connection history toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white"
          >
            {showHistory ? 'Hide' : 'Show'} Connection History
          </Button>
          
          <div className="text-xs text-white/60">
            Details: {showDetails ? 'On' : 'Off'}
          </div>
        </div>

        {/* Connection history */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 max-h-40 overflow-y-auto"
            >
              {connectionHistory.slice(-10).reverse().map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-2 glass-panel rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getStateConfig(event.state).color.replace('text-', 'bg-')
                    )} />
                    <span className="text-white/80 capitalize">
                      {event.state}
                    </span>
                    {event.reason && (
                      <span className="text-white/60 text-xs">
                        - {event.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-white/60 text-xs">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}