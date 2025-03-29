/**
 * Test script for making calls with enhanced features
 */
import 'dotenv/config';
import fetch from 'node-fetch';

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Please say hello, have a short conversation, and then say goodbye and end the call.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is Investor Signals AI assistant in training. May I please speak with you?";
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
const customerName = args[4] || null;

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

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Make a call using enhanced features
 * @param {string} phoneNumber - The phone number to call
 * @returns {Promise<boolean>} - Whether the call was successfully initiated
 */
async function makeEnhancedCall(phoneNumber) {
  try {
    console.log(`${colors.cyan}Making an enhanced call to ${phoneNumber}...${colors.reset}`);
    console.log(`${colors.yellow}Using prompt:${colors.reset} "${prompt}"`);
    console.log(`${colors.yellow}First message:${colors.reset} "${firstMessage}"`);
    console.log(`${colors.yellow}Using server:${colors.reset} ${serverUrl}`);
    console.log(`${colors.yellow}Twilio region:${colors.reset} au1 (Australia) for lower latency`);
    
    if (customerName) {
      console.log(`${colors.yellow}Customer name:${colors.reset} "${customerName}"`);
    }
    
    // Enhanced call payload
    const payload = {
      number: phoneNumber,
      prompt: prompt,
      first_message: firstMessage,
      region: 'au1',                      // Australia region
      callerId: process.env.TWILIO_PHONE_NUMBER,
      enhanced: true                      // Enable enhanced features
    };
    
    // Add customer name if provided
    if (customerName) {
      payload.name = customerName;
    }
    
    // Make the API call to the server
    const startTime = Date.now();
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (response.ok) {
      console.log(`${colors.green}Call initiated successfully!${colors.reset}`);
      console.log(`${colors.yellow}Call SID:${colors.reset} ${data.callSid}`);
      console.log(`${colors.yellow}Conversation ID:${colors.reset} ${data.conversationId}`);
      console.log(`${colors.yellow}Request completed in:${colors.reset} ${duration}s`);
      
      // Show timing information if available
      if (data.timing) {
        console.log(`${colors.cyan}Timing breakdown:${colors.reset}`);
        Object.entries(data.timing).forEach(([key, value]) => {
          console.log(`  ${colors.magenta}${key}:${colors.reset} ${value}ms`);
        });
      }
      
      // Start polling for call updates
      pollCallStatus(data.callSid);
      
      return true;
    } else {
      console.error(`${colors.red}Failed to initiate call:${colors.reset}`, data.error);
      console.error(`${colors.yellow}Details:${colors.reset}`, data.details || 'No additional details');
      
      if (data.code) {
        console.error(`${colors.yellow}Error code:${colors.reset}`, data.code);
      }
      
      console.log(`${colors.yellow}Request failed in:${colors.reset} ${duration}s`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error making API call:${colors.reset}`, error.message);
    console.error(`${colors.yellow}Make sure your server is running at ${serverUrl}${colors.reset}`);
    console.error('If using localhost, ensure the server is running on port 8000');
    console.error('If using ngrok, check that your tunnel is active and the URL is correct');
    return false;
  }
}

/**
 * Poll for call status updates
 * @param {string} callSid - The Call SID to monitor
 */
async function pollCallStatus(callSid) {
  let isActive = true;
  let statusChangeCount = 0;
  let lastStatus = '';
  let recordingCount = 0;
  
  console.log(`\n${colors.cyan}Starting call monitoring for ${callSid}...${colors.reset}`);
  
  while (isActive && statusChangeCount < 10) {
    try {
      // Wait 5 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check call status
      const response = await fetch(`${serverUrl}/api/call/${callSid}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`${colors.red}Error fetching call status:${colors.reset}`, data.error);
        continue;
      }
      
      const callInfo = data.callInfo;
      
      // Log status changes
      if (callInfo.status !== lastStatus) {
        console.log(`${colors.yellow}Call status changed:${colors.reset} ${lastStatus || 'unknown'} -> ${callInfo.status}`);
        lastStatus = callInfo.status;
        statusChangeCount++;
      }
      
      // Log recordings
      if (callInfo.recordings && callInfo.recordings.length > recordingCount) {
        const newRecordings = callInfo.recordings.slice(recordingCount);
        recordingCount = callInfo.recordings.length;
        
        console.log(`${colors.green}New recordings available:${colors.reset} ${newRecordings.length}`);
        newRecordings.forEach((rec, index) => {
          console.log(`  ${colors.magenta}Recording ${recordingCount - newRecordings.length + index + 1}:${colors.reset} ${rec.url}`);
        });
      }
      
      // Check if call is still active
      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(callInfo.status)) {
        isActive = false;
        
        // Show final call details
        console.log(`\n${colors.cyan}Call completed with status:${colors.reset} ${callInfo.status}`);
        if (callInfo.duration) {
          console.log(`${colors.yellow}Duration:${colors.reset} ${callInfo.duration} seconds`);
        }
        console.log(`${colors.yellow}Recordings:${colors.reset} ${recordingCount}`);
        
        // Show recording URLs
        if (recordingCount > 0) {
          console.log(`\n${colors.cyan}Recording URLs:${colors.reset}`);
          callInfo.recordings.forEach((rec, index) => {
            console.log(`  ${colors.magenta}Recording ${index + 1}:${colors.reset} ${rec.url}`);
          });
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error polling call status:${colors.reset}`, error.message);
    }
  }
  
  console.log(`${colors.cyan}Call monitoring completed.${colors.reset}`);
}

/**
 * Call all numbers with a delay between them
 */
async function callAllNumbers() {
  console.log(`${colors.cyan}Will call ${phoneNumbers.length} numbers (${phoneNumbers.join(', ')})${colors.reset}`);
  
  for (let i = 0; i < phoneNumbers.length; i++) {
    const number = phoneNumbers[i];
    console.log(`\n${colors.blue}Call ${i+1} of ${phoneNumbers.length}${colors.reset}`);
    
    const success = await makeEnhancedCall(number);
    
    // If this is not the last number and the call was successful, wait before calling the next one
    if (i < phoneNumbers.length - 1 && success) {
      const delay = process.env.CALL_DELAY ? parseInt(process.env.CALL_DELAY) : DEFAULT_DELAY;
      console.log(`${colors.yellow}Waiting ${delay/1000} seconds before the next call...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log(`\n${colors.green}All calls completed!${colors.reset}`);
}

console.log(`
${colors.cyan}Enhanced Test Call Script (v2.1.0)${colors.reset}
${colors.yellow}---------------------------------${colors.reset}
Usage: node test-enhanced-call.js [phone_number] [prompt] [first_message] [server_url] [customer_name]
Examples:
  node test-enhanced-call.js                         # Call all numbers in VERIFIED_NUMBERS
  node test-enhanced-call.js +1234567890             # Call specific number
  node test-enhanced-call.js +1234567890 "Custom prompt" "Custom message"
  node test-enhanced-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io
  node test-enhanced-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io "John Smith"
`);

// Start calling all numbers
callAllNumbers();
