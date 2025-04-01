"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Headphones, Download, ChevronDown, ChevronUp, Info } from "lucide-react";
import { RecordingInfo } from "@/lib/types";
import { formatDate, formatDuration, formatPhoneNumber } from "@/lib/utils";
import { WaveformPlayer } from "./waveform-player";
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

  // Use the backend proxy for download AND playback
  // Use the v2 backend proxy path structure
  const proxyUrl_v2 = `/api/recordings/download/${recording.recordingSid}`;
  const audioUrl = proxyUrl_v2; // Use v2 proxy path for player
  const downloadUrl = proxyUrl_v2; // Use v2 proxy path for download link

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
          <WaveformPlayer 
            audioUrl={audioUrl} // Pass the updated URL
            downloadUrl={downloadUrl} // Pass the updated URL
            title={`Call Recording - ${formatDate(recording.createdAt ?? 'N/A')}`}
          />
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
              href={downloadUrl} // Use the v2 backend proxy path variable
              // Keep download attribute for filename suggestion, but target isn't strictly needed
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
