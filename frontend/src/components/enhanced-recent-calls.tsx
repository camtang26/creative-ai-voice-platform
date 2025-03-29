"use client"

import * as React from "react"
import { Phone, Play, PhoneCall, Clock, CheckCircle, XCircle, AlertCircle, PhoneOff, Loader2, RefreshCw } from "lucide-react"
// Import formatDuration and ensure formatDate is imported
import { cn, formatDate, formatPhoneNumber, formatDuration as formatDurationUtil } from "@/lib/utils" 
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { RecentCall } from "@/lib/types"
import { useSocket } from "@/lib/socket-context"
import { getApiUrl } from "@/lib/api"; // Import the helper

export function EnhancedRecentCalls() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [calls, setCalls] = React.useState<RecentCall[]>([]);
  const [callCount, setCallCount] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const { activeCalls, lastMessage } = useSocket();
  
  // Load recent calls data
  React.useEffect(() => {
    async function loadRecentCalls() {
      setIsLoading(true);
      try {
        // Use getApiUrl
        const apiUrl = getApiUrl('/api/db/calls?limit=5&page=1');
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} for URL: ${apiUrl}`);
        }
        
        const result = await response.json();
        console.log('MongoDB Call API response:', result);
        
        if (result.success && result.data && Array.isArray(result.data.calls)) {
          // Map the MongoDB call data to the RecentCall format
          const recentCalls = result.data.calls.map((call: any) => ({
            sid: call.sid,
            from: call.from || '',
            to: call.to || '',
            status: call.status || 'unknown',
            duration: call.duration || 0,
            timestamp: call.startTime || call.createdAt || new Date().toISOString(),
            hasRecording: Array.isArray(call.recordings) && call.recordings.length > 0
          }));
          
          setCalls(recentCalls);
          setCallCount(result.data.pagination?.total || recentCalls.length);
          setLastUpdated(new Date());
        } else {
          // If no calls found, set empty array
          setCalls([]);
          setCallCount(0);
        }
      } catch (error) {
        console.error("Error loading recent calls:", error);
        // If API call fails, set empty array
        setCalls([]);
        setCallCount(0);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentCalls();
    
    // Set up interval to refresh recent calls periodically
    const intervalId = setInterval(() => {
      loadRecentCalls();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Update recent calls when socket sends updates
  React.useEffect(() => {
    if (lastMessage && lastMessage.type === 'status_update' && lastMessage.data) {
      // Check if this call is already in our list
      const existingCallIndex = calls.findIndex(call => call.sid === lastMessage.callSid);
      
      if (existingCallIndex >= 0) {
        // Update existing call
        const updatedCalls = [...calls];
        updatedCalls[existingCallIndex] = {
          ...updatedCalls[existingCallIndex],
          status: lastMessage.data.status || updatedCalls[existingCallIndex].status,
          duration: lastMessage.data.duration || updatedCalls[existingCallIndex].duration,
          hasRecording: Array.isArray(lastMessage.data.recordings) && lastMessage.data.recordings.length > 0
        };
        setCalls(updatedCalls);
      } else if (calls.length < 5) {
        // Add new call if we have less than 5
        const newCall: RecentCall = {
          sid: lastMessage.callSid,
          from: lastMessage.data.from || '',
          to: lastMessage.data.to || '',
          status: lastMessage.data.status || 'unknown',
          duration: lastMessage.data.duration || 0,
          timestamp: lastMessage.data.startTime || lastMessage.data.createdAt || new Date().toISOString(),
          hasRecording: Array.isArray(lastMessage.data.recordings) && lastMessage.data.recordings.length > 0
        };
        setCalls([newCall, ...calls.slice(0, 4)]); // Keep only 5 most recent calls
      }
      
      // Update lastUpdated
      setLastUpdated(new Date());
    }
  }, [lastMessage, calls]);
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Use getApiUrl
      const apiUrl = getApiUrl('/api/db/calls?limit=5&page=1');
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} for URL: ${apiUrl}`);
      }
      
      const result = await response.json();
      console.log('MongoDB Call API response (refresh):', result);
      
      if (result.success && result.data && Array.isArray(result.data.calls)) {
        // Map the MongoDB call data to the RecentCall format
        const recentCalls = result.data.calls.map((call: any) => ({
          sid: call.sid,
          from: call.from || '',
          to: call.to || '',
          status: call.status || 'unknown',
          duration: call.duration || 0,
          timestamp: call.startTime || call.createdAt || new Date().toISOString(),
          hasRecording: Array.isArray(call.recordings) && call.recordings.length > 0
        }));
        
        setCalls(recentCalls);
        setCallCount(result.data.pagination?.total || recentCalls.length);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error refreshing recent calls:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed local formatDuration and formatTimestamp functions

  return (
    <div className="flex flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-foreground">Recent Calls</h2>
          <p className="text-sm text-muted-foreground">
            {callCount} calls in the last 24 hours
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} strokeWidth={2} />
          )}
          <span>Refresh</span>
        </Button>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading recent calls...</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y">
          {calls.map((call, index) => (
            <div key={call.sid || `call-${index}-${Date.now()}`} className="flex flex-col p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Phone size={18} className="text-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{formatPhoneNumber(call.to)}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={call.status} />
                      {/* Use imported formatDate */}
                      <span className="text-xs text-muted-foreground">{formatDate(call.timestamp)}</span> 
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {call.hasRecording && (
                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/call-details/${call.sid}`}>
                        <Play size={16} className="text-foreground" />
                      </Link>
                    </Button>
                  )}
                  {call.status === 'in-progress' ? (
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                      <PhoneOff size={16} className="text-foreground" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/call-details/${call.sid}`}>
                        <PhoneCall size={16} className="text-foreground" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {/* Use imported formatDurationUtil */}
                  Duration: {formatDurationUtil(call.duration)} 
                </span>
                <span className="text-xs text-muted-foreground">
                  From: {formatPhoneNumber(call.from)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && calls.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Phone size={24} className="text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No recent calls</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            When you make or receive calls, they will appear here.
          </p>
        </div>
      )}
      
      <Separator />
      
      <div className="p-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/call-logs">View All Calls</Link>
        </Button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1">
      {status === "completed" && (
        <CheckCircle size={14} className="text-green-500" />
      )}
      {status === "in-progress" && (
        <AlertCircle size={14} className="text-amber-500" />
      )}
      {status === "failed" && (
        <XCircle size={14} className="text-red-500" />
      )}
      <span className={cn(
        "text-xs",
        status === "completed" && "text-green-500",
        status === "in-progress" && "text-amber-500",
        status === "failed" && "text-red-500"
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  )
}
