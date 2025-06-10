/**
 * MongoDB Phase 2 Test Script
 * Tests the Socket.IO integration for real-time updates
 */
import { 
  connectToDatabase, 
  getCallRepository, 
  getRecordingRepository, 
  getTranscriptRepository
} from './db/index.js';
import { io } from 'socket.io-client';

// Test data
const testCallSid = `TEST_${Date.now()}`;
const testRecordingSid = `RE_${Date.now()}`;
const testConversationId = `CONV_${Date.now()}`;

// Socket.IO client
let socket;

/**
 * Set up Socket.IO client
 */
function setupSocketClient() {
  return new Promise((resolve, reject) => {
    // Connect to Socket.IO server
    socket = io('http://localhost:8000', {
      transports: ['websocket'],
      path: '/socket.io/'
    });
    
    // Connection event
    socket.on('connect', () => {
      console.log(`✅ Connected to Socket.IO server with ID: ${socket.id}`);
      resolve();
    });
    
    // Connection error event
    socket.on('connect_error', (error) => {
      console.error(`❌ Socket.IO connection error: ${error.message}`);
      reject(error);
    });
    
    // Set up event listeners
    socket.on('call_update', (data) => {
      console.log(`📢 Received call_update event:`, data);
    });
    
    socket.on('status_update', (data) => {
      console.log(`📢 Received status_update event:`, data);
    });
    
    socket.on('recording_update', (data) => {
      console.log(`📢 Received recording_update event:`, data);
    });
    
    socket.on('transcript_update', (data) => {
      console.log(`📢 Received transcript_update event:`, data);
    });
    
    socket.on('transcript_message', (data) => {
      console.log(`📢 Received transcript_message event:`, data);
    });
    
    socket.on('active_calls', (data) => {
      console.log(`📢 Received active_calls event with ${data.length} calls`);
    });
  });
}

/**
 * Run the tests
 */
async function runTests() {
  try {
    console.log('MongoDB Phase 2 Test Script (Socket.IO Integration)');
    console.log('=================================================');
    
    // Connect to MongoDB
    console.log('\n1. Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Set up Socket.IO client
    console.log('\n2. Setting up Socket.IO client...');
    await setupSocketClient();
    
    // Subscribe to events
    console.log('\n3. Subscribing to events...');
    socket.emit('subscribe_to_calls');
    console.log('✅ Subscribed to call updates');
    
    // Get repositories
    const callRepository = getCallRepository();
    const recordingRepository = getRecordingRepository();
    const transcriptRepository = getTranscriptRepository();
    
    // Test call creation and updates
    console.log('\n4. Testing call creation and updates...');
    console.log('   (Watch for Socket.IO events in the console)');
    
    // Create a call
    const callData = {
      callSid: testCallSid,
      conversationId: testConversationId,
      status: 'initiated',
      from: '+1234567890',
      to: '+0987654321',
      direction: 'outbound-api',
      createdAt: new Date()
    };
    
    const savedCall = await callRepository.saveCall(callData);
    console.log(`✅ Created call: ${savedCall.callSid}`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Subscribe to specific call
    socket.emit('subscribe_to_call', testCallSid);
    console.log(`✅ Subscribed to call: ${testCallSid}`);
    
    // Update call status
    await callRepository.updateCallStatus(testCallSid, 'ringing', {
      startTime: new Date()
    });
    console.log(`✅ Updated call status to ringing`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update call status again
    await callRepository.updateCallStatus(testCallSid, 'in-progress', {
      answeredBy: 'human'
    });
    console.log(`✅ Updated call status to in-progress`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test recording creation
    console.log('\n5. Testing recording creation...');
    const recordingData = {
      recordingSid: testRecordingSid,
      callSid: testCallSid,
      status: 'in-progress',
      duration: 0,
      url: `https://api.twilio.com/recordings/${testRecordingSid}`
    };
    
    const savedRecording = await recordingRepository.saveRecording(recordingData);
    console.log(`✅ Created recording: ${savedRecording.recordingSid}`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update recording
    await recordingRepository.updateRecording(testRecordingSid, {
      status: 'completed',
      duration: 60
    });
    console.log(`✅ Updated recording status to completed`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Subscribe to transcript updates
    socket.emit('subscribe_to_transcripts');
    console.log('✅ Subscribed to transcript updates');
    
    socket.emit('subscribe_to_call_transcript', testCallSid);
    console.log(`✅ Subscribed to transcript for call: ${testCallSid}`);
    
    // Test transcript creation
    console.log('\n6. Testing transcript creation...');
    const transcriptData = {
      callSid: testCallSid,
      conversationId: testConversationId,
      summary: 'Test conversation summary',
      transcript: [
        {
          role: 'agent',
          message: 'Hello, how can I help you today?',
          timestamp: new Date()
        },
        {
          role: 'user',
          message: 'I have a question about your service.',
          timestamp: new Date(Date.now() + 5000)
        },
        {
          role: 'agent',
          message: 'I would be happy to help with that.',
          timestamp: new Date(Date.now() + 10000)
        }
      ]
    };
    
    const savedTranscript = await transcriptRepository.saveTranscript(transcriptData);
    console.log(`✅ Created transcript for call: ${savedTranscript.callSid}`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Complete the call
    await callRepository.updateCallStatus(testCallSid, 'completed', {
      endTime: new Date(),
      duration: 120,
      outcome: 'held'
    });
    console.log(`✅ Updated call status to completed`);
    
    // Wait for Socket.IO events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n7. Cleaning up...');
    
    // Disconnect Socket.IO client
    socket.disconnect();
    console.log('✅ Disconnected from Socket.IO server');
    
    // Clean up test data (optional - comment out to keep test data in the database)
    /*
    await callRepository.deleteCall(testCallSid);
    console.log(`✅ Deleted test call`);
    
    await recordingRepository.deleteRecording(testRecordingSid);
    console.log(`✅ Deleted test recording`);
    */
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Disconnect Socket.IO client if connected
    if (socket && socket.connected) {
      socket.disconnect();
    }
    
    // Exit the process
    process.exit(0);
  }
}

// Run the tests
runTests();