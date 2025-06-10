/**
 * MongoDB Deletion Cascade Test
 * Tests the call deletion method and verifies that all associated data is properly deleted
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import mongoose from 'mongoose';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// MongoDB URI
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-outbound-calling';

// Test data
const testCallSid = `TEST_DELETE_${Date.now()}`;
const testRecordingSid = `RE_${testCallSid}`;
const testConversationId = `CONV_${testCallSid}`;

// Performance metrics
const metrics = {
  creationTimes: {},
  deletionTimes: {},
  orphanedData: {},
  errors: []
};

/**
 * Connect to MongoDB directly
 */
async function connectToMongoDB() {
  console.log('\nConnecting to MongoDB directly...');
  
  try {
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    metrics.errors.push({
      operation: 'connectToMongoDB',
      error: error.message
    });
    return false;
  }
}

/**
 * Create test call with associated data
 */
async function createTestCallWithAssociatedData() {
  console.log('\n1. Creating test call with associated data...');
  
  try {
    // Create call
    console.log('Creating test call...');
    const callStartTime = performance.now();
    
    const callResponse = await fetch(`${serverUrl}/api/db/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        conversationId: testConversationId,
        status: 'completed',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'outbound-api',
        duration: 120,
        createdAt: new Date()
      })
    });
    
    const callData = await callResponse.json();
    const callEndTime = performance.now();
    metrics.creationTimes.call = callEndTime - callStartTime;
    
    if (!callResponse.ok || !callData.success) {
      console.error('❌ Failed to create test call');
      console.error(`   Error: ${callData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createCall',
        error: callData.error || 'Unknown error'
      });
      return false;
    }
    
    console.log('✅ Created test call');
    console.log(`   Call SID: ${testCallSid}`);
    console.log(`   Creation time: ${metrics.creationTimes.call.toFixed(2)}ms`);
    
    // Create recording
    console.log('\nCreating test recording...');
    const recordingStartTime = performance.now();
    
    const recordingResponse = await fetch(`${serverUrl}/api/db/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recordingSid: testRecordingSid,
        callSid: testCallSid,
        status: 'completed',
        duration: 120,
        url: `https://api.twilio.com/recordings/${testRecordingSid}`,
        createdAt: new Date()
      })
    });
    
    const recordingData = await recordingResponse.json();
    const recordingEndTime = performance.now();
    metrics.creationTimes.recording = recordingEndTime - recordingStartTime;
    
    if (!recordingResponse.ok || !recordingData.success) {
      console.error('❌ Failed to create test recording');
      console.error(`   Error: ${recordingData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createRecording',
        error: recordingData.error || 'Unknown error'
      });
      return false;
    }
    
    console.log('✅ Created test recording');
    console.log(`   Recording SID: ${testRecordingSid}`);
    console.log(`   Creation time: ${metrics.creationTimes.recording.toFixed(2)}ms`);
    
    // Create transcript
    console.log('\nCreating test transcript...');
    const transcriptStartTime = performance.now();
    
    const transcriptResponse = await fetch(`${serverUrl}/api/db/transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        conversationId: testConversationId,
        summary: 'Test conversation summary',
        messages: [
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
      })
    });
    
    const transcriptData = await transcriptResponse.json();
    const transcriptEndTime = performance.now();
    metrics.creationTimes.transcript = transcriptEndTime - transcriptStartTime;
    
    if (!transcriptResponse.ok || !transcriptData.success) {
      console.error('❌ Failed to create test transcript');
      console.error(`   Error: ${transcriptData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createTranscript',
        error: transcriptData.error || 'Unknown error'
      });
      return false;
    }
    
    console.log('✅ Created test transcript');
    console.log(`   Creation time: ${metrics.creationTimes.transcript.toFixed(2)}ms`);
    
    // Create call events
    console.log('\nCreating test call events...');
    const eventsStartTime = performance.now();
    
    // Create status change event
    const statusEventResponse = await fetch(`${serverUrl}/api/db/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        eventType: 'status_change',
        data: {
          status: 'completed',
          timestamp: new Date().toISOString()
        },
        source: 'test'
      })
    });
    
    const statusEventData = await statusEventResponse.json();
    
    if (!statusEventResponse.ok || !statusEventData.success) {
      console.error('❌ Failed to create status change event');
      console.error(`   Error: ${statusEventData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createStatusEvent',
        error: statusEventData.error || 'Unknown error'
      });
    }
    
    // Create machine detection event
    const machineEventResponse = await fetch(`${serverUrl}/api/db/events`, {
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
    
    const machineEventData = await machineEventResponse.json();
    
    if (!machineEventResponse.ok || !machineEventData.success) {
      console.error('❌ Failed to create machine detection event');
      console.error(`   Error: ${machineEventData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createMachineEvent',
        error: machineEventData.error || 'Unknown error'
      });
    }
    
    // Create transcript event
    const transcriptEventResponse = await fetch(`${serverUrl}/api/db/events`, {
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
    
    const transcriptEventData = await transcriptEventResponse.json();
    
    if (!transcriptEventResponse.ok || !transcriptEventData.success) {
      console.error('❌ Failed to create transcript event');
      console.error(`   Error: ${transcriptEventData.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'createTranscriptEvent',
        error: transcriptEventData.error || 'Unknown error'
      });
    }
    
    const eventsEndTime = performance.now();
    metrics.creationTimes.events = eventsEndTime - eventsStartTime;
    
    console.log('✅ Created test call events');
    console.log(`   Creation time: ${metrics.creationTimes.events.toFixed(2)}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    metrics.errors.push({
      operation: 'createTestData',
      error: error.message
    });
    return false;
  }
}

/**
 * Verify test data exists
 */
async function verifyTestDataExists() {
  console.log('\n2. Verifying test data exists...');
  
  try {
    // Verify call exists
    const callResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`);
    const callData = await callResponse.json();
    
    if (!callResponse.ok || !callData.success || !callData.data) {
      console.error('❌ Test call not found');
      metrics.errors.push({
        operation: 'verifyCall',
        error: 'Test call not found'
      });
      return false;
    }
    
    console.log('✅ Test call exists');
    
    // Verify recording exists
    const recordingResponse = await fetch(`${serverUrl}/api/db/recordings/${testRecordingSid}`);
    const recordingData = await recordingResponse.json();
    
    if (!recordingResponse.ok || !recordingData.success || !recordingData.data) {
      console.error('❌ Test recording not found');
      metrics.errors.push({
        operation: 'verifyRecording',
        error: 'Test recording not found'
      });
      return false;
    }
    
    console.log('✅ Test recording exists');
    
    // Verify transcript exists
    const transcriptResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}/transcript`);
    const transcriptData = await transcriptResponse.json();
    
    if (!transcriptResponse.ok || !transcriptData.success || !transcriptData.data) {
      console.error('❌ Test transcript not found');
      metrics.errors.push({
        operation: 'verifyTranscript',
        error: 'Test transcript not found'
      });
      return false;
    }
    
    console.log('✅ Test transcript exists');
    
    // Verify events exist
    const eventsResponse = await fetch(`${serverUrl}/api/db/events/${testCallSid}`);
    const eventsData = await eventsResponse.json();
    
    if (!eventsResponse.ok || !eventsData.success || !eventsData.data || !eventsData.data.events || eventsData.data.events.length === 0) {
      console.error('❌ Test events not found');
      metrics.errors.push({
        operation: 'verifyEvents',
        error: 'Test events not found'
      });
      return false;
    }
    
    console.log('✅ Test events exist');
    console.log(`   Event count: ${eventsData.data.events.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error verifying test data:', error.message);
    metrics.errors.push({
      operation: 'verifyTestData',
      error: error.message
    });
    return false;
  }
}

/**
 * Delete test call
 */
async function deleteTestCall() {
  console.log('\n3. Deleting test call...');
  
  try {
    const startTime = performance.now();
    
    // Delete call
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    const endTime = performance.now();
    metrics.deletionTimes.call = endTime - startTime;
    
    if (!response.ok || !data.success) {
      console.error('❌ Failed to delete test call');
      console.error(`   Error: ${data.error || 'Unknown error'}`);
      metrics.errors.push({
        operation: 'deleteCall',
        error: data.error || 'Unknown error'
      });
      return false;
    }
    
    console.log('✅ Test call deleted successfully');
    console.log(`   Deletion time: ${metrics.deletionTimes.call.toFixed(2)}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting test call:', error.message);
    metrics.errors.push({
      operation: 'deleteCall',
      error: error.message
    });
    return false;
  }
}

/**
 * Check for orphaned data
 */
async function checkForOrphanedData() {
  console.log('\n4. Checking for orphaned data...');
  
  try {
    // Check if call still exists
    const callResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`);
    const callData = await callResponse.json();
    
    if (callResponse.status !== 404 && callData.data) {
      console.error('❌ Call still exists after deletion');
      metrics.orphanedData.call = true;
    } else {
      console.log('✅ Call properly deleted');
      metrics.orphanedData.call = false;
    }
    
    // Check if recording still exists
    const recordingResponse = await fetch(`${serverUrl}/api/db/recordings/${testRecordingSid}`);
    const recordingData = await recordingResponse.json();
    
    if (recordingResponse.status !== 404 && recordingData.data) {
      console.error('❌ Recording still exists after call deletion');
      metrics.orphanedData.recording = true;
    } else {
      console.log('✅ Recording properly deleted');
      metrics.orphanedData.recording = false;
    }
    
    // Check if transcript still exists
    const transcriptResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}/transcript`);
    const transcriptData = await transcriptResponse.json();
    
    if (transcriptResponse.status !== 404 && transcriptData.data) {
      console.error('❌ Transcript still exists after call deletion');
      metrics.orphanedData.transcript = true;
    } else {
      console.log('✅ Transcript properly deleted');
      metrics.orphanedData.transcript = false;
    }
    
    // Check if events still exist
    const eventsResponse = await fetch(`${serverUrl}/api/db/events/${testCallSid}`);
    const eventsData = await eventsResponse.json();
    
    if (eventsResponse.status !== 404 && eventsData.data && eventsData.data.events && eventsData.data.events.length > 0) {
      console.error('❌ Events still exist after call deletion');
      metrics.orphanedData.events = true;
    } else {
      console.log('✅ Events properly deleted');
      metrics.orphanedData.events = false;
    }
    
    // Check MongoDB directly for any orphaned data
    if (mongoose.connection.readyState === 1) {
      console.log('\nChecking MongoDB directly for orphaned data...');
      
      // Check for orphaned call
      const Call = mongoose.model('Call');
      const orphanedCall = await Call.findOne({ callSid: testCallSid });
      
      if (orphanedCall) {
        console.error('❌ Orphaned call found in MongoDB');
        metrics.orphanedData.mongoCall = true;
      } else {
        console.log('✅ No orphaned call in MongoDB');
        metrics.orphanedData.mongoCall = false;
      }
      
      // Check for orphaned recording
      const Recording = mongoose.model('Recording');
      const orphanedRecording = await Recording.findOne({ recordingSid: testRecordingSid });
      
      if (orphanedRecording) {
        console.error('❌ Orphaned recording found in MongoDB');
        metrics.orphanedData.mongoRecording = true;
      } else {
        console.log('✅ No orphaned recording in MongoDB');
        metrics.orphanedData.mongoRecording = false;
      }
      
      // Check for orphaned transcript
      const Transcript = mongoose.model('Transcript');
      const orphanedTranscript = await Transcript.findOne({ callSid: testCallSid });
      
      if (orphanedTranscript) {
        console.error('❌ Orphaned transcript found in MongoDB');
        metrics.orphanedData.mongoTranscript = true;
      } else {
        console.log('✅ No orphaned transcript in MongoDB');
        metrics.orphanedData.mongoTranscript = false;
      }
      
      // Check for orphaned events
      const CallEvent = mongoose.model('CallEvent');
      const orphanedEvents = await CallEvent.find({ callSid: testCallSid });
      
      if (orphanedEvents && orphanedEvents.length > 0) {
        console.error(`❌ ${orphanedEvents.length} orphaned events found in MongoDB`);
        metrics.orphanedData.mongoEvents = true;
      } else {
        console.log('✅ No orphaned events in MongoDB');
        metrics.orphanedData.mongoEvents = false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking for orphaned data:', error.message);
    metrics.errors.push({
      operation: 'checkOrphanedData',
      error: error.message
    });
    return false;
  }
}

/**
 * Test error scenarios
 */
async function testErrorScenarios() {
  console.log('\n5. Testing error scenarios...');
  
  try {
    // Test deleting non-existent call
    console.log('Testing deletion of non-existent call...');
    const nonExistentCallSid = `NONEXISTENT_${Date.now()}`;
    
    const response = await fetch(`${serverUrl}/api/db/calls/${nonExistentCallSid}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.status === 404 || !data.success) {
      console.log('✅ Proper error response for non-existent call');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    } else {
      console.error('❌ Unexpected success response for non-existent call');
      metrics.errors.push({
        operation: 'testNonExistentCall',
        error: 'Unexpected success response'
      });
    }
    
    // Test deleting with invalid call SID
    console.log('\nTesting deletion with invalid call SID...');
    
    const invalidResponse = await fetch(`${serverUrl}/api/db/calls/invalid-sid`, {
      method: 'DELETE'
    });
    
    const invalidData = await invalidResponse.json();
    
    if (invalidResponse.status === 400 || invalidResponse.status === 404 || !invalidData.success) {
      console.log('✅ Proper error response for invalid call SID');
      console.log(`   Status: ${invalidResponse.status}`);
      console.log(`   Error: ${invalidData.error || 'Unknown error'}`);
    } else {
      console.error('❌ Unexpected success response for invalid call SID');
      metrics.errors.push({
        operation: 'testInvalidCallSid',
        error: 'Unexpected success response'
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing error scenarios:', error.message);
    metrics.errors.push({
      operation: 'testErrorScenarios',
      error: error.message
    });
    return false;
  }
}

/**
 * Measure deletion performance
 */
async function measureDeletionPerformance() {
  console.log('\n6. Measuring deletion performance with various data volumes...');
  
  try {
    // Create test calls with different volumes of associated data
    const testCases = [
      { name: 'Small', callCount: 5, eventsPerCall: 3 },
      { name: 'Medium', callCount: 20, eventsPerCall: 10 },
      { name: 'Large', callCount: 50, eventsPerCall: 20 }
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting ${testCase.name} data volume...`);
      console.log(`Creating ${testCase.callCount} calls with ${testCase.eventsPerCall} events each...`);
      
      const calls = [];
      const creationStartTime = performance.now();
      
      // Create calls
      for (let i = 0; i < testCase.callCount; i++) {
        const callSid = `TEST_PERF_${testCase.name}_${Date.now()}_${i}`;
        calls.push(callSid);
        
        // Create call
        await fetch(`${serverUrl}/api/db/calls`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callSid,
            status: 'completed',
            from: '+1234567890',
            to: '+0987654321',
            direction: 'outbound-api',
            duration: 120,
            createdAt: new Date()
          })
        });
        
        // Create recording
        await fetch(`${serverUrl}/api/db/recordings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recordingSid: `RE_${callSid}`,
            callSid,
            status: 'completed',
            duration: 120,
            url: `https://api.twilio.com/recordings/RE_${callSid}`,
            createdAt: new Date()
          })
        });
        
        // Create events
        for (let j = 0; j < testCase.eventsPerCall; j++) {
          await fetch(`${serverUrl}/api/db/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              callSid,
              eventType: j % 3 === 0 ? 'status_change' : j % 3 === 1 ? 'machine_detection' : 'transcript',
              data: {
                timestamp: new Date().toISOString()
              },
              source: 'test'
            })
          });
        }
      }
      
      const creationEndTime = performance.now();
      const creationTime = creationEndTime - creationStartTime;
      
      console.log(`✅ Created ${calls.length} test calls with associated data`);
      console.log(`   Creation time: ${creationTime.toFixed(2)}ms`);
      
      // Delete calls and measure performance
      console.log(`\nDeleting ${calls.length} test calls...`);
      const deletionStartTime = performance.now();
      
      for (const callSid of calls) {
        await fetch(`${serverUrl}/api/db/calls/${callSid}`, {
          method: 'DELETE'
        });
      }
      
      const deletionEndTime = performance.now();
      const deletionTime = deletionEndTime - deletionStartTime;
      
      console.log(`✅ Deleted ${calls.length} test calls`);
      console.log(`   Deletion time: ${deletionTime.toFixed(2)}ms`);
      console.log(`   Average time per call: ${(deletionTime / calls.length).toFixed(2)}ms`);
      
      metrics.deletionTimes[testCase.name] = {
        callCount: testCase.callCount,
        eventsPerCall: testCase.eventsPerCall,
        totalTime: deletionTime,
        averageTimePerCall: deletionTime / calls.length
      };
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error measuring deletion performance:', error.message);
    metrics.errors.push({
      operation: 'measureDeletionPerformance',
      error: error.message
    });
    return false;
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('\n7. Generating performance report...');
  
  console.log('\nCreation Times:');
  Object.entries(metrics.creationTimes).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.toFixed(2)}ms`);
  });
  
  console.log('\nDeletion Times:');
  Object.entries(metrics.deletionTimes).forEach(([key, value]) => {
    if (typeof value === 'number') {
      console.log(`  ${key}: ${value.toFixed(2)}ms`);
    } else {
      console.log(`  ${key}:`);
      console.log(`    Call Count: ${value.callCount}`);
      console.log(`    Events Per Call: ${value.eventsPerCall}`);
      console.log(`    Total Time: ${value.totalTime.toFixed(2)}ms`);
      console.log(`    Average Time Per Call: ${value.averageTimePerCall.toFixed(2)}ms`);
    }
  });
  
  console.log('\nOrphaned Data Check:');
  Object.entries(metrics.orphanedData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? '❌ Found' : '✅ None'}`);
  });
  
  console.log('\nErrors:');
  if (metrics.errors.length === 0) {
    console.log('  No errors detected');
  } else {
    metrics.errors.forEach(error => {
      console.log(`  ${error.operation}: ${error.error}`);
    });
  }
  
  // Calculate overall success
  const orphanedDataFound = Object.values(metrics.orphanedData).some(value => value);
  
  console.log('\nOverall Assessment:');
  if (metrics.errors.length === 0 && !orphanedDataFound) {
    console.log('✅ Deletion cascade is working correctly');
    console.log('  All associated data is properly deleted');
    console.log('  No errors detected during testing');
  } else if (metrics.errors.length > 0 && !orphanedDataFound) {
    console.log('⚠️ Deletion cascade works but errors occurred during testing');
    console.log(`  ${metrics.errors.length} errors detected`);
  } else if (metrics.errors.length === 0 && orphanedDataFound) {
    console.log('❌ Deletion cascade is not working correctly');
    console.log('  Orphaned data found after call deletion');
  } else {
    console.log('❌ Deletion cascade is not working correctly');
    console.log('  Orphaned data found and errors occurred during testing');
    console.log(`  ${metrics.errors.length} errors detected`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Deletion Cascade Test');
  console.log('============================');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Call SID: ${testCallSid}`);
  console.log(`Test Recording SID: ${testRecordingSid}`);
  console.log(`Test Conversation ID: ${testConversationId}`);
  
  try {
    // Connect to MongoDB directly
    await connectToMongoDB();
    
    // Create test call with associated data
    const dataCreated = await createTestCallWithAssociatedData();
    
    if (dataCreated) {
      // Verify test data exists
      await verifyTestDataExists();
      
      // Delete test call
      await deleteTestCall();
      
      // Check for orphaned data
      await checkForOrphanedData();
    }
    
    // Test error scenarios
    await testErrorScenarios();
    
    // Measure deletion performance
    await measureDeletionPerformance();
    
    // Generate performance report
    generatePerformanceReport();
    
    console.log('\nDeletion Cascade Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the main function
main();