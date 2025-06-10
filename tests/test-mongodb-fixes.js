/**
 * Test MongoDB Fixes
 * Tests the fixes for the MongoDB integration issues
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { io } from 'socket.io-client';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

/**
 * Test the dashboard overview endpoint
 */
async function testDashboardOverview() {
  console.log('\n1. Testing dashboard overview endpoint...');
  try {
    const response = await fetch(`${serverUrl}/api/db/dashboard/overview`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Dashboard overview endpoint is working');
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${data.success}`);
      if (data.data) {
        console.log(`   Summary: ${data.data.summary ? 'Present' : 'Missing'}`);
        console.log(`   Recent Calls: ${data.data.recentCalls ? `${data.data.recentCalls.length} calls` : 'Missing'}`);
        console.log(`   Sentiment: ${data.data.sentiment ? `${data.data.sentiment.length} items` : 'Missing'}`);
      }
    } else {
      console.log('❌ Dashboard overview endpoint failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      console.log(`   Details: ${data.details || 'No details provided'}`);
    }
  } catch (error) {
    console.log('❌ Dashboard overview endpoint failed');
    console.log(`   Error: ${error.message}`);
  }
}

/**
 * Test Socket.IO connection
 */
async function testSocketIO() {
  console.log('\n2. Testing Socket.IO connection...');
  
  return new Promise((resolve) => {
    // Connect to Socket.IO server
    const socket = io(serverUrl, {
      transports: ['websocket'],
      path: '/socket.io/',
      reconnectionAttempts: 3,
      timeout: 5000
    });
    
    // Set a timeout for the connection attempt
    const timeout = setTimeout(() => {
      console.log('❌ Socket.IO connection timed out');
      socket.disconnect();
      resolve(false);
    }, 5000);
    
    // Connection event
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Socket.IO connection successful');
      console.log(`   Socket ID: ${socket.id}`);
      
      // Subscribe to call updates
      socket.emit('subscribe_to_calls');
      console.log('   Subscribed to call updates');
      
      // Listen for active calls
      socket.on('active_calls', (data) => {
        console.log(`   Received active_calls event with ${data.length} calls`);
      });
      
      // Disconnect after a short delay
      setTimeout(() => {
        socket.disconnect();
        console.log('   Socket.IO disconnected');
        resolve(true);
      }, 2000);
    });
    
    // Connection error event
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Socket.IO connection error');
      console.log(`   Error: ${error.message}`);
      socket.disconnect();
      resolve(false);
    });
  });
}

/**
 * Test call deletion
 */
async function testCallDeletion() {
  console.log('\n3. Testing call deletion...');
  
  // Create a test call
  const testCallSid = `TEST_${Date.now()}`;
  
  try {
    // Create a test call
    const createResponse = await fetch(`${serverUrl}/api/db/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        status: 'completed',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'outbound-api'
      })
    });
    
    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create test call');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Error: ${createData.error || 'Unknown error'}`);
      return;
    }
    
    console.log('✅ Created test call');
    console.log(`   Call SID: ${testCallSid}`);
    
    // Delete the test call
    const deleteResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`, {
      method: 'DELETE'
    });
    
    const deleteData = await deleteResponse.json();
    
    if (deleteResponse.ok && deleteData.success) {
      console.log('✅ Deleted test call');
    } else {
      console.log('❌ Failed to delete test call');
      console.log(`   Status: ${deleteResponse.status}`);
      console.log(`   Error: ${deleteData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('❌ Error testing call deletion');
    console.log(`   Error: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Fixes Test Script');
  console.log('========================');
  console.log(`Server URL: ${serverUrl}`);
  
  // Test dashboard overview endpoint
  await testDashboardOverview();
  
  // Test Socket.IO connection
  await testSocketIO();
  
  // Test call deletion
  await testCallDeletion();
  
  console.log('\nTests completed!');
}

// Run the main function
main();