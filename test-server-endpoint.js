#!/usr/bin/env node

/**
 * Test if the server is responding and which routes are available
 */

import fetch from 'node-fetch';

async function testServerEndpoints() {
  console.log('🔍 Testing server endpoints...');
  
  try {
    // Test health endpoint
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch('https://twilioel-production.up.railway.app/healthz');
    console.log('Health Status:', healthResponse.status);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health Data:', healthData);
    }
    
    // Test a known working endpoint
    console.log('\n2️⃣ Testing campaigns list endpoint...');
    const campaignsResponse = await fetch('https://twilioel-production.up.railway.app/api/db/campaigns');
    console.log('Campaigns Status:', campaignsResponse.status);
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      console.log('Campaigns Success:', campaignsData.success);
      console.log('Campaigns Count:', campaignsData.data?.campaigns?.length || 0);
    }
    
    // Test the CSV endpoint with a simple GET to see if route exists
    console.log('\n3️⃣ Testing CSV endpoint route existence...');
    const csvGetResponse = await fetch('https://twilioel-production.up.railway.app/api/db/campaigns/start-from-csv');
    console.log('CSV GET Status:', csvGetResponse.status);
    console.log('Should be 405 (Method Not Allowed) if route exists but only accepts POST');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerEndpoints();