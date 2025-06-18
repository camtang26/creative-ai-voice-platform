# Socket.IO Integration for Real-time Call Updates

This guide explains how to set up and use the Socket.IO integration for real-time call status updates between the ElevenLabs/Twilio backend and your frontend dashboard.

## Implementation Overview

The Socket.IO integration enables real-time communication between the server and the frontend, allowing for:

- Live call status updates
- Real-time recording notifications
- Active call monitoring
- Call quality metrics
- Call termination confirmations

## Files Included

1. **Backend Components**:
   - `socket-server-enhanced.js`: Socket.IO server implementation
   - `server-enhanced.js`: Updated server with Socket.IO integration

2. **Frontend Components**:
   - `socket-context-enhanced.tsx`: React context for Socket.IO
   - `enhanced-live-calls-grid.tsx`: Example React component for live call monitoring

## Installation Steps

### 1. Backend Setup

1. **Rename/Replace Files**:
   ```bash
   # Backup original socket-server.js if needed
   mv socket-server.js socket-server.js.bak

   # Install the enhanced socket server
   mv socket-server-enhanced.js socket-server.js

   # Backup original server.js if needed
   mv server.js server.js.bak

   # Install the enhanced server
   mv server-enhanced.js server.js
   ```

2. **Restart the Server**:
   ```bash
   # Using your start script
   npm start
   # or
   node server.js
   ```

### 2. Frontend Setup

1. **Rename/Replace Files**:
   ```bash
   # Backup original socket-context.tsx if needed
   mv src/lib/socket-context.tsx src/lib/socket-context.tsx.bak

   # Install the enhanced socket context
   mv src/lib/socket-context-enhanced.tsx src/lib/socket-context.tsx
   ```

2. **Update .env Files**:
   Add the following environment variables to your frontend .env file:
   ```
   NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
   ```

3. **Update Import Paths**:
   Make sure any components using the socket context have the correct import path:
   ```typescript
   import { useSocket } from '@/lib/socket-context';
   ```

4. **Use the Enhanced Live Calls Grid Component**:
   You can either replace your existing live calls grid component or update your page to use the enhanced version:
   ```tsx
   import { EnhancedLiveCallsGrid } from '@/components/enhanced-live-calls-grid';

   // In your page component:
   return (
     <div>
       <EnhancedLiveCallsGrid />
     </div>
   );
   ```

## How to Use the Socket.IO Integration

### Backend Integration

The Socket.IO server is automatically initialized when the server starts. Key events are emitted at these points:

1. When a call status changes (`call-status-callback`)
2. When a recording status changes (`recording-status-callback`)
3. When quality metrics are received (`quality-insights-callback`)
4. When answering machine detection results arrive (`amd-status-callback`)

### Frontend Integration

The `useSocket` hook provides access to:

```typescript
const { 
  socket,              // The Socket.IO instance
  isConnected,         // Boolean indicating connection status
  lastMessage,         // The last message received from the server
  activeCalls,         // Array of active calls
  subscribeToCall,     // Function to subscribe to a specific call
  unsubscribeFromCall, // Function to unsubscribe from a call
  refreshActiveCalls   // Function to refresh the active calls list
} = useSocket();
```

### Example: Subscribing to a Specific Call

```typescript
import { useSocket } from '@/lib/socket-context';
import { useEffect } from 'react';

function CallDetailPage({ callSid }) {
  const { subscribeToCall, unsubscribeFromCall, socket, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected) {
      // Subscribe to updates for this specific call
      subscribeToCall(callSid);
      
      // Clean up on unmount
      return () => {
        unsubscribeFromCall(callSid);
      };
    }
  }, [callSid, isConnected, subscribeToCall, unsubscribeFromCall]);

  // Rest of your component
}
```

### Example: Terminating a Call

```typescript
async function terminateCall(callSid) {
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
    
    // The socket will automatically update the UI when the call is terminated
  } catch (error) {
    console.error('Error terminating call:', error);
  }
}
```

## Socket Events

### Server to Client Events

1. `connect`: When the socket connection is established
2. `disconnect`: When the socket connection is closed
3. `active_calls`: Sent when the client subscribes to call updates
4. `call_update`: Sent when any call status changes
5. `call_data`: Sent when a specific call has an update

### Client to Server Events

1. `subscribe_to_calls`: Request to receive active calls updates
2. `subscribe_to_call`: Subscribe to a specific call's updates
3. `unsubscribe_from_call`: Unsubscribe from a specific call's updates

## Troubleshooting

1. **Connection Issues**:
   - Check that the server is running
   - Verify the Socket.IO URL in the frontend environment variables
   - Check browser console for connection errors

2. **No Updates**:
   - Ensure the USE_MOCK_SOCKET flag is set to `false` in `socket-context.tsx`
   - Check that the client has subscribed to call updates
   - Verify the socket is connected (check `isConnected` value)

3. **Error Messages**:
   - Look for detailed error logs in both server and browser console
   - Make sure all dependencies are installed

## Development vs. Production

During development, you can use the mock socket implementation by setting:
```typescript
const USE_MOCK_SOCKET = true;
```

This provides simulated call data for testing without needing real calls.

For production, make sure to set:
```typescript
const USE_MOCK_SOCKET = false;
```

## Next Steps

1. **Enhanced Analytics**: Implement real-time analytics dashboards using the socket data
2. **Call Transcription**: Add real-time transcription display using Socket.IO events
3. **Call Quality Visualization**: Create visualizations for call quality metrics
4. **Mobile Notifications**: Add push notifications for important call events

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [React Context API Documentation](https://reactjs.org/docs/context.html)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
