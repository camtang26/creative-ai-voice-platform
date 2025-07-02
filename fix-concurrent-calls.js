/**
 * Script to fix concurrent call handling in campaigns
 * This ensures campaigns can make multiple calls concurrently
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getCampaignRepository, getCallRepository, initializeMongoDB } from './db/index.js';
import { terminateCall } from './enhanced-call-handler.js';
import Twilio from 'twilio';

dotenv.config();

async function fixConcurrentCalls() {
  try {
    // Initialize MongoDB with models
    await initializeMongoDB();
    console.log('Connected to MongoDB');
    
    const campaignRepo = getCampaignRepository();
    const callRepo = getCallRepository();
    
    // Initialize Twilio client
    const twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      { region: 'au1' }
    );
    
    // Get all active campaigns
    const activeCampaigns = await campaignRepo.getCampaigns({ status: 'active' });
    console.log(`Found ${activeCampaigns.campaigns.length} active campaigns`);
    
    for (const campaign of activeCampaigns.campaigns) {
      console.log(`\nChecking campaign: ${campaign.name} (${campaign._id})`);
      console.log(`Current settings:`, campaign.settings);
      
      // Update campaign to allow concurrent calls
      if (campaign.settings?.maxConcurrentCalls === 1) {
        console.log('Updating campaign to allow 5 concurrent calls...');
        await campaignRepo.updateCampaign(campaign._id, {
          settings: {
            ...campaign.settings,
            maxConcurrentCalls: 5,
            callDelay: 30000 // 30 seconds between calls
          }
        });
        console.log('✓ Updated campaign settings');
      }
      
      // Check for stuck calls
      const Call = mongoose.model('Call');
      const stuckCalls = await Call.find({
        campaignId: campaign._id,
        status: 'in-progress',
        startTime: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
      });
      
      console.log(`Found ${stuckCalls.length} stuck calls`);
      
      for (const call of stuckCalls) {
        const duration = Math.floor((Date.now() - new Date(call.startTime)) / 1000);
        console.log(`\nStuck call: ${call.contactName} (${call.callSid})`);
        console.log(`- Duration: ${duration} seconds`);
        console.log(`- Started: ${call.startTime}`);
        
        // Check Twilio status
        try {
          const twilioCall = await twilioClient.calls(call.callSid).fetch();
          console.log(`- Twilio status: ${twilioCall.status}`);
          
          if (twilioCall.status === 'completed') {
            // Update our database
            await callRepo.updateCallStatus(call.callSid, 'completed', {
              endTime: new Date(),
              duration: twilioCall.duration || duration
            });
            console.log('✓ Updated call status to completed');
          } else if (['in-progress', 'ringing'].includes(twilioCall.status) && duration > 600) {
            // Terminate calls longer than 10 minutes
            console.log('Terminating stuck call...');
            await twilioClient.calls(call.callSid).update({ status: 'completed' });
            await callRepo.updateCallStatus(call.callSid, 'completed', {
              endTime: new Date(),
              duration: duration,
              terminatedBy: 'admin_cleanup'
            });
            console.log('✓ Terminated stuck call');
          }
        } catch (error) {
          console.log(`Error checking Twilio status: ${error.message}`);
          // If call not found on Twilio, mark as completed
          if (error.status === 404) {
            await callRepo.updateCallStatus(call.callSid, 'completed', {
              endTime: new Date(),
              duration: duration,
              terminatedBy: 'not_found_cleanup'
            });
            console.log('✓ Marked missing call as completed');
          }
        }
      }
    }
    
    console.log('\nDone fixing concurrent calls');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the fix
fixConcurrentCalls();