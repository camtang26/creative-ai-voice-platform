/**
 * Debug script for phone validation endpoint timeout
 */

import https from 'https';

const API_HOST = 'twilio-elevenlabs-app.onrender.com';
const API_PATH = '/api/validate-phone';

function makeRequest() {
  const data = JSON.stringify({ phoneNumber: '+14155552000' });

  const options = {
    hostname: API_HOST,
    port: 443,
    path: API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: 120000 // 2 minute timeout
  };

  console.log(`Making request to https://${API_HOST}${API_PATH}`);
  console.log('Request body:', data);
  console.log('Headers:', options.headers);

  const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response Headers:', res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
      console.log('Received chunk:', chunk.toString());
    });

    res.on('end', () => {
      console.log('Response complete');
      console.log('Full response:', responseData);
      try {
        const json = JSON.parse(responseData);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.on('timeout', () => {
    console.error('Request timed out after 2 minutes');
    req.destroy();
  });

  // Log when data is written
  console.log('Writing request body...');
  req.write(data);
  console.log('Ending request...');
  req.end();
}

// Also test if other endpoints work
async function testOtherEndpoints() {
  console.log('\n\nTesting other endpoints for comparison...\n');
  
  // Test /healthz endpoint
  const healthReq = https.get(`https://${API_HOST}/healthz`, (res) => {
    console.log(`/healthz status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('/healthz response:', data));
  });
  healthReq.on('error', err => console.error('/healthz error:', err));
  
  // Test /api/call-stats endpoint
  setTimeout(() => {
    const statsReq = https.get(`https://${API_HOST}/api/call-stats`, (res) => {
      console.log(`/api/call-stats status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => console.log('/api/call-stats response:', data.substring(0, 100) + '...'));
    });
    statsReq.on('error', err => console.error('/api/call-stats error:', err));
  }, 1000);
}

// Run the tests
console.log('Starting phone validation debug...\n');
makeRequest();
testOtherEndpoints();