/**
 * Script to fix stuck campaigns and ensure proper completion
 * This addresses issues where campaigns remain active despite all contacts being processed
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getCampaignRepository, getContactRepository, getCallRepository, initializeMongoDB } from './db/index.js';

dotenv.config();

async function fixStuckCampaigns() {
  try {
    // Initialize MongoDB with models
    await initializeMongoDB();
    console.log('Connected to MongoDB');
    
    const campaignRepo = getCampaignRepository();
    const contactRepo = getContactRepository();
    const callRepo = getCallRepository();
    
    // Get all active campaigns
    const activeCampaigns = await campaignRepo.getCampaigns({ status: 'active' });
    console.log(`Found ${activeCampaigns.campaigns.length} active campaigns`);
    
    for (const campaign of activeCampaigns.campaigns) {
      console.log(`\nChecking campaign: ${campaign.name} (${campaign._id})`);
      
      // Get contact stats for this campaign
      const pendingContacts = await contactRepo.getContacts(
        { campaignId: campaign._id, status: 'pending' },
        { limit: 1 }
      );
      
      const callingContacts = await contactRepo.getContacts(
        { campaignId: campaign._id, status: 'calling' },
        { limit: 1 }
      );
      
      const completedContacts = await contactRepo.getContacts(
        { campaignId: campaign._id, status: 'completed' },
        { limit: 1 }
      );
      
      const failedContacts = await contactRepo.getContacts(
        { campaignId: campaign._id, status: 'failed' },
        { limit: 1 }
      );
      
      const totalContacts = await contactRepo.getContacts(
        { campaignId: campaign._id },
        { limit: 1 }
      );
      
      console.log('Contact stats:');
      console.log(`- Total: ${totalContacts.pagination.total}`);
      console.log(`- Pending: ${pendingContacts.pagination.total}`);
      console.log(`- Calling: ${callingContacts.pagination.total}`);
      console.log(`- Completed: ${completedContacts.pagination.total}`);
      console.log(`- Failed (includes no-answer): ${failedContacts.pagination.total}`);
      
      // Check for active calls
      let activeCallCount = 0;
      try {
        // Use direct MongoDB query since getCalls might not be available
        const Call = mongoose.model('Call');
        const activeCalls = await Call.find({
          campaignId: campaign._id,
          status: { $in: ['initiated', 'ringing', 'in-progress'] }
        }).limit(10);
        activeCallCount = activeCalls.length;
      } catch (error) {
        console.log('Error checking active calls:', error.message);
      }
      
      console.log(`Active calls: ${activeCallCount}`);
      
      // Determine if campaign should be completed
      const shouldComplete = 
        pendingContacts.pagination.total === 0 && 
        callingContacts.pagination.total === 0 &&
        activeCallCount === 0;
      
      if (shouldComplete) {
        console.log(`Campaign "${campaign.name}" should be marked as completed!`);
        
        // Calculate final stats
        const finalStats = {
          totalContacts: totalContacts.pagination.total,
          contactsReached: completedContacts.pagination.total + failedContacts.pagination.total,
          successfulCalls: completedContacts.pagination.total,
          failedCalls: failedContacts.pagination.total
        };
        
        console.log('Final stats:', finalStats);
        
        // Update campaign status
        await campaignRepo.updateCampaignStatus(campaign._id, 'completed');
        await campaignRepo.updateCampaignStats(campaign._id, finalStats);
        
        console.log(`✓ Campaign "${campaign.name}" marked as completed`);
      } else {
        console.log(`Campaign "${campaign.name}" is still active`);
        
        // Check if there are stuck "calling" contacts
        if (callingContacts.pagination.total > 0 && activeCallCount === 0) {
          console.log('Found stuck contacts in "calling" status with no active calls');
          
          // Reset stuck calling contacts back to pending
          const stuckContacts = await contactRepo.getContacts(
            { campaignId: campaign._id, status: 'calling' },
            { limit: 100 }
          );
          
          for (const contact of stuckContacts.contacts) {
            console.log(`Resetting stuck contact: ${contact.name} (${contact.phoneNumber})`);
            await contactRepo.updateContact(contact._id, { 
              status: 'pending'
              // Don't set lastCallResult as it has enum validation
            });
          }
          
          console.log(`✓ Reset ${stuckContacts.contacts.length} stuck contacts`);
        }
      }
    }
    
    console.log('\nDone checking campaigns');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixStuckCampaigns();