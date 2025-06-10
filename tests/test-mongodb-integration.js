/**
 * MongoDB Integration Test Script
 * Tests the MongoDB integration for the ElevenLabs/Twilio outbound calling project
 */
import { 
  connectToDatabase, 
  getCallRepository, 
  getRecordingRepository, 
  getTranscriptRepository,
  getCallEventRepository,
  getAnalyticsRepository
} from './db/index.js';

// Test data
const testCallSid = `TEST_${Date.now()}`;
const testRecordingSid = `RE_${Date.now()}`;
const testConversationId = `CONV_${Date.now()}`;

/**
 * Run the tests
 */
async function runTests() {
  try {
    console.log('MongoDB Integration Test Script');
    console.log('==============================');
    
    // Connect to MongoDB
    console.log('\n1. Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Get repositories
    const callRepository = getCallRepository();
    const recordingRepository = getRecordingRepository();
    const transcriptRepository = getTranscriptRepository();
    const callEventRepository = getCallEventRepository();
    const analyticsRepository = getAnalyticsRepository();
    
    // Test call repository
    console.log('\n2. Testing call repository...');
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
    console.log(`✅ Saved call: ${savedCall.callSid}`);
    
    const retrievedCall = await callRepository.getCallBySid(testCallSid);
    console.log(`✅ Retrieved call: ${retrievedCall.callSid}`);
    
    await callRepository.updateCallStatus(testCallSid, 'in-progress', {
      startTime: new Date(),
      answeredBy: 'human'
    });
    console.log(`✅ Updated call status to in-progress`);
    
    // Test recording repository
    console.log('\n3. Testing recording repository...');
    const recordingData = {
      recordingSid: testRecordingSid,
      callSid: testCallSid,
      status: 'in-progress',
      duration: 0,
      url: `https://api.twilio.com/recordings/${testRecordingSid}`
    };
    
    const savedRecording = await recordingRepository.saveRecording(recordingData);
    console.log(`✅ Saved recording: ${savedRecording.recordingSid}`);
    
    const retrievedRecording = await recordingRepository.getRecordingBySid(testRecordingSid);
    console.log(`✅ Retrieved recording: ${retrievedRecording.recordingSid}`);
    
    await recordingRepository.updateRecording(testRecordingSid, {
      status: 'completed',
      duration: 60
    });
    console.log(`✅ Updated recording status to completed`);
    
    // Test transcript repository
    console.log('\n4. Testing transcript repository...');
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
    console.log(`✅ Saved transcript for call: ${savedTranscript.callSid}`);
    
    const retrievedTranscript = await transcriptRepository.getTranscriptByCallSid(testCallSid);
    console.log(`✅ Retrieved transcript with ${retrievedTranscript.messages.length} messages`);
    
    // Test call event repository
    console.log('\n5. Testing call event repository...');
    
    // Log status change event
    await callEventRepository.logEvent(testCallSid, 'status_change', {
      status: 'initiated',
      timestamp: new Date(Date.now() - 60000).toISOString()
    });
    console.log(`✅ Logged status_change event`);
    
    // Log machine detection event
    await callEventRepository.logEvent(testCallSid, 'machine_detection', {
      result: 'human',
      confidence: 0.95,
      timestamp: new Date(Date.now() - 45000).toISOString()
    });
    console.log(`✅ Logged machine_detection event`);
    
    // Log transcript event
    await callEventRepository.logEvent(testCallSid, 'transcript', {
      transcriptId: savedTranscript._id.toString(),
      messageCount: 3,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Logged transcript event`);
    
    // Get events for call
    const events = await callEventRepository.getCallEvents(testCallSid);
    console.log(`✅ Retrieved ${events.events.length} events for call`);
    
    // Test analytics repository
    console.log('\n6. Testing analytics repository...');
    
    // Complete the call for analytics
    await callRepository.updateCallStatus(testCallSid, 'completed', {
      endTime: new Date(),
      duration: 120,
      outcome: 'held'
    });
    console.log(`✅ Updated call status to completed`);
    
    // Get call duration stats
    const durationStats = await analyticsRepository.getCallDurationStats('day');
    console.log(`✅ Retrieved call duration stats for ${durationStats.stats.length} periods`);
    
    // Get call outcome distribution
    const outcomeDistribution = await analyticsRepository.getCallOutcomeDistribution();
    console.log(`✅ Retrieved call outcome distribution with ${outcomeDistribution.distribution.length} outcomes`);
    
    // Get dashboard summary
    const dashboardSummary = await analyticsRepository.getDashboardSummary();
    console.log(`✅ Retrieved dashboard summary`);
    
    // Get call events timeline
    const timeline = await analyticsRepository.getCallEventsTimeline(testCallSid);
    console.log(`✅ Retrieved call events timeline with ${timeline.events.length} events`);
    
    console.log('\n7. Cleaning up test data...');
    
    // Clean up test data (optional - comment out to keep test data in the database)
    /*
    await callRepository.deleteCall(testCallSid);
    console.log(`✅ Deleted test call`);
    
    await recordingRepository.deleteRecording(testRecordingSid);
    console.log(`✅ Deleted test recording`);
    
    // Transcript and events will be deleted automatically due to MongoDB TTL index
    */
    
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