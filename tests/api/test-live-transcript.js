/**
 * Test script for live transcript functionality
 */
import io from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';
const TEST_CALL_SID = process.argv[2] || 'CAtest123456789';

console.log('🔴 Live Transcript Test');
console.log(`Server: ${SERVER_URL}`);
console.log(`Testing with Call SID: ${TEST_CALL_SID}`);
console.log('----------------------------\n');

// Connect to Socket.IO server
const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true
});

// Track connection status
socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  
  // Subscribe to transcript updates
  console.log('📡 Subscribing to transcript updates...');
  socket.emit('subscribe_to_transcripts');
  socket.emit('subscribe_to_call_transcript', TEST_CALL_SID);
  
  // Simulate a transcript message after 2 seconds
  setTimeout(() => {
    console.log('\n🎭 Simulating transcript messages...\n');
    simulateTranscripts();
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// Listen for transcript updates
socket.on('transcript_update', (data) => {
  if (data.callSid === TEST_CALL_SID) {
    if (data.type === 'typing_indicator') {
      console.log(`\n💭 ${data.data.speaker} is typing...`);
    } else if (data.type === 'message') {
      const isPartial = data.data.isPartial ? ' (partial)' : ' (complete)';
      console.log(`\n📝 [${data.data.speaker}]${isPartial}: ${data.data.text}`);
    }
  }
});

// Listen for old format (for debugging)
socket.on('transcript_message', (data) => {
  if (data.callSid === TEST_CALL_SID) {
    console.log('\n🔧 [DEBUG] Old format received:', JSON.stringify(data.message));
  }
});

// Simulate transcript messages
function simulateTranscripts() {
  // Import socket server functions (this would normally be done on the server side)
  console.log(`
⚠️  To test live transcripts:

1. Make a real call using: npm run test-call
2. Or manually emit test events from the server console:

   import { emitTranscriptTypewriter } from './socket-server.js';
   
   // Simulate customer speaking
   emitTranscriptTypewriter('${TEST_CALL_SID}', {
     role: 'user',
     message: 'Hello, I am interested in learning more about your product offerings.'
   }, 4);
   
   // Simulate agent response after 3 seconds
   setTimeout(() => {
     emitTranscriptTypewriter('${TEST_CALL_SID}', {
       role: 'assistant',
       message: 'Thank you for your interest! I would be happy to help you learn about our products.'
     }, 4);
   }, 3000);

3. Watch this terminal to see the typewriter effect in action!
`);
}

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing test...');
  socket.disconnect();
  process.exit(0);
});

// Error handling
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});