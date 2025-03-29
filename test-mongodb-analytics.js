/**
 * Test MongoDB Analytics API
 * 
 * This script tests the MongoDB analytics API endpoints to ensure they're working correctly.
 * It makes requests to the API endpoints and logs the responses.
 */

import fetch from 'node-fetch';

// Base URL for API requests
const API_BASE_URL = 'http://localhost:8000/api/db';

// Test functions
async function testRecentCalls() {
  console.log('\n--- Testing Recent Calls API ---');
  try {
    const response = await fetch(`${API_BASE_URL}/calls?limit=5&page=1`);
    
    if (!response.ok) {
      throw new Error(`Error fetching calls: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Success:', result.success);
    console.log('Total calls:', result.data?.pagination?.total || 'N/A');
    console.log('Call count:', result.data?.calls?.length || 0);
    
    if (result.data?.calls?.length > 0) {
      console.log('Sample call:', JSON.stringify(result.data.calls[0], null, 2));
    } else {
      console.log('No calls found');
    }
    
    return result.success;
  } catch (error) {
    console.error('Error testing recent calls:', error);
    return false;
  }
}

async function testCallLogs() {
  console.log('\n--- Testing Call Logs API ---');
  try {
    const response = await fetch(`${API_BASE_URL}/calls?limit=20&page=1`);
    
    if (!response.ok) {
      throw new Error(`Error fetching call logs: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Success:', result.success);
    console.log('Total calls:', result.data?.pagination?.total || 'N/A');
    console.log('Call count:', result.data?.calls?.length || 0);
    
    if (result.data?.calls?.length > 0) {
      console.log('Sample call fields:', Object.keys(result.data.calls[0]).join(', '));
    } else {
      console.log('No calls found');
    }
    
    return result.success;
  } catch (error) {
    console.error('Error testing call logs:', error);
    return false;
  }
}

async function testSuccessRateAnalytics() {
  console.log('\n--- Testing Success Rate Analytics API ---');
  try {
    // Add period parameter to ensure we get time-series data
    const response = await fetch(`${API_BASE_URL}/analytics/outcomes?period=day`);
    
    if (!response.ok) {
      throw new Error(`Error fetching success rate analytics: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Success:', result.success);
    
    if (result.data?.outcomes) {
      console.log('Outcomes count:', result.data.outcomes.length);
      console.log('Sample outcome:', JSON.stringify(result.data.outcomes[0], null, 2));
    } else {
      console.log('No outcomes data found');
      console.log('Response structure:', JSON.stringify(result, null, 2));
    }
    
    return result.success;
  } catch (error) {
    console.error('Error testing success rate analytics:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== MongoDB API Tests ===');
  
  const recentCallsSuccess = await testRecentCalls();
  const callLogsSuccess = await testCallLogs();
  const successRateSuccess = await testSuccessRateAnalytics();
  
  console.log('\n=== Test Results ===');
  console.log('Recent Calls API:', recentCallsSuccess ? 'PASS' : 'FAIL');
  console.log('Call Logs API:', callLogsSuccess ? 'PASS' : 'FAIL');
  console.log('Success Rate Analytics API:', successRateSuccess ? 'PASS' : 'FAIL');
  
  if (!recentCallsSuccess || !callLogsSuccess || !successRateSuccess) {
    console.log('\nSome tests failed. Please check the API endpoints and try again.');
  } else {
    console.log('\nAll tests passed!');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
