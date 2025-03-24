/**
 * ALTERNATIVE IMPLEMENTATION: Direct Twilio-ElevenLabs integration with custom first message
 * 
 * This file provides a simpler alternative to the server.js + outbound.js approach.
 * It directly connects Twilio to ElevenLabs without requiring a local server.
 * 
 * To run this file directly: node custom-message.js <phone-number> "<custom-message>" ["<customer-name>"]
 */

// Load environment variables
import 'dotenv/config';

// Import the Twilio module
import twilio from 'twilio';

// Your Twilio and ElevenLabs credentials from .env
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Create Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Make an outbound call with a custom first message
 * @param {string} toNumber - Phone number to call in E.164 format
 * @param {string} firstMessage - Custom message for agent to say
 * @param {string} customerName - Name of the customer (optional)
 */
async function makeCustomCall(toNumber, firstMessage, customerName = '') {
  try {
    // Include API key in the webhook URL
    let webhookUrl = `https://api.us.elevenlabs.io/twilio/outbound_call?agent_id=${ELEVENLABS_AGENT_ID}&api_key=${ELEVENLABS_API_KEY}`;
    
    // Add custom message parameter (URL encoded)
    if (firstMessage) {
      webhookUrl += `&first_message=${encodeURIComponent(firstMessage)}`;
    }
    
    // Add customer name if provided
    if (customerName) {
      // This will be available to your agent as a variable
      webhookUrl += `&customer_name=${encodeURIComponent(customerName)}`;
    }
    
    console.log(`Calling ${toNumber} from ${TWILIO_PHONE_NUMBER}...`);
    console.log(`Custom message: "${firstMessage}"`);
    if (customerName) console.log(`Customer name: ${customerName}`);
    
    // Create an outbound call
    const call = await twilioClient.calls.create({
      to: toNumber,
      from: TWILIO_PHONE_NUMBER,
      url: webhookUrl,
      method: 'POST'
    });
    
    console.log(`Call SID: ${call.sid}`);
    return call;
  } catch (error) {
    console.error(`Error making call to ${toNumber}:`, error);
  }
}

// Example usage
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node custom-message.js <phone-number> "<custom-message>" ["<customer-name>"]');
    process.exit(1);
  }
  
  const phoneNumber = args[0];
  const message = args[1];
  const customerName = args[2] || '';
  
  await makeCustomCall(phoneNumber, message, customerName);
  console.log('Call initiated successfully!');
}

// Run the main function
main();