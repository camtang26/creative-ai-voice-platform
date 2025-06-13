/**
 * Simple test for phone validation endpoint
 */

const API_BASE_URL = 'https://twilio-elevenlabs-app.onrender.com';

async function testPhoneValidation() {
  console.log('Testing phone validation endpoint...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber: '+14155552000' }),
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }
    
    const data = await response.json();
    console.log('Success:', data);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timed out after 10 seconds');
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Run test
testPhoneValidation().then(success => {
  process.exit(success ? 0 : 1);
});