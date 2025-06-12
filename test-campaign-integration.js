/**
 * Test Campaign Integration
 * This script tests the campaign functionality after fixes
 */
import 'dotenv/config';

const API_URL = process.env.SERVER_URL || 'http://localhost:8000';

/**
 * Create a test campaign
 */
async function createTestCampaign() {
  try {
    console.log('Creating test campaign...');
    
    const response = await fetch(`${API_URL}/api/db/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Integration Test Campaign ${Date.now()}`,
        description: 'Testing campaign engine integration',
        status: 'draft',
        prompt: 'You are a friendly AI assistant testing the campaign system. Keep the call brief and professional.',
        firstMessage: 'Hello {name}, this is a test call from our AI system. Is this a good time for a quick test?',
        callerId: process.env.TWILIO_PHONE_NUMBER,
        region: 'au1',
        settings: {
          callDelay: 5000,
          maxConcurrentCalls: 1,
          retryCount: 0
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ Created campaign: ${result.data.name} (ID: ${result.data._id})`);
      return result.data._id;
    } else {
      throw new Error(result.error || 'Failed to create campaign');
    }
  } catch (error) {
    console.error('✗ Error creating campaign:', error);
    throw error;
  }
}

/**
 * Create a test contact
 */
async function createTestContact(campaignId) {
  try {
    console.log('Creating test contact...');
    
    // Replace with a real test phone number
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';
    
    const response = await fetch(`${API_URL}/api/db/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: testPhoneNumber,
        name: 'Test Contact',
        email: 'test@example.com',
        status: 'active',
        campaignIds: [campaignId]
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ Created contact: ${result.data.name} (${result.data.phoneNumber})`);
      return result.data._id;
    } else {
      throw new Error(result.error || 'Failed to create contact');
    }
  } catch (error) {
    console.error('✗ Error creating contact:', error);
    throw error;
  }
}

/**
 * Add contact to campaign
 */
async function addContactToCampaign(campaignId, contactId) {
  try {
    console.log('Adding contact to campaign...');
    
    const response = await fetch(`${API_URL}/api/db/campaigns/${campaignId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactIds: [contactId]
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Added contact to campaign');
      return true;
    } else {
      throw new Error(result.error || 'Failed to add contact');
    }
  } catch (error) {
    console.error('✗ Error adding contact:', error);
    throw error;
  }
}

/**
 * Start the campaign
 */
async function startCampaign(campaignId) {
  try {
    console.log('Starting campaign...');
    
    const response = await fetch(`${API_URL}/api/db/campaigns/${campaignId}/start`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Campaign started successfully');
      return true;
    } else {
      throw new Error(result.error || 'Failed to start campaign');
    }
  } catch (error) {
    console.error('✗ Error starting campaign:', error);
    throw error;
  }
}

/**
 * Check campaign status
 */
async function checkCampaignStatus(campaignId) {
  try {
    const response = await fetch(`${API_URL}/api/db/campaigns/${campaignId}/stats`);
    const result = await response.json();
    
    if (result.success) {
      console.log('\nCampaign Status:');
      console.log(`- Name: ${result.data.campaign.name}`);
      console.log(`- Status: ${result.data.campaign.status}`);
      console.log(`- Total Contacts: ${result.data.stats.totalContacts}`);
      console.log(`- Calls Placed: ${result.data.stats.callsPlaced}`);
      console.log(`- Calls Completed: ${result.data.stats.callsCompleted}`);
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to get status');
    }
  } catch (error) {
    console.error('✗ Error checking status:', error);
    throw error;
  }
}

/**
 * Stop the campaign
 */
async function stopCampaign(campaignId) {
  try {
    console.log('\nStopping campaign...');
    
    const response = await fetch(`${API_URL}/api/db/campaigns/${campaignId}/stop`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Campaign stopped');
      return true;
    } else {
      throw new Error(result.error || 'Failed to stop campaign');
    }
  } catch (error) {
    console.error('✗ Error stopping campaign:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('Campaign Integration Test');
  console.log('========================\n');
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.error('❌ TWILIO_PHONE_NUMBER not set in environment');
    process.exit(1);
  }
  
  let campaignId = null;
  
  try {
    // Create campaign
    campaignId = await createTestCampaign();
    
    // Create contact
    const contactId = await createTestContact(campaignId);
    
    // Add contact to campaign
    await addContactToCampaign(campaignId, contactId);
    
    // Start campaign
    await startCampaign(campaignId);
    
    // Wait and check status
    console.log('\nWaiting 10 seconds for campaign to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check status
    await checkCampaignStatus(campaignId);
    
    // Stop campaign
    await stopCampaign(campaignId);
    
    console.log('\n✅ Campaign integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Try to stop campaign if it was created
    if (campaignId) {
      try {
        await stopCampaign(campaignId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('Starting test in 3 seconds...\n');
setTimeout(runTest, 3000);