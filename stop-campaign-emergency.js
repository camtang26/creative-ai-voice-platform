#!/usr/bin/env node
/**
 * Emergency Campaign Stop Script
 * Use this to forcefully stop a campaign that won't pause
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const campaignId = process.argv[2];

if (!campaignId) {
  console.error('Usage: node stop-campaign-emergency.js <campaignId>');
  console.error('Example: node stop-campaign-emergency.js 6853e3a74869b5cbb9dbe12b');
  process.exit(1);
}

async function emergencyStopCampaign() {
  try {
    console.log(`🚨 Emergency stopping campaign: ${campaignId}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get Campaign model
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    
    // Find and update campaign
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }
    
    console.log(`📊 Current campaign status: ${campaign.status}`);
    console.log(`📞 Campaign name: ${campaign.name}`);
    
    // Force update to stopped status
    campaign.status = 'completed';
    campaign.stats.endTime = new Date();
    await campaign.save();
    
    console.log('✅ Campaign forcefully stopped in database');
    console.log('⚠️  Note: Server restart required to stop active execution');
    
    // Check if campaign engine is running
    try {
      const { getActiveCampaigns } = await import('./db/campaign-engine.js');
      const activeCampaigns = getActiveCampaigns();
      
      if (activeCampaigns.has(campaignId)) {
        console.log('⚠️  Campaign is still active in engine memory!');
        console.log('🔄 Please restart the server to fully stop execution');
      } else {
        console.log('✅ Campaign not active in engine');
      }
    } catch (error) {
      console.log('ℹ️  Could not check engine status (server may not be running locally)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

emergencyStopCampaign();