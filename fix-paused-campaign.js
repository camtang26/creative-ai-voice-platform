import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import { getActiveCampaigns, stopCampaign, pauseCampaign } from './db/campaign-engine.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixPausedCampaign() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB');

    const campaignName = "2nd lot of 40 Leads - IS agent calls";
    
    // Find the campaign
    const campaign = await Campaign.findOne({ 
      name: { $regex: campaignName, $options: 'i' } 
    });

    if (!campaign) {
      console.log(`Campaign "${campaignName}" not found.`);
      return;
    }

    console.log('\n=== FOUND CAMPAIGN ===');
    console.log(`Name: ${campaign.name}`);
    console.log(`ID: ${campaign._id}`);
    console.log(`Current Status: ${campaign.status}`);

    // Check active campaigns in engine
    console.log('\n=== CHECKING ENGINE STATE ===');
    const activeCampaigns = getActiveCampaigns();
    const activeCampaign = activeCampaigns.find(c => c.id === campaign._id.toString());

    if (activeCampaign) {
      console.log('⚠️  Campaign is ACTIVE in engine!');
      console.log(`- Active Calls: ${activeCampaign.activeCalls}`);
      console.log(`- Paused Flag: ${activeCampaign.paused}`);
      
      console.log('\n🔧 FIXING: Attempting to stop campaign in engine...');
      
      // Try to stop the campaign
      const stopped = await stopCampaign(campaign._id.toString());
      
      if (stopped) {
        console.log('✅ Campaign stopped successfully in engine');
        
        // Update database status to paused
        campaign.status = 'paused';
        await campaign.save();
        console.log('✅ Database status updated to paused');
      } else {
        console.log('❌ Failed to stop campaign in engine');
        
        // Force remove from active campaigns
        console.log('\n🔧 Attempting force removal...');
        
        // This is a direct manipulation - not ideal but necessary
        // The engine should expose a forceStop method
        console.log('⚠️  Manual intervention required - campaign engine needs to be restarted');
      }
    } else {
      console.log('✅ Campaign is NOT active in engine (good)');
      
      // Ensure database status is correct
      if (campaign.status === 'active') {
        console.log('🔧 Updating database status to paused...');
        campaign.status = 'paused';
        await campaign.save();
        console.log('✅ Database status updated');
      }
    }

    // Final check
    console.log('\n=== FINAL STATE ===');
    const updatedCampaign = await Campaign.findById(campaign._id);
    const finalActiveCampaigns = getActiveCampaigns();
    const stillActive = finalActiveCampaigns.find(c => c.id === campaign._id.toString());

    console.log(`Database Status: ${updatedCampaign.status}`);
    console.log(`Engine State: ${stillActive ? 'STILL ACTIVE' : 'Not active'}`);

    if (stillActive) {
      console.log('\n⚠️  WARNING: Campaign is still active in engine!');
      console.log('Recommended actions:');
      console.log('1. Restart the server to clear all active campaigns');
      console.log('2. Check for any background processes that might be restarting campaigns');
      console.log('3. Review the campaign engine code for bugs in the pause/stop logic');
    } else {
      console.log('\n✅ Campaign successfully removed from active campaigns');
    }

  } catch (error) {
    console.error('Error fixing campaign:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixPausedCampaign();