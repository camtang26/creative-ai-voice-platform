/**
 * Simulate Campaign Execution
 * This script simulates the execution of a campaign for testing purposes
 */
import 'dotenv/config';
import { initializeMongoDB } from './db/index.js';
import { startCampaign, pauseCampaign, resumeCampaign, stopCampaign, getActiveCampaigns } from './db/campaign-engine.js';

// Campaign ID to simulate
let campaignId = null;

/**
 * Create a test campaign
 * @returns {Promise<string>} Campaign ID
 */
async function createTestCampaign() {
  try {
    console.log('Creating test campaign...');
    
    const { campaign } = await fetch(`${process.env.SERVER_URL || 'http://localhost:8000'}/api/db/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Test Campaign ${Date.now()}`,
        description: 'Test campaign for simulation',
        status: 'draft',
        prompt: 'This is a test prompt for the campaign',
        firstMessage: 'Hello, this is a test message from our campaign',
        callerId: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        region: 'us1',
        settings: {
          callDelay: 5000,
          maxConcurrentCalls: 2,
          retryCount: 1,
          retryDelay: 3600000
        }
      })
    }).then(res => res.json());
    
    if (!campaign || !campaign.data || !campaign.data._id) {
      throw new Error('Failed to create campaign');
    }
    
    console.log(`Created test campaign: ${campaign.data.name} (${campaign.data._id})`);
    
    return campaign.data._id;
  } catch (error) {
    console.error('Error creating test campaign:', error);
    throw error;
  }
}

/**
 * Create test contacts
 * @param {string} campaignId - Campaign ID
 * @param {number} count - Number of contacts to create
 * @returns {Promise<Array>} Contact IDs
 */
async function createTestContacts(campaignId, count = 5) {
  try {
    console.log(`Creating ${count} test contacts...`);
    
    const contactIds = [];
    
    for (let i = 0; i < count; i++) {
      const response = await fetch(`${process.env.SERVER_URL || 'http://localhost:8000'}/api/db/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          name: `Test Contact ${i + 1}`,
          email: `test${i + 1}@example.com`,
          tags: ['test', `group-${i % 3}`],
          notes: `Test contact ${i + 1} for campaign simulation`,
          status: 'active',
          priority: i % 5,
          campaignIds: [campaignId]
        })
      }).then(res => res.json());
      
      if (response.success && response.data && response.data._id) {
        console.log(`Created test contact: ${response.data.name} (${response.data._id})`);
        contactIds.push(response.data._id);
      } else {
        console.error(`Failed to create test contact: ${response.error || 'Unknown error'}`);
      }
    }
    
    console.log(`Created ${contactIds.length} test contacts`);
    
    return contactIds;
  } catch (error) {
    console.error('Error creating test contacts:', error);
    throw error;
  }
}

/**
 * Add contacts to campaign
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} contactIds - Contact IDs
 * @returns {Promise<void>}
 */
async function addContactsToCampaign(campaignId, contactIds) {
  try {
    console.log(`Adding ${contactIds.length} contacts to campaign...`);
    
    const response = await fetch(`${process.env.SERVER_URL || 'http://localhost:8000'}/api/db/campaigns/${campaignId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contactIds })
    }).then(res => res.json());
    
    if (response.success) {
      console.log(`Added ${contactIds.length} contacts to campaign`);
    } else {
      console.error(`Failed to add contacts to campaign: ${response.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error adding contacts to campaign:', error);
    throw error;
  }
}

/**
 * Simulate campaign execution
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<void>}
 */
async function simulateCampaignExecution(campaignId) {
  try {
    console.log(`Simulating campaign execution for campaign: ${campaignId}`);
    
    // Start campaign
    console.log('Starting campaign...');
    await startCampaign(campaignId);
    
    // Wait for 10 seconds
    console.log('Waiting for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Get active campaigns
    const activeCampaigns = getActiveCampaigns();
    console.log('Active campaigns:', JSON.stringify(activeCampaigns, null, 2));
    
    // Pause campaign
    console.log('Pausing campaign...');
    await pauseCampaign(campaignId);
    
    // Wait for 5 seconds
    console.log('Waiting for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Resume campaign
    console.log('Resuming campaign...');
    await resumeCampaign(campaignId);
    
    // Wait for 10 seconds
    console.log('Waiting for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Stop campaign
    console.log('Stopping campaign...');
    await stopCampaign(campaignId);
    
    console.log('Campaign simulation completed');
  } catch (error) {
    console.error('Error simulating campaign execution:', error);
  }
}

/**
 * Clean up test data
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<void>}
 */
async function cleanupTestData(campaignId) {
  try {
    console.log('Cleaning up test data...');
    
    // Delete campaign
    const response = await fetch(`${process.env.SERVER_URL || 'http://localhost:8000'}/api/db/campaigns/${campaignId}`, {
      method: 'DELETE'
    }).then(res => res.json());
    
    if (response.success) {
      console.log(`Deleted test campaign: ${campaignId}`);
    } else {
      console.error(`Failed to delete test campaign: ${response.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Campaign Simulation');
    console.log('===================');
    
    // Initialize MongoDB
    await initializeMongoDB();
    
    // Create test campaign
    campaignId = await createTestCampaign();
    
    // Create test contacts
    const contactIds = await createTestContacts(campaignId, 5);
    
    // Add contacts to campaign
    await addContactsToCampaign(campaignId, contactIds);
    
    // Simulate campaign execution
    await simulateCampaignExecution(campaignId);
    
    // Clean up test data
    await cleanupTestData(campaignId);
    
    console.log('Simulation completed');
    process.exit(0);
  } catch (error) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  
  if (campaignId) {
    await stopCampaign(campaignId);
    await cleanupTestData(campaignId);
  }
  
  process.exit(0);
});

// Run the main function
main();