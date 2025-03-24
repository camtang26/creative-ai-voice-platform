import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

// Load environment variables from parent directory
const envPath = path.join(parentDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`ERROR: .env file not found at ${envPath}`);
  process.exit(1);
}

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is Investor Signals AI assistant in training. May I please speak with {name}?";
const DEFAULT_SERVER_URL = "http://localhost:8001"; // Default to optimized server port
const DEFAULT_DELAY = 10000; // 10 seconds delay between calls by default

// Get server URL from environment or default to localhost with optimized port
const SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;

// Command line arguments
const args = process.argv.slice(2);
const phoneNumberArg = args[0]; // Allows specifying a single number as an argument
const prompt = args[1] || DEFAULT_PROMPT;
const firstMessage = args[2] || DEFAULT_FIRST_MESSAGE;
const serverUrl = args[3] || SERVER_URL;

// Get verified numbers from environment
let phoneNumbers = [];
if (phoneNumberArg) {
  // If a phone number was provided as an argument, only call that number
  phoneNumbers = [phoneNumberArg];
} else if (process.env.VERIFIED_NUMBERS) {
  // Otherwise use all numbers from the VERIFIED_NUMBERS environment variable
  phoneNumbers = process.env.VERIFIED_NUMBERS.split(',').map(num => num.trim());
}

if (phoneNumbers.length === 0) {
  console.error('Error: No phone numbers provided. Please provide a phone number as the first argument or set VERIFIED_NUMBERS in .env');
  process.exit(1);
}

async function makeCall(phoneNumber) {
  try {
    console.log(`Making a call to ${phoneNumber}...`);
    console.log(`Using prompt: "${prompt}"`);
    console.log(`First message: "${firstMessage}"`);
    console.log(`Using server: ${serverUrl}`);
    
    // Measure API response time
    const startTime = Date.now();
    
    // Make the API call to your server with optimize_latency=true
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        prompt: prompt,
        first_message: firstMessage,
        optimize_latency: true  // Request latency optimization
      }),
    });

    console.log(`[LATENCY] API response time: ${Date.now() - startTime}ms`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      return true;
    } else {
      console.error('Failed to initiate call:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your optimized server is running at ${serverUrl}`);
    console.error('If using localhost, ensure the server is running on port 8001');
    console.error('If using ngrok, check that your tunnel is active and the URL is correct');
    return false;
  }
}

// Function to call all numbers with a delay between them
async function callAllNumbers() {
  console.log('====================================================');
  console.log('       USING OPTIMIZED TEST CALL SCRIPT             ');
  console.log('====================================================');
  console.log(`Will call ${phoneNumbers.length} numbers (${phoneNumbers.join(', ')})`);
  
  for (let i = 0; i < phoneNumbers.length; i++) {
    const number = phoneNumbers[i];
    console.log(`\nCall ${i+1} of ${phoneNumbers.length}`);
    
    const success = await makeCall(number);
    
    // If this is not the last number and the call was successful, wait before calling the next one
    if (i < phoneNumbers.length - 1 && success) {
      const delay = process.env.CALL_DELAY ? parseInt(process.env.CALL_DELAY) : DEFAULT_DELAY;
      console.log(`Waiting ${delay/1000} seconds before the next call...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('\nAll calls completed!');
}

console.log(`
Usage: node make-call-optimized.js [phone_number] [prompt] [first_message] [server_url]
Examples:
  node make-call-optimized.js                         # Call all numbers in VERIFIED_NUMBERS
  node make-call-optimized.js +1234567890             # Call specific number
  node make-call-optimized.js +1234567890 "Custom prompt" "Custom message"
  node make-call-optimized.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io
  
This script uses the optimized server implementation for lower latency.
`);

// Start calling all numbers
callAllNumbers();