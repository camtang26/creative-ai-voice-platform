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
import { CallTranscript } from "@/components/call-transcript" // Import static transcript component
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fetchCall, fetchCallRecordings, fetchCallTranscript } from "@/lib/mongodb-api"
import { cn, formatTimeInSeconds } from "@/lib/utils" // Ensure formatTimeInSeconds is imported
// Import necessary types
import { CallInfo, RecordingInfo, TranscriptData, EvaluationCriteriaResult, DataCollectionResult } from "@/lib/types"

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
      console.log('[CallDetailsPage] loadCallData started. Clearing main error state.'); // Log before clearing
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
        console.log('[CallDetailsPage] Attempting fetchCall...'); // Log before fetch
        const callResponse = await fetchCall(params.id)
        
        if (callResponse.success && callResponse.call) {
          setCall(callResponse.call)
        } else {
          const callErrorMsg = callResponse.error || 'Failed to load call details';
          // Log failure but DON'T set the main error state if core call details aren't found
          console.warn(`[CallDetailsPage] fetchCall failed or call not found: ${callErrorMsg}`);
          // setError(callErrorMsg) // REMOVED: Don't set main error here
          setCall(null); // Ensure call state is null if fetch fails
          // Removed the early return/setLoading here to allow other fetches even if call details fail initially
        }
        
        // Fetch recordings
        console.log('[CallDetailsPage] Attempting fetchCallRecordings...'); // Log before fetch
        const recordingsResponse = await fetchCallRecordings(params.id)
        
        if (recordingsResponse.success && recordingsResponse.recordings) {
          setRecordings(recordingsResponse.recordings)
          
          // Set first recording as active if available
          if (recordingsResponse.recordings.length > 0) {
            setActiveRecordingId(recordingsResponse.recordings[0].recordingSid)
          }
        }
        
        // Fetch transcript (Restored - will fetch from DB API)
        // Wrap transcript fetch in its own try-catch to isolate its errors
        try {
          const transcriptResponse = await fetchCallTranscript(params.id);
          if (transcriptResponse.success && transcriptResponse.data) { // Check data property based on API response structure
            // Note: transcriptResponse.data should hold the full TranscriptData object
            setTranscript(transcriptResponse.data);
          } else {
            // Log specific transcript error, but don't set the main page error
            console.warn(`[CallDetailsPage] Transcript not found or failed to load: ${transcriptResponse.error || 'Unknown transcript error'}`);
            setTranscript(null); // Ensure transcript state is null if fetch fails
          }
        } catch (transcriptErr) {
           // Catch errors specifically from fetchCallTranscript
           console.error('[CallDetailsPage] Error fetching transcript:', transcriptErr);
           setTranscript(null); // Ensure transcript state is null on error
           // DO NOT set the main 'setError' here
        }
        
      } catch (err: any) { // Add type annotation for err
        // This catch block now only handles errors from fetchCall and fetchCallRecordings
        console.error('Error loading core call data (call details or recordings):', err);
        // Provide a more specific error message based on context if possible
        let errorMessage = 'Failed to load essential call data.';
        if (err && typeof err === 'object' && 'message' in err) {
           errorMessage = `Error loading call details or recordings: ${err.message}`;
        }
        console.log(`[CallDetailsPage] Outer catch block triggered. Setting main error state: ${errorMessage}`); // Log before setting error
        setError(errorMessage); // Sets the main error state
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
      
    {/* Content Area - Corrected Conditional Logic */}
    {loading ? (
        // --- Loading State ---
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : call ? (
        // --- Call Data Loaded Successfully ---
        // Render the main content grid including call info, recordings, and transcript/analysis section
        <>
          {/* Optional: Display non-blocking warning if 'error' state was set by a critical failure */}
          {error && (
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 mb-4 text-sm">
               <p><strong>Warning:</strong> {error}</p>
             </div>
           )}
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
                  <div><p className="text-sm font-medium text-muted-foreground">From</p><p className="flex items-center text-sm"><Bot className="h-4 w-4 mr-1 text-primary" />{call.from || 'Unknown'}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">To</p><p className="flex items-center text-sm"><User className="h-4 w-4 mr-1 text-primary" />{call.to || 'Unknown'}{call.contactName && ` (${call.contactName})`}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Start Time</p><p className="flex items-center text-sm"><Calendar className="h-4 w-4 mr-1 text-muted-foreground" />{call.startTime ? new Date(call.startTime).toLocaleString() : 'N/A'}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Duration</p><p className="flex items-center text-sm"><Clock className="h-4 w-4 mr-1 text-muted-foreground" />{call.duration ? formatTime(call.duration) : 'N/A'}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Call SID</p><p className="text-sm font-mono">{call.callSid || call.sid}</p></div>
                  {call.answeredBy && (<div><p className="text-sm font-medium text-muted-foreground">Answered By</p><p className="text-sm capitalize">{call.answeredBy}</p></div>)}
                  {call.conversationId && (<div><p className="text-sm font-medium text-muted-foreground">Conv. ID</p><p className="text-sm font-mono">{call.conversationId}</p></div>)}
                </div>
              </CardContent>
            </Card>

            {/* Audio player card */}
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center"><Volume2 className="h-5 w-5 mr-2" />Call Recording</CardTitle>
                <CardDescription>{recordings.length === 0 ? 'No recordings available' : 'Listen to the call recording'}</CardDescription>
              </CardHeader>
              <CardContent>
                {recordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 bg-muted rounded-md p-4 text-center">
                    <VolumeX className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No recordings available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <audio ref={audioRef} className="hidden" />
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="icon" onClick={togglePlayback}>{isPlaying ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}</Button>
                      <div className="flex-1 mx-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                        <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer range-sm dark:bg-gray-700" />
                      </div>
                      <Button variant="outline" size="icon" onClick={toggleMute}>{isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</Button>
                    </div>
                    {recordings.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Available Recordings:</p>
                        <div className="flex flex-wrap gap-2">
                          {recordings.map((recording) => (
                            <Badge key={recording.sid || recording.recordingSid} variant={activeRecordingId === (recording.sid || recording.recordingSid) ? "default" : "outline"} className="cursor-pointer" onClick={() => setActiveRecordingId(recording.sid || recording.recordingSid)}>
                              {recording.source === 'customer' ? 'Customer' : recording.source === 'agent' ? 'Agent' : 'Call'} {recording.duration && `(${formatTime(recording.duration)})`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" asChild disabled={!activeRecordingId}>
                        <a href={recordings.find(r => (r.sid || r.recordingSid) === activeRecordingId)?.url} download target="_blank"><DownloadCloud className="h-4 w-4 mr-2" />Download</a>
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
                <TabsTrigger value="transcript"><MessageSquare className="h-4 w-4 mr-2" />Transcript</TabsTrigger>
                <TabsTrigger value="analysis"><Wand2 className="h-4 w-4 mr-2" />Analysis</TabsTrigger>
              </TabsList>

              {/* Transcript Tab */}
              <TabsContent value="transcript" className="mt-4">
                {call.status === 'in-progress' ? (
                  <RealTimeTranscript callSid={call.callSid || call.sid} initialTranscript={transcript} />
                ) : (
                  // Use the dedicated CallTranscript component for static display
                  // It fetches its own data based on callSid.
                  <CallTranscript callSid={call.callSid || call.sid} />
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="mt-4">
                 <Card>
                   <CardHeader>
                     <CardTitle>Call Analysis</CardTitle>
                     <CardDescription>AI-powered analysis of the conversation</CardDescription>
                   </CardHeader>
                   <CardContent>
                     {/* Check transcript loading/error state if CallTranscript handled it internally,
                         OR check the transcript state variable directly if passed as prop */}
                     {!transcript ? (
                        <div className="flex flex-col items-center justify-center h-40 bg-muted rounded-md p-4 text-center">
                           <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                           <p className="text-muted-foreground">Transcript data needed for analysis is unavailable.</p>
                         </div>
                     ) : !transcript.analysis ? (
                       <div className="flex flex-col items-center justify-center h-40 bg-muted rounded-md p-4 text-center">
                         <Wand2 className="h-10 w-10 text-muted-foreground mb-2" />
                         <p className="text-muted-foreground">
                           {transcript?.status === 'processing' ? 'Analysis is processing...' : 'No analysis data available for this call.'}
                         </p>
                       </div>
                     ) : (
                       // Analysis data exists, render it
                       <div className="space-y-6">
                         {/* Call summary */}
                         {transcript.analysis.transcript_summary && (
                            <div>
                              <h3 className="text-lg font-medium mb-2">Summary</h3>
                              <div className="bg-muted p-4 rounded-md"><p>{transcript.analysis.transcript_summary}</p></div>
                            </div>
                         )}
                         {/* Call Outcome */}
                         {transcript.analysis.call_successful && (
                            <div>
                              <h3 className="text-lg font-medium mb-2">Call Outcome</h3>
                              <div className="flex items-center">
                                {transcript.analysis.call_successful === 'success' ? <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : <XCircle className="h-5 w-5 text-red-500 mr-2" />}
                                <span className={`font-medium ${transcript.analysis.call_successful === 'success' ? 'text-green-600' : 'text-red-600'}`}>{transcript.analysis.call_successful.charAt(0).toUpperCase() + transcript.analysis.call_successful.slice(1)}</span>
                              </div>
                            </div>
                         )}
                         {/* Criteria Evaluation */}
                         {transcript.analysis.evaluation_criteria_results && Object.keys(transcript.analysis.evaluation_criteria_results).length > 0 && (
                           <div>
                             <h3 className="text-lg font-medium mb-2">Criteria Evaluation</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                               {Object.entries(transcript.analysis.evaluation_criteria_results).map(([key, criteria]) => {
                                 const typedCriteria = criteria as EvaluationCriteriaResult; // Type assertion
                                 return (
                                   <div key={key} className="flex flex-col items-start p-2 border rounded bg-background/50">
                                     <span className="text-xs font-medium text-muted-foreground mb-1">{typedCriteria.criteria_id.replace(/_/g, ' ')}</span>
                                     <Badge variant={typedCriteria.result === 'success' ? 'success' : typedCriteria.result === 'failure' ? 'destructive' : 'secondary'} className="mb-1">
                                       {typedCriteria.result.charAt(0).toUpperCase() + typedCriteria.result.slice(1)}
                                     </Badge>
                                     <p className="text-xs text-muted-foreground">{typedCriteria.rationale}</p>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         )}
                         {/* Data Collection */}
                         {transcript.analysis.data_collection_results && Object.keys(transcript.analysis.data_collection_results).length > 0 && (
                           <div>
                             <h3 className="text-lg font-medium mb-2">Data Collection</h3>
                             <div className="space-y-2 bg-muted p-4 rounded-md">
                               {Object.entries(transcript.analysis.data_collection_results).map(([key, dataItem]) => {
                                 const typedDataItem = dataItem as DataCollectionResult; // Type assertion
                                 return (
                                   <div key={key} className="text-sm border-b pb-1 last:border-b-0">
                                     <span className="font-medium text-muted-foreground">{typedDataItem.data_collection_id.replace(/_/g, ' ')}: </span>
                                     <span className="text-foreground">{String(typedDataItem.value ?? '-')}</span>
                                     {typedDataItem.rationale && <span className="text-muted-foreground italic text-xs"> ({typedDataItem.rationale})</span>}
                                   </div>
                                 );
                               })}
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
        // --- Call Data Not Found (after loading) ---
        // This handles the case where fetchCall returned success:false OR a critical error occurred
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Call Not Found</h2>
          <p className="text-muted-foreground">Could not find call details for ID: {params.id}</p>
          {/* Display critical error message ONLY if it was set (e.g., invalid ID, network error) */}
          {error && <p className="text-red-600 mt-2 text-sm">Details: {error}</p>}
          <Button className="mt-4" asChild>
            <Link href="/call-logs">Go to Call Logs</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

