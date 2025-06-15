import 'dotenv/config';
// Removed node-fetch import - using native fetch
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get server URL from environment or ask user
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';

// Test configurations
const RAILWAY_URL = 'https://twilioel-production.up.railway.app';
const LOCAL_URL = process.env.SERVER_URL; // From .env file, should be the ngrok URL

// Ask the user which server to test
async function selectServer() {
  console.log('\n=== LATENCY TESTING TOOL ===\n');
  console.log('This tool helps compare latency between Railway and local server setups.');
  console.log('1. Railway server (Singapore region)');
  console.log('2. Local server with ngrok (current URL: ' + LOCAL_URL + ')');
  console.log('3. Run tests on both servers to compare');
  
  return new Promise((resolve) => {
    rl.question('\nSelect server to test (1, 2, or 3): ', (answer) => {
      if (['1', '2', '3'].includes(answer)) {
        resolve(parseInt(answer));
      } else {
        console.log('Invalid selection. Defaulting to local server (2).');
        resolve(2);
      }
    });
  });
}

// Ask for phone number
async function getPhoneNumber() {
  return new Promise((resolve) => {
    rl.question('\nEnter phone number to call (E.164 format, e.g., +61412345678): ', (answer) => {
      if (answer.startsWith('+')) {
        resolve(answer);
      } else {
        console.log('Invalid phone number format. Please use E.164 format starting with +.');
        getPhoneNumber().then(resolve);
      }
    });
  });
}

// Make a call and measure latency
async function makeCallWithLatencyMeasurement(serverUrl, phoneNumber) {
  console.log(`\nMaking test call to ${phoneNumber} via ${serverUrl}...`);
  
  const startTime = Date.now();
  
  try {
    // API call to initiate an outbound call
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        prompt: 'You are a helpful assistant making a latency test call. Keep your responses very brief for this test.',
        first_message: 'Hello, this is a latency test call. Please say a single word to test response time.'
      }),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Call initiated successfully! API response time: ${responseTime}ms`);
      console.log(`Call SID: ${data.callSid}`);
      console.log(`\nIMPORTANT: This test only measures API response time.`);
      console.log(`To measure actual conversation latency, time how long it takes for the AI to respond during the call.`);
      return {
        success: true,
        apiResponseTime: responseTime,
        callSid: data.callSid
      };
    } else {
      console.error(`❌ Failed to initiate call: ${data.error}`);
      console.error(`Details: ${data.details || 'No additional details provided'}`);
      return {
        success: false,
        apiResponseTime: responseTime,
        error: data.error,
        details: data.details
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ Error making API call: ${error.message}`);
    return {
      success: false,
      apiResponseTime: responseTime,
      error: error.message
    };
  }
}

// Run a comparison test
async function runComparisonTest(phoneNumber) {
  console.log('\n=== RUNNING COMPARISON TEST ===');
  
  console.log('\n--- RAILWAY SERVER TEST ---');
  const railwayResult = await makeCallWithLatencyMeasurement(RAILWAY_URL, phoneNumber);
  
  // Wait 20 seconds between calls to avoid confusion
  console.log('\nWaiting 20 seconds before making the next test call...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  console.log('\n--- LOCAL SERVER TEST ---');
  const localResult = await makeCallWithLatencyMeasurement(LOCAL_URL, phoneNumber);
  
  // Output comparison
  console.log('\n=== LATENCY COMPARISON RESULTS ===');
  console.log(`Railway API Response Time: ${railwayResult.apiResponseTime}ms (${railwayResult.success ? 'Success' : 'Failed'})`);
  console.log(`Local API Response Time: ${localResult.apiResponseTime}ms (${localResult.success ? 'Success' : 'Failed'})`);
  
  const difference = Math.abs(railwayResult.apiResponseTime - localResult.apiResponseTime);
  const faster = railwayResult.apiResponseTime < localResult.apiResponseTime ? 'Railway' : 'Local';
  
  console.log(`\nResult: ${faster} server API response was ${difference}ms faster.`);
  console.log('\nIMPORTANT: This only compares API response time for initiating the call.');
  console.log('For actual conversation latency, record response times during the calls.');
}

// Main function
async function main() {
  try {
    const serverChoice = await selectServer();
    const phoneNumber = await getPhoneNumber();
    
    if (serverChoice === 3) {
      await runComparisonTest(phoneNumber);
    } else {
      const serverUrl = serverChoice === 1 ? RAILWAY_URL : LOCAL_URL;
      await makeCallWithLatencyMeasurement(serverUrl, phoneNumber);
    }
    
    rl.question('\nPress Enter to exit...', () => {
      rl.close();
    });
  } catch (error) {
    console.error('Error during test:', error);
    rl.close();
  }
}

// Run the main function
main();