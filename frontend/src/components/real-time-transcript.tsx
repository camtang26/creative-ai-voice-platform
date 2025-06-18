"use client"

import { useState, useEffect, useRef } from 'react'
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
import { cn } from '@/lib/utils'
import { MessageCircle, Phone, User, Bot, Headphones, RefreshCw, AlertCircle } from 'lucide-react'

interface TranscriptMessage {
  role: 'assistant' | 'user' | 'system' | string; // Made role more flexible
  text: string; // Changed from message to text
  timestamp?: string;
  speaker?: string; // Added speaker
}

// Define TranscriptData locally
interface TranscriptData {
  callSid?: string;
  messages: TranscriptMessage[];
}

interface RealTimeTranscriptProps {
  callSid: string;
  initialTranscript?: TranscriptData | null; // Use TranscriptData
}

export function RealTimeTranscript({ callSid, initialTranscript }: RealTimeTranscriptProps) {
  const {
    socket,
    isConnected,
    subscribeToCall,
    unsubscribeFromCall,
    lastTranscriptUpdate
  } = useSocket()
  
  const [messages, setMessages] = useState<TranscriptMessage[]>(initialTranscript?.messages || [])
  const [isLive, setIsLive] = useState(true)
  const [isNewMessage, setIsNewMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Subscribe to call transcript updates
  useEffect(() => {
    if (callSid) {
      console.log(`[Socket] Subscribing to call transcript: ${callSid}`)
      subscribeToCall(callSid)
      socket?.emit('subscribe_to_call_transcript', callSid)
    }
    
    return () => {
      if (callSid) {
        console.log(`[Socket] Unsubscribing from call transcript: ${callSid}`)
        unsubscribeFromCall(callSid)
        socket?.emit('unsubscribe_from_call_transcript', callSid)
      }
    }
  }, [callSid, socket, subscribeToCall, unsubscribeFromCall])
  
  // Handle transcript updates
  useEffect(() => {
    if (lastTranscriptUpdate && lastTranscriptUpdate.callSid === callSid) {
      console.log('[Socket] Received transcript update:', lastTranscriptUpdate)
      
      // Assuming for 'transcript_message', data is a TranscriptMessage object
      if (lastTranscriptUpdate.type === 'transcript_message' && lastTranscriptUpdate.data) {
        const newMessage = lastTranscriptUpdate.data as TranscriptMessage; // Cast data to TranscriptMessage
        // Add single message
        setMessages(prev => {
          // Check if the message is already in the transcript
          const isDuplicate = prev.some(
            (m: TranscriptMessage) => m.text === newMessage.text &&
                                     m.role === newMessage.role &&
                                     m.timestamp === newMessage.timestamp // Optional: check timestamp too
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Add the new message
          return [...prev, newMessage];
        });
        setIsNewMessage(true);
      } else if (lastTranscriptUpdate.type === 'full_transcript' && lastTranscriptUpdate.data && Array.isArray((lastTranscriptUpdate.data as TranscriptData).messages)) {
        // Replace entire transcript, assuming data is TranscriptData
        setMessages((lastTranscriptUpdate.data as TranscriptData).messages);
        setIsNewMessage(true)
      }
    }
  }, [lastTranscriptUpdate, callSid])
  
  // Custom event handler for call transcript messages
  useEffect(() => {
    // Interface for transcript_update events (new format)
    interface TranscriptUpdateData {
      callSid: string;
      type: 'message' | 'typing_indicator' | 'full_transcript';
      data?: {
        text: string;
        role: string;
        timestamp?: string;
        speaker?: string;
        isPartial?: boolean;
      };
    }
    
    // Interface for call_transcript_message events (old format)
    interface CallTranscriptEventData {
      callSid: string;
      message?: TranscriptMessage;
      data?: TranscriptMessage;
    }
    
    // Handler for new format transcript_update events
    const handleTranscriptUpdate = (eventData: TranscriptUpdateData) => {
      console.log(`[Socket] Received transcript update for call ${callSid}:`, eventData)
      
      if (eventData.callSid === callSid && eventData.type === 'message' && eventData.data) {
        const newMessage: TranscriptMessage = {
          text: eventData.data.text,
          role: eventData.data.role,
          timestamp: eventData.data.timestamp,
          speaker: eventData.data.speaker
        };

        setMessages(prev => {
          // For typewriter effect: update last message if partial
          if (eventData.data?.isPartial && prev.length > 0) {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === newMessage.role && eventData.data.text.startsWith(lastMessage.text)) {
              // Update the last message
              const updated = [...prev];
              updated[updated.length - 1] = { ...lastMessage, text: eventData.data.text };
              return updated;
            }
          }
          
          // Check if the message is already in the transcript
          const isDuplicate = prev.some(
            (m: TranscriptMessage) => m.text === newMessage.text && m.role === newMessage.role
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Add the new message
          return [...prev, newMessage];
        });
        
        setIsNewMessage(true);
        setTimeout(() => setIsNewMessage(false), 2000);
      }
    };
    
    // Handler for old format call_transcript_message events
    const handleCallTranscriptMessage = (eventData: CallTranscriptEventData) => {
      console.log(`[Socket] Received transcript message for call ${callSid}:`, eventData)
      
      const messagePayload = eventData.data || eventData.message;

      if (eventData.callSid === callSid && messagePayload &&
          typeof messagePayload.text === 'string' && typeof messagePayload.role === 'string') {
        
        const newMessage = messagePayload as TranscriptMessage;

        setMessages(prev => {
          // Check if the message is already in the transcript
          const isDuplicate = prev.some(
            (m: TranscriptMessage) => m.text === newMessage.text &&
                                     m.role === newMessage.role &&
                                     m.timestamp === newMessage.timestamp
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Add the new message
          return [...prev, newMessage];
        })
        setIsNewMessage(true)
      }
    }
    
    if (socket) {
      socket.on('call_transcript_message', handleCallTranscriptMessage)
      socket.on('transcript_update', handleTranscriptUpdate)
    }
    
    return () => {
      if (socket) {
        socket.off('call_transcript_message', handleCallTranscriptMessage)
        socket.off('transcript_update', handleTranscriptUpdate)
      }
    }
  }, [socket, callSid])
  
  // Auto-scroll to bottom on new messages if in live mode
  useEffect(() => {
    if (isLive && isNewMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      setIsNewMessage(false)
    }
  }, [messages, isLive, isNewMessage])
  
  // Toggle live mode when scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
    
    if (isAtBottom && !isLive) {
      setIsLive(true)
    } else if (!isAtBottom && isLive) {
      setIsLive(false)
    }
  }
  
  // Format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ''
    
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (e) {
      return ''
    }
  }
  
  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-primary" />
              Live Transcript
              {!isConnected && <Badge variant="outline" className="ml-2">Offline</Badge>}
            </CardTitle>
            <CardDescription>
              Real-time conversation transcript
            </CardDescription>
          </div>
          {isLive ? (
            <Badge variant="default" className="animate-pulse">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
              Live
            </Badge>
          ) : (
            <Badge variant="outline" onClick={() => {
              setIsLive(true)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }} className="cursor-pointer hover:bg-secondary">
              Resume Live
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {!isConnected && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Socket connection is offline</p>
            <p className="text-sm text-muted-foreground mt-1">Waiting for connection...</p>
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mt-4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Headphones className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No transcript available yet</p>
            <p className="text-sm text-muted-foreground mt-1">Transcript will appear as the conversation progresses</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-start space-x-3",
                  message.role === 'assistant' ? "justify-start" : "justify-end"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1 bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={cn(
                  "rounded-lg p-3 max-w-[80%] relative group",
                  message.role === 'assistant' 
                    ? "bg-muted text-foreground" 
                    : "bg-primary text-primary-foreground"
                )}>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                  {message.timestamp && (
                    <span className="absolute -bottom-5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 mt-1 bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t p-3 flex justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="h-4 w-4 mr-1" />
          <span className="text-xs">Call ID: {callSid}</span>
        </div>
        {messages.length > 0 && !isLive && (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              setIsLive(true)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Resume Live
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
