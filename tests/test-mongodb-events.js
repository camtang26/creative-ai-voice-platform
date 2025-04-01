/**
 * MongoDB Call Events Test Script
 * Tests the call events functionality
 */
import { 
  connectToDatabase, 
  getCallRepository, 
  getCallEventRepository 
} from './db/index.js';

// Test data
const testCallSid = `TEST_EVENTS_${Date.now()}`;

/**
 * Run the tests
 */
async function runTests() {
  try {
    console.log('MongoDB Call Events Test Script');
    console.log('==============================');
    
    // Connect to MongoDB
    console.log('\n1. Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Get repositories
    const callRepository = getCallRepository();
    const callEventRepository = getCallEventRepository();
    
    // Create a test call
    console.log('\n2. Creating test call...');
    const callData = {
      callSid: testCallSid,
      status: 'initiated',
      from: '+1234567890',
      to: '+0987654321',
      direction: 'outbound-api',
      createdAt: new Date()
    };
    
    const savedCall = await callRepository.saveCall(callData);
    console.log(`✅ Created call: ${savedCall.callSid}`);
    
    // Log different types of events
    console.log('\n3. Logging various call events...');
    
    // Log status change event
    console.log('   Logging status change event...');
    await callEventRepository.logEvent(testCallSid, 'status_change', {
      status: 'ringing',
      previousStatus: 'initiated',
      timestamp: new Date().toISOString()
    });
    console.log('   ✅ Status change event logged');
    
    // Log machine detection event
    console.log('   Logging machine detection event...');
    await callEventRepository.logEvent(testCallSid, 'machine_detection', {
      answeredBy: 'human',
      timestamp: new Date().toISOString()
    });
    console.log('   ✅ Machine detection event logged');
    
    // Log recording event
    console.log('   Logging recording event...');
    await callEventRepository.logEvent(testCallSid, 'recording', {
      recordingSid: `RE_${Date.now()}`,
      status: 'in-progress',
      timestamp: new Date().toISOString()
    });
    console.log('   ✅ Recording event logged');
    
    // Log agent response event
    console.log('   Logging agent response event...');
    await callEventRepository.logEvent(testCallSid, 'agent_response', {
      message: 'Hello, how can I help you today?',
      timestamp: new Date().toISOString()
    }, { source: 'elevenlabs' });
    console.log('   ✅ Agent response event logged');
    
    // Log user message event
    console.log('   Logging user message event...');
    await callEventRepository.logEvent(testCallSid, 'user_message', {
      message: 'I have a question about my account.',
      timestamp: new Date().toISOString()
    }, { source: 'user' });
    console.log('   ✅ User message event logged');
    
    // Get events for the call
    console.log('\n4. Retrieving events for the call...');
    const events = await callEventRepository.getCallEvents(testCallSid);
    console.log(`   Retrieved ${events.events.length} events:`);
    events.events.forEach((event, index) => {
      console.log(`   Event ${index + 1}: Type = ${event.eventType}, Source = ${event.source}`);
    });
    
    // Clean up test data
    console.log('\n5. Cleaning up test data...');
    
    // Delete the call (if you want to clean up)
    if (callRepository.deleteCall) {
      await callRepository.deleteCall(testCallSid);
      console.log(`   ✅ Deleted test call: ${testCallSid}`);
    } else {
      console.log(`   ⚠️ Call repository doesn't have a deleteCall method, skipping cleanup`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the tests
runTests();
