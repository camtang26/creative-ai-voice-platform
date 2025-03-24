import 'dotenv/config';
import fetch from 'node-fetch';

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is a test call to check if our AU region configuration is working.";
const SERVER_URL = "https://twilioel-production.up.railway.app";
const CALLER_ID = "+61291570351"; // E.164 format (no spaces)

// Command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] || "+61404713440"; // Use provided number or default
const prompt = args[1] || DEFAULT_PROMPT;
const firstMessage = args[2] || DEFAULT_FIRST_MESSAGE;

async function makeCallWithoutRegion() {
  console.log("=== TEST 1: MAKING CALL WITHOUT REGION PARAMETER ===");
  try {
    console.log(`Making a call to ${phoneNumber}...`);
    console.log(`Using prompt: "${prompt}"`);
    console.log(`First message: "${firstMessage}"`);
    console.log(`Using server: ${SERVER_URL}`);
    console.log(`Using caller ID: ${CALLER_ID}`);
    
    // Make the API call to your server WITHOUT region parameter
    const response = await fetch(`${SERVER_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        prompt: prompt,
        first_message: firstMessage,
        callerId: CALLER_ID
      }),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      return true;
    } else {
      console.error('Failed to initiate call:', data.error);
      console.error('Details:', data.details || 'No details provided');
      return false;
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your server is running at ${SERVER_URL}`);
    return false;
  }
}

async function makeCallWithRegion() {
  console.log("\n=== TEST 2: MAKING CALL WITH REGION PARAMETER ===");
  try {
    console.log(`Making a call to ${phoneNumber}...`);
    console.log(`Using prompt: "${prompt}"`);
    console.log(`First message: "${firstMessage}"`);
    console.log(`Using server: ${SERVER_URL}`);
    console.log(`Using caller ID: ${CALLER_ID}`);
    console.log(`Using region: au1`);
    
    // Make the API call to your server WITH region parameter
    const response = await fetch(`${SERVER_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        prompt: prompt,
        first_message: firstMessage,
        callerId: CALLER_ID,
        region: 'au1'
      }),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      return true;
    } else {
      console.error('Failed to initiate call:', data.error);
      console.error('Details:', data.details || 'No details provided');
      return false;
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your server is running at ${SERVER_URL}`);
    return false;
  }
}

async function testServerHealth() {
  console.log("\n=== TEST 3: CHECKING SERVER HEALTH ===");
  try {
    const response = await fetch(`${SERVER_URL}/`);
    console.log(`Server health check status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log("Server response:", JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error checking server health:', error.message);
    return false;
  }
}

async function run() {
  console.log("=====================================");
  console.log("  TWILIO AU REGION DEBUG TOOL");
  console.log("=====================================");
  console.log("This script will help diagnose issues with the AU region implementation.");
  console.log("");
  
  // Test server health first
  const serverHealth = await testServerHealth();
  if (!serverHealth) {
    console.error("Cannot connect to the server. Make sure it's running and accessible.");
    return;
  }
  
  // Test call without region parameter
  const result1 = await makeCallWithoutRegion();
  
  // Test call with region parameter
  const result2 = await makeCallWithRegion();
  
  console.log("\n=== SUMMARY ===");
  console.log(`Server health check: ${serverHealth ? 'PASSED' : 'FAILED'}`);
  console.log(`Call without region: ${result1 ? 'PASSED' : 'FAILED'}`);
  console.log(`Call with region: ${result2 ? 'PASSED' : 'FAILED'}`);
  console.log("");
  
  if (result1 && !result2) {
    console.log("DIAGNOSIS: The region parameter seems to be causing the problem.");
    console.log("RECOMMENDATION: Use the version without the region parameter, or check");
    console.log("                 if the server implementation supports the region parameter.");
  } else if (!result1 && !result2) {
    console.log("DIAGNOSIS: Both calls failed, suggesting a more fundamental issue.");
    console.log("RECOMMENDATION: Check server logs and Twilio credentials.");
  } else if (result1 && result2) {
    console.log("DIAGNOSIS: Both approaches work fine!");
    console.log("RECOMMENDATION: You can use either approach.");
  } else {
    console.log("DIAGNOSIS: Unexpected results - calls with region work but not without region.");
    console.log("RECOMMENDATION: Stick with the version using the region parameter.");
  }
}

// Start the diagnostic tests
run();