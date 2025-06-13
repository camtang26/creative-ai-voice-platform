/**
 * Debug campaign start issue
 */

const API_BASE_URL = 'https://twilio-elevenlabs-app.onrender.com';

async function debugCampaignStart() {
  // Create a test campaign with exact same data as E2E test
  const testCampaign = {
    name: 'Debug Test Campaign',
    description: 'Debug campaign start issue',
    prompt: 'You are a test assistant. This is a test call.',
    firstMessage: 'Hello, this is a test call for E2E testing.',
    callerId: '+14155551234',
    region: 'us1'
  };
  
  try {
    // Create campaign
    console.log('Creating campaign with:', JSON.stringify(testCampaign, null, 2));
    
    const createResponse = await fetch(`${API_BASE_URL}/api/db/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCampaign)
    });
    
    const createData = await createResponse.json();
    console.log('Create response:', createData);
    
    if (!createResponse.ok) {
      console.error('Failed to create campaign');
      return;
    }
    
    const campaignId = createData.data._id;
    console.log(`\nCampaign created with ID: ${campaignId}`);
    
    // Try to start the campaign
    console.log('\nAttempting to start campaign...');
    const startResponse = await fetch(`${API_BASE_URL}/api/db/campaigns/${campaignId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const startData = await startResponse.json();
    console.log('Start response status:', startResponse.status);
    console.log('Start response data:', JSON.stringify(startData, null, 2));
    
    // Clean up
    console.log('\nCleaning up...');
    await fetch(`${API_BASE_URL}/api/db/campaigns/${campaignId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    await fetch(`${API_BASE_URL}/api/db/campaigns/${campaignId}`, {
      method: 'DELETE'
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCampaignStart();