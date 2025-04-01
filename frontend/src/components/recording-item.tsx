"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Headphones, Download, ChevronDown, ChevronUp, Info } from "lucide-react";
import { RecordingInfo } from "@/lib/types";
import { formatDate, formatDuration, formatPhoneNumber } from "@/lib/utils";
// REMOVED: import { getMediaUrl } from "@/lib/api";
import { SimpleAudioPlayer } from "./simple-audio-player";
import Link from "next/link";

interface RecordingItemProps {
  recording: RecordingInfo;
  callSid: string;
  callDetails?: {
    from: string;
    to: string;
    startTime: string;
    endTime?: string;
  };
}

export function RecordingItem({ recording, callSid, callDetails }: RecordingItemProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Duration formatting with fallback for recordings without duration
  const displayDuration = recording.duration ? 
    formatDuration(recording.duration) : 
    'Unknown';

  // Construct the RELATIVE backend URL for playback and download
  const backendAudioUrl = recording.recordingSid
    ? `/api/recordings/${recording.recordingSid}/download`
    : '';
  // Added check for window object to avoid SSR errors

  // REMOVED: State and effects for fetching/managing blob URLs
  // const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  // const [blobUrl, setBlobUrl] = useState<string>('');
  // const [isLoading, setIsLoading] = useState(false);
  // const [audioError, setAudioError] = useState<string | null>(null);
  // REMOVED: fetchAudioData function
  // REMOVED: useEffect for blob URL cleanup
  // REMOVED: useEffect for fetching audio on expand

  // Construct the direct backend URL for playback and download - MOVED EARLIER
  // const backendAudioUrl = recording.recordingSid ? `/api/recordings/${recording.recordingSid}/download` : ''; // REMOVED DUPLICATE
  const downloadFilename = `recording_${recording.recordingSid || 'unknown'}.mp3`;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Headphones className="h-5 w-5 text-primary" />
            {/* Use recordingSid */}
            <span className="font-medium">Recording {recording.recordingSid?.substring(0, 8) ?? 'ID N/A'}...</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/call-details/${callSid}`}>
                <Info className="h-4 w-4 mr-1" />
                Call Details
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleExpanded}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {callDetails && (
            <>
              <div className="text-muted-foreground">From:</div>
              <div>{formatPhoneNumber(callDetails.from)}</div>
              
              <div className="text-muted-foreground">To:</div>
              <div>{formatPhoneNumber(callDetails.to)}</div>
            </>
          )}
          
          <div className="text-muted-foreground">Duration:</div>
          <div>{displayDuration}</div>
          
          <div className="text-muted-foreground">Recorded:</div>
          {/* Use createdAt field, provide fallback */}
          <div>{formatDate(recording.createdAt ?? 'N/A')}</div>
          
          <div className="text-muted-foreground">Channels:</div>
          <div>{recording.channels || 'Mono'}</div>
          
          <div className="text-muted-foreground">Status:</div>
          <div>{recording.status}</div>
        </div>
      </CardContent>

      {expanded && (
        <CardContent className="pt-0">
          {/* Conditionally render only when backendAudioUrl is valid */}
          {/* Moved log outside JSX */}
          {(() => { console.log(`[RecordingItem] Checking render condition. backendAudioUrl: '${backendAudioUrl}'`); return null; })()}
          {backendAudioUrl ? (
            <SimpleAudioPlayer
              audioUrl={backendAudioUrl} // Pass the direct backend URL
              downloadUrl={backendAudioUrl} // Pass the direct backend URL
              title={`Call Recording - ${formatDate(recording.createdAt ?? 'N/A')}`}
            />
          ) : (
            <div className="text-center text-muted-foreground p-4">Preparing player...</div>
          )}
        </CardContent>
      )}

      <CardFooter className="pt-2">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleExpanded}
          >
            {expanded ? 'Hide Player' : 'Show Player'}
          </Button>
          {/* Changed Button to Link for direct download */}
          <Button 
            variant="outline" 
            size="sm" 
            asChild // Use Button styling on the Link
          >
            <Link
              // Use the backend proxy URL for href
              href={backendAudioUrl} // Use the direct backend URL
              // Keep download attribute for filename suggestion
              download={`recording_${recording.recordingSid ?? 'unknown'}.mp3`}
              target="_blank"
              rel="noopener noreferrer" // Good practice for target="_blank"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
