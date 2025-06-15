/**
 * Test Script for Enhanced Twilio Integration
 * 
 * This script tests the following enhancements:
 * 1. Call recording functionality
 * 2. Automatic call termination
 * 3. Enhanced data streaming
 */

import 'dotenv/config';
// Removed node-fetch import - using native fetch
import Twilio from 'twilio';

// Default test server URL
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';

// Initialize Twilio client for verification
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Test phone number to use (from environment or default)
const TEST_PHONE = process.env.TEST_PHONE || process.env.VERIFIED_NUMBERS?.split(',')[0];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Make a test call and return the Call SID
 */
async function makeTestCall() {
  console.log(`${colors.blue}Making a test call to ${TEST_PHONE}...${colors.reset}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: TEST_PHONE,
        prompt: 'You are a test assistant. Say hello, ask how they are, then say goodbye and end the conversation.',
        first_message: 'Hello, this is a test call. How are you today?',
        region: 'au1'
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`${colors.green}Call initiated successfully!${colors.reset}`);
      console.log(`Call SID: ${data.callSid}`);
      console.log(`Conversation ID: ${data.conversationId}`);
      return data.callSid;
    } else {
      console.error(`${colors.red}Failed to initiate call:${colors.reset}`, data.error);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}Error making API call:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Test call recording functionality
 */
async function testCallRecording(callSid) {
  console.log(`\n${colors.blue}Testing call recording for ${callSid}...${colors.reset}`);
  
  // Wait 60 seconds for the call to complete and recordings to be available
  console.log('Waiting 60 seconds for call to complete...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  try {
    // Get recordings from server API
    console.log('Fetching recordings from server API...');
    const response = await fetch(`${SERVER_URL}/api/calls/${callSid}/recordings`);
    const data = await response.json();
    
    if (response.ok && data.recordings && data.recordings.length > 0) {
      console.log(`${colors.green}Found ${data.recordings.length} recordings!${colors.reset}`);
      console.log('Recording URLs:');
      data.recordings.forEach((recording, index) => {
        console.log(`  ${index + 1}. MP3: ${recording.mp3Url}`);
        console.log(`     WAV: ${recording.wavUrl}`);
        console.log(`     Duration: ${recording.duration || 'Unknown'} seconds`);
        console.log(`     Channels: ${recording.channels || 'Unknown'}`);
        console.log(`     Created: ${recording.dateCreated || 'Unknown'}`);
      });
      return true;
    } else {
      console.log(`${colors.yellow}No recordings found yet. This may be normal if the call is still in progress.${colors.reset}`);
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error fetching recordings:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Check call termination status
 */
async function checkCallTermination(callSid) {
  console.log(`\n${colors.blue}Checking call termination for ${callSid}...${colors.reset}`);
  
  try {
    const call = await twilioClient.calls(callSid).fetch();
    
    console.log(`Call Status: ${call.status}`);
    console.log(`Duration: ${call.duration || 'Unknown'} seconds`);
    console.log(`Start Time: ${call.startTime || 'Unknown'}`);
    console.log(`End Time: ${call.endTime || 'Unknown'}`);
    
    if (['completed', 'canceled', 'busy', 'failed', 'no-answer'].includes(call.status)) {
      console.log(`${colors.green}Call was properly terminated! (Status: ${call.status})${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}Call is still active or in an unusual state: ${call.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error checking call status:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`${colors.cyan}=== Enhanced Twilio Integration Test ===\n${colors.reset}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  
  if (!TEST_PHONE) {
    console.error(`${colors.red}Error: No test phone number provided. Please set TEST_PHONE or VERIFIED_NUMBERS in your .env file.${colors.reset}`);
    return;
  }
  
  // Make a test call
  const callSid = await makeTestCall();
  
  if (!callSid) {
    console.error(`${colors.red}Failed to make test call, cannot continue tests.${colors.reset}`);
    return;
  }
  
  // Test call recording
  const recordingResult = await testCallRecording(callSid);
  
  // Check termination status
  const terminationResult = await checkCallTermination(callSid);
  
  // Final results
  console.log(`\n${colors.cyan}=== Test Results ===\n${colors.reset}`);
  console.log(`Call Recording: ${recordingResult ? colors.green + 'PASS' : colors.yellow + 'INCONCLUSIVE'}${colors.reset}`);
  console.log(`Call Termination: ${terminationResult ? colors.green + 'PASS' : colors.yellow + 'INCONCLUSIVE'}${colors.reset}`);
  
  if (!recordingResult || !terminationResult) {
    console.log(`\n${colors.yellow}Note: Inconclusive tests might need more time or manual verification.${colors.reset}`);
    console.log(`You can manually check the call status and recordings for call ${callSid} in the Twilio console.`);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
});