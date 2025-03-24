// Simple test script that doesn't use any modules to avoid compatibility issues
// Run with: node test-server.js

// Configuration
const SERVER_URL = "https://twilioel-production.up.railway.app";
const PHONE_NUMBER = "+61404713440"; // Replace with a valid number
const CALLER_ID = "+61291570351";

// Test the root endpoint (health check)
async function testRootEndpoint() {
  console.log(`Testing root endpoint: ${SERVER_URL}/`);
  
  try {
    const response = await fetch(`${SERVER_URL}/`);
    const status = response.status;
    console.log(`Status code: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`Error: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('Error calling root endpoint:', error.message);
    return false;
  }
}

// Test the health endpoint
async function testHealthEndpoint() {
  console.log(`\nTesting health endpoint: ${SERVER_URL}/health`);
  
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const status = response.status;
    console.log(`Status code: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`Error: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('Error calling health endpoint:', error.message);
    return false;
  }
}

// Test making a call
async function testOutboundCall() {
  console.log(`\nTesting outbound call endpoint: ${SERVER_URL}/outbound-call`);
  
  try {
    const response = await fetch(`${SERVER_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: PHONE_NUMBER,
        prompt: "You are a helpful assistant making a phone call. Be friendly and professional.",
        first_message: "Hello, this is a test call to verify the server is working correctly.",
        callerId: CALLER_ID
      }),
    });
    
    const status = response.status;
    console.log(`Status code: ${status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`Error: ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        // Ignore error parsing failure
      }
      return false;
    }
  } catch (error) {
    console.error('Error making outbound call:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('======================================');
  console.log('  RAILWAY SERVER CONNECTION TESTER    ');
  console.log('======================================');
  
  const rootResult = await testRootEndpoint();
  const healthResult = await testHealthEndpoint();
  const callResult = await testOutboundCall();
  
  console.log('\n======================================');
  console.log('             TEST RESULTS             ');
  console.log('======================================');
  console.log(`Root endpoint (/) .......... ${rootResult ? 'PASS' : 'FAIL'}`);
  console.log(`Health endpoint (/health) .. ${healthResult ? 'PASS' : 'FAIL'}`);
  console.log(`Outbound call .............. ${callResult ? 'PASS' : 'FAIL'}`);
  console.log('======================================');
  
  if (!rootResult && !healthResult && !callResult) {
    console.log('\nAll tests failed. Possible issues:');
    console.log('1. The server is not running');
    console.log('2. The URL is incorrect');
    console.log('3. There is a network issue');
    console.log(`4. The PORT environment variable on Railway might not be set correctly`);
  } else if (rootResult && !callResult) {
    console.log('\nServer is running but call endpoint is failing. Possible issues:');
    console.log('1. Twilio credentials may be incorrect');
    console.log('2. The outbound call route is returning an error');
    console.log('3. Check Railway logs for more details');
  }
}

// Run the tests
runTests();