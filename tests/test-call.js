/**
 * Enhanced test script for making outbound calls
 * Compatible with the improved server architecture
 */
import 'dotenv/config';
// Removed node-fetch import - using native fetch
// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is Investor Signals AI assistant in training. May I please speak with {name}?";
const DEFAULT_SERVER_URL = "http://localhost:8000";
const DEFAULT_DELAY = 10000; // 10 seconds delay between calls by default

// Get server URL from environment or default to localhost
const SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;

// Command line arguments
const args = process.argv.slice(2);
const phoneNumberArg = args[0]; // Allows specifying a single number as an argument
const prompt = args[1] || DEFAULT_PROMPT;
const firstMessage = args[2] || DEFAULT_FIRST_MESSAGE;
const serverUrl = args[3] || SERVER_URL;
const customerName = args[4] || ""; // Optional customer name parameter

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

/**
 * Make a call to a phone number
 * @param {string} phoneNumber - The phone number to call
 * @returns {Promise<boolean>} Whether the call was successfully initiated
 */
async function makeCall(phoneNumber) {
  try {
    const startTime = Date.now();
    
    console.log(`Making a call to ${phoneNumber}...`);
    console.log(`Using prompt: "${prompt}"`);
    console.log(`First message: "${firstMessage}"`);
    console.log(`Using server: ${serverUrl}`);
    console.log(`Using Twilio region: au1 (Australia) for lower latency`);
    
    if (customerName) {
      console.log(`Customer name: "${customerName}"`);
    }
    
    // Prepare request payload
    const payload = {
      number: phoneNumber,
      prompt: prompt,
      first_message: firstMessage,
      region: 'au1',  // Add explicit region for Australia
      callerId: process.env.TWILIO_PHONE_NUMBER // Use caller ID from environment
    };
    
    // Add customer name if provided
    if (customerName) {
      payload.name = customerName;
    }
    
    // Make the API call to the server
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      console.log(`Conversation ID: ${data.conversationId}`);
      console.log(`Request completed in ${duration.toFixed(2)} seconds`);
      
      // Show timing information if available
      if (data.timing) {
        console.log('Timing breakdown:');
        Object.entries(data.timing).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}ms`);
        });
      }
      
      return true;
    } else {
      console.error('Failed to initiate call:', data.error);
      console.error('Details:', data.details || 'No additional details');
      
      if (data.code) {
        console.error('Error code:', data.code);
      }
      
      console.log(`Request failed in ${duration.toFixed(2)} seconds`);
      return false;
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your server is running at ${serverUrl}`);
    console.error('If using localhost, ensure the server is running on port 8000');
    console.error('If using ngrok, check that your tunnel is active and the URL is correct');
    return false;
  }
}

/**
 * Call all numbers with a delay between them
 */
async function callAllNumbers() {
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
Enhanced Test Call Script (v2.0.0)
---------------------------------
Usage: node test-call.js [phone_number] [prompt] [first_message] [server_url] [customer_name]
Examples:
  node test-call.js                         # Call all numbers in VERIFIED_NUMBERS
  node test-call.js +1234567890             # Call specific number
  node test-call.js +1234567890 "Custom prompt" "Custom message"
  node test-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io
  node test-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io "John Smith"
`);

// Start calling all numbers
callAllNumbers();
