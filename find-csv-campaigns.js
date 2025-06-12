import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function findCSVCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB\n');

    // Find all campaigns with CSV info
    const csvCampaigns = await Campaign.find({ 
      'csvInfo': { $exists: true } 
    }).sort({ createdAt: -1 });

    console.log(`Found ${csvCampaigns.length} CSV campaigns:\n`);

    for (const campaign of csvCampaigns) {
      console.log('='.repeat(50));
      console.log(`Campaign: ${campaign.name}`);
      console.log(`ID: ${campaign._id}`);
      console.log(`Status: ${campaign.status} ⚠️`);
      console.log(`Created: ${campaign.createdAt}`);
      
      if (campaign.csvInfo) {
        console.log(`\nCSV Details:`);
        console.log(`- File: ${campaign.csvInfo.originalFileName}`);
        console.log(`- Total Records: ${campaign.csvInfo.totalRecords}`);
        console.log(`- Valid Contacts: ${campaign.csvInfo.validContacts}`);
        console.log(`- Invalid: ${campaign.csvInfo.invalidContacts}`);
      }

      // Count contacts for this campaign
      const contactCount = await Contact.countDocuments({ campaigns: campaign._id });
      console.log(`\nContacts in database: ${contactCount}`);

      if (campaign.stats) {
        console.log(`\nCall Statistics:`);
        console.log(`- Total Contacts: ${campaign.stats.totalContacts || 0}`);
        console.log(`- Calls Placed: ${campaign.stats.callsPlaced || 0}`);
        console.log(`- Calls Completed: ${campaign.stats.callsCompleted || 0}`);
        console.log(`- Calls Failed: ${campaign.stats.callsFailed || 0}`);
      }

      console.log(`\nSettings:`);
      console.log(`- Call Interval: ${(campaign.settings?.callDelay || 90000) / 1000} seconds`);
      console.log(`- Status: ${campaign.status}`);
      
      if (campaign.status !== 'active' && campaign.status !== 'completed') {
        console.log(`\n⚠️ CAMPAIGN IS NOT ACTIVE! Status is: ${campaign.status}`);
        console.log('To activate, use the campaign ID above');
      }
    }

    // Also show any recent campaigns
    console.log('\n' + '='.repeat(50));
    console.log('ALL RECENT CAMPAIGNS (last 5):');
    const recentCampaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(5);

    recentCampaigns.forEach(c => {
      console.log(`- ${c.name} (${c._id}) - Status: ${c.status} - Created: ${c.createdAt.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

findCSVCampaigns();