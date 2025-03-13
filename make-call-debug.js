import 'dotenv/config';
import fetch from 'node-fetch';

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is an AI assistant calling from ElevenLabs. How are you today?";
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
    
    // First check if the server is reachable
    try {
      console.log("Testing server connection...");
      const testResponse = await fetch(serverUrl);
      console.log(`Server test response status: ${testResponse.status}`);
      const testData = await testResponse.text();
      console.log(`Server test response (first 100 chars): ${testData.substring(0, 100)}`);
    } catch (testError) {
      console.error("Error connecting to server during test:", testError.message);
    }
    
    // Make the API call to your server
    console.log("Making outbound call API request...");
    const payload = {
      number: phoneNumber,
      prompt: prompt,
      first_message: firstMessage
    };
    console.log("Request payload:", JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`API response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`Raw API response: ${responseText}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
      
      if (response.ok) {
        console.log('Call initiated successfully!');
        console.log(`Call SID: ${data.callSid}`);
        return true;
      } else {
        console.error('Failed to initiate call:', data.error);
        if (data.details) {
          console.error('Error details:', data.details);
        }
        return false;
      }
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError.message);
      console.error('Raw response was:', responseText);
      return false;
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error('Full error:', error);
    console.error(`Make sure your server is running at ${serverUrl}`);
    console.error('If using localhost, ensure the server is running on port 8000');
    console.error('If using ngrok, check that your tunnel is active and the URL is correct');
    return false;
  }
}

// Function to call all numbers with a delay between them
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
Usage: node make-call-debug.js [phone_number] [prompt] [first_message] [server_url]
Examples:
  node make-call-debug.js                         # Call all numbers in VERIFIED_NUMBERS
  node make-call-debug.js +1234567890             # Call specific number
  node make-call-debug.js +1234567890 "Custom prompt" "Custom message"
  node make-call-debug.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io
`);

console.log("Environment Details:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER);
console.log("VERIFIED_NUMBERS:", process.env.VERIFIED_NUMBERS);
console.log("SERVER_URL:", process.env.SERVER_URL);
console.log("ELEVENLABS_AGENT_ID:", process.env.ELEVENLABS_AGENT_ID ? "DEFINED" : "UNDEFINED");
console.log("ELEVENLABS_API_KEY:", process.env.ELEVENLABS_API_KEY ? "DEFINED" : "UNDEFINED");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "DEFINED" : "UNDEFINED");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "DEFINED" : "UNDEFINED");

// Start calling all numbers
callAllNumbers(); 