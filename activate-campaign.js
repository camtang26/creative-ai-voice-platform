import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import { updateCampaignStatus, updateCampaignStats } from './db/repositories/campaign.repository.js';
import dotenv from 'dotenv';

dotenv.config();

async function activateCampaign(campaignIdOrName) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB\n');

    // Find campaign by ID or name
    let campaign = await Campaign.findById(campaignIdOrName).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ name: new RegExp(campaignIdOrName, 'i') });
    }

    if (!campaign) {
      console.log(`❌ Campaign not found: ${campaignIdOrName}`);
      return;
    }

    console.log(`Found campaign: ${campaign.name} (${campaign._id})`);
    console.log(`Current status: ${campaign.status}`);

    // Check for contacts
    const contacts = await Contact.find({ campaigns: campaign._id });
    console.log(`\nContacts associated with campaign: ${contacts.length}`);

    if (contacts.length === 0) {
      console.log('\n❌ No contacts found for this campaign!');
      console.log('The campaign cannot start without contacts.');
      console.log('\nTo fix this:');
      console.log('1. Upload a CSV file through the "Upload CSV" tab');
      console.log('2. Or add contacts manually to this campaign');
      return;
    }

    // Show first few contacts
    console.log('\nFirst 5 contacts:');
    contacts.slice(0, 5).forEach((contact, i) => {
      console.log(`${i + 1}. ${contact.name} - ${contact.phoneNumber}`);
    });

    if (campaign.status === 'active') {
      console.log('\n✅ Campaign is already active!');
      return;
    }

    // Update campaign stats
    await updateCampaignStats(campaign._id, {
      totalContacts: contacts.length
    });

    // Activate the campaign
    console.log('\n🚀 Activating campaign...');
    await updateCampaignStatus(campaign._id, 'active');

    console.log('✅ Campaign activated successfully!');
    console.log('\nThe campaign engine should now start processing calls.');
    console.log(`Expected: ${contacts.length} calls with ${(campaign.settings?.callDelay || 90000) / 1000}s intervals`);
    console.log('\nMonitor progress at: http://localhost:3000/campaigns');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];
if (!campaignId) {
  console.log('Usage: node activate-campaign.js <campaign-id-or-name>');
  console.log('Example: node activate-campaign.js "200 leads"');
  console.log('Example: node activate-campaign.js 684a5c7b11c9196332b62bcf');
} else {
  activateCampaign(campaignId);
}