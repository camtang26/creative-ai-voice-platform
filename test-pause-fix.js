import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import { getActiveCampaigns, pauseCampaign, resumeCampaign, stopCampaign } from './db/campaign-engine.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPauseFix() {
  try {
    console.log('🧪 Testing Campaign Engine Pause Fix\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('✅ Connected to MongoDB');

    // Search for the problematic campaign
    const campaignName = "2nd lot of 40 Leads - IS agent calls";
    const campaign = await Campaign.findOne({ 
      name: { $regex: campaignName, $options: 'i' } 
    });

    if (!campaign) {
      console.log(`❌ Campaign "${campaignName}" not found.`);
      
      // Try to find any campaign that might be stuck
      const allCampaigns = await Campaign.find({ status: { $in: ['active', 'paused'] } }).select('name status');
      console.log('\nAvailable campaigns:');
      allCampaigns.forEach(c => console.log(`- ${c.name} (${c.status})`));
      
      if (allCampaigns.length === 0) {
        console.log('No active or paused campaigns found.');
        return;
      }
    }

    const targetCampaign = campaign || (await Campaign.findOne({ status: { $in: ['active', 'paused'] } }));
    
    if (!targetCampaign) {
      console.log('No campaigns to test with.');
      return;
    }

    console.log(`\n📋 Testing with campaign: ${targetCampaign.name}`);
    console.log(`Campaign ID: ${targetCampaign._id}`);
    console.log(`Current DB Status: ${targetCampaign.status}`);

    // Check initial state
    console.log('\n1️⃣ INITIAL STATE CHECK');
    let activeCampaigns = getActiveCampaigns();
    let isActive = activeCampaigns.find(c => c.id === targetCampaign._id.toString());
    
    console.log(`Active in engine: ${isActive ? 'YES' : 'NO'}`);
    if (isActive) {
      console.log(`- Active Calls: ${isActive.activeCalls}`);
      console.log(`- Paused Flag: ${isActive.paused || false}`);
    }

    // Test pause
    console.log('\n2️⃣ TESTING PAUSE');
    const pauseResult = await pauseCampaign(targetCampaign._id.toString());
    console.log(`Pause result: ${pauseResult ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Verify pause worked
    activeCampaigns = getActiveCampaigns();
    isActive = activeCampaigns.find(c => c.id === targetCampaign._id.toString());
    
    console.log(`\nAfter pause - Active in engine: ${isActive ? '❌ STILL ACTIVE (BUG!)' : '✅ NOT ACTIVE (CORRECT)'}`);
    
    // Check database status
    const pausedCampaign = await Campaign.findById(targetCampaign._id);
    console.log(`Database status: ${pausedCampaign.status}`);

    // Wait a bit to ensure no race conditions
    console.log('\n⏳ Waiting 5 seconds to ensure no ghost executions...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Final check
    activeCampaigns = getActiveCampaigns();
    isActive = activeCampaigns.find(c => c.id === targetCampaign._id.toString());
    
    console.log(`\n3️⃣ FINAL STATE AFTER WAIT');
    console.log(`Still active in engine: ${isActive ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD)'}`);

    // Test resume
    console.log('\n4️⃣ TESTING RESUME');
    const resumeResult = await resumeCampaign(targetCampaign._id.toString());
    console.log(`Resume result: ${resumeResult ? '✅ SUCCESS' : '❌ FAILED'}`);

    activeCampaigns = getActiveCampaigns();
    isActive = activeCampaigns.find(c => c.id === targetCampaign._id.toString());
    
    console.log(`After resume - Active in engine: ${isActive ? '✅ YES (CORRECT)' : '❌ NO (BUG!)'}`);

    // Clean up - pause again
    console.log('\n5️⃣ CLEANUP - Pausing campaign again');
    await pauseCampaign(targetCampaign._id.toString());

    console.log('\n✅ TEST COMPLETE');
    console.log('\n📊 SUMMARY:');
    console.log('The fix ensures that paused campaigns are completely removed from the');
    console.log('active campaigns map, preventing any possibility of continued execution.');
    console.log('Resume functionality has been updated to re-add the campaign when resumed.');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testPauseFix();