import 'dotenv/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function testSocketUpdates() {
  console.log('Testing Socket.IO updates...');
  console.log(`API URL: ${API_URL}`);
  
  try {
    // Test making a call
    console.log('\n1. Testing outbound call creation...');
    const response = await fetch(`${API_URL}/api/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: '+61488776655', // Test number
        prompt: 'Test call for Socket.IO updates',
        first_message: 'Hello, this is a test call to verify real-time updates.',
        name: 'Socket Test'
      })
    });
    
    const result = await response.json();
    console.log('Call creation result:', result);
    
    if (result.success) {
      console.log(`Call SID: ${result.call.sid}`);
      console.log('\nCheck your frontend dashboard to see if this call appears in real-time!');
      console.log('You should see:');
      console.log('1. The active calls count increment');
      console.log('2. The new call appear in the live calls list');
      console.log('3. Status updates as the call progresses');
    } else {
      console.error('Failed to create call:', result.error);
    }
    
  } catch (error) {
    console.error('Error testing Socket.IO updates:', error);
  }
}

// Run the test
testSocketUpdates();