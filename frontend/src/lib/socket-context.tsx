"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEventManager, createSocketEventManager } from './socket-events';
import { mockCallStats } from './mockData';
import { CallInfo, CampaignStats, CampaignConfig } from './types'; // Added CampaignStats and CampaignConfig

// Flag to use mock socket data during development - SET TO FALSE FOR PRODUCTION
const USE_MOCK_SOCKET = false;

// Types for socket data
type Call = {
  sid: string;
  status: string;
  to: string;
  from: string;
  startTime: string;
  duration?: number;
  recordings?: any[];
  recordingCount?: number;
  answeredBy?: string;
  machineBehavior?: string;
  conversation_id?: string;
  campaign_id?: string;
  qualityMetrics?: any;
};

type Recording = {
  sid: string;
  callSid: string;
  url?: string;
  duration?: number;
  channels?: number;
  status: string;
  timestamp: string;
  transcriptionStatus?: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string; // Consider using CampaignConfig['status'] for consistency
  stats?: CampaignStats; // Use CampaignStats type, make it optional if not always present
  progress?: number; // Make optional if not always present
  lastUpdated?: string; // Make optional if not always present
};

type Transcript = {
  callSid: string;
  recordingSid?: string;
  messages: Array<{
    role: 'assistant' | 'user';
    text: string;
    timestamp?: string;
  }>;
  sentiment?: {
    overall: number;
    segments?: Array<{
      role: string;
      score: number;
    }>;
  };
};

type CallUpdate = {
  type: string;
  callSid: string;
  timestamp: string;
  status?: string;
  data?: any;
};

export type CampaignUpdate = { // Added export
  type: string;
  campaignId: string;
  timestamp: string;
  status?: string;
  data?: any;
};

type RecordingUpdate = {
  type: string;
  recordingSid: string;
  callSid: string;
  timestamp: string;
  status?: string;
  data?: any;
};

type TranscriptUpdate = {
  type: string;
  callSid: string;
  recordingSid?: string;
  timestamp: string;
  data?: any;
};

type SocketContextType = {
  socket: Socket | null;
  eventManager: SocketEventManager | null;
  isConnected: boolean;
  lastMessage: CallUpdate | null;
  activeCalls: Call[];
  activeCampaigns: Campaign[];
  recentCalls: Call[];
  lastRecordingUpdate: RecordingUpdate | null;
  lastTranscriptUpdate: TranscriptUpdate | null;
  lastCampaignUpdate: CampaignUpdate | null;
  subscribeToCall: (callSid: string, options?: { withTranscript?: boolean }) => void;
  unsubscribeFromCall: (callSid: string) => void;
  subscribeToCampaign: (campaignId: string) => void;
  unsubscribeFromCampaign: (campaignId: string) => void;
  refreshActiveCalls: () => void;
  refreshActiveCampaigns: () => void;
  forceReconnect: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  eventManager: null,
  isConnected: false,
  lastMessage: null,
  activeCalls: [],
  activeCampaigns: [],
  recentCalls: [],
  lastRecordingUpdate: null,
  lastTranscriptUpdate: null,
  lastCampaignUpdate: null,
  subscribeToCall: () => {},
  unsubscribeFromCall: () => {},
  subscribeToCampaign: () => {},
  unsubscribeFromCampaign: () => {},
  refreshActiveCalls: () => {},
  refreshActiveCampaigns: () => {},
  forceReconnect: () => {},
  connectionStatus: 'disconnected',
});

export const useSocket = () => useContext(SocketContext);

// Mock socket implementation that simulates real-time updates
function createMockSocket() {
  let listeners: Record<string, Function[]> = {};
  let connected = true;
  
  // Simulate socket interface
  const mockSocket: any = {
    on: (event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      
      // Immediately trigger connect event
      if (event === 'connect' && connected) {
        setTimeout(() => callback(), 500);
      }
      
      return mockSocket;
    },
    
    emit: (event: string, ...args: any[]) => {
      console.log(`[Mock Socket] Emitted ${event}`, args);
      
      if (event === 'subscribe_to_calls') {
        // Simulate receiving call updates
        startMockCallUpdates();

        // Send active calls list
        setTimeout(() => {
          if (listeners['active_calls']) {
            listeners['active_calls'].forEach(callback => 
              callback(mockCallStats.stats.activeCalls)
            );
          }
        }, 300);
      } else if (event === 'subscribe_to_call') {
        const callSid = args[0];
        const call = mockCallStats.stats.activeCalls.find(c => c.sid === callSid);
        
        if (call && listeners['call_data']) {
          setTimeout(() => {
            listeners['call_data'].forEach(callback => 
              callback({
                callSid,
                ...call,
                timestamp: new Date().toISOString()
              })
            );
          }, 200);
        }
      }
      
      return mockSocket;
    },
    
    disconnect: () => {
      connected = false;
      if (listeners['disconnect']) {
        listeners['disconnect'].forEach(callback => callback());
      }
    },
    
    // Method to trigger events (for internal use)
    _trigger: (event: string, ...args: any[]) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => callback(...args));
      }
    }
  };
  
  // Start mock call update simulation
  function startMockCallUpdates() {
    // Simulate an active call list from the mock data
    const activeCalls = [...mockCallStats.stats.activeCalls];
    
    // Send initial status updates
    setTimeout(() => {
      activeCalls.forEach(call => {
        mockSocket._trigger('call_update', {
          type: 'status_update',
          callSid: call.sid,
          status: call.status,
          timestamp: new Date().toISOString(),
          data: call
        });
      });
    }, 1000);
    
    // Simulate random updates over time
    const interval = setInterval(() => {
      if (!connected) {
        clearInterval(interval);
        return;
      }
      
      if (Math.random() > 0.7 && activeCalls.length > 0) {
        // Choose a random event type
        const eventType = Math.random() > 0.3 ? 'status_update' : 'call_ended';
        
        // Choose a random call
        const callIndex = Math.floor(Math.random() * activeCalls.length);
        const call = activeCalls[callIndex];
        
        if (eventType === 'call_ended') {
          // Remove call from active calls
          activeCalls.splice(callIndex, 1);
          
          mockSocket._trigger('call_update', {
            type: 'call_ended',
            callSid: call.sid,
            timestamp: new Date().toISOString()
          });
        } else {
          // Update status
          const newStatus = Math.random() > 0.5 ? 'in-progress' : 'ringing';
          call.status = newStatus;
          
          mockSocket._trigger('call_update', {
            type: 'status_update',
            callSid: call.sid,
            status: newStatus,
            timestamp: new Date().toISOString(),
            data: call
          });
        }
      }
      
      // Occasionally add a new call
      if (Math.random() > 0.9) {
        const newCall = {
          sid: 'CA' + Math.random().toString(36).substring(2, 15),
          status: 'ringing',
          to: '+614' + Math.floor(Math.random() * 10000000).toString().padStart(8, '0'),
          from: '+61499999999',
          startTime: new Date().toISOString(),
          duration: 0,
          recordingCount: 0,
          answeredBy: null
        };
        
        activeCalls.push(newCall);
        
        mockSocket._trigger('call_update', {
          type: 'new_call',
          callSid: newCall.sid,
          timestamp: new Date().toISOString(),
          data: newCall
        });
      }
    }, 5000); // Update every 5 seconds
  }
  
  return mockSocket;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [eventManager, setEventManager] = useState<SocketEventManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<CallUpdate | null>(null);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [lastRecordingUpdate, setLastRecordingUpdate] = useState<RecordingUpdate | null>(null);
  const [lastTranscriptUpdate, setLastTranscriptUpdate] = useState<TranscriptUpdate | null>(null);
  const [lastCampaignUpdate, setLastCampaignUpdate] = useState<CampaignUpdate | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('disconnected');

  // Subscribe to a specific call
  const subscribeToCall = useCallback((callSid: string, options?: { withTranscript?: boolean }) => {
    if (eventManager && isConnected) {
      console.log(`[Socket] Subscribing to call ${callSid}`);
      
      // Set up callback to handle call updates
      const handleCallUpdate = (data: any) => {
        console.log(`[Socket] Received update for call ${callSid}:`, data);
        
        // Update active calls if needed
        if (data.type === 'status_update' && data.data) {
          setActiveCalls(prev => {
            const callExists = prev.some(call => call.sid === callSid);
            
            if (callExists) {
              // Update existing call
              return prev.map(call => 
                call.sid === callSid ? { ...call, ...data.data } : call
              );
            } else {
              // Add as new call
              return [...prev, data.data];
            }
          });
          
          // Update recent calls
          setRecentCalls(prev => {
            const callExists = prev.some(call => call.sid === callSid);
            
            if (callExists) {
              // Update existing call in recent list
              return prev.map(call => 
                call.sid === callSid ? { ...call, ...data.data } : call
              );
            } else {
              // Add to recent calls
              return [data.data, ...prev].slice(0, 10);
            }
          });
        }
      };
      
      // Set up callback for transcript updates if requested
      const handleTranscriptUpdate = options?.withTranscript 
        ? (data: any) => {
            console.log(`[Socket] Received transcript update for call ${callSid}:`, data);
            setLastTranscriptUpdate(data);
          }
        : undefined;
      
      // Subscribe to the call
      eventManager.subscribeToCall(callSid, handleCallUpdate, handleTranscriptUpdate);
    }
  }, [eventManager, isConnected]);

  // Unsubscribe from a specific call
  const unsubscribeFromCall = useCallback((callSid: string) => {
    if (eventManager && isConnected) {
      console.log(`[Socket] Unsubscribing from call ${callSid}`);
      eventManager.unsubscribeFromCall(callSid);
    }
  }, [eventManager, isConnected]);

  // Subscribe to a specific campaign
  const subscribeToCampaign = useCallback((campaignId: string) => {
    if (eventManager && isConnected) {
      console.log(`[Socket] Subscribing to campaign ${campaignId}`);
      
      // Set up callback to handle campaign updates
      const handleCampaignUpdate = (data: any) => {
        console.log(`[Socket] Received update for campaign ${campaignId}:`, data);
        setLastCampaignUpdate(data);
        
        // Update active campaigns
        if (data.type === 'status_update' || data.type === 'progress_update') {
          setActiveCampaigns(prev => {
            const campaignExists = prev.some(camp => camp.id === campaignId);
            
            if (campaignExists) {
              // Update existing campaign
              return prev.map(camp => 
                camp.id === campaignId ? { ...camp, ...data.data } : camp
              );
            } else if (data.data) {
              // Add as new campaign
              return [...prev, data.data];
            }
            
            return prev;
          });
        }
      };
      
      // Subscribe to the campaign
      eventManager.subscribeToCampaign(campaignId, handleCampaignUpdate);
    }
  }, [eventManager, isConnected]);

  // Unsubscribe from a specific campaign
  const unsubscribeFromCampaign = useCallback((campaignId: string) => {
    if (eventManager && isConnected) {
      console.log(`[Socket] Unsubscribing from campaign ${campaignId}`);
      eventManager.unsubscribeFromCampaign(campaignId);
    }
  }, [eventManager, isConnected]);

  // Refresh the active calls list
  const refreshActiveCalls = useCallback(() => {
    if (eventManager && isConnected) {
      console.log('[Socket] Manually refreshing active calls');
      
      // Re-subscribe to calls
      eventManager.subscribeToCalls((data: any) => {
        console.log('[Socket] Received refreshed active calls:', data);
        setActiveCalls(data || []);
      });
    }
  }, [eventManager, isConnected]);

  // Refresh the active campaigns list
  const refreshActiveCampaigns = useCallback(() => {
    if (eventManager && isConnected) {
      console.log('[Socket] Manually refreshing active campaigns');
      
      // Re-subscribe to campaigns
      eventManager.subscribeToCampaigns((data: any) => {
        console.log('[Socket] Received refreshed active campaigns:', data);
        setActiveCampaigns(data || []);
      });
    }
  }, [eventManager, isConnected]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    if (eventManager) {
      console.log('[Socket] Forcing reconnection');
      setConnectionStatus('reconnecting');
      eventManager.forceReconnect();
    }
  }, [eventManager]);

  // Initialize socket connection
  useEffect(() => {
    let socketInstance: any;
    
    if (USE_MOCK_SOCKET) {
      console.log('[Socket] Using mock socket implementation');
      socketInstance = createMockSocket();
    } else {
      // Create real socket connection with enhanced settings and better error handling
      try {
        // Use NEXT_PUBLIC_API_URL directly for socket connection base URL
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        socketInstance = io(socketUrl, { // Connect to the base URL
          transports: ['polling', 'websocket'], // Allow both polling and websocket
          reconnection: true,
          reconnectionAttempts: 10,              // Increased from 5 to 10
          reconnectionDelay: 1000,               // Start with 1s delay
          reconnectionDelayMax: 10000,           // Max 10s delay between reconnection attempts
          randomizationFactor: 0.5,              // Add randomization to prevent reconnection storms
          timeout: 10000,
          autoConnect: true,                     // Connect automatically
          query: { reconnect: 'true' },          // Signal this is a reconnection attempt
          path: '/socket.io/',
        });
        
        console.log('[Socket] Attempting connection to:', socketUrl);
      } catch (error) {
        console.error('[Socket] Error creating socket instance:', error);
        // Create a mock socket as fallback
        socketInstance = createMockSocket();
        console.log('[Socket] Using mock socket due to connection error');
      }
    }

    // Set socket instance in state
    setSocket(socketInstance);
    
    // Create enhanced event manager
    const manager = createSocketEventManager(socketInstance, {
      maxRetries: 10,
      retryDelay: 1000,
      verboseLogging: true
    });
    
    setEventManager(manager);
    
    // Set up basic socket event handlers
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Automatically subscribe to call updates
      console.log('[Socket] Auto-subscribing to call updates');
      socketInstance.emit('subscribe_to_calls');
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socketInstance.on('reconnect_attempt', () => {
      console.log('[Socket] Reconnecting...');
      setConnectionStatus('reconnecting');
    });
    
    // Add error handling
    socketInstance.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionStatus('disconnected');
      
      // If we're in development mode, use mock data after multiple failures
      if (process.env.NODE_ENV === 'development' && !USE_MOCK_SOCKET) {
        console.log('[Socket] Using fallback data in development mode due to connection error');
      }
    });

    // Set up data event handlers
    socketInstance.on('active_calls', (data: Call[]) => {
      console.log('[Socket] Received active calls list:', data);
      setActiveCalls(data || []);
      
      // Update recent calls with active calls
      setRecentCalls(prev => {
        // Combine existing recent calls with active calls
        const combinedCalls = [...prev];
        
        // Add any active calls not already in recent calls
        data.forEach(activeCall => {
          const exists = combinedCalls.some(call => call.sid === activeCall.sid);
          if (!exists) {
            combinedCalls.unshift(activeCall);
          }
        });
        
        // Return the most recent 10 calls
        return combinedCalls.slice(0, 10);
      });
    });

    socketInstance.on('call_update', (data: CallUpdate) => {
      console.log('[Socket] Call update received:', data);
      setLastMessage(data);
      
      // The specific call update will be handled by the subscribeToCall callback
      // This is for global call updates
      
      // Also update recent calls
      if (data.type === 'new_call' && data.data) {
        setRecentCalls(prev => {
          const newCall = data.data;
          return [newCall, ...prev].slice(0, 10);
        });
      }
    });

    socketInstance.on('active_campaigns', (data: Campaign[]) => {
      console.log('[Socket] Received active campaigns list:', data);
      setActiveCampaigns(data || []);
    });

    socketInstance.on('recording_update', (data: RecordingUpdate) => {
      console.log('[Socket] Recording update received:', data);
      setLastRecordingUpdate(data);
    });

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        console.log('[Socket] Cleaning up socket connection');
        socketInstance.disconnect();
      }
    };
  }, []);

  // Value object for the context
  const contextValue = {
    socket,
    eventManager,
    isConnected,
    lastMessage,
    activeCalls,
    activeCampaigns,
    recentCalls,
    lastRecordingUpdate,
    lastTranscriptUpdate,
    lastCampaignUpdate,
    subscribeToCall,
    unsubscribeFromCall,
    subscribeToCampaign,
    unsubscribeFromCampaign,
    refreshActiveCalls,
    refreshActiveCampaigns,
    forceReconnect,
    connectionStatus
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
