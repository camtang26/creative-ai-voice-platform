"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhoneCall, PhoneOff, Phone, Clock, User, PlayCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Status badge color mapping
const statusColorMap: Record<string, string> = {
  'initiated': 'bg-blue-100 text-blue-800 border-blue-300',
  'ringing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'in-progress': 'bg-green-100 text-green-800 border-green-300',
  'completed': 'bg-gray-100 text-gray-800 border-gray-300',
  'failed': 'bg-red-100 text-red-800 border-red-300',
  'busy': 'bg-purple-100 text-purple-800 border-purple-300',
  'no-answer': 'bg-orange-100 text-orange-800 border-orange-300',
  'canceled': 'bg-gray-100 text-gray-800 border-gray-300'
};

// Status icon mapping
const statusIconMap: Record<string, React.ReactNode> = {
  'initiated': <PhoneCall className="h-4 w-4 text-blue-600" />,
  'ringing': <PhoneCall className="h-4 w-4 text-yellow-600 animate-pulse" />,
  'in-progress': <Phone className="h-4 w-4 text-green-600" />,
  'completed': <PhoneOff className="h-4 w-4 text-gray-600" />,
  'failed': <PhoneOff className="h-4 w-4 text-red-600" />,
  'busy': <PhoneOff className="h-4 w-4 text-purple-600" />,
  'no-answer': <PhoneOff className="h-4 w-4 text-orange-600" />,
  'canceled': <PhoneOff className="h-4 w-4 text-gray-600" />
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
        <h2 className="text-2xl font-bold">Live Calls</h2>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loading || !isConnected}
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
        <div className="bg-red-100 text-red-800 p-2 rounded-md border border-red-300">
          {error}
        </div>
      )}

      {activeCalls.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg border border-dashed text-center">
          <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No Active Calls</h3>
          <p className="text-gray-500 mt-2">
            {isConnected 
              ? "There are currently no active calls. Start a new call or check again later." 
              : "Waiting for connection to the server..."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCalls.map((call) => (
            <Card key={call.sid} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-md font-medium truncate">
                    {call.to || "Unknown Number"}
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={statusColorMap[call.status] || "bg-gray-100"}
                  >
                    {statusIconMap[call.status] || <PhoneCall className="h-4 w-4" />}
                    <span className="ml-1">{call.status}</span>
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeElapsed(call.startTime)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">From:</span>
                    <p className="truncate">{call.from || "Unknown"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p>{call.duration || 0}s</p>
                  </div>
                  {call.answeredBy && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Answered By:</span>
                      <Badge variant="outline" className="ml-2">
                        <User className="h-3 w-3 mr-1" />
                        {call.answeredBy}
                      </Badge>
                    </div>
                  )}
                  {call.recordingCount !== undefined && call.recordingCount > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Recordings:</span>
                      <Badge variant="outline" className="ml-2">
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
                >
                  Details
                </Button>
                {call.status === 'in-progress' || call.status === 'ringing' ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleTerminateCall(call.sid)}
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    End Call
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled
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
        <div className="mt-4 p-2 bg-gray-50 border rounded text-sm text-gray-700">
          <div><strong>Last Update:</strong> {lastMessage.type} for call {lastMessage.callSid}</div>
          <div><strong>Timestamp:</strong> {new Date(lastMessage.timestamp).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
}
