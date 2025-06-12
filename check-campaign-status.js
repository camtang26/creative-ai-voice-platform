import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Call from './db/models/call.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkCampaignStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB');

    // Find the most recent campaign
    const recentCampaign = await Campaign.findOne()
      .sort({ createdAt: -1 })
      .populate('stats');

    if (!recentCampaign) {
      console.log('No campaigns found in the database.');
      return;
    }

    console.log('\n=== MOST RECENT CAMPAIGN ===');
    console.log(`Name: ${recentCampaign.name}`);
    console.log(`ID: ${recentCampaign._id}`);
    console.log(`Status: ${recentCampaign.status}`);
    console.log(`Created: ${recentCampaign.createdAt}`);
    console.log(`Total Contacts: ${recentCampaign.stats?.totalContacts || 0}`);
    console.log(`Calls Placed: ${recentCampaign.stats?.callsPlaced || 0}`);
    console.log(`Calls Completed: ${recentCampaign.stats?.callsCompleted || 0}`);
    console.log(`Calls Failed: ${recentCampaign.stats?.callsFailed || 0}`);
    
    if (recentCampaign.csvInfo) {
      console.log('\n--- CSV Info ---');
      console.log(`Original File: ${recentCampaign.csvInfo.originalFileName}`);
      console.log(`Total Records: ${recentCampaign.csvInfo.totalRecords}`);
      console.log(`Valid Contacts: ${recentCampaign.csvInfo.validContacts}`);
      console.log(`Invalid Contacts: ${recentCampaign.csvInfo.invalidContacts}`);
    }

    if (recentCampaign.settings) {
      console.log('\n--- Settings ---');
      console.log(`Call Delay: ${recentCampaign.settings.callDelay / 1000} seconds`);
      console.log(`Max Concurrent: ${recentCampaign.settings.maxConcurrentCalls}`);
    }

    // Check recent calls for this campaign
    const recentCalls = await Call.find({ campaign: recentCampaign._id })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`\n=== RECENT CALLS (${recentCalls.length} shown) ===`);
    recentCalls.forEach((call, index) => {
      console.log(`\nCall ${index + 1}:`);
      console.log(`  To: ${call.to}`);
      console.log(`  Status: ${call.status}`);
      console.log(`  Created: ${call.createdAt}`);
      console.log(`  Call SID: ${call.callSid || 'Not yet assigned'}`);
    });

    // Find all active campaigns
    const activeCampaigns = await Campaign.find({ status: 'active' });
    console.log(`\n=== ACTIVE CAMPAIGNS: ${activeCampaigns.length} ===`);
    activeCampaigns.forEach(campaign => {
      console.log(`- ${campaign.name} (${campaign._id})`);
    });

  } catch (error) {
    console.error('Error checking campaign status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the check
checkCampaignStatus();