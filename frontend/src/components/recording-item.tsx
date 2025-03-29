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

  // Get the appropriate audio URL
  const audioUrl = recording.mp3Url || recording.url;
  // Get the download URL (could be different format)
  const downloadUrl = recording.mp3Url || recording.wavUrl || recording.url;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Headphones className="h-5 w-5 text-primary" />
            <span className="font-medium">Recording {recording.sid.substring(0, 8)}...</span>
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
          <div>{formatDate(recording.timestamp)}</div>
          
          <div className="text-muted-foreground">Channels:</div>
          <div>{recording.channels || 'Mono'}</div>
          
          <div className="text-muted-foreground">Status:</div>
          <div>{recording.status}</div>
        </div>
      </CardContent>

      {expanded && (
        <CardContent className="pt-0">
          <WaveformPlayer 
            audioUrl={audioUrl}
            downloadUrl={downloadUrl}
            title={`Call Recording - ${formatDate(recording.timestamp)}`}
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
              href={downloadUrl} 
              download={`${recording.sid}.mp3`} // Suggest filename
              target="_blank" // Keep target blank as fallback
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
