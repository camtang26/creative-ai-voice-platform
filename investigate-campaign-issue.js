import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import Call from './db/models/call.model.js';
import { getActiveCampaigns } from './db/campaign-engine.js';
import dotenv from 'dotenv';

dotenv.config();

async function investigateCampaignIssue() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB');

    // Search for the specific campaign
    const campaignName = "2nd lot of 40 Leads - IS agent calls";
    const campaign = await Campaign.findOne({ 
      name: { $regex: campaignName, $options: 'i' } 
    });

    if (!campaign) {
      console.log(`Campaign "${campaignName}" not found in database.`);
      const allCampaigns = await Campaign.find({}).select('name status').limit(10);
      console.log('\nAvailable campaigns:');
      allCampaigns.forEach(c => console.log(`- ${c.name} (${c.status})`));
      return;
    }

    console.log('\n=== CAMPAIGN DETAILS ===');
    console.log(`Name: ${campaign.name}`);
    console.log(`ID: ${campaign._id}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Created: ${campaign.createdAt}`);
    console.log(`Last Executed: ${campaign.lastExecuted || 'Never'}`);
    
    // Check campaign stats
    console.log('\n=== CAMPAIGN STATS ===');
    console.log(`Total Contacts: ${campaign.stats?.totalContacts || 0}`);
    console.log(`Calls Placed: ${campaign.stats?.callsPlaced || 0}`);
    console.log(`Calls Completed: ${campaign.stats?.callsCompleted || 0}`);
    console.log(`Calls Failed: ${campaign.stats?.callsFailed || 0}`);
    console.log(`Calls Answered: ${campaign.stats?.callsAnswered || 0}`);

    // Check if campaign is in active memory
    console.log('\n=== ENGINE STATE ===');
    const activeCampaigns = getActiveCampaigns();
    const activeCampaign = activeCampaigns.find(c => c.id === campaign._id.toString());
    
    if (activeCampaign) {
      console.log('Campaign IS in active memory!');
      console.log(`- Active Calls: ${activeCampaign.activeCalls}`);
      console.log(`- Paused: ${activeCampaign.paused}`);
      console.log('⚠️  This campaign should be removed from active campaigns if paused!');
    } else {
      console.log('Campaign is NOT in active memory (good if paused)');
    }

    // Check for Olexii contact
    const olexiiContact = await Contact.findOne({
      campaignId: campaign._id,
      $or: [
        { name: { $regex: 'Olexii', $options: 'i' } },
        { phoneNumber: '380504544211' },
        { phoneNumber: '+380504544211' }
      ]
    });

    if (olexiiContact) {
      console.log('\n=== OLEXII CONTACT DETAILS ===');
      console.log(`Name: ${olexiiContact.name}`);
      console.log(`Phone: ${olexiiContact.phoneNumber}`);
      console.log(`Status: ${olexiiContact.status}`);
      console.log(`Call Count: ${olexiiContact.callCount || 0}`);
      console.log(`Last Contacted: ${olexiiContact.lastContacted || 'Never'}`);
      console.log(`Created: ${olexiiContact.createdAt}`);

      // Check recent calls to this contact
      const recentCalls = await Call.find({
        to: { $in: [olexiiContact.phoneNumber, `+${olexiiContact.phoneNumber}`, olexiiContact.phoneNumber.replace('+', '')] },
        campaign: campaign._id
      }).sort({ createdAt: -1 }).limit(5);

      console.log(`\n=== RECENT CALLS TO OLEXII (${recentCalls.length} found) ===`);
      recentCalls.forEach((call, index) => {
        console.log(`\nCall ${index + 1}:`);
        console.log(`  Call SID: ${call.callSid}`);
        console.log(`  Status: ${call.status}`);
        console.log(`  Created: ${call.createdAt}`);
        console.log(`  Duration: ${call.duration || 0}s`);
      });
    } else {
      console.log('\n⚠️  Olexii contact not found in this campaign');
    }

    // Check for any contacts with callCount = 0
    const uncalledContacts = await Contact.countDocuments({
      campaignId: campaign._id,
      status: 'active',
      callCount: 0
    });

    console.log(`\n=== CONTACT ANALYSIS ===`);
    console.log(`Uncalled contacts remaining: ${uncalledContacts}`);
    
    if (uncalledContacts > 0) {
      const nextContacts = await Contact.find({
        campaignId: campaign._id,
        status: 'active',
        callCount: 0
      }).limit(5).select('name phoneNumber priority');
      
      console.log('\nNext contacts to be called:');
      nextContacts.forEach(c => console.log(`- ${c.name} (${c.phoneNumber}) Priority: ${c.priority || 0}`));
    }

    // Get all active campaigns from engine
    console.log('\n=== ALL ACTIVE CAMPAIGNS IN ENGINE ===');
    activeCampaigns.forEach(c => {
      console.log(`- ${c.name} (${c.id})`);
      console.log(`  Active Calls: ${c.activeCalls}, Paused: ${c.paused}`);
    });

  } catch (error) {
    console.error('Error investigating campaign:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

// Run the investigation
investigateCampaignIssue();