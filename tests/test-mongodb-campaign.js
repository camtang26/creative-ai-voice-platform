/**
 * MongoDB Campaign and Contact Test
 * Tests the campaign and contact functionality
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Test data
const testCampaignId = `TEST_CAMPAIGN_${Date.now()}`;
const testContactIds = [];

// Performance metrics
const metrics = {
  campaign: {
    create: [],
    get: [],
    update: [],
    delete: []
  },
  contact: {
    create: [],
    get: [],
    update: [],
    delete: []
  }
};

/**
 * Measure API response time
 * @param {string} url - API URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data and time
 */
async function measureApiResponse(url, options = {}) {
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    const end = performance.now();
    const time = end - start;
    
    return {
      success: response.ok,
      status: response.status,
      data,
      time
    };
  } catch (error) {
    const end = performance.now();
    const time = end - start;
    
    return {
      success: false,
      error: error.message,
      time
    };
  }
}

/**
 * Create a test campaign
 * @returns {Promise<Object>} Campaign data
 */
async function createTestCampaign() {
  console.log('\nCreating test campaign...');
  
  const campaignData = {
    name: `Test Campaign ${testCampaignId}`,
    description: 'Test campaign for MongoDB integration',
    status: 'draft',
    prompt: 'This is a test prompt for the campaign',
    firstMessage: 'Hello, this is a test message from our campaign',
    callerId: '+1234567890',
    region: 'us1',
    settings: {
      callDelay: 5000,
      maxConcurrentCalls: 2,
      retryCount: 1,
      retryDelay: 3600000
    }
  };
  
  const start = performance.now();
  
  try {
    const response = await fetch(`${serverUrl}/api/db/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });
    
    const data = await response.json();
    const end = performance.now();
    const time = end - start;
    
    metrics.campaign.create.push(time);
    
    if (response.ok && data.success) {
      console.log(`✅ Created test campaign: ${data.data.name} (${data.data._id})`);
      return data.data;
    } else {
      console.error(`❌ Failed to create test campaign: ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating test campaign: ${error.message}`);
    return null;
  }
}

/**
 * Create test contacts
 * @param {number} count - Number of contacts to create
 * @returns {Promise<Array>} Contact data array
 */
async function createTestContacts(count = 5) {
  console.log(`\nCreating ${count} test contacts...`);
  
  const contacts = [];
  
  for (let i = 0; i < count; i++) {
    const contactData = {
      phoneNumber: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: `Test Contact ${i + 1}`,
      email: `test${i + 1}@example.com`,
      tags: ['test', `group-${i % 3}`],
      notes: `Test contact ${i + 1} for MongoDB integration`,
      status: 'active',
      priority: i % 5
    };
    
    const start = performance.now();
    
    try {
      const response = await fetch(`${serverUrl}/api/db/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
      });
      
      const data = await response.json();
      const end = performance.now();
      const time = end - start;
      
      metrics.contact.create.push(time);
      
      if (response.ok && data.success) {
        console.log(`✅ Created test contact: ${data.data.name} (${data.data._id})`);
        contacts.push(data.data);
        testContactIds.push(data.data._id);
      } else {
        console.error(`❌ Failed to create test contact: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Error creating test contact: ${error.message}`);
    }
  }
  
  return contacts;
}

/**
 * Add contacts to campaign
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} contactIds - Contact IDs
 * @returns {Promise<boolean>} Success status
 */
async function addContactsToCampaign(campaignId, contactIds) {
  console.log(`\nAdding ${contactIds.length} contacts to campaign...`);
  
  try {
    const response = await fetch(`${serverUrl}/api/db/campaigns/${campaignId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contactIds })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ Added ${contactIds.length} contacts to campaign`);
      return true;
    } else {
      console.error(`❌ Failed to add contacts to campaign: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding contacts to campaign: ${error.message}`);
    return false;
  }
}

/**
 * Test campaign CRUD operations
 * @param {Object} campaign - Campaign data
 * @returns {Promise<void>}
 */
async function testCampaignCRUD(campaign) {
  console.log('\n=== Testing Campaign CRUD Operations ===');
  
  // Get campaign
  console.log('\nGetting campaign...');
  const getResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}`);
  
  if (getResponse.success) {
    console.log(`✅ Got campaign: ${getResponse.data.data.name}`);
    metrics.campaign.get.push(getResponse.time);
  } else {
    console.error(`❌ Failed to get campaign: ${getResponse.error || getResponse.data?.error || 'Unknown error'}`);
  }
  
  // Update campaign
  console.log('\nUpdating campaign...');
  const updateResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'Updated test campaign description',
      settings: {
        ...campaign.settings,
        maxConcurrentCalls: 3
      }
    })
  });
  
  if (updateResponse.success) {
    console.log(`✅ Updated campaign: ${updateResponse.data.data.name}`);
    metrics.campaign.update.push(updateResponse.time);
  } else {
    console.error(`❌ Failed to update campaign: ${updateResponse.error || updateResponse.data?.error || 'Unknown error'}`);
  }
  
  // Get campaign contacts
  console.log('\nGetting campaign contacts...');
  const contactsResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/contacts`);
  
  if (contactsResponse.success) {
    console.log(`✅ Got campaign contacts: ${contactsResponse.data.data.contacts.length} contacts`);
  } else {
    console.error(`❌ Failed to get campaign contacts: ${contactsResponse.error || contactsResponse.data?.error || 'Unknown error'}`);
  }
  
  // Get campaign stats
  console.log('\nGetting campaign stats...');
  const statsResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/stats`);
  
  if (statsResponse.success) {
    console.log(`✅ Got campaign stats`);
    console.log(`   Total contacts: ${statsResponse.data.data.contactCount}`);
  } else {
    console.error(`❌ Failed to get campaign stats: ${statsResponse.error || statsResponse.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test campaign status operations
 * @param {Object} campaign - Campaign data
 * @returns {Promise<void>}
 */
async function testCampaignStatusOperations(campaign) {
  console.log('\n=== Testing Campaign Status Operations ===');
  
  // Start campaign
  console.log('\nStarting campaign...');
  const startResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/start`, {
    method: 'POST'
  });
  
  if (startResponse.success) {
    console.log(`✅ Started campaign: ${startResponse.data.data.name}`);
    console.log(`   Status: ${startResponse.data.data.status}`);
  } else {
    console.error(`❌ Failed to start campaign: ${startResponse.error || startResponse.data?.error || 'Unknown error'}`);
  }
  
  // Pause campaign
  console.log('\nPausing campaign...');
  const pauseResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/pause`, {
    method: 'POST'
  });
  
  if (pauseResponse.success) {
    console.log(`✅ Paused campaign: ${pauseResponse.data.data.name}`);
    console.log(`   Status: ${pauseResponse.data.data.status}`);
  } else {
    console.error(`❌ Failed to pause campaign: ${pauseResponse.error || pauseResponse.data?.error || 'Unknown error'}`);
  }
  
  // Resume campaign
  console.log('\nResuming campaign...');
  const resumeResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/resume`, {
    method: 'POST'
  });
  
  if (resumeResponse.success) {
    console.log(`✅ Resumed campaign: ${resumeResponse.data.data.name}`);
    console.log(`   Status: ${resumeResponse.data.data.status}`);
  } else {
    console.error(`❌ Failed to resume campaign: ${resumeResponse.error || resumeResponse.data?.error || 'Unknown error'}`);
  }
  
  // Stop campaign
  console.log('\nStopping campaign...');
  const stopResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaign._id}/stop`, {
    method: 'POST'
  });
  
  if (stopResponse.success) {
    console.log(`✅ Stopped campaign: ${stopResponse.data.data.name}`);
    console.log(`   Status: ${stopResponse.data.data.status}`);
  } else {
    console.error(`❌ Failed to stop campaign: ${stopResponse.error || stopResponse.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test contact CRUD operations
 * @param {Object} contact - Contact data
 * @returns {Promise<void>}
 */
async function testContactCRUD(contact) {
  console.log('\n=== Testing Contact CRUD Operations ===');
  
  // Get contact
  console.log('\nGetting contact...');
  const getResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/${contact._id}`);
  
  if (getResponse.success) {
    console.log(`✅ Got contact: ${getResponse.data.data.name}`);
    metrics.contact.get.push(getResponse.time);
  } else {
    console.error(`❌ Failed to get contact: ${getResponse.error || getResponse.data?.error || 'Unknown error'}`);
  }
  
  // Update contact
  console.log('\nUpdating contact...');
  const updateResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/${contact._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notes: 'Updated test contact notes',
      priority: 5
    })
  });
  
  if (updateResponse.success) {
    console.log(`✅ Updated contact: ${updateResponse.data.data.name}`);
    metrics.contact.update.push(updateResponse.time);
  } else {
    console.error(`❌ Failed to update contact: ${updateResponse.error || updateResponse.data?.error || 'Unknown error'}`);
  }
  
  // Add tags to contact
  console.log('\nAdding tags to contact...');
  const addTagsResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/${contact._id}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tags: ['important', 'follow-up']
    })
  });
  
  if (addTagsResponse.success) {
    console.log(`✅ Added tags to contact: ${addTagsResponse.data.data.tags.join(', ')}`);
  } else {
    console.error(`❌ Failed to add tags to contact: ${addTagsResponse.error || addTagsResponse.data?.error || 'Unknown error'}`);
  }
  
  // Remove tags from contact
  console.log('\nRemoving tags from contact...');
  const removeTagsResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/${contact._id}/tags`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tags: ['follow-up']
    })
  });
  
  if (removeTagsResponse.success) {
    console.log(`✅ Removed tags from contact: ${removeTagsResponse.data.data.tags.join(', ')}`);
  } else {
    console.error(`❌ Failed to remove tags from contact: ${removeTagsResponse.error || removeTagsResponse.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test contact import
 * @returns {Promise<void>}
 */
async function testContactImport() {
  console.log('\n=== Testing Contact Import ===');
  
  const contacts = [
    {
      phoneNumber: '+12345678901',
      name: 'Import Contact 1',
      email: 'import1@example.com',
      tags: ['import', 'test']
    },
    {
      phoneNumber: '+12345678902',
      name: 'Import Contact 2',
      email: 'import2@example.com',
      tags: ['import', 'test']
    },
    {
      phoneNumber: '+12345678903',
      name: 'Import Contact 3',
      email: 'import3@example.com',
      tags: ['import', 'test']
    }
  ];
  
  const importResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contacts
    })
  });
  
  if (importResponse.success) {
    console.log(`✅ Imported contacts: ${importResponse.data.data.created} created, ${importResponse.data.data.updated} updated`);
  } else {
    console.error(`❌ Failed to import contacts: ${importResponse.error || importResponse.data?.error || 'Unknown error'}`);
  }
}

/**
 * Clean up test data
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} contactIds - Contact IDs
 * @returns {Promise<void>}
 */
async function cleanupTestData(campaignId, contactIds) {
  console.log('\n=== Cleaning Up Test Data ===');
  
  // Delete campaign
  console.log('\nDeleting campaign...');
  const deleteCampaignResponse = await measureApiResponse(`${serverUrl}/api/db/campaigns/${campaignId}`, {
    method: 'DELETE'
  });
  
  if (deleteCampaignResponse.success) {
    console.log(`✅ Deleted campaign: ${campaignId}`);
    metrics.campaign.delete.push(deleteCampaignResponse.time);
  } else {
    console.error(`❌ Failed to delete campaign: ${deleteCampaignResponse.error || deleteCampaignResponse.data?.error || 'Unknown error'}`);
  }
  
  // Delete contacts
  console.log('\nDeleting contacts...');
  
  for (const contactId of contactIds) {
    const deleteContactResponse = await measureApiResponse(`${serverUrl}/api/db/contacts/${contactId}`, {
      method: 'DELETE'
    });
    
    if (deleteContactResponse.success) {
      console.log(`✅ Deleted contact: ${contactId}`);
      metrics.contact.delete.push(deleteContactResponse.time);
    } else {
      console.error(`❌ Failed to delete contact: ${deleteContactResponse.error || deleteContactResponse.data?.error || 'Unknown error'}`);
    }
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('\n=== Performance Report ===');
  
  // Campaign metrics
  console.log('\nCampaign API Performance:');
  
  if (metrics.campaign.create.length > 0) {
    const createAvg = metrics.campaign.create.reduce((sum, time) => sum + time, 0) / metrics.campaign.create.length;
    console.log(`  Create: ${createAvg.toFixed(2)}ms`);
  }
  
  if (metrics.campaign.get.length > 0) {
    const getAvg = metrics.campaign.get.reduce((sum, time) => sum + time, 0) / metrics.campaign.get.length;
    console.log(`  Get: ${getAvg.toFixed(2)}ms`);
  }
  
  if (metrics.campaign.update.length > 0) {
    const updateAvg = metrics.campaign.update.reduce((sum, time) => sum + time, 0) / metrics.campaign.update.length;
    console.log(`  Update: ${updateAvg.toFixed(2)}ms`);
  }
  
  if (metrics.campaign.delete.length > 0) {
    const deleteAvg = metrics.campaign.delete.reduce((sum, time) => sum + time, 0) / metrics.campaign.delete.length;
    console.log(`  Delete: ${deleteAvg.toFixed(2)}ms`);
  }
  
  // Contact metrics
  console.log('\nContact API Performance:');
  
  if (metrics.contact.create.length > 0) {
    const createAvg = metrics.contact.create.reduce((sum, time) => sum + time, 0) / metrics.contact.create.length;
    console.log(`  Create: ${createAvg.toFixed(2)}ms`);
  }
  
  if (metrics.contact.get.length > 0) {
    const getAvg = metrics.contact.get.reduce((sum, time) => sum + time, 0) / metrics.contact.get.length;
    console.log(`  Get: ${getAvg.toFixed(2)}ms`);
  }
  
  if (metrics.contact.update.length > 0) {
    const updateAvg = metrics.contact.update.reduce((sum, time) => sum + time, 0) / metrics.contact.update.length;
    console.log(`  Update: ${updateAvg.toFixed(2)}ms`);
  }
  
  if (metrics.contact.delete.length > 0) {
    const deleteAvg = metrics.contact.delete.reduce((sum, time) => sum + time, 0) / metrics.contact.delete.length;
    console.log(`  Delete: ${deleteAvg.toFixed(2)}ms`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Campaign and Contact Test');
  console.log('=================================');
  console.log(`Server URL: ${serverUrl}`);
  
  try {
    // Create test campaign
    const campaign = await createTestCampaign();
    if (!campaign) {
      console.error('❌ Failed to create test campaign, aborting test');
      return;
    }
    
    // Create test contacts
    const contacts = await createTestContacts(5);
    if (contacts.length === 0) {
      console.error('❌ Failed to create test contacts, aborting test');
      return;
    }
    
    // Add contacts to campaign
    await addContactsToCampaign(campaign._id, testContactIds);
    
    // Test campaign CRUD operations
    await testCampaignCRUD(campaign);
    
    // Test campaign status operations
    await testCampaignStatusOperations(campaign);
    
    // Test contact CRUD operations
    await testContactCRUD(contacts[0]);
    
    // Test contact import
    await testContactImport();
    
    // Clean up test data
    await cleanupTestData(campaign._id, testContactIds);
    
    // Generate performance report
    generatePerformanceReport();
    
    console.log('\nCampaign and Contact Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  }
}

// Run the main function
main();