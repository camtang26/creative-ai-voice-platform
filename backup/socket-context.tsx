"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from './utils';

// Define the shape of our context
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeCalls: any[];
  activeCampaigns: any[];
  lastMessage: any | null;
  refreshActiveCalls: () => void;
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  activeCalls: [],
  activeCampaigns: [],
  lastMessage: null,
  refreshActiveCalls: () => {},
});

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext);

// Provider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Extract the base URL without the /api path
    const baseUrl = getApiUrl().replace('/api', '');
    
    // Create socket connection
    const socketInstance = io(baseUrl, {
      reconnection: true,
      path: '/socket.io',
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      
      // Subscribe to updates
      socketInstance.emit('subscribe:calls');
      socketInstance.emit('subscribe:campaigns');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      
      // Re-subscribe to updates
      socketInstance.emit('subscribe:calls');
      socketInstance.emit('subscribe:campaigns');
    });

    socketInstance.on('active_calls', (data) => {
      console.log('[Socket] Received active calls list:', data);
      setActiveCalls(data || []);
      setLastMessage({ type: 'active_calls', data, timestamp: new Date() });
    });

    socketInstance.on('active_campaigns', (data) => {
      console.log('[Socket] Received active campaigns list:', data);
      setActiveCampaigns(data || []);
      setLastMessage({ type: 'active_campaigns', data, timestamp: new Date() });
    });

    socketInstance.on('call_update', (data) => {
      console.log('[Socket] Call update:', data);
      setLastMessage({ type: 'call_update', data, timestamp: new Date() });
      
      // Update the active calls list
      setActiveCalls(prev => {
        // If the call already exists in the list, update it
        const exists = prev.some(call => call.sid === data.sid);
        
        if (exists) {
          return prev.map(call => 
            call.sid === data.sid ? { ...call, ...data } : call
          );
        } else {
          // Otherwise, add it to the list
          return [...prev, data];
        }
      });
    });

    socketInstance.on('campaign_update', (data) => {
      console.log('[Socket] Campaign update:', data);
      setLastMessage({ type: 'campaign_update', data, timestamp: new Date() });
      
      // Update the active campaigns list
      setActiveCampaigns(prev => {
        // If the campaign already exists in the list, update it
        const exists = prev.some(campaign => campaign.id === data.id);
        
        if (exists) {
          return prev.map(campaign => 
            campaign.id === data.id ? { ...campaign, ...data } : campaign
          );
        } else {
          // Otherwise, add it to the list
          return [...prev, data];
        }
      });
    });

    // Save socket instance
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('[Socket] Cleaning up socket connection');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('error');
      socketInstance.off('reconnect');
      socketInstance.off('active_calls');
      socketInstance.off('active_campaigns');
      socketInstance.off('call_update');
      socketInstance.off('campaign_update');
      socketInstance.disconnect();
    };
  }, []);

  // Function to manually refresh active calls
  const refreshActiveCalls = () => {
    if (socket && isConnected) {
      socket.emit('get:active_calls');
      socket.emit('get:active_campaigns');
    }
  };

  // Provide the socket context to children
  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        activeCalls, 
        activeCampaigns, 
        lastMessage,
        refreshActiveCalls
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
