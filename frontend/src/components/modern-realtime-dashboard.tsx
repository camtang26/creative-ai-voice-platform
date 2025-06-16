"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/lib/socket-context'
import { 
  PhoneCall, 
  RefreshCw, 
  Activity, 
  PhoneOff, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Loader2,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react'
import { cn, formatDate, formatPhoneNumber } from '@/lib/utils'

interface ModernRealTimeDashboardProps {
  campaignId?: string
  showBothTabs?: boolean
  className?: string
}

export function ModernRealTimeDashboard({ 
  campaignId, 
  showBothTabs = true, 
  className 
}: ModernRealTimeDashboardProps) {
  const { isConnected, activeCalls, refreshActiveCalls, lastMessage } = useSocket()
  const [activeTab, setActiveTab] = useState<'calls' | 'activity'>('calls')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [recentEvents, setRecentEvents] = useState<Array<{
    id: string
    type: 'call_started' | 'call_ended' | 'system_event'
    message: string
    timestamp: Date
    severity: 'info' | 'success' | 'warning' | 'error'
  }>>([])

  // Simulate real-time events for demo
  useEffect(() => {
    const eventInterval = setInterval(() => {
      const events = [
        { type: 'call_started' as const, message: 'New call initiated to +1 (555) 123-4567', severity: 'info' as const },
        { type: 'call_ended' as const, message: 'Call completed successfully - 2m 34s duration', severity: 'success' as const },
        { type: 'system_event' as const, message: 'WebSocket connection restored', severity: 'success' as const },
        { type: 'system_event' as const, message: 'High call volume detected', severity: 'warning' as const },
      ]
      
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      const newEvent = {
        id: Date.now().toString(),
        ...randomEvent,
        timestamp: new Date()
      }
      
      setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]) // Keep only 10 most recent
    }, 8000) // New event every 8 seconds

    return () => clearInterval(eventInterval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshActiveCalls()
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  const connectionStatus = isConnected ? 'connected' : 'disconnected'
  const connectionColor = isConnected ? 'text-green-400' : 'text-red-400'
  const connectionIcon = isConnected ? Wifi : WifiOff

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={cn("space-y-6", className)}
    >
      {/* Connection Status Header */}
      <div className="glass-panel p-4 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: isConnected ? [1, 1.2, 1] : 1,
                rotate: isConnected ? 0 : [0, -10, 10, 0]
              }}
              transition={{ 
                scale: { duration: 2, repeat: Infinity },
                rotate: { duration: 0.5, repeat: Infinity }
              }}
            >
              {connectionIcon({ className: `h-5 w-5 ${connectionColor}` })}
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-white">Real-Time Monitor</h3>
              <p className="text-sm text-white/60">
                Status: <span className={connectionColor}>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "border-current", 
                isConnected ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"
              )}
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-current rounded-full mr-2"
              />
              {activeCalls?.length || 0} Active
            </Badge>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ duration: 1, ease: "linear", repeat: isRefreshing ? Infinity : 0 }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'calls' | 'activity')}>
        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
          <TabsTrigger 
            value="calls" 
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-white"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Live Calls
          </TabsTrigger>
          <TabsTrigger 
            value="activity"
            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white"
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <AnimatePresence mode="wait">
            {activeCalls && activeCalls.length > 0 ? (
              <motion.div 
                key="calls-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {activeCalls.map((call, index) => (
                  <motion.div
                    key={call.sid}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-panel p-4 rounded-xl border border-white/10 hover:border-blue-400/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            backgroundColor: ['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.4)', 'rgba(34, 197, 94, 0.2)']
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-3 h-3 bg-green-500/20 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-white">
                            {formatPhoneNumber(call.to) || call.to}
                          </p>
                          <p className="text-sm text-white/60">
                            Started {formatDate(call.startTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-400 border-green-400/30">
                          {call.status}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                          <PhoneOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="no-calls"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-panel p-8 rounded-xl border border-white/10 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"
                  >
                    <PhoneCall className="h-6 w-6 text-blue-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Active Calls</h3>
                    <p className="text-white/60">All quiet on the calling front.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="space-y-3">
            <AnimatePresence>
              {recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel p-4 rounded-xl border border-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2",
                      event.severity === 'success' && "bg-green-400",
                      event.severity === 'warning' && "bg-yellow-400", 
                      event.severity === 'error' && "bg-red-400",
                      event.severity === 'info' && "bg-blue-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{event.message}</p>
                      <p className="text-xs text-white/60 mt-1">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        event.severity === 'success' && "text-green-400 border-green-400/30",
                        event.severity === 'warning' && "text-yellow-400 border-yellow-400/30", 
                        event.severity === 'error' && "text-red-400 border-red-400/30",
                        event.severity === 'info' && "text-blue-400 border-blue-400/30"
                      )}
                    >
                      {event.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {recentEvents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-8 rounded-xl border border-white/10 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center"
                  >
                    <Zap className="h-6 w-6 text-purple-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Waiting for Activity</h3>
                    <p className="text-white/60">Recent events will appear here.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}