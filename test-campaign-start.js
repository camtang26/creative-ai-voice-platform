/**
 * Test campaign start functionality with different scenarios
 */

const API_BASE_URL = 'https://twilio-elevenlabs-app.onrender.com';

// Test data
const testContact = {
  name: 'Campaign Test Contact',
  phoneNumber: `+1415555${Math.floor(Math.random() * 9000) + 1000}`,
  email: `campaign-test-${Date.now()}@example.com`,
  status: 'active'
};

const minimalCampaign = {
  name: 'Minimal Test Campaign',
  description: 'Testing minimal campaign requirements'
};

const completeCampaign = {
  name: 'Complete Test Campaign',
  description: 'Testing with all fields',
  callerId: '+14155551234', // This would need to be a real Twilio number
  prompt: 'You are a helpful AI assistant calling on behalf of Test Company.',
  firstMessage: 'Hello, this is a test call from Test Company. Is now a good time to talk?',
  region: 'us1'
};

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`📡 ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
      return { success: false, error: data.error || data.message, status: response.status };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Campaign Start Requirements\n');
  
  const results = {
    scenarios: []
  };
  
  // Scenario 1: Minimal campaign without contacts
  console.log('📋 Scenario 1: Minimal campaign without contacts');
  let result = await makeRequest('/api/db/campaigns', {
    method: 'POST',
    body: JSON.stringify(minimalCampaign)
  });
  
  if (result.success) {
    const campaignId = result.data.data._id;
    console.log(`✅ Created campaign: ${campaignId}`);
    
    // Try to start it
    result = await makeRequest(`/api/db/campaigns/${campaignId}/start`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    results.scenarios.push({
      name: 'Minimal campaign without contacts',
      created: true,
      started: result.success,
      error: result.error,
      status: result.status
    });
    
    // Cleanup
    await makeRequest(`/api/db/campaigns/${campaignId}/cancel`, { method: 'POST', body: '{}' });
    await makeRequest(`/api/db/campaigns/${campaignId}`, { method: 'DELETE' });
  }
  
  console.log('\n📋 Scenario 2: Complete campaign without contacts');
  result = await makeRequest('/api/db/campaigns', {
    method: 'POST',
    body: JSON.stringify(completeCampaign)
  });
  
  if (result.success) {
    const campaignId = result.data.data._id;
    console.log(`✅ Created campaign: ${campaignId}`);
    
    // Try to start it
    result = await makeRequest(`/api/db/campaigns/${campaignId}/start`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    results.scenarios.push({
      name: 'Complete campaign without contacts',
      created: true,
      started: result.success,
      error: result.error,
      status: result.status
    });
    
    // Cleanup
    await makeRequest(`/api/db/campaigns/${campaignId}/cancel`, { method: 'POST', body: '{}' });
    await makeRequest(`/api/db/campaigns/${campaignId}`, { method: 'DELETE' });
  }
  
  console.log('\n📋 Scenario 3: Complete campaign with contacts');
  // First create a contact
  result = await makeRequest('/api/db/contacts', {
    method: 'POST',
    body: JSON.stringify(testContact)
  });
  
  if (result.success) {
    const contactId = result.data.data._id;
    console.log(`✅ Created contact: ${contactId}`);
    
    // Create campaign
    result = await makeRequest('/api/db/campaigns', {
      method: 'POST',
      body: JSON.stringify(completeCampaign)
    });
    
    if (result.success) {
      const campaignId = result.data.data._id;
      console.log(`✅ Created campaign: ${campaignId}`);
      
      // Add contact to campaign
      result = await makeRequest(`/api/db/campaigns/${campaignId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactIds: [contactId] })
      });
      
      if (result.success) {
        console.log(`✅ Added contact to campaign`);
        
        // Try to start it
        result = await makeRequest(`/api/db/campaigns/${campaignId}/start`, {
          method: 'POST',
          body: JSON.stringify({})
        });
        
        results.scenarios.push({
          name: 'Complete campaign with contacts',
          created: true,
          started: result.success,
          error: result.error,
          status: result.status
        });
        
        // Cleanup
        await makeRequest(`/api/db/campaigns/${campaignId}/cancel`, { method: 'POST', body: '{}' });
        await makeRequest(`/api/db/campaigns/${campaignId}`, { method: 'DELETE' });
      }
      
      // Delete contact
      await makeRequest(`/api/db/contacts/${contactId}`, { method: 'DELETE' });
    }
  }
  
  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log('═'.repeat(50));
  results.scenarios.forEach(scenario => {
    console.log(`\n${scenario.name}:`);
    console.log(`  Created: ${scenario.created ? '✅' : '❌'}`);
    console.log(`  Started: ${scenario.started ? '✅' : '❌'}`);
    if (!scenario.started) {
      console.log(`  Error: ${scenario.error} (HTTP ${scenario.status})`);
    }
  });
}

runTests().catch(console.error);