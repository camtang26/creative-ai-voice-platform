#!/usr/bin/env node

/**
 * Test if a simple POST to the CSV endpoint returns something other than 404
 */

import fetch from 'node-fetch';

async function testSimplePost() {
  console.log('🧪 Testing simple POST to CSV endpoint...');
  
  try {
    const response = await fetch('https://twilioel-production.up.railway.app/api/db/campaigns/start-from-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimplePost();