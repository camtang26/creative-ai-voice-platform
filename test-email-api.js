import 'dotenv/config';
import fetch from 'node-fetch';

// Get the server URL from environment or use localhost
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;

// Function to test the email API
async function testEmailAPI() {
  console.log('===== TESTING EMAIL API ENDPOINT =====');
  console.log(`Server URL: ${SERVER_URL}`);
  
  if (!EMAIL_API_KEY) {
    console.error('❌ ERROR: EMAIL_API_KEY is not set in your .env file');
    process.exit(1);
  }
  
  // Create a test email
  const testEmail = {
    to_email: 'craig@elevenlabs.io', // Replace with your test email
    subject: 'Test Email from ElevenLabs AI API',
    content: `
      <h1>This is a test email from the ElevenLabs AI API</h1>
      <p>If you're seeing this, the email API endpoint is working!</p>
      <p>This email was sent at: ${new Date().toISOString()}</p>
      <hr />
      <p><em>This is an automated test message.</em></p>
    `,
    customer_name: 'API Test User'
  };
  
  try {
    console.log(`Sending test email to ${testEmail.to_email}...`);
    
    // Make the API request
    const response = await fetch(`${SERVER_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_API_KEY}`
      },
      body: JSON.stringify(testEmail)
    });
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('\n❌ ERROR: Server did not return JSON');
      console.error(`Content-Type: ${contentType}`);
      console.error(`Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response text (first 200 chars):', text.substring(0, 200));
      return;
    }
    
    // Parse the response
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS: Email API request was successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.testMode) {
        console.log(`\n📩 TEST EMAIL PREVIEW: ${result.previewUrl}`);
        console.log('(Open this URL to view the test email)');
      }
    } else {
      console.error('\n❌ ERROR: Email API request failed');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Error details:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\n❌ ERROR: Failed to connect to the API');
    console.error(`Error details: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nCONNECTION ERROR TROUBLESHOOTING:');
      console.log('1. Make sure the server is running (npm start)');
      console.log('2. Check if the SERVER_URL is correct in your .env file');
      console.log('3. If using ngrok, verify the tunnel is active');
    }
  }
}

// Run the test
testEmailAPI(); 