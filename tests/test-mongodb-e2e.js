/**
 * MongoDB End-to-End System Test
 * Performs a complete end-to-end test of the MongoDB integration
 */
import 'dotenv/config';
// Removed node-fetch import - using native fetch
import { io } from 'socket.io-client';
import { performance } from 'perf_hooks';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Test data
const testCallSid = `TEST_E2E_${Date.now()}`;
const testRecordingSid = `RE_${Date.now()}`;
const testConversationId = `CONV_${Date.now()}`;

// Socket.IO client
let socket;

// Performance metrics
const metrics = {
  apiResponses: [],
  queryTimes: [],
  errors: [],
  warnings: []
};

/**
 * Log API response
 * @param {string} endpoint - API endpoint
 * @param {Object} response - Response object
 * @param {Object} data - Response data
 * @param {number} time - Response time in ms
 */
function logApiResponse(endpoint, response, data, time) {
  metrics.apiResponses.push({
    endpoint,
    status: response.status,
    statusText: response.statusText,
    time: `${time.toFixed(2)}ms`,
    data: data
  });
  
  console.log(`API Response: ${endpoint}`);
  console.log(`  Status: ${response.status} ${response.statusText}`);
  console.log(`  Time: ${time.toFixed(2)}ms`);
  
  if (response.status >= 400) {
    console.error(`  Error: ${data.error || 'Unknown error'}`);
    console.error(`  Details: ${data.details || 'No details provided'}`);
    metrics.errors.push({
      endpoint,
      status: response.status,
      error: data.error || 'Unknown error',
      details: data.details || 'No details provided'
    });
  }
}

/**
 * Log query time
 * @param {string} query - Query description
 * @param {number} time - Query time in ms
 */
function logQueryTime(query, time) {
  metrics.queryTimes.push({
    query,
    time: `${time.toFixed(2)}ms`
  });
  
  console.log(`Query: ${query}`);
  console.log(`  Time: ${time.toFixed(2)}ms`);
}

/**
 * Set up Socket.IO client
 */
async function setupSocketClient() {
  return new Promise((resolve, reject) => {
    // Connect to Socket.IO server
    socket = io(serverUrl, {
      transports: ['websocket'],
      path: '/socket.io/'
    });
    
    // Connection event
    socket.on('connect', () => {
      console.log(`✅ Connected to Socket.IO server with ID: ${socket.id}`);
      
      // Subscribe to call updates
      socket.emit('subscribe_to_calls');
      console.log('✅ Subscribed to call updates');
      
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
      
      socket.on('active_calls', (data) => {
        console.log(`📢 Received active_calls event with ${data.length} calls`);
      });
      
      resolve();
    });
    
    // Connection error event
    socket.on('connect_error', (error) => {
      console.error(`❌ Socket.IO connection error: ${error.message}`);
      metrics.errors.push({
        type: 'socket.io',
        error: 'Connection error',
        details: error.message
      });
      reject(error);
    });
  });
}

/**
 * Make a test call
 */
async function makeTestCall() {
  console.log('\n1. Making a test call...');
  
  const startTime = performance.now();
  
  try {
    // Make the outbound call request
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '+1234567890',
        prompt: 'You are a helpful assistant making a test call.',
        first_message: 'Hello, this is a test call for MongoDB integration.',
        name: 'Test User',
        callSid: testCallSid,
        conversationId: testConversationId,
        region: 'au1',
        recording: true,
        mongodb: true
      })
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Parse response
    const data = await response.json();
    
    // Log API response
    logApiResponse('/outbound-call', response, data, responseTime);
    
    if (response.ok) {
      console.log('✅ Test call initiated successfully');
      console.log(`   Call SID: ${data.callSid || testCallSid}`);
      console.log(`   Conversation ID: ${data.conversationId || testConversationId}`);
      
      // Wait for Socket.IO events
      console.log('   Waiting for Socket.IO events...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } else {
      console.error('❌ Failed to initiate test call');
      return false;
    }
  } catch (error) {
    console.error('❌ Error making test call:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: '/outbound-call',
      error: error.message
    });
    return false;
  }
}

/**
 * Verify call in database
 */
async function verifyCallInDatabase() {
  console.log('\n2. Verifying call in database...');
  
  const startTime = performance.now();
  
  try {
    // Get call by SID
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`);
    const data = await response.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log API response
    logApiResponse(`/api/db/calls/${testCallSid}`, response, data, responseTime);
    
    if (response.ok && data.success) {
      console.log('✅ Call found in database');
      console.log(`   Call SID: ${data.data.callSid}`);
      console.log(`   Status: ${data.data.status}`);
      console.log(`   From: ${data.data.from}`);
      console.log(`   To: ${data.data.to}`);
      
      // Log query time
      logQueryTime('Get call by SID', responseTime);
      
      return true;
    } else {
      console.error('❌ Call not found in database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying call in database:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: `/api/db/calls/${testCallSid}`,
      error: error.message
    });
    return false;
  }
}

/**
 * Log test events
 */
async function logTestEvents() {
  console.log('\n3. Logging test events...');
  
  try {
    // Log status change event
    const statusChangeStartTime = performance.now();
    const statusChangeResponse = await fetch(`${serverUrl}/api/db/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        eventType: 'status_change',
        data: {
          status: 'in-progress',
          timestamp: new Date().toISOString()
        },
        source: 'test'
      })
    });
    const statusChangeData = await statusChangeResponse.json();
    const statusChangeEndTime = performance.now();
    const statusChangeTime = statusChangeEndTime - statusChangeStartTime;
    
    // Log API response
    logApiResponse('/api/db/events (status_change)', statusChangeResponse, statusChangeData, statusChangeTime);
    
    // Log machine detection event
    const machineStartTime = performance.now();
    const machineResponse = await fetch(`${serverUrl}/api/db/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        eventType: 'machine_detection',
        data: {
          result: 'human',
          confidence: 0.95,
          timestamp: new Date().toISOString()
        },
        source: 'test'
      })
    });
    const machineData = await machineResponse.json();
    const machineEndTime = performance.now();
    const machineTime = machineEndTime - machineStartTime;
    
    // Log API response
    logApiResponse('/api/db/events (machine_detection)', machineResponse, machineData, machineTime);
    
    // Log transcript event
    const transcriptStartTime = performance.now();
    const transcriptResponse = await fetch(`${serverUrl}/api/db/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        eventType: 'transcript',
        data: {
          message: 'Hello, this is a test message.',
          role: 'agent',
          timestamp: new Date().toISOString()
        },
        source: 'test'
      })
    });
    const transcriptData = await transcriptResponse.json();
    const transcriptEndTime = performance.now();
    const transcriptTime = transcriptEndTime - transcriptStartTime;
    
    // Log API response
    logApiResponse('/api/db/events (transcript)', transcriptResponse, transcriptData, transcriptTime);
    
    if (statusChangeResponse.ok && machineResponse.ok && transcriptResponse.ok) {
      console.log('✅ Test events logged successfully');
      return true;
    } else {
      console.error('❌ Failed to log test events');
      return false;
    }
  } catch (error) {
    console.error('❌ Error logging test events:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: '/api/db/events',
      error: error.message
    });
    return false;
  }
}

/**
 * Verify events for call
 */
async function verifyEventsForCall() {
  console.log('\n4. Verifying events for call...');
  
  const startTime = performance.now();
  
  try {
    // Get events for call
    const response = await fetch(`${serverUrl}/api/db/events/${testCallSid}`);
    const data = await response.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log API response
    logApiResponse(`/api/db/events/${testCallSid}`, response, data, responseTime);
    
    if (response.ok && data.success) {
      console.log('✅ Events found for call');
      console.log(`   Event count: ${data.data.events.length}`);
      
      // Log event types
      const eventTypes = data.data.events.map(event => event.eventType);
      console.log(`   Event types: ${eventTypes.join(', ')}`);
      
      // Log query time
      logQueryTime('Get events for call', responseTime);
      
      return true;
    } else {
      console.error('❌ Events not found for call');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying events for call:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: `/api/db/events/${testCallSid}`,
      error: error.message
    });
    return false;
  }
}

/**
 * Verify active calls
 */
async function verifyActiveCalls() {
  console.log('\n5. Verifying active calls...');
  
  const startTime = performance.now();
  
  try {
    // Get active calls
    const response = await fetch(`${serverUrl}/api/db/dashboard/realtime`);
    const data = await response.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log API response
    logApiResponse('/api/db/dashboard/realtime', response, data, responseTime);
    
    if (response.ok && data.success) {
      console.log('✅ Active calls retrieved');
      console.log(`   Active call count: ${data.data.activeCallCount}`);
      
      // Check if our test call is in the active calls list
      const testCallFound = data.data.activeCalls.some(call => call.callSid === testCallSid);
      console.log(`   Test call in active calls: ${testCallFound ? 'Yes' : 'No'}`);
      
      // Log query time
      logQueryTime('Get active calls', responseTime);
      
      return true;
    } else {
      console.error('❌ Failed to retrieve active calls');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying active calls:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: '/api/db/dashboard/realtime',
      error: error.message
    });
    return false;
  }
}

/**
 * Run analytics queries
 */
async function runAnalyticsQueries() {
  console.log('\n6. Running analytics queries...');
  
  try {
    // Get dashboard overview
    const overviewStartTime = performance.now();
    const overviewResponse = await fetch(`${serverUrl}/api/db/dashboard/overview`);
    const overviewData = await overviewResponse.json();
    const overviewEndTime = performance.now();
    const overviewTime = overviewEndTime - overviewStartTime;
    
    // Log API response
    logApiResponse('/api/db/dashboard/overview', overviewResponse, overviewData, overviewTime);
    
    // Get call duration stats
    const durationStartTime = performance.now();
    const durationResponse = await fetch(`${serverUrl}/api/db/analytics/duration/day`);
    const durationData = await durationResponse.json();
    const durationEndTime = performance.now();
    const durationTime = durationEndTime - durationStartTime;
    
    // Log API response
    logApiResponse('/api/db/analytics/duration/day', durationResponse, durationData, durationTime);
    
    // Get call outcome distribution
    const outcomeStartTime = performance.now();
    const outcomeResponse = await fetch(`${serverUrl}/api/db/analytics/outcomes`);
    const outcomeData = await outcomeResponse.json();
    const outcomeEndTime = performance.now();
    const outcomeTime = outcomeEndTime - outcomeStartTime;
    
    // Log API response
    logApiResponse('/api/db/analytics/outcomes', outcomeResponse, outcomeData, outcomeTime);
    
    if (overviewResponse.ok && durationResponse.ok && outcomeResponse.ok) {
      console.log('✅ Analytics queries executed successfully');
      
      // Log query times
      logQueryTime('Dashboard overview', overviewTime);
      logQueryTime('Call duration stats', durationTime);
      logQueryTime('Call outcome distribution', outcomeTime);
      
      return true;
    } else {
      console.error('❌ Failed to execute analytics queries');
      return false;
    }
  } catch (error) {
    console.error('❌ Error running analytics queries:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: 'analytics',
      error: error.message
    });
    return false;
  }
}

/**
 * Delete test call
 */
async function deleteTestCall() {
  console.log('\n7. Deleting test call...');
  
  const startTime = performance.now();
  
  try {
    // Delete call
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log API response
    logApiResponse(`DELETE /api/db/calls/${testCallSid}`, response, data, responseTime);
    
    if (response.ok && data.success) {
      console.log('✅ Test call deleted successfully');
      
      // Log query time
      logQueryTime('Delete call', responseTime);
      
      // Verify call is deleted
      console.log('   Verifying call is deleted...');
      const verifyResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`);
      const verifyData = await verifyResponse.json();
      
      if (verifyResponse.status === 404 || !verifyData.data) {
        console.log('✅ Call deletion verified');
        return true;
      } else {
        console.error('❌ Call still exists after deletion');
        return false;
      }
    } else {
      console.error('❌ Failed to delete test call');
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting test call:', error.message);
    metrics.errors.push({
      type: 'api',
      endpoint: `/api/db/calls/${testCallSid}`,
      error: error.message
    });
    return false;
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('\n8. Generating performance report...');
  
  console.log('\nAPI Response Times:');
  metrics.apiResponses.forEach(response => {
    console.log(`  ${response.endpoint}: ${response.status} (${response.time})`);
  });
  
  console.log('\nQuery Times:');
  metrics.queryTimes.forEach(query => {
    console.log(`  ${query.query}: ${query.time}`);
  });
  
  console.log('\nErrors:');
  if (metrics.errors.length === 0) {
    console.log('  No errors detected');
  } else {
    metrics.errors.forEach(error => {
      console.log(`  ${error.type} - ${error.endpoint || ''}: ${error.error}`);
      if (error.details) {
        console.log(`    Details: ${error.details}`);
      }
    });
  }
  
  console.log('\nWarnings:');
  if (metrics.warnings.length === 0) {
    console.log('  No warnings detected');
  } else {
    metrics.warnings.forEach(warning => {
      console.log(`  ${warning.type}: ${warning.message}`);
    });
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB End-to-End System Test');
  console.log('=============================');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Call SID: ${testCallSid}`);
  console.log(`Test Recording SID: ${testRecordingSid}`);
  console.log(`Test Conversation ID: ${testConversationId}`);
  
  try {
    // Set up Socket.IO client
    await setupSocketClient();
    
    // Make a test call
    const callCreated = await makeTestCall();
    
    if (callCreated) {
      // Verify call in database
      await verifyCallInDatabase();
      
      // Log test events
      await logTestEvents();
      
      // Verify events for call
      await verifyEventsForCall();
      
      // Verify active calls
      await verifyActiveCalls();
      
      // Run analytics queries
      await runAnalyticsQueries();
      
      // Delete test call
      await deleteTestCall();
    }
    
    // Generate performance report
    generatePerformanceReport();
    
    console.log('\nEnd-to-End System Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    metrics.errors.push({
      type: 'test',
      error: error.message
    });
  } finally {
    // Disconnect Socket.IO client if connected
    if (socket && socket.connected) {
      socket.disconnect();
      console.log('\nSocket.IO client disconnected');
    }
  }
}

// Run the main function
main();