/**
 * Test script for phone validation endpoint
 */

// Removed node-fetch import - using native fetch
async function testPhoneValidation() {
  const testCases = [
    { phoneNumber: '+14155552671' }, // Valid US E.164
    { phoneNumber: '4155552671' },   // Valid US 10-digit
    { phoneNumber: '14155552671' },  // Valid US 11-digit
    { phoneNumber: '123' },          // Invalid
    { phoneNumber: '' },             // Empty
    // Missing phoneNumber field
  ];

  // Test local server
  const localUrl = 'http://localhost:8000/api/validate-phone';
  
  console.log('Testing phone validation endpoint...\n');

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${JSON.stringify(testCase)}`);
      
      const response = await fetch(localUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase),
        timeout: 5000 // 5 second timeout
      });

      const result = await response.json();
      console.log(`Response (${response.status}):`, JSON.stringify(result, null, 2));
      console.log('---\n');
    } catch (error) {
      console.error(`Error testing ${JSON.stringify(testCase)}:`, error.message);
      console.log('---\n');
    }
  }

  // Test missing body
  try {
    console.log('Testing with no body:');
    const response = await fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    const result = await response.json();
    console.log(`Response (${response.status}):`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing no body:', error.message);
  }
}

// Run the test
testPhoneValidation().catch(console.error);