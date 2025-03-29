"use client";

import { useState, useEffect } from 'react';
import { ActiveCallCard } from '@/components/active-call-card';
import { CallInfo } from '@/lib/types';
import { useSocket } from '@/lib/socket-context';
import { fetchCallStats } from '@/lib/api';

export function LiveCallsGrid() {
  const [activeCalls, setActiveCalls] = useState<CallInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected, lastMessage } = useSocket();

  // Fetch initial active calls on component mount
  useEffect(() => {
    async function fetchInitialCalls() {
      setIsLoading(true);
      try {
        const result = await fetchCallStats();
        if (result.success) {
          setActiveCalls(result.stats.activeCalls || []);
        } else {
          setError('Failed to load active calls');
        }
      } catch (err) {
        setError('Error connecting to server');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialCalls();
  }, []);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastMessage) {
      const { type, callSid, status, data } = lastMessage;

      if (type === 'new_call') {
        // Add new call to the list
        setActiveCalls(prev => [...prev, data]);
      } 
      else if (type === 'status_update') {
        // Update existing call status
        setActiveCalls(prev => 
          prev.map(call => 
            call.sid === callSid ? { ...call, ...data, status } : call
          )
        );
      } 
      else if (type === 'call_ended') {
        // Remove call that has ended
        setActiveCalls(prev => 
          prev.filter(call => call.sid !== callSid)
        );
      }
    }
  }, [lastMessage]);

  // Subscribe to call events when socket is connected
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('subscribe_to_calls');

      return () => {
        socket.emit('unsubscribe_from_calls');
      };
    }
  }, [socket, isConnected]);

  // Handle when a call is ended by user action
  function handleCallEnded(callSid: string) {
    setActiveCalls(prev => prev.filter(call => call.sid !== callSid));
  }

  // If we're still loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-muted"></div>
          <div className="h-4 w-32 bg-muted mt-4 rounded"></div>
        </div>
      </div>
    );
  }

  // If we encountered an error
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex">
          <div>
            <p className="text-red-700">Error loading active calls</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button 
              className="mt-2 text-sm text-red-700 hover:text-red-500"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If there are no active calls
  if (activeCalls.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <h3 className="font-medium text-lg mb-2">No Active Calls</h3>
        <p className="text-muted-foreground">
          There are currently no active calls to display. 
          Start a new call from the "Make Call" page.
        </p>
      </div>
    );
  }

  // Render the grid of active calls
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeCalls.map(call => (
        <ActiveCallCard 
          key={call.sid} 
          call={call} 
          onCallEnded={handleCallEnded}
        />
      ))}
    </div>
  );
}
