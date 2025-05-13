"use client"

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '@/lib/socket-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RealTimeStatusIndicator } from '@/components/real-time-status-indicator'
import { Bot, User, Volume2, VolumeX, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchCallTranscript } from '@/lib/mongodb-api'

// Define interfaces for transcript structure
interface TranscriptMessage {
  role: 'user' | 'agent' | 'system' | string; // Allow string for flexibility if other roles exist
  text: string;
  timestamp?: string;
  speaker?: string; // e.g., 'Agent', 'Customer Name', or speaker ID
  // Add other potential message properties like sentiment, confidence, etc.
}

interface TranscriptData {
  callSid?: string; // Optional if transcript object is self-contained
  messages: TranscriptMessage[];
  // Potentially other metadata like language, duration, etc.
}

interface EnhancedRealTimeTranscriptProps {
  callSid: string
  initialTranscript?: TranscriptData | null
  className?: string
}

export function EnhancedRealTimeTranscript({ callSid, initialTranscript, className }: EnhancedRealTimeTranscriptProps) {
  const { socket, isConnected, subscribeToCall, unsubscribeFromCall } = useSocket()
  const [transcript, setTranscript] = useState<TranscriptData | null>(initialTranscript || { messages: [] })
  const [loading, setLoading] = useState(initialTranscript ? false : true)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  const [newMessage, setNewMessage] = useState<boolean>(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const [latestSpeaker, setLatestSpeaker] = useState<string | null>(null)
  const [speakerTyping, setSpeakerTyping] = useState<boolean>(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper to scroll to bottom of transcript
  const scrollToBottom = () => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Load initial transcript if not provided
  useEffect(() => {
    const loadTranscript = async () => {
      if (!initialTranscript && callSid) {
        try {
          setLoading(true)
          const response = await fetchCallTranscript(callSid)
          
          if (response.success && response.transcript) {
            setTranscript(response.transcript)
          } else {
            // If no transcript exists yet, create an empty one
            setTranscript({ messages: [] })
          }
        } catch (err) {
          console.error('Error loading transcript:', err)
          setError('Failed to load transcript')
        } finally {
          setLoading(false)
        }
      }
    }
    
    loadTranscript()
  }, [callSid, initialTranscript])

  // Subscribe to call updates for transcript
  useEffect(() => {
    if (socket && isConnected && callSid && !isSubscribed) {
      console.log(`[Transcript] Subscribing to call ${callSid}`)
      subscribeToCall(callSid)
      setIsSubscribed(true)
      setLastActivity(new Date())
    }

    // Cleanup subscription on unmount
    return () => {
      if (socket && isSubscribed) {
        console.log(`[Transcript] Unsubscribing from call ${callSid}`)
        unsubscribeFromCall(callSid)
        setIsSubscribed(false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket, isConnected, callSid, isSubscribed, subscribeToCall, unsubscribeFromCall])

  // Handle transcript updates
  useEffect(() => {
    if (!socket) return

    // Type for socket transcript update data
    // This should ideally come from a shared types definition with the backend/socket server
    interface SocketTranscriptMessageData {
      text: string;
      role: string;
      timestamp?: string;
      speaker?: string;
      // other fields from the socket message
    }
    interface SocketTranscriptUpdate {
      callSid: string;
      type: 'message' | 'typing_indicator' | 'full_transcript' | string; // Allow other types
      data: SocketTranscriptMessageData | any; // 'any' for other update types like full_transcript
    }

    const handleTranscriptUpdate = (data: SocketTranscriptUpdate) => {
      console.log('[Transcript] Received transcript update:', data)
      
      if (data.callSid === callSid) {
        setLastActivity(new Date())
        
        // Handle different update types
        if (data.type === 'message' && data.data && typeof data.data.text === 'string' && typeof data.data.role === 'string') {
          // Add a new message
          setTranscript((prev: TranscriptData | null) => {
            const prevMessages = prev?.messages || [];
            // If the message already exists, don't add it again
            const messageExists = prevMessages.some((msg: TranscriptMessage) =>
              msg.text === data.data.text && msg.role === data.data.role
            )
            
            if (messageExists) return prev;
            
            const newMessage: TranscriptMessage = {
              text: data.data.text,
              role: data.data.role,
              timestamp: data.data.timestamp || new Date().toISOString(),
              speaker: data.data.speaker
            };
            // Redundant prevMessages declaration removed.
            // prevMessages from line 133 will be used.
            const updatedMessages = [
              ...prevMessages,
              newMessage
            ];
            
            return {
              ...(prev || { messages: [] }),
              callSid: prev?.callSid || callSid,
              messages: updatedMessages
            } as TranscriptData;
          })
          
          // Show new message indicator
          setNewMessage(true)
          setTimeout(() => setNewMessage(false), 2000)
          
          // Set latest speaker
          setLatestSpeaker(data.data.role)
          
          // Scroll to bottom
          setTimeout(scrollToBottom, 100)
        } else if (data.type === 'typing_indicator') {
          // Show typing indicator
          setSpeakerTyping(true)
          setLatestSpeaker(data.data.role)
          
          // Clear any existing typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          
          // Set a timeout to clear the typing indicator after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setSpeakerTyping(false)
          }, 3000)
        } else if (data.type === 'full_transcript') {
          // Replace the entire transcript
          setTranscript(data.data)
          setTimeout(scrollToBottom, 100)
        }
      }
    }

    const handleCallData = (data: any) => {
      console.log('[Transcript] Received call data:', data)
      
      if (data.callSid === callSid && data.transcript) {
        setTranscript(data.transcript)
        setLastActivity(new Date())
        setTimeout(scrollToBottom, 100)
      }
    }
    
    // Register event listeners
    socket.on('transcript_update', handleTranscriptUpdate)
    socket.on('call_data', handleCallData)

    // Cleanup
    return () => {
      socket.off('transcript_update', handleTranscriptUpdate)
      socket.off('call_data', handleCallData)
    }
  }, [socket, callSid])

  // Scroll to bottom when messages are added
  useEffect(() => {
    if (transcript && transcript.messages && transcript.messages.length > 0) {
      scrollToBottom()
    }
  }, [transcript?.messages?.length])

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setLoading(true)
      const response = await fetchCallTranscript(callSid)
      
      if (response.success && response.transcript) {
        setTranscript(response.transcript)
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error refreshing transcript:', err)
      setError('Failed to refresh transcript')
      setLoading(false)
    }
  }

  if (loading && (!transcript || transcript.messages.length === 0)) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Call Transcript</CardTitle>
            <RealTimeStatusIndicator 
              subscriptionType="transcript" 
              resourceId={callSid} 
            />
          </div>
          <CardDescription>
            Real-time conversation transcript
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4 ml-auto" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("w-full border-red-200 bg-red-50", className)}>
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Transcript</CardTitle>
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
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            Conversation Transcript
            {newMessage && (
              <Badge variant="default" className="ml-2 animate-pulse">
                New Message
              </Badge>
            )}
          </CardTitle>
          <RealTimeStatusIndicator 
            subscriptionType="transcript" 
            resourceId={callSid} 
          />
        </div>
        <CardDescription>
          {transcript && transcript.messages && transcript.messages.length > 0
            ? `${transcript.messages.length} message${transcript.messages.length !== 1 ? 's' : ''} in the conversation`
            : 'Real-time conversation transcript'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4 pr-2">
          {(!transcript || transcript.messages.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-sm">Conversation messages will appear here in real-time</p>
            </div>
          ) : (
            transcript.messages.map((message: TranscriptMessage, index: number) => (
              <div
                key={index}
                className={cn(
                  "flex items-start space-x-3",
                  message.role === 'assistant' || message.role === 'agent' ? "justify-start" : "justify-end"
                )}
              >
                {(message.role === 'assistant' || message.role === 'agent') && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "rounded-lg p-3 max-w-[80%] transition-all",
                  message.role === 'assistant' || message.role === 'agent'
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground",
                  // Add pulse animation to the most recent message
                  transcript.messages && index === transcript.messages.length - 1 && newMessage && "animate-pulse"
                )}>
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  {message.timestamp && (
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {(message.role === 'user' || message.role === 'customer') && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {/* Typing indicator */}
          {speakerTyping && (
            <div 
              className={cn(
                "flex items-start space-x-3",
                latestSpeaker === 'assistant' || latestSpeaker === 'agent' ? "justify-start" : "justify-end"
              )}
            >
              {(latestSpeaker === 'assistant' || latestSpeaker === 'agent') && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "rounded-lg p-3 max-w-[80%]",
                latestSpeaker === 'assistant' || latestSpeaker === 'agent'
                  ? "bg-muted text-foreground" 
                  : "bg-primary text-primary-foreground"
              )}>
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
              </div>
              {(latestSpeaker === 'user' || latestSpeaker === 'customer') && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
          
          {/* Element to scroll to */}
          <div ref={transcriptEndRef} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {lastActivity && (
            <span>Last updated: {lastActivity.toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex space-x-2">
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
          {transcript && transcript.messages && transcript.messages.length > 0 && ( // This check is already correct
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Save Transcript
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
