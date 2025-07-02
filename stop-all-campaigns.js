/**
 * Emergency script to stop all active campaigns and reset stuck contacts
 * Use this when campaigns are repeatedly calling due to balance issues
 */
import { connectToDatabase, closeConnection } from './db/mongodb-connection.js';
import { getCampaignRepository, getContactRepository } from './db/index.js';
import { stopCampaign } from './db/campaign-engine.js';

async function stopAllCampaigns() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    
    const campaignRepo = getCampaignRepository();
    const contactRepo = getContactRepository();
    
    // Get all active campaigns
    const activeCampaigns = await campaignRepo.getCampaigns(
      { status: 'active' },
      { limit: 1000 }
    );
    
    console.log(`Found ${activeCampaigns.campaigns.length} active campaigns`);
    
    // Stop each active campaign
    for (const campaign of activeCampaigns.campaigns) {
      console.log(`Stopping campaign: ${campaign.name} (${campaign._id})`);
      
      // Update status to completed
      await campaignRepo.updateCampaignStatus(campaign._id, 'completed');
      
      // Try to stop via engine (may not be in memory)
      try {
        await stopCampaign(campaign._id);
      } catch (error) {
        console.log(`Campaign engine stop failed (may not be in memory): ${error.message}`);
      }
    }
    
    // Find all contacts stuck in "calling" status
    const stuckContacts = await contactRepo.getContacts(
      { status: 'calling' },
      { limit: 1000 }
    );
    
    console.log(`\nFound ${stuckContacts.pagination.total} contacts stuck in "calling" status`);
    
    // Reset stuck contacts to failed with balance error
    for (const contact of stuckContacts.contacts) {
      console.log(`Resetting stuck contact: ${contact.name} (${contact.phoneNumber})`);
      await contactRepo.updateContact(contact._id, {
        status: 'failed',
        lastCallResult: 'failed', // Use standard enum value
        lastCallError: 'Campaign stopped due to Twilio balance issues',
        lastCallDate: new Date()
      });
    }
    
    // Find contacts with recent balance errors
    const balanceErrorContacts = await contactRepo.getContacts(
      { lastCallResult: 'twilio_balance_error' },
      { limit: 1000 }
    );
    
    console.log(`\nFound ${balanceErrorContacts.pagination.total} contacts with balance errors`);
    
    console.log('\nAll campaigns stopped and stuck contacts reset.');
    console.log('Please add Twilio balance before starting new campaigns.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeConnection();
  }
}

// Run the script
stopAllCampaigns();