# Socket.IO Integration for Real-Time MongoDB Updates

This document outlines the architecture and implementation details for integrating Socket.IO with MongoDB to provide real-time updates for the ElevenLabs/Twilio integration project.

## Overview

Real-time updates are a critical component of the ElevenLabs/Twilio integration, particularly for active call monitoring and campaign management. Socket.IO provides a robust framework for implementing real-time, bidirectional communication between the server and clients.

The integration leverages MongoDB Change Streams to detect database changes and Socket.IO to push these changes to connected clients in real-time.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    MongoDB      │────►│  Change Streams │────►│  Event Emitter  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Client Browser │◄────│    Socket.IO    │◄────│   Socket.IO     │
│                 │     │     Client      │     │    Server       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Components

1. **MongoDB**: The database storing all call and campaign data
2. **Change Streams**: MongoDB feature that allows applications to access real-time data changes
3. **Event Emitter**: Node.js EventEmitter that bridges Change Streams and Socket.IO
4. **Socket.IO Server**: Server-side component that manages WebSocket connections
5. **Socket.IO Client**: Client-side component that receives real-time updates
6. **Client Browser**: Frontend application that displays real-time data

## Implementation Details

### 1. Server-Side Implementation

#### Socket.IO Server Setup

```javascript
// socket-server.js

import { Server } from 'socket.io';
import { getActiveCalls } from './db/repositories/call.repository.js';
import { getActiveCampaigns } from './db/repositories/campaign.repository.js';

let io;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server
 * @returns {Object} Socket.IO server
 */
export function initSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
  });
  
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    // Handle subscriptions
    socket.on('subscribe:calls', async () => {
      socket.join('calls_room');
      console.log(`[Socket.IO] Client ${socket.id} subscribed to calls`);
      
      // Send initial active calls data
      try {
        const activeCalls = await getActiveCalls();
        socket.emit('active_calls', {
          calls: activeCalls,
          count: activeCalls.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error fetching active calls:', error);
        socket.emit('error', {
          type: 'active_calls',
          message: 'Error fetching active calls',
          details: error.message
        });
      }
    });
    
    socket.on('subscribe:campaigns', async () => {
      socket.join('campaigns_room');
      console.log(`[Socket.IO] Client ${socket.id} subscribed to campaigns`);
      
      // Send initial active campaigns data
      try {
        const activeCampaigns = await getActiveCampaigns();
        socket.emit('active_campaigns', {
          campaigns: activeCampaigns,
          count: activeCampaigns.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error fetching active campaigns:', error);
        socket.emit('error', {
          type: 'active_campaigns',
          message: 'Error fetching active campaigns',
          details: error.message
        });
      }
    });
    
    // Handle manual refresh requests
    socket.on('get:active_calls', async () => {
      try {
        const activeCalls = await getActiveCalls();
        socket.emit('active_calls', {
          calls: activeCalls,
          count: activeCalls.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error fetching active calls:', error);
        socket.emit('error', {
          type: 'active_calls',
          message: 'Error fetching active calls',
          details: error.message
        });
      }
    });
    
    socket.on('get:active_campaigns', async () => {
      try {
        const activeCampaigns = await getActiveCampaigns();
        socket.emit('active_campaigns', {
          campaigns: activeCampaigns,
          count: activeCampaigns.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error fetching active campaigns:', error);
        socket.emit('error', {
          type: 'active_campaigns',
          message: 'Error fetching active campaigns',
          details: error.message
        });
      }
    });
    
    // Handle client errors
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Client error from ${socket.id}:`, error);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
  
  // Set up error handling
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.IO] Connection error:', err);
  });
  
  return io;
}

/**
 * Emit event to all clients in a room
 * @param {string} event - Event name
 * @param {any} data - Event data
 * @param {string} room - Room name
 */
export function emitToRoom(event, data, room) {
  if (!io) {
    console.error('[Socket.IO] Socket.IO not initialized');
    return;
  }
  
  io.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Socket.IO] Emitted ${event} to ${room}`);
}

/**
 * Emit call update event
 * @param {Object} call - Call data
 */
export function emitCallUpdate(call) {
  if (!io) {
    console.error('[Socket.IO] Socket.IO not initialized');
    return;
  }
  
  io.to('calls_room').emit('call_update', {
    call,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Socket.IO] Emitted call_update for ${call.callSid}`);
}

/**
 * Emit campaign update event
 * @param {Object} campaign - Campaign data
 */
export function emitCampaignUpdate(campaign) {
  if (!io) {
    console.error('[Socket.IO] Socket.IO not initialized');
    return;
  }
  
  io.to('campaigns_room').emit('campaign_update', {
    campaign,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[Socket.IO] Emitted campaign_update for ${campaign.campaignId}`);
}

export default {
  initSocketServer,
  emitToRoom,
  emitCallUpdate,
  emitCampaignUpdate
};
```

#### MongoDB Change Streams Integration

```javascript
// change-stream-handler.js

import { MongoClient } from 'mongodb';
import { emitCallUpdate, emitCampaignUpdate } from './socket-server.js';

let changeStreams = [];

/**
 * Initialize MongoDB change streams
 * @param {MongoClient} client - MongoDB client
 */
export async function initChangeStreams(client) {
  try {
    // Close any existing change streams
    await closeChangeStreams();
    
    const db = client.db();
    
    // Watch for changes in the calls collection
    const callsChangeStream = db.collection('calls').watch(
      [
        {
          $match: {
            $or: [
              { 'operationType': 'insert' },
              { 'operationType': 'update' },
              { 'operationType': 'replace' }
            ]
          }
        }
      ],
      { fullDocument: 'updateLookup' }
    );
    
    callsChangeStream.on('change', async (change) => {
      console.log(`[ChangeStream] Detected change in calls collection: ${change.operationType}`);
      
      if (change.fullDocument) {
        // Emit call update event
        emitCallUpdate(change.fullDocument);
        
        // If the call status changed to completed, failed, etc., update campaign stats
        if (change.operationType === 'update' && 
            change.updateDescription.updatedFields.status && 
            change.fullDocument.campaignId) {
          try {
            // Get updated campaign data
            const campaign = await db.collection('campaigns').findOne({ 
              campaignId: change.fullDocument.campaignId 
            });
            
            if (campaign) {
              // Emit campaign update event
              emitCampaignUpdate(campaign);
            }
          } catch (error) {
            console.error('[ChangeStream] Error fetching campaign data:', error);
          }
        }
      }
    });
    
    // Watch for changes in the campaigns collection
    const campaignsChangeStream = db.collection('campaigns').watch(
      [
        {
          $match: {
            $or: [
              { 'operationType': 'insert' },
              { 'operationType': 'update' },
              { 'operationType': 'replace' }
            ]
          }
        }
      ],
      { fullDocument: 'updateLookup' }
    );
    
    campaignsChangeStream.on('change', (change) => {
      console.log(`[ChangeStream] Detected change in campaigns collection: ${change.operationType}`);
      
      if (change.fullDocument) {
        // Emit campaign update event
        emitCampaignUpdate(change.fullDocument);
      }
    });
    
    // Store change streams for later cleanup
    changeStreams.push(callsChangeStream, campaignsChangeStream);
    
    console.log('[ChangeStream] MongoDB change streams initialized');
    
    return { callsChangeStream, campaignsChangeStream };
  } catch (error) {
    console.error('[ChangeStream] Error initializing change streams:', error);
    throw error;
  }
}

/**
 * Close all change streams
 */
export async function closeChangeStreams() {
  try {
    for (const stream of changeStreams) {
      await stream.close();
      console.log('[ChangeStream] Closed change stream');
    }
    
    changeStreams = [];
  } catch (error) {
    console.error('[ChangeStream] Error closing change streams:', error);
  }
}

export default {
  initChangeStreams,
  closeChangeStreams
};
```

#### Integration with Server Startup

```javascript
// server.js

import express from 'express';
import http from 'http';
import { connectToDatabase } from './db/mongodb-connection.js';
import { initSocketServer } from './socket-server.js';
import { initChangeStreams } from './change-stream-handler.js';
import { registerRoutes } from './routes.js';

async function startServer() {
  try {
    // Create Express app
    const app = express();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Connect to MongoDB
    const mongoClient = await connectToDatabase();
    
    // Initialize Socket.IO
    const io = initSocketServer(server);
    
    // Initialize change streams
    await initChangeStreams(mongoClient);
    
    // Register routes
    registerRoutes(app);
    
    // Start server
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await closeChangeStreams();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
```

### 2. Client-Side Implementation

#### Socket.IO Client Setup

```typescript
// socket-client.ts

import { io, Socket } from 'socket.io-client';

// Socket.IO client instance
let socket: Socket | null = null;

// Connection status
let isConnected = false;

// Reconnection attempts
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Event listeners
const eventListeners: Record<string, Function[]> = {};

/**
 * Initialize Socket.IO client
 * @returns {Socket} Socket.IO client
 */
export function initSocketClient(): Socket {
  if (socket) {
    return socket;
  }
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  socket = io(API_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true
  });
  
  // Set up event listeners
  socket.on('connect', () => {
    console.log('[Socket.IO] Connected to server');
    isConnected = true;
    reconnectAttempts = 0;
    
    // Trigger connect event listeners
    triggerEventListeners('connect');
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Disconnected: ${reason}`);
    isConnected = false;
    
    // Trigger disconnect event listeners
    triggerEventListeners('disconnect', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('[Socket.IO] Connection error:', error);
    reconnectAttempts++;
    
    // Trigger error event listeners
    triggerEventListeners('error', error);
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[Socket.IO] Max reconnection attempts reached');
      socket?.disconnect();
    }
  });
  
  socket.on('error', (error) => {
    console.error('[Socket.IO] Error:', error);
    
    // Trigger error event listeners
    triggerEventListeners('error', error);
  });
  
  return socket;
}

/**
 * Get Socket.IO client instance
 * @returns {Socket|null} Socket.IO client
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
export function isSocketConnected(): boolean {
  return isConnected;
}

/**
 * Subscribe to active calls updates
 */
export function subscribeToActiveCalls(): void {
  if (!socket) {
    console.error('[Socket.IO] Socket not initialized');
    return;
  }
  
  socket.emit('subscribe:calls');
  console.log('[Socket.IO] Subscribed to active calls');
}

/**
 * Subscribe to active campaigns updates
 */
export function subscribeToActiveCampaigns(): void {
  if (!socket) {
    console.error('[Socket.IO] Socket not initialized');
    return;
  }
  
  socket.emit('subscribe:campaigns');
  console.log('[Socket.IO] Subscribed to active campaigns');
}

/**
 * Request active calls data
 */
export function requestActiveCalls(): void {
  if (!socket) {
    console.error('[Socket.IO] Socket not initialized');
    return;
  }
  
  socket.emit('get:active_calls');
  console.log('[Socket.IO] Requested active calls');
}

/**
 * Request active campaigns data
 */
export function requestActiveCampaigns(): void {
  if (!socket) {
    console.error('[Socket.IO] Socket not initialized');
    return;
  }
  
  socket.emit('get:active_campaigns');
  console.log('[Socket.IO] Requested active campaigns');
}

/**
 * Add event listener
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 */
export function addEventListener(event: string, callback: Function): void {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  
  eventListeners[event].push(callback);
  
  // If socket exists, add listener
  if (socket) {
    socket.on(event, (...args) => {
      callback(...args);
    });
  }
}

/**
 * Remove event listener
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 */
export function removeEventListener(event: string, callback: Function): void {
  if (!eventListeners[event]) {
    return;
  }
  
  eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
  
  // If socket exists, remove listener
  if (socket) {
    socket.off(event, callback as any);
  }
}

/**
 * Trigger event listeners
 * @param {string} event - Event name
 * @param {...any} args - Event arguments
 */
function triggerEventListeners(event: string, ...args: any[]): void {
  if (!eventListeners[event]) {
    return;
  }
  
  for (const callback of eventListeners[event]) {
    callback(...args);
  }
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (!socket) {
    return;
  }
  
  socket.disconnect();
  socket = null;
  isConnected = false;
  console.log('[Socket.IO] Disconnected socket');
}

export default {
  initSocketClient,
  getSocket,
  isSocketConnected,
  subscribeToActiveCalls,
  subscribeToActiveCampaigns,
  requestActiveCalls,
  requestActiveCampaigns,
  addEventListener,
  removeEventListener,
  disconnectSocket
};
```

#### React Hook for Active Calls

```typescript
// useActiveCalls.ts

import { useState, useEffect, useCallback } from 'react';
import { 
  initSocketClient, 
  subscribeToActiveCalls, 
  addEventListener, 
  removeEventListener,
  isSocketConnected,
  requestActiveCalls
} from './socket-client';
import { CallInfo } from './types';

/**
 * Hook for subscribing to active calls
 * @returns {Object} Active calls data and status
 */
export function useActiveCalls() {
  const [activeCalls, setActiveCalls] = useState<CallInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Initialize socket and subscribe to active calls
  useEffect(() => {
    // Initialize socket
    initSocketClient();
    
    // Subscribe to active calls
    subscribeToActiveCalls();
    
    // Handle active calls updates
    const handleActiveCalls = (data: { calls: CallInfo[], count: number, timestamp: string }) => {
      setActiveCalls(data.calls);
      setIsLoading(false);
      setError(null);
      setLastUpdated(new Date(data.timestamp));
    };
    
    // Handle call updates
    const handleCallUpdate = (data: { call: CallInfo, timestamp: string }) => {
      setActiveCalls(prevCalls => {
        // Check if call already exists
        const existingCallIndex = prevCalls.findIndex(c => c.callSid === data.call.callSid);
        
        if (existingCallIndex >= 0) {
          // Update existing call
          const updatedCalls = [...prevCalls];
          updatedCalls[existingCallIndex] = data.call;
          return updatedCalls;
        } else {
          // Add new call if it's active
          if (['initiated', 'queued', 'ringing', 'in-progress'].includes(data.call.status)) {
            return [...prevCalls, data.call];
          }
          return prevCalls;
        }
      });
      
      setLastUpdated(new Date(data.timestamp));
    };
    
    // Handle errors
    const handleError = (error: { type: string, message: string, details: string }) => {
      if (error.type === 'active_calls') {
        setError(error.message);
        setIsLoading(false);
      }
    };
    
    // Add event listeners
    addEventListener('active_calls', handleActiveCalls);
    addEventListener('call_update', handleCallUpdate);
    addEventListener('error', handleError);
    
    // Clean up event listeners
    return () => {
      removeEventListener('active_calls', handleActiveCalls);
      removeEventListener('call_update', handleCallUpdate);
      removeEventListener('error', handleError);
    };
  }, []);
  
  // Function to manually refresh active calls
  const refreshActiveCalls = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    if (isSocketConnected()) {
      requestActiveCalls();
    } else {
      setError('Socket not connected');
      setIsLoading(false);
    }
  }, []);
  
  return {
    activeCalls,
    isLoading,
    error,
    lastUpdated,
    refreshActiveCalls
  };
}
```

#### React Component for Active Calls

```tsx
// ActiveCallsMonitor.tsx

import React from 'react';
import { useActiveCalls } from '../hooks/useActiveCalls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Phone, PhoneOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ActiveCallsMonitor() {
  const { activeCalls, isLoading, error, lastUpdated, refreshActiveCalls } = useActiveCalls();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Active Calls</CardTitle>
          <CardDescription>
            {lastUpdated && (
              <span>Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
            )}
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshActiveCalls}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : activeCalls.length === 0 ? (
          <div className="text-center py-12">
            <PhoneOff className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No active calls at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCalls.map(call => (
              <div key={call.callSid} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{call.contactName || 'Unknown Contact'}</h3>
                      <p className="text-sm text-muted-foreground">{call.to}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      call.status === 'in-progress' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : call.status === 'ringing'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {call.status}
                    </span>
                    {call.startTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Started {formatDistanceToNow(new Date(call.startTime), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                {call.duration && (
                  <div className="mt-2 text-sm">
                    Duration: {Math.floor(call.duration / 60)}m {call.duration % 60}s
                  </div>
                )}
                {call.agentId && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Agent: {call.agentId}
                  </div>
                )}
                {call.campaignId && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Campaign: {call.campaignId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Performance Considerations

### 1. Connection Pooling

To handle multiple concurrent connections efficiently, the Socket.IO server should be configured with appropriate connection pooling:

```javascript
// socket-server.js

const io = new Server(server, {
  // ...
  maxHttpBufferSize: 1e6, // 1MB
  pingInterval: 10000,
  pingTimeout: 5000,
  connectTimeout: 10000,
  // ...
});
```

### 2. Change Stream Optimization

To minimize the load on MongoDB, change streams should be optimized to only watch for relevant changes:

```javascript
// Optimized change stream pipeline
const pipeline = [
  {
    $match: {
      $or: [
        { 'operationType': 'insert' },
        {
          'operationType': 'update',
          'updateDescription.updatedFields.status': { $exists: true }
        },
        {
          'operationType': 'replace',
          'fullDocument.status': { $in: ['initiated', 'ringing', 'in-progress', 'completed'] }
        }
      ]
    }
  }
];

const callsChangeStream = db.collection('calls').watch(pipeline, { fullDocument: 'updateLookup' });
```

### 3. Event Batching

For high-volume updates, events should be batched to reduce the number of Socket.IO messages:

```javascript
// Event batching
let callUpdatesBatch = [];
let batchTimeout = null;

function queueCallUpdate(call) {
  callUpdatesBatch.push(call);
  
  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      if (callUpdatesBatch.length > 0) {
        io.to('calls_room').emit('calls_batch_update', {
          calls: callUpdatesBatch,
          timestamp: new Date().toISOString()
        });
        
        callUpdatesBatch = [];
      }
      
      batchTimeout = null;
    }, 100); // 100ms batching window
  }
}
```

### 4. Client-Side Throttling

To prevent overwhelming the client with updates, implement throttling on the client side:

```typescript
// Throttled update handler
import { throttle } from 'lodash';

const throttledUpdateHandler = throttle((data) => {
  setActiveCalls(data.calls);
  setLastUpdated(new Date(data.timestamp));
}, 200); // 200ms throttle window

addEventListener('calls_batch_update', throttledUpdateHandler);
```

## Error Handling and Recovery

### 1. Reconnection Strategy

Implement a robust reconnection strategy to handle network interruptions:

```typescript
// Client-side reconnection
socket = io(API_URL, {
  // ...
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5
});

socket.io.on('reconnect_attempt', (attempt) => {
  console.log(`[Socket.IO] Reconnection attempt ${attempt}`);
});

socket.io.on('reconnect', (attempt) => {
  console.log(`[Socket.IO] Reconnected after ${attempt} attempts`);
  
  // Resubscribe to rooms
  socket.emit('subscribe:calls');
  socket.emit('subscribe:campaigns');
});

socket.io.on('reconnect_error', (error) => {
  console.error('[Socket.IO] Reconnection error:', error);
});

socket.io.on('reconnect_failed', () => {
  console.error('[Socket.IO] Failed to reconnect');
});
```

### 2. Change Stream Error Handling

Implement error handling and recovery for change streams:

```javascript
// Change stream error handling
callsChangeStream.on('error', async (error) => {
  console.error('[ChangeStream] Error in calls change stream:', error);
  
  // Close the stream
