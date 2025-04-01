/**
 * ElevenLabs Webhook Simulator
 * 
 * This script simulates an ElevenLabs webhook event to test transcript storage in MongoDB.
 * It sends a simulated transcript to the server's webhook endpoint.
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Default values
const DEFAULT_SERVER_URL = "http://localhost:8000";

// Get server URL from environment or default to localhost
const SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;

// Command line arguments
const args = process.argv.slice(2);
const callSidArg = args[0]; // Call SID to associate the transcript with
const serverUrl = args[1] || SERVER_URL;

if (!callSidArg) {
  console.error('Error: No Call SID provided. Please provide a Call SID as the first argument.');
  console.error('Usage: node simulate-elevenlabs-webhook.js <call_sid> [server_url]');
  process.exit(1);
}

/**
 * Generate a signature for the webhook payload
 * @param {string} payload - The webhook payload as a string
 * @param {string} secret - The webhook secret
 * @returns {string} The signature
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Simulate an ElevenLabs webhook event
 * @param {string} callSid - The Twilio Call SID to associate the transcript with
 * @returns {Promise<boolean>} Whether the webhook was successfully sent
 */
async function simulateWebhook(callSid) {
  try {
    console.log(`Simulating ElevenLabs webhook for Call SID: ${callSid}`);
    console.log(`Using server: ${serverUrl}`);
    
    // Sample transcript data
    const transcript = [
      {
        role: "assistant",
        text: "Hello, this is an AI assistant from ElevenLabs. I'm calling to test our MongoDB integration. May I please speak with you?",
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        role: "user",
        text: "Yes, this is me. How can I help you?",
        timestamp: new Date(Date.now() - 45000).toISOString()
      },
      {
        role: "assistant",
        text: "Thank you for taking my call. I'm just testing our MongoDB integration. How are you doing today?",
        timestamp: new Date(Date.now() - 30000).toISOString()
      },
      {
        role: "user",
        text: "I'm doing well, thanks for asking. Is this just a test call?",
        timestamp: new Date(Date.now() - 15000).toISOString()
      },
      {
        role: "assistant",
        text: "Yes, this is just a test call to verify our MongoDB integration is working correctly. Thank you for participating in this test. Have a great day!",
        timestamp: new Date().toISOString()
      }
    ];
    
    // Create webhook payload
    const payload = {
      event: "call.transcript",
      callId: callSid,
      conversationId: `conv_${crypto.randomUUID()}`,
      transcript: transcript,
      sentiment: {
        overall: 0.75, // Positive sentiment
        segments: [
          { role: "assistant", score: 0.8 },
          { role: "user", score: 0.7 },
          { role: "assistant", score: 0.8 },
          { role: "user", score: 0.7 },
          { role: "assistant", score: 0.8 }
        ]
      },
      metadata: {
        duration: 120,
        wordCount: 85,
        callStartTime: new Date(Date.now() - 120000).toISOString(),
        callEndTime: new Date().toISOString()
      }
    };
    
    // Convert payload to string for signature
    const payloadString = JSON.stringify(payload);
    
    // Generate signature using the webhook secret from .env
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    const signature = generateSignature(payloadString, webhookSecret);
    
    // Make the API call to the server's webhook endpoint
    const response = await fetch(`${serverUrl}/elevenlabs-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Signature': signature
      },
      body: payloadString,
    });

    const data = await response.text();
    
    if (response.ok) {
      console.log('Webhook sent successfully!');
      console.log(`Response: ${data}`);
      return true;
    } else {
      console.error('Failed to send webhook:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending webhook:', error.message);
    console.error(`Make sure your server is running at ${serverUrl}`);
    return false;
  }
}

console.log(`
ElevenLabs Webhook Simulator (v1.0.0)
-------------------------------------
Simulating a webhook event for Call SID: ${callSidArg}
Server URL: ${serverUrl}
`);

// Simulate the webhook
simulateWebhook(callSidArg);