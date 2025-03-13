import 'dotenv/config';
import fetch from 'node-fetch';

// Test the email API endpoint
async function testEmailApi() {
  try {
    console.log('Testing email API endpoint...');
    
    // Prepare the request
    const url = 'http://localhost:8000/api/email/send';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
    };
    const body = {
      to_email: 'test@example.com',
      subject: 'Test Email from API Test Script',
      content: 'This is a test email sent from our test script to verify the API endpoint is working correctly.',
      customer_name: 'Test User'
    };
    
    console.log('Sending request to:', url);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Body:', JSON.stringify(body, null, 2));
    
    // Send the request
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    // Parse the response
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ API test successful!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('\n❌ API test failed');
      console.error('Status:', response.status, response.statusText);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error during API test:', error);
  }
}

// Run the test
testEmailApi(); 