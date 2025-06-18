import { io } from 'socket.io-client';
import 'dotenv/config';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log(`Connecting to Socket.IO server at: ${SOCKET_URL}`);

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('Socket ID:', socket.id);
  
  // Subscribe to call updates
  console.log('📡 Subscribing to call updates...');
  socket.emit('subscribe_to_calls');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔥 Connection error:', error.message);
});

// Listen for active calls list
socket.on('active_calls', (data) => {
  console.log('\n📞 Active calls update received:');
  console.log(`Total active calls: ${data ? data.length : 0}`);
  if (data && data.length > 0) {
    data.forEach((call, index) => {
      console.log(`  ${index + 1}. Call ${call.sid} - Status: ${call.status}, To: ${call.to}`);
    });
  }
});

// Listen for call updates
socket.on('call_update', (data) => {
  console.log('\n🔔 Call update received:');
  console.log(`  Type: ${data.type}`);
  console.log(`  Call SID: ${data.callSid}`);
  console.log(`  Status: ${data.data?.status || 'N/A'}`);
  console.log(`  Timestamp: ${data.timestamp}`);
});

// Listen for new calls
socket.on('new_call', (data) => {
  console.log('\n🆕 New call event:');
  console.log(`  Call SID: ${data.callSid || data.sid}`);
  console.log(`  To: ${data.to}`);
  console.log(`  Status: ${data.status}`);
});

// Keep the script running
console.log('\n👂 Listening for Socket.IO events... (Press Ctrl+C to exit)\n');

// Prevent the script from exiting
process.stdin.resume();