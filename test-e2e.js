/**
 * End-to-End Testing Script for ElevenLabs Outbound Calling
 * Tests all major functionality and cleans up afterwards
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://twilio-elevenlabs-app.onrender.com';

// Test data
const testContact = {
  name: 'E2E Test Contact',
  phoneNumber: '+14155552000', // Test number
  email: 'e2e-test@example.com',
  status: 'active',
  tags: ['test', 'e2e']
};

const testCampaign = {
  name: 'E2E Test Campaign',
  description: 'End-to-end test campaign - DELETE AFTER TEST',
  prompt_template: 'You are a test assistant. This is a test call.',
  first_message_template: 'Hello {name}, this is a test call for E2E testing.',
  schedule: {
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    max_concurrent_calls: 1,
    call_interval_ms: 60000
  }
};

// Keep track of created resources for cleanup
const createdResources = {
  contactIds: [],
  campaignIds: [],
  callSids: []
};

// Helper functions
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
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

// Test functions
async function testCreateContact() {
  console.log('\n🧪 Testing: Create Contact');
  
  try {
    const result = await makeRequest('/api/db/contacts', {
      method: 'POST',
      body: JSON.stringify(testContact)
    });
    
    if (result.success && result.data) {
      console.log(`✅ Contact created with ID: ${result.data._id}`);
      createdResources.contactIds.push(result.data._id);
      return result.data;
    } else {
      throw new Error('Failed to create contact');
    }
  } catch (error) {
    console.error(`❌ Create contact test failed: ${error.message}`);
    throw error;
  }
}

async function testFetchContacts() {
  console.log('\n🧪 Testing: Fetch Contacts');
  
  try {
    const result = await makeRequest('/api/db/contacts?limit=10');
    
    if (result.success && result.data) {
      console.log(`✅ Fetched ${result.data.contacts.length} contacts`);
      return result.data;
    } else {
      throw new Error('Failed to fetch contacts');
    }
  } catch (error) {
    console.error(`❌ Fetch contacts test failed: ${error.message}`);
    throw error;
  }
}

async function testBulkDeleteContacts() {
  console.log('\n🧪 Testing: Bulk Delete Contacts');
  
  if (createdResources.contactIds.length === 0) {
    console.log('⚠️ No contacts to delete, skipping test');
    return;
  }
  
  try {
    const result = await makeRequest('/api/db/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ contactIds: createdResources.contactIds })
    });
    
    if (result.success && result.data) {
      console.log(`✅ Bulk delete successful: ${result.data.success} deleted, ${result.data.failed} failed`);
      createdResources.contactIds = []; // Clear deleted IDs
      return result.data;
    } else {
      throw new Error('Failed to bulk delete contacts');
    }
  } catch (error) {
    console.error(`❌ Bulk delete test failed: ${error.message}`);
    throw error;
  }
}

async function testCreateCampaign() {
  console.log('\n🧪 Testing: Create Campaign');
  
  try {
    const result = await makeRequest('/api/db/campaigns', {
      method: 'POST',
      body: JSON.stringify(testCampaign)
    });
    
    if (result.success && result.data) {
      console.log(`✅ Campaign created with ID: ${result.data._id}`);
      createdResources.campaignIds.push(result.data._id);
      return result.data;
    } else {
      throw new Error('Failed to create campaign');
    }
  } catch (error) {
    console.error(`❌ Create campaign test failed: ${error.message}`);
    throw error;
  }
}

async function testCampaignOperations(campaignId) {
  console.log('\n🧪 Testing: Campaign Start/Pause/Cancel');
  
  try {
    // Test starting campaign
    console.log('  📍 Starting campaign...');
    let result = await makeRequest(`/api/db/campaigns/${campaignId}/start`, {
      method: 'POST'
    });
    
    if (result.success) {
      console.log('  ✅ Campaign started successfully');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test pausing campaign
    console.log('  📍 Pausing campaign...');
    result = await makeRequest(`/api/db/campaigns/${campaignId}/pause`, {
      method: 'POST'
    });
    
    if (result.success) {
      console.log('  ✅ Campaign paused successfully');
    }
    
    // Test canceling campaign
    console.log('  📍 Canceling campaign...');
    result = await makeRequest(`/api/db/campaigns/${campaignId}/cancel`, {
      method: 'POST'
    });
    
    if (result.success) {
      console.log('  ✅ Campaign canceled successfully');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Campaign operations test failed: ${error.message}`);
    throw error;
  }
}

async function testPhoneValidation() {
  console.log('\n🧪 Testing: Phone Number Validation');
  
  const testNumbers = [
    { number: '+14155552000', expected: true },
    { number: '14155552000', expected: true },
    { number: '415-555-2000', expected: true },
    { number: 'invalid', expected: false },
    { number: '', expected: false }
  ];
  
  let passed = 0;
  
  for (const test of testNumbers) {
    try {
      const result = await makeRequest('/api/validate-phone', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: test.number })
      });
      
      const isValid = result.success && result.isValid;
      if (isValid === test.expected) {
        console.log(`  ✅ "${test.number}" validation: ${isValid} (expected)`);
        passed++;
      } else {
        console.log(`  ❌ "${test.number}" validation: ${isValid} (expected ${test.expected})`);
      }
    } catch (error) {
      if (!test.expected) {
        console.log(`  ✅ "${test.number}" validation: error (expected invalid)`);
        passed++;
      } else {
        console.log(`  ❌ "${test.number}" validation: error (expected valid)`);
      }
    }
  }
  
  console.log(`✅ Phone validation tests: ${passed}/${testNumbers.length} passed`);
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete any remaining contacts
  if (createdResources.contactIds.length > 0) {
    console.log(`  📍 Deleting ${createdResources.contactIds.length} test contacts...`);
    for (const id of createdResources.contactIds) {
      try {
        await makeRequest(`/api/db/contacts/${id}`, { method: 'DELETE' });
        console.log(`  ✅ Deleted contact ${id}`);
      } catch (error) {
        console.log(`  ⚠️ Failed to delete contact ${id}: ${error.message}`);
      }
    }
  }
  
  // Delete any test campaigns
  if (createdResources.campaignIds.length > 0) {
    console.log(`  📍 Deleting ${createdResources.campaignIds.length} test campaigns...`);
    for (const id of createdResources.campaignIds) {
      try {
        // First cancel if running
        await makeRequest(`/api/db/campaigns/${id}/cancel`, { method: 'POST' }).catch(() => {});
        // Then delete
        await makeRequest(`/api/db/campaigns/${id}`, { method: 'DELETE' });
        console.log(`  ✅ Deleted campaign ${id}`);
      } catch (error) {
        console.log(`  ⚠️ Failed to delete campaign ${id}: ${error.message}`);
      }
    }
  }
  
  console.log('✅ Cleanup complete');
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting End-to-End Tests');
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log('=' .repeat(50));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Create Contact', fn: testCreateContact },
    { name: 'Fetch Contacts', fn: testFetchContacts },
    { name: 'Create Campaign', fn: testCreateCampaign },
    { name: 'Phone Validation', fn: testPhoneValidation }
  ];
  
  // Run tests
  for (const test of tests) {
    results.total++;
    try {
      const result = await test.fn();
      
      // Special handling for campaign operations
      if (test.name === 'Create Campaign' && result && result._id) {
        results.total++;
        try {
          await testCampaignOperations(result._id);
          results.passed++;
        } catch (error) {
          results.failed++;
        }
      }
      
      results.passed++;
    } catch (error) {
      results.failed++;
    }
  }
  
  // Test bulk delete at the end
  results.total++;
  try {
    await testBulkDeleteContacts();
    results.passed++;
  } catch (error) {
    results.failed++;
  }
  
  // Always run cleanup
  await cleanup();
  
  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  cleanup().then(() => process.exit(1));
});