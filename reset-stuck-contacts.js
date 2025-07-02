/**
 * Script to reset all stuck contacts in "calling" status
 * This will allow the campaign to process them again
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getCampaignRepository, getContactRepository, initializeMongoDB } from './db/index.js';

dotenv.config();

async function resetStuckContacts() {
  try {
    // Initialize MongoDB with models
    await initializeMongoDB();
    console.log('Connected to MongoDB');
    
    const campaignRepo = getCampaignRepository();
    const contactRepo = getContactRepository();
    
    // Get the specific campaign
    const campaignName = '4th Set of 40 Leads IS';
    const campaigns = await campaignRepo.getCampaigns({ status: 'active' });
    const campaign = campaigns.campaigns.find(c => c.name === campaignName);
    
    if (!campaign) {
      console.log(`Campaign "${campaignName}" not found`);
      return;
    }
    
    console.log(`\nFound campaign: ${campaign.name} (${campaign._id})`);
    console.log(`Current settings:`, campaign.settings);
    
    // Get all contacts in "calling" status
    const callingContacts = await contactRepo.getContacts(
      { campaignId: campaign._id, status: 'calling' },
      { limit: 100 }
    );
    
    console.log(`\nFound ${callingContacts.pagination.total} contacts stuck in "calling" status`);
    
    if (callingContacts.contacts.length > 0) {
      console.log('\nResetting stuck contacts:');
      
      for (const contact of callingContacts.contacts) {
        const timeSinceLastContact = contact.lastContacted 
          ? Math.floor((Date.now() - new Date(contact.lastContacted)) / 1000 / 60)
          : 'unknown';
          
        console.log(`- ${contact.name} (${contact.phoneNumber}) - Last contacted: ${timeSinceLastContact} minutes ago`);
        
        // Reset to pending status
        await contactRepo.updateContact(contact._id, { 
          status: 'pending',
          callCount: Math.max(0, contact.callCount - 1) // Decrement call count to allow retry
        });
      }
      
      console.log(`\n✓ Reset ${callingContacts.contacts.length} stuck contacts to pending status`);
    }
    
    // Check campaign stats after reset
    const pendingContacts = await contactRepo.getContacts(
      { campaignId: campaign._id, status: 'pending' },
      { limit: 1 }
    );
    
    console.log(`\nCampaign now has ${pendingContacts.pagination.total} pending contacts to process`);
    
    // Ensure campaign has proper concurrent call settings
    if (campaign.settings?.maxConcurrentCalls < 5) {
      console.log('\nUpdating campaign to allow 5 concurrent calls...');
      await campaignRepo.updateCampaign(campaign._id, {
        settings: {
          ...campaign.settings,
          maxConcurrentCalls: 5,
          callDelay: 30000 // 30 seconds between call cycles
        }
      });
      console.log('✓ Updated campaign settings');
    }
    
    console.log('\nThe campaign should now resume processing contacts every 30 seconds');
    console.log('Up to 5 calls can be in progress simultaneously');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the reset
resetStuckContacts();