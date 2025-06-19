"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhoneCall, PhoneOff, Phone, Clock, User, PlayCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Status badge color mapping for dark theme
const statusColorMap: Record<string, string> = {
  'initiated': 'bg-blue-900/50 text-blue-200 border-blue-700/50',
  'ringing': 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50',
  'in-progress': 'bg-green-900/50 text-green-200 border-green-700/50',
  'completed': 'bg-gray-800/50 text-gray-300 border-gray-600/50',
  'failed': 'bg-red-900/50 text-red-200 border-red-700/50',
  'busy': 'bg-purple-900/50 text-purple-200 border-purple-700/50',
  'no-answer': 'bg-orange-900/50 text-orange-200 border-orange-700/50',
  'canceled': 'bg-gray-800/50 text-gray-300 border-gray-600/50'
};

// Status icon mapping
const statusIconMap: Record<string, React.ReactNode> = {
  'initiated': <PhoneCall className="h-4 w-4 text-blue-400" />,
  'ringing': <PhoneCall className="h-4 w-4 text-yellow-400 animate-pulse" />,
  'in-progress': <Phone className="h-4 w-4 text-green-400" />,
  'completed': <PhoneOff className="h-4 w-4 text-gray-400" />,
  'failed': <PhoneOff className="h-4 w-4 text-red-400" />,
  'busy': <PhoneOff className="h-4 w-4 text-purple-400" />,
  'no-answer': <PhoneOff className="h-4 w-4 text-orange-400" />,
  'canceled': <PhoneOff className="h-4 w-4 text-gray-400" />
};

export function EnhancedLiveCallsGrid() {
  const { 
    isConnected, 
    activeCalls, 
    refreshActiveCalls, 
    lastMessage 
  } = useSocket();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle refresh button click
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    
    try {
      refreshActiveCalls();
      setTimeout(() => setLoading(false), 1000);
    } catch (err) {
      setError('Failed to refresh calls');
      setLoading(false);
    }
  };

  // Terminate a call
  const handleTerminateCall = async (callSid: string) => {
    try {
      const response = await fetch(`/api/calls/${callSid}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to terminate call');
      }
      
      // The call termination will be reflected via socket updates
      // No need to manually update state
    } catch (err) {
      console.error('Error terminating call:', err);
      setError('Failed to terminate call');
    }
  };

  // Get time elapsed since call started
  const getTimeElapsed = (startTime: string) => {
    try {
      return formatDistanceToNow(new Date(startTime), { addSuffix: true });
    } catch (err) {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Live Calls</h2>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={isConnected ? "bg-green-900/50 text-green-200 border-green-700/50" : "bg-red-900/50 text-red-200 border-red-700/50"}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loading || !isConnected}
            className="text-gray-200 border-gray-600/50 hover:bg-gray-800/50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/50 text-red-200 p-2 rounded-md border border-red-700/50">
          {error}
        </div>
      )}

      {activeCalls.length === 0 ? (
        <div className="bg-gray-900/50 p-8 rounded-lg border border-dashed border-gray-700/50 text-center backdrop-blur-sm">
          <PhoneCall className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-200">No Active Calls</h3>
          <p className="text-gray-400 mt-2">
            {isConnected 
              ? "There are currently no active calls. Start a new call or check again later." 
              : "Waiting for connection to the server..."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCalls.map((call) => (
            <Card key={call.sid} className="overflow-hidden bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-md font-medium truncate text-gray-100">
                    {call.to || "Unknown Number"}
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={statusColorMap[call.status] || "bg-gray-800/50 text-gray-300 border-gray-600/50"}
                  >
                    {statusIconMap[call.status] || <PhoneCall className="h-4 w-4" />}
                    <span className="ml-1">{call.status}</span>
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-gray-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeElapsed(call.startTime)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">From:</span>
                    <p className="truncate text-gray-300">{call.from || "Unknown"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="text-gray-300">{call.duration || 0}s</p>
                  </div>
                  {call.answeredBy && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Answered By:</span>
                      <Badge variant="outline" className="ml-2 bg-gray-800/50 text-gray-300 border-gray-600/50">
                        <User className="h-3 w-3 mr-1" />
                        {call.answeredBy}
                      </Badge>
                    </div>
                  )}
                  {call.recordingCount !== undefined && call.recordingCount > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Recordings:</span>
                      <Badge variant="outline" className="ml-2 bg-gray-800/50 text-gray-300 border-gray-600/50">
                        <PlayCircle className="h-3 w-3 mr-1" />
                        {call.recordingCount}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="pt-2 pb-2 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = `/call-details/${call.sid}`}
                  className="text-gray-200 border-gray-600/50 hover:bg-gray-800/50"
                >
                  Details
                </Button>
                {call.status === 'in-progress' || call.status === 'ringing' ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleTerminateCall(call.sid)}
                    className="bg-red-900/50 hover:bg-red-800/70 text-red-200 border-red-700/50"
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    End Call
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled
                    className="text-gray-500 border-gray-700/50 opacity-50"
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    Call Ended
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {lastMessage && (
        <div className="mt-4 p-2 bg-gray-900/50 border border-gray-700/50 rounded text-sm text-gray-300 backdrop-blur-sm">
          <div><strong className="text-gray-200">Last Update:</strong> {lastMessage.type} for call {lastMessage.callSid}</div>
          <div><strong className="text-gray-200">Timestamp:</strong> {new Date(lastMessage.timestamp).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
}
