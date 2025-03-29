/**
 * MongoDB Socket.IO Stress Test
 * Tests the Socket.IO implementation under load
 */
import 'dotenv/config';
import { io } from 'socket.io-client';
import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import os from 'os';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Number of clients to create
const NUM_CLIENTS = 10;

// Test data
const testCallSid = `TEST_SOCKET_${Date.now()}`;

// Socket.IO clients
const clients = [];

// Performance metrics
const metrics = {
  connectionTimes: [],
  eventPropagationTimes: {},
  reconnectionTimes: [],
  errors: [],
  memoryUsage: []
};

/**
 * Log memory usage
 * @param {string} label - Label for the memory usage snapshot
 */
function logMemoryUsage(label) {
  const memUsage = process.memoryUsage();
  const memorySnapshot = {
    label,
    timestamp: new Date().toISOString(),
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
    systemFree: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
    systemTotal: `${Math.round(os.totalmem() / 1024 / 1024)} MB`
  };
  
  metrics.memoryUsage.push(memorySnapshot);
  
  console.log(`Memory Usage (${label}):`);
  console.log(`  RSS: ${memorySnapshot.rss}`);
  console.log(`  Heap Total: ${memorySnapshot.heapTotal}`);
  console.log(`  Heap Used: ${memorySnapshot.heapUsed}`);
  console.log(`  External: ${memorySnapshot.external}`);
  console.log(`  System Free: ${memorySnapshot.systemFree}`);
  console.log(`  System Total: ${memorySnapshot.systemTotal}`);
}

/**
 * Create a Socket.IO client
 * @param {number} index - Client index
 * @returns {Promise<Object>} Socket.IO client
 */
function createSocketClient(index) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    console.log(`Creating Socket.IO client ${index + 1}...`);
    
    // Create Socket.IO client
    const socket = io(serverUrl, {
      transports: ['websocket'],
      path: '/socket.io/',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000
    });
    
    // Connection event
    socket.on('connect', () => {
      const endTime = performance.now();
      const connectionTime = endTime - startTime;
      
      console.log(`✅ Client ${index + 1} connected with ID: ${socket.id}`);
      console.log(`   Connection time: ${connectionTime.toFixed(2)}ms`);
      
      metrics.connectionTimes.push({
        clientIndex: index,
        socketId: socket.id,
        time: connectionTime
      });
      
      // Subscribe to call updates
      socket.emit('subscribe_to_calls');
      console.log(`   Client ${index + 1} subscribed to call updates`);
      
      // Subscribe to transcript updates
      socket.emit('subscribe_to_transcripts');
      console.log(`   Client ${index + 1} subscribed to transcript updates`);
      
      // Set up event listeners
      socket.on('call_update', (data) => {
        console.log(`📢 Client ${index + 1} received call_update event:`, data);
        
        // Record event propagation time if this is for our test call
        if (data.callSid === testCallSid) {
          const now = performance.now();
          if (metrics.eventPropagationTimes.callUpdateSent) {
            const propagationTime = now - metrics.eventPropagationTimes.callUpdateSent;
            console.log(`   Event propagation time: ${propagationTime.toFixed(2)}ms`);
            
            if (!metrics.eventPropagationTimes.callUpdate) {
              metrics.eventPropagationTimes.callUpdate = [];
            }
            
            metrics.eventPropagationTimes.callUpdate.push({
              clientIndex: index,
              socketId: socket.id,
              time: propagationTime
            });
          }
        }
      });
      
      socket.on('status_update', (data) => {
        console.log(`📢 Client ${index + 1} received status_update event:`, data);
        
        // Record event propagation time if this is for our test call
        if (data.callSid === testCallSid) {
          const now = performance.now();
          if (metrics.eventPropagationTimes.statusUpdateSent) {
            const propagationTime = now - metrics.eventPropagationTimes.statusUpdateSent;
            console.log(`   Event propagation time: ${propagationTime.toFixed(2)}ms`);
            
            if (!metrics.eventPropagationTimes.statusUpdate) {
              metrics.eventPropagationTimes.statusUpdate = [];
            }
            
            metrics.eventPropagationTimes.statusUpdate.push({
              clientIndex: index,
              socketId: socket.id,
              time: propagationTime
            });
          }
        }
      });
      
      socket.on('transcript_update', (data) => {
        console.log(`📢 Client ${index + 1} received transcript_update event:`, data);
        
        // Record event propagation time if this is for our test call
        if (data.callSid === testCallSid) {
          const now = performance.now();
          if (metrics.eventPropagationTimes.transcriptUpdateSent) {
            const propagationTime = now - metrics.eventPropagationTimes.transcriptUpdateSent;
            console.log(`   Event propagation time: ${propagationTime.toFixed(2)}ms`);
            
            if (!metrics.eventPropagationTimes.transcriptUpdate) {
              metrics.eventPropagationTimes.transcriptUpdate = [];
            }
            
            metrics.eventPropagationTimes.transcriptUpdate.push({
              clientIndex: index,
              socketId: socket.id,
              time: propagationTime
            });
          }
        }
      });
      
      socket.on('active_calls', (data) => {
        console.log(`📢 Client ${index + 1} received active_calls event with ${data.length} calls`);
      });
      
      // Reconnection events
      socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`⚠️ Client ${index + 1} reconnection attempt ${attempt}`);
      });
      
      socket.io.on('reconnect', (attempt) => {
        const reconnectTime = performance.now() - socket.io._reconnectionStartTime;
        console.log(`✅ Client ${index + 1} reconnected after ${attempt} attempts`);
        console.log(`   Reconnection time: ${reconnectTime.toFixed(2)}ms`);
        
        metrics.reconnectionTimes.push({
          clientIndex: index,
          socketId: socket.id,
          attempts: attempt,
          time: reconnectTime
        });
      });
      
      socket.io.on('reconnect_error', (error) => {
        console.error(`❌ Client ${index + 1} reconnection error:`, error.message);
        
        metrics.errors.push({
          clientIndex: index,
          socketId: socket.id,
          type: 'reconnect_error',
          error: error.message
        });
      });
      
      socket.io.on('reconnect_failed', () => {
        console.error(`❌ Client ${index + 1} failed to reconnect after all attempts`);
        
        metrics.errors.push({
          clientIndex: index,
          socketId: socket.id,
          type: 'reconnect_failed',
          error: 'Failed to reconnect after all attempts'
        });
      });
      
      // Error event
      socket.on('error', (error) => {
        console.error(`❌ Client ${index + 1} error:`, error.message);
        
        metrics.errors.push({
          clientIndex: index,
          socketId: socket.id,
          type: 'socket_error',
          error: error.message
        });
      });
      
      // Disconnect event
      socket.on('disconnect', (reason) => {
        console.log(`⚠️ Client ${index + 1} disconnected: ${reason}`);
        
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          console.log(`   Attempting to reconnect...`);
          socket.io._reconnectionStartTime = performance.now();
          socket.connect();
        }
      });
      
      resolve(socket);
    });
    
    // Connection error event
    socket.on('connect_error', (error) => {
      console.error(`❌ Client ${index + 1} connection error:`, error.message);
      
      metrics.errors.push({
        clientIndex: index,
        type: 'connect_error',
        error: error.message
      });
      
      reject(error);
    });
  });
}

/**
 * Create a test call
 */
async function createTestCall() {
  console.log('\nCreating test call...');
  
  try {
    // Make the outbound call request
    const response = await fetch(`${serverUrl}/api/db/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        status: 'initiated',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'outbound-api',
        createdAt: new Date()
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Test call created successfully');
      console.log(`   Call SID: ${testCallSid}`);
      return true;
    } else {
      console.error('❌ Failed to create test call');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating test call:', error.message);
    return false;
  }
}

/**
 * Trigger call update event
 */
async function triggerCallUpdateEvent() {
  console.log('\nTriggering call update event...');
  
  try {
    // Record event send time
    metrics.eventPropagationTimes.callUpdateSent = performance.now();
    
    // Update call status
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'in-progress',
        startTime: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Call update triggered successfully');
      return true;
    } else {
      console.error('❌ Failed to trigger call update');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error triggering call update:', error.message);
    return false;
  }
}

/**
 * Trigger transcript update event
 */
async function triggerTranscriptUpdateEvent() {
  console.log('\nTriggering transcript update event...');
  
  try {
    // Record event send time
    metrics.eventPropagationTimes.transcriptUpdateSent = performance.now();
    
    // Create transcript
    const response = await fetch(`${serverUrl}/api/db/transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        messages: [
          {
            role: 'agent',
            message: 'Hello, this is a test message.',
            timestamp: new Date().toISOString()
          }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Transcript update triggered successfully');
      return true;
    } else {
      console.error('❌ Failed to trigger transcript update');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error triggering transcript update:', error.message);
    return false;
  }
}

/**
 * Test forced disconnection and reconnection
 */
async function testForcedDisconnection() {
  console.log('\nTesting forced disconnection and reconnection...');
  
  // Select a random client to disconnect
  const clientIndex = Math.floor(Math.random() * clients.length);
  const socket = clients[clientIndex];
  
  console.log(`Disconnecting client ${clientIndex + 1}...`);
  
  // Store reconnection start time
  socket.io._reconnectionStartTime = performance.now();
  
  // Force disconnect
  socket.disconnect();
  
  // Wait for reconnection
  console.log('Waiting for reconnection...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if reconnected
  if (socket.connected) {
    console.log('✅ Client reconnected successfully');
    return true;
  } else {
    console.error('❌ Client failed to reconnect');
    return false;
  }
}

/**
 * Delete test call
 */
async function deleteTestCall() {
  console.log('\nDeleting test call...');
  
  try {
    // Delete call
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Test call deleted successfully');
      return true;
    } else {
      console.error('❌ Failed to delete test call');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting test call:', error.message);
    return false;
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('\nGenerating performance report...');
  
  // Calculate average connection time
  const avgConnectionTime = metrics.connectionTimes.reduce((sum, item) => sum + item.time, 0) / metrics.connectionTimes.length;
  
  console.log('\nConnection Times:');
  console.log(`  Average: ${avgConnectionTime.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...metrics.connectionTimes.map(item => item.time)).toFixed(2)}ms`);
  console.log(`  Max: ${Math.max(...metrics.connectionTimes.map(item => item.time)).toFixed(2)}ms`);
  
  // Calculate event propagation times
  console.log('\nEvent Propagation Times:');
  
  if (metrics.eventPropagationTimes.callUpdate) {
    const avgCallUpdateTime = metrics.eventPropagationTimes.callUpdate.reduce((sum, item) => sum + item.time, 0) / metrics.eventPropagationTimes.callUpdate.length;
    console.log(`  Call Update:`);
    console.log(`    Average: ${avgCallUpdateTime.toFixed(2)}ms`);
    console.log(`    Min: ${Math.min(...metrics.eventPropagationTimes.callUpdate.map(item => item.time)).toFixed(2)}ms`);
    console.log(`    Max: ${Math.max(...metrics.eventPropagationTimes.callUpdate.map(item => item.time)).toFixed(2)}ms`);
  }
  
  if (metrics.eventPropagationTimes.statusUpdate) {
    const avgStatusUpdateTime = metrics.eventPropagationTimes.statusUpdate.reduce((sum, item) => sum + item.time, 0) / metrics.eventPropagationTimes.statusUpdate.length;
    console.log(`  Status Update:`);
    console.log(`    Average: ${avgStatusUpdateTime.toFixed(2)}ms`);
    console.log(`    Min: ${Math.min(...metrics.eventPropagationTimes.statusUpdate.map(item => item.time)).toFixed(2)}ms`);
    console.log(`    Max: ${Math.max(...metrics.eventPropagationTimes.statusUpdate.map(item => item.time)).toFixed(2)}ms`);
  }
  
  if (metrics.eventPropagationTimes.transcriptUpdate) {
    const avgTranscriptUpdateTime = metrics.eventPropagationTimes.transcriptUpdate.reduce((sum, item) => sum + item.time, 0) / metrics.eventPropagationTimes.transcriptUpdate.length;
    console.log(`  Transcript Update:`);
    console.log(`    Average: ${avgTranscriptUpdateTime.toFixed(2)}ms`);
    console.log(`    Min: ${Math.min(...metrics.eventPropagationTimes.transcriptUpdate.map(item => item.time)).toFixed(2)}ms`);
    console.log(`    Max: ${Math.max(...metrics.eventPropagationTimes.transcriptUpdate.map(item => item.time)).toFixed(2)}ms`);
  }
  
  // Calculate reconnection times
  if (metrics.reconnectionTimes.length > 0) {
    const avgReconnectionTime = metrics.reconnectionTimes.reduce((sum, item) => sum + item.time, 0) / metrics.reconnectionTimes.length;
    
    console.log('\nReconnection Times:');
    console.log(`  Average: ${avgReconnectionTime.toFixed(2)}ms`);
    console.log(`  Min: ${Math.min(...metrics.reconnectionTimes.map(item => item.time)).toFixed(2)}ms`);
    console.log(`  Max: ${Math.max(...metrics.reconnectionTimes.map(item => item.time)).toFixed(2)}ms`);
  }
  
  // Log errors
  console.log('\nErrors:');
  if (metrics.errors.length === 0) {
    console.log('  No errors detected');
  } else {
    metrics.errors.forEach(error => {
      console.log(`  Client ${error.clientIndex + 1} - ${error.type}: ${error.error}`);
    });
  }
  
  // Log memory usage
  console.log('\nMemory Usage Summary:');
  if (metrics.memoryUsage.length > 0) {
    const initialMemory = metrics.memoryUsage[0];
    const finalMemory = metrics.memoryUsage[metrics.memoryUsage.length - 1];
    
    console.log(`  Initial RSS: ${initialMemory.rss}`);
    console.log(`  Final RSS: ${finalMemory.rss}`);
    console.log(`  Initial Heap Used: ${initialMemory.heapUsed}`);
    console.log(`  Final Heap Used: ${finalMemory.heapUsed}`);
    
    // Calculate memory growth
    const initialHeapUsed = parseInt(initialMemory.heapUsed);
    const finalHeapUsed = parseInt(finalMemory.heapUsed);
    const heapGrowth = finalHeapUsed - initialHeapUsed;
    
    console.log(`  Heap Growth: ${heapGrowth > 0 ? '+' : ''}${heapGrowth} MB`);
    
    if (heapGrowth > 5) {
      console.log('  ⚠️ Significant memory growth detected. Possible memory leak.');
    } else {
      console.log('  ✅ Memory usage stable. No apparent memory leaks.');
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Socket.IO Stress Test');
  console.log('============================');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Number of clients: ${NUM_CLIENTS}`);
  console.log(`Test Call SID: ${testCallSid}`);
  
  try {
    // Log initial memory usage
    logMemoryUsage('Initial');
    
    // Create test call
    await createTestCall();
    
    // Create Socket.IO clients
    console.log('\nCreating Socket.IO clients...');
    for (let i = 0; i < NUM_CLIENTS; i++) {
      try {
        const socket = await createSocketClient(i);
        clients.push(socket);
      } catch (error) {
        console.error(`Failed to create client ${i + 1}:`, error.message);
      }
    }
    
    console.log(`\n✅ Created ${clients.length} Socket.IO clients`);
    
    // Log memory usage after client creation
    logMemoryUsage('After Client Creation');
    
    // Wait for all clients to be ready
    console.log('\nWaiting for all clients to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger call update event
    await triggerCallUpdateEvent();
    
    // Wait for event propagation
    console.log('\nWaiting for event propagation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger transcript update event
    await triggerTranscriptUpdateEvent();
    
    // Wait for event propagation
    console.log('\nWaiting for event propagation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Log memory usage after events
    logMemoryUsage('After Events');
    
    // Test forced disconnection and reconnection
    await testForcedDisconnection();
    
    // Wait for reconnection to complete
    console.log('\nWaiting for reconnection to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Log memory usage after reconnection
    logMemoryUsage('After Reconnection');
    
    // Delete test call
    await deleteTestCall();
    
    // Generate performance report
    generatePerformanceReport();
    
    console.log('\nSocket.IO Stress Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Log final memory usage
    logMemoryUsage('Final');
    
    // Disconnect all Socket.IO clients
    console.log('\nDisconnecting all Socket.IO clients...');
    for (const socket of clients) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    
    console.log('All Socket.IO clients disconnected');
  }
}

// Run the main function
main();