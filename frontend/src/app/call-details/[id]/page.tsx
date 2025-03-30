"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Phone,
  User,
  Calendar,
  Clock,
  PlayCircle,
  PauseCircle,
  Volume2,
  VolumeX,
  DownloadCloud,
  Wand2,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  PhoneOff,
  PhoneIncoming,
  AlertTriangle,
  Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RealTimeTranscript } from "@/components/real-time-transcript"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fetchCall, fetchCallRecordings, fetchCallTranscript } from "@/lib/mongodb-api"
import { cn } from "@/lib/utils"

interface CallDetailsPageProps {
  params: {
    id: string
  }
}

export default function CallDetailsPageEnhanced({ params }: CallDetailsPageProps) {
  // Removed commented-out debug logs
  const [call, setCall] = useState<any>(null)
  const [recordings, setRecordings] = useState<any[]>([])
  const [transcript, setTranscript] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch call details, recordings, and transcript
  useEffect(() => {
    const loadCallData = async () => {
      setLoading(true)
      setError(null)
      
      // Removed commented-out debug log
      
      // Add a guard clause in case id is truly undefined/null
      if (!params?.id || params.id === 'undefined') { // Check for literal "undefined" string too
        console.error('[CallDetailsPage] No valid ID found in params. Cannot load call data.');
        setError('Invalid Call ID provided in URL.');
        setLoading(false);
        return; // Stop execution if no valid ID
      }
      
      try {
        // Fetch call details - use the guarded params.id
        const callResponse = await fetchCall(params.id) 
        
        if (callResponse.success && callResponse.call) {
          setCall(callResponse.call)
        } else {
          setError(callResponse.error || 'Failed to load call details')
        }
        
        // Fetch recordings
        const recordingsResponse = await fetchCallRecordings(params.id)
        
        if (recordingsResponse.success && recordingsResponse.recordings) {
          setRecordings(recordingsResponse.recordings)
          
          // Set first recording as active if available
          if (recordingsResponse.recordings.length > 0) {
            setActiveRecordingId(recordingsResponse.recordings[0].recordingSid)
          }
        }
        
        // Fetch transcript
        const transcriptResponse = await fetchCallTranscript(params.id)
        
        if (transcriptResponse.success && transcriptResponse.transcript) {
          setTranscript(transcriptResponse.transcript)
        }
        
      } catch (err) {
        console.error('Error loading call data:', err)
        setError('Failed to load call data')
      } finally {
        setLoading(false)
      }
    }
    
    loadCallData()
  }, [params.id])

  // Handle audio player events
  useEffect(() => {
    const audioElement = audioRef.current
    
    if (!audioElement) return
    
    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime)
      setDuration(audioElement.duration || 0)
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)
    
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Load active recording when changed
  useEffect(() => {
    if (activeRecordingId && recordings.length > 0) {
      const recording = recordings.find(r => r.recordingSid === activeRecordingId)
      
      if (recording && audioRef.current) {
        // Reset player state
        setIsPlaying(false)
        setCurrentTime(0)
        
        // Set new audio source
        audioRef.current.src = recording.url || recording.mp3Url
        audioRef.current.load()
      }
    }
  }, [activeRecordingId, recordings])

  // Handle play/pause
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  // Handle mute/unmute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    
    if (audioRef.current && !isNaN(time)) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // Format time (seconds) to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status color and icon
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'green', icon: <CheckCircle className="h-5 w-5 text-green-500" /> }
      case 'failed':
      case 'busy':
      case 'no-answer':
        return { color: 'red', icon: <XCircle className="h-5 w-5 text-red-500" /> }
      case 'in-progress':
        return { color: 'blue', icon: <PhoneIncoming className="h-5 w-5 text-blue-500" /> }
      case 'canceled':
        return { color: 'amber', icon: <PhoneOff className="h-5 w-5 text-amber-500" /> }
      default:
        return { color: 'gray', icon: <AlertTriangle className="h-5 w-5 text-gray-500" /> }
    }
  }

  const statusInfo = call ? getStatusColor(call.status) : { color: 'gray', icon: null }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Details</h1>
          <p className="text-muted-foreground">
            {loading 
              ? 'Loading call details...' 
              : call 
                ? `Call to ${call.to || 'unknown'} on ${new Date(call.startTime).toLocaleString()}` 
                : 'Call information'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/call-logs">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Calls
          </Link>
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
        </div>
      ) : call ? (
        <>
          <div className="grid gap-4 md:grid-cols-7">
            {/* Call information card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Call Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-muted rounded-full p-3">
                    {statusInfo.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className={`text-${statusInfo.color}-500 font-medium capitalize`}>{call.status}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">From</p>
                    <p className="flex items-center text-sm">
                      <Bot className="h-4 w-4 mr-1 text-primary" />
                      {call.from || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">To</p>
                    <p className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-1 text-primary" />
                      {call.to || 'Unknown'}
                      {call.contactName && ` (${call.contactName})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Time</p>
                    <p className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      {call.startTime ? new Date(call.startTime).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Call SID</p>
                    <p className="text-sm font-mono">{call.callSid || call.sid}</p>
                  </div>
                  {call.answeredBy && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Answered By</p>
                      <p className="text-sm capitalize">{call.answeredBy}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Audio player card */}
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Volume2 className="h-5 w-5 mr-2" />
                  Call Recording
                </CardTitle>
                <CardDescription>
                  {recordings.length === 0 
                    ? 'No recordings available for this call' 
                    : 'Listen to the call recording'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 bg-muted rounded-md p-4 text-center">
                    <VolumeX className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No recordings available for this call</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <audio ref={audioRef} className="hidden" />
                    
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={togglePlayback}
                      >
                        {isPlaying ? (
                          <PauseCircle className="h-5 w-5" />
                        ) : (
                          <PlayCircle className="h-5 w-5" />
                        )}
                      </Button>
                      
                      <div className="flex-1 mx-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full"
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    
                    {recordings.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Available Recordings</p>
                        <div className="flex flex-wrap gap-2">
                          {recordings.map((recording) => (
                            <Badge
                              key={recording.recordingSid}
                              variant={activeRecordingId === recording.recordingSid ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => setActiveRecordingId(recording.recordingSid)}
                            >
                              {recording.source === 'customer' ? 'Customer' : recording.source === 'agent' ? 'Agent' : 'Call'} Recording
                              {recording.duration && ` (${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')})`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <a 
                          href={recordings.find(r => r.recordingSid === activeRecordingId)?.url} 
                          download
                          target="_blank"
                        >
                          <DownloadCloud className="h-4 w-4 mr-2" />
                          Download Recording
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Transcript / Analysis section with tabs */}
          <div className="mt-6">
            <Tabs defaultValue="transcript">
              <TabsList>
                <TabsTrigger value="transcript">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="analysis">
                  <Wand2 className="h-4 w-4 mr-2" />
                  Analysis
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="mt-4">
                {call.status === 'in-progress' ? (
                  // Live transcript component for in-progress calls
                  <RealTimeTranscript 
                    callSid={call.callSid || call.sid}
                    initialTranscript={transcript}
                  />
                ) : (
                  // Static transcript for completed calls
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Call Transcript
                      </CardTitle>
                      <CardDescription>
                        {transcript ? 'Complete conversation transcript' : 'No transcript available for this call'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!transcript || !transcript.messages || transcript.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 bg-muted rounded-md p-4 text-center">
                          <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No transcript available for this call</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transcript.messages.map((message: any, index: number) => (
                            <div 
                              key={index} 
                              className={cn(
                                "flex items-start space-x-3",
                                message.role === 'assistant' || message.role === 'agent' ? "justify-start" : "justify-end"
                              )}
                            >
                              {(message.role === 'assistant' || message.role === 'agent') && (
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn(
                                "rounded-lg p-3 max-w-[80%]",
                                message.role === 'assistant' || message.role === 'agent'
                                  ? "bg-muted text-foreground" 
                                  : "bg-primary text-primary-foreground"
                              )}>
                                <p className="whitespace-pre-wrap break-words">{message.message}</p>
                                {message.timestamp && (
                                  <p className="text-xs mt-1 opacity-70">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>
                              {(message.role === 'user' || message.role === 'customer') && (
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Analysis</CardTitle>
                    <CardDescription>
                      AI-powered analysis of the conversation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!transcript || !transcript.analysis ? (
                      <div className="flex flex-col items-center justify-center h-40 bg-muted rounded-md p-4 text-center">
                        <Wand2 className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No analysis available for this call</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Call summary */}
                        <div>
                          <h3 className="text-lg font-medium mb-2">Summary</h3>
                          <div className="bg-muted p-4 rounded-md">
                            <p>{transcript.summary || 'No summary available'}</p>
                          </div>
                        </div>
                        
                        {/* Sentiment analysis */}
                        {transcript.analysis.sentiment && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Sentiment</h3>
                            <div className="bg-muted p-4 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">Negative</span>
                                <span className="text-sm text-muted-foreground">Positive</span>
                              </div>
                              <div className="h-4 relative w-full bg-background rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full",
                                    transcript.analysis.sentiment === 'positive' ? "bg-green-500" :
                                    transcript.analysis.sentiment === 'negative' ? "bg-red-500" :
                                    "bg-amber-500"
                                  )}
                                  style={{ 
                                    width: `${
                                      transcript.analysis.sentiment === 'positive' ? '75%' :
                                      transcript.analysis.sentiment === 'negative' ? '25%' :
                                      '50%'
                                    }` 
                                  }}
                                />
                              </div>
                              <p className="text-sm mt-2 text-center capitalize">
                                {transcript.analysis.sentiment}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Topics */}
                        {transcript.analysis.topics && transcript.analysis.topics.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Topics Discussed</h3>
                            <div className="flex flex-wrap gap-2">
                              {transcript.analysis.topics.map((topic: string, index: number) => (
                                <Badge key={index} variant="secondary">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Call success */}
                        {transcript.analysis.callSuccessful !== undefined && (
                          <div>
                            <h3 className="text-lg font-medium mb-2">Call Outcome</h3>
                            <div className="flex items-center">
                              {transcript.analysis.callSuccessful ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                              )}
                              <span className="font-medium">
                                {transcript.analysis.callSuccessful ? 'Successful' : 'Unsuccessful'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Call Not Found</h2>
          <p className="text-muted-foreground">Could not find call with ID: {params.id}</p>
          <Button className="mt-4" asChild>
            <Link href="/call-logs">Go to Call Logs</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
