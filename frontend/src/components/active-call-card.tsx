"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallInfo } from "@/lib/types";
import { terminateCall } from "@/lib/api";
import { PhoneOff, Headphones, Volume2, VolumeX } from "lucide-react";
import { formatPhoneNumber, formatDuration } from "@/lib/utils";

interface ActiveCallCardProps {
  call: CallInfo;
  onCallEnded?: (callSid: string) => void;
}

export function ActiveCallCard({ call, onCallEnded }: ActiveCallCardProps) {
  const [isTerminating, setIsTerminating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(
    call.startTime ? 
      Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000) : 
      0
  );

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (call.startTime) {
        const newElapsed = Math.floor(
          (Date.now() - new Date(call.startTime).getTime()) / 1000
        );
        setElapsedTime(newElapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [call.startTime]);

  async function handleTerminateCall() {
    if (isTerminating) return;
    
    setIsTerminating(true);
    try {
      const result = await terminateCall(call.sid);
      if (result.success) {
        if (onCallEnded) {
          onCallEnded(call.sid);
        }
      } else {
        console.error("Failed to terminate call:", result.error);
      }
    } catch (error) {
      console.error("Error terminating call:", error);
    } finally {
      setIsTerminating(false);
    }
  }

  // Toggle audio streaming for this call
  function toggleListening() {
    setIsListening(!isListening);
    // In a real implementation, we would start/stop streaming audio here
  }

  // Get a color based on call state
  function getStatusColor(status: string) {
    switch (status) {
      case 'in-progress':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'ringing':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'initiated':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return '';
    }
  }

  return (
    <Card className={`overflow-hidden border-l-4 ${getStatusColor(call.status)}`}>
      <CardHeader className="p-4">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{formatPhoneNumber(call.to)}</span>
          <span className={`call-status-badge ${call.status}`}>
            {call.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Call ID:</div>
          <div className="font-mono">{call.sid}</div>
          
          <div className="text-muted-foreground">From:</div>
          <div>{formatPhoneNumber(call.from)}</div>
          
          <div className="text-muted-foreground">Duration:</div>
          <div>{formatDuration(elapsedTime)}</div>
          
          <div className="text-muted-foreground">Started:</div>
          <div>{new Date(call.startTime).toLocaleTimeString()}</div>
          
          {call.answeredBy && (
            <>
              <div className="text-muted-foreground">Answered By:</div>
              <div>{call.answeredBy}</div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button 
          variant={isListening ? "default" : "outline"} 
          size="sm" 
          onClick={toggleListening}
        >
          {isListening ? (
            <><VolumeX className="h-4 w-4 mr-1" /> Stop Listening</>
          ) : (
            <><Volume2 className="h-4 w-4 mr-1" /> Listen</>
          )}
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleTerminateCall}
          disabled={isTerminating}
        >
          <PhoneOff className="h-4 w-4 mr-1" /> 
          {isTerminating ? "Ending..." : "End Call"}
        </Button>
      </CardFooter>
    </Card>
  );
}
