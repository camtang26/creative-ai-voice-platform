"use client";

import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { SocketProvider } from '@/lib/socket-context';
import { LiveCallsWithTranscripts } from '@/components/live-calls-with-transcripts';
import { PhoneCall, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Create a client-only component for the time display
function TimeDisplay() {
  const [currentTime, setCurrentTime] = useState<string>("");
  
  useEffect(() => {
    // Only set the time on the client after mounting
    setCurrentTime(new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }));
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Only render the time when it has been set on the client
  if (!currentTime) return <span>Loading...</span>;
  
  return <span>{currentTime}</span>;
}

export default function LiveCallsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate refreshing data
  function handleRefresh() {
    setIsRefreshing(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }

  return (
    <SocketProvider>
      <div className="flex flex-col gap-6">
        <DashboardHeader 
          title="Live Calls" 
          description="Monitor active calls in real-time"
          actions={
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" asChild>
                <Link href="/make-call">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  New Call
                </Link>
              </Button>
            </div>
          }
        />
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Last updated: </span> 
            <TimeDisplay />
            <span className="ml-2 text-xs">
              (Updates automatically)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs text-muted-foreground">Real-time mode</span>
            </div>
          </div>
        </div>
        
        <LiveCallsWithTranscripts />
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>
            <strong>Note:</strong> Audio streaming requires a compatible WebRTC or WebSocket audio streaming 
            endpoint on the server. The current implementation simulates this functionality.
          </p>
        </div>
      </div>
    </SocketProvider>
  );
}
