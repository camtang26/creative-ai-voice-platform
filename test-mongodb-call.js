/**
 * MongoDB-Integrated Test Call Script
 * Makes a test call using the MongoDB-integrated server
 */
import 'dotenv/config';
import Twilio from 'twilio';
import fetch from 'node-fetch';

// Command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] || process.env.VERIFIED_NUMBERS?.split(',')[0];
const prompt = args[1] || "You are a helpful assistant making a phone call. Be friendly and professional. After introducing yourself, ask how the person is doing today, listen to their response, then thank them for participating in this test call and say goodbye.";
const firstMessage = args[2] || "Hello, this is an AI assistant from ElevenLabs. I'm calling to test our MongoDB integration. May I please speak with {name}?";
const serverUrl = args[3] || process.env.SERVER_URL || 'http://localhost:8000';
const customerName = args[4] || 'there';

// Twilio client
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Make a MongoDB-integrated call
 * @param {string} to - Phone number to call
 * @param {string} prompt - Prompt for the AI agent
 * @param {string} firstMessage - First message to say
 * @param {string} serverUrl - Server URL
 * @param {string} name - Customer name
 * @returns {Promise<Object>} Call result
 */
async function makeMongoDbCall(to, prompt, firstMessage, serverUrl, name) {
  console.log(`Making a MongoDB-integrated call to ${to}...`);
  console.log(`Using prompt: "${prompt}"`);
  console.log(`First message: "${firstMessage}"`);
  console.log(`Using server: ${serverUrl}`);
  
  // Determine Twilio region for lower latency
  const region = process.env.TWILIO_REGION || 'au1';
  console.log(`Using Twilio region: ${region} (Australia) for lower latency`);
  
  // Enable recording
  const recording = true;
  console.log(`Recording: ${recording ? 'Enabled' : 'Disabled'}`);
  
  // Enable MongoDB logging
  const mongodbLogging = true;
  console.log(`MongoDB logging: ${mongodbLogging ? 'Enabled' : 'Disabled'}`);
  
  // Start timer
  const startTime = Date.now();
  
  try {
    // Make the outbound call request
    const response = await fetch(`${serverUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        prompt,
        first_message: firstMessage,
        name,
        region,
        recording,
        mongodb: mongodbLogging
      })
    });
    
    // End timer
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Parse response
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`Failed to initiate call: ${data.error || 'Unknown error'}`);
      console.error(`Details: ${data.details || 'No details provided'}`);
      console.error(`Error code: ${data.code || 'No error code'}`);
      console.error(`Request failed in ${duration.toFixed(2)} seconds`);
      return { success: false, error: data.error };
    }
    
    console.log('Call initiated successfully!');
    console.log(`Call SID: ${data.callSid}`);
    console.log(`Conversation ID: ${data.conversationId || 'undefined'}`);
    console.log(`MongoDB Document ID: ${data.mongodbId || 'Not available'}`);
    console.log(`Request completed in ${duration.toFixed(2)} seconds`);
    
    // Show timing breakdown if available
    if (data.timing) {
      console.log('Timing breakdown:');
      console.log(`  - total: ${data.timing.total}ms`);
      console.log(`  - signedUrl: ${data.timing.signedUrl}ms`);
      console.log(`  - dynamicVars: ${data.timing.dynamicVars}ms`);
      console.log(`  - twilioCall: ${data.timing.twilioCall}ms`);
    }
    
    return { success: true, callSid: data.callSid };
  } catch (error) {
    console.error(`Error making call: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\nMongoDB-Integrated Test Call Script (v1.0.0)');
  console.log('--------------------------------------------');
  console.log('Usage: node test-mongodb-call.js [phone_number] [prompt] [first_message] [server_url] [customer_name]');
  console.log('Examples:');
  console.log('  node test-mongodb-call.js                         # Call all numbers in VERIFIED_NUMBERS');
  console.log('  node test-mongodb-call.js +1234567890             # Call specific number');
  console.log('  node test-mongodb-call.js +1234567890 "Custom prompt" "Custom message"');
  console.log('  node test-mongodb-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io');
  console.log('  node test-mongodb-call.js +1234567890 "Default prompt" "Default message" https://your-ngrok-url.ngrok.io "John Smith"');
  console.log('');
  console.log('Note: This script requires the MongoDB-enabled server to be running.');
  console.log('Run the server with: npm run start-mongodb');
  console.log('');
  
  // Check if we have a phone number
  if (!phoneNumber) {
    console.error('Error: No phone number provided and VERIFIED_NUMBERS not set in .env');
    process.exit(1);
  }
  
  // If the phone number contains commas, it's a list of numbers
  const phoneNumbers = phoneNumber.split(',');
  
  console.log(`Will call ${phoneNumbers.length} numbers (${phoneNumber})`);
  console.log('');
  
  // Make calls to all numbers
  for (let i = 0; i < phoneNumbers.length; i++) {
    const number = phoneNumbers[i].trim();
    
    console.log(`Call ${i + 1} of ${phoneNumbers.length}`);
    await makeMongoDbCall(number, prompt, firstMessage, serverUrl, customerName);
    console.log('');
    
    // Wait between calls if there are multiple
    if (i < phoneNumbers.length - 1) {
      const delay = process.env.CALL_DELAY || 60000;
      console.log(`Waiting ${delay / 1000} seconds before next call...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('All calls completed!');
}

// Run the main function
main();