import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import { startCampaign, stopCampaign, pauseCampaign } from './db/campaign-engine.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixCampaignSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('Connected to MongoDB\n');

    // 1. Find all campaigns
    const allCampaigns = await Campaign.find().sort({ createdAt: -1 });
    console.log(`Found ${allCampaigns.length} total campaigns\n`);

    // 2. Check each campaign
    for (const campaign of allCampaigns) {
      console.log('='.repeat(50));
      console.log(`Campaign: ${campaign.name}`);
      console.log(`ID: ${campaign._id}`);
      console.log(`Status: ${campaign.status}`);
      console.log(`Created: ${campaign.createdAt}`);

      // Count contacts
      const contactCount = await Contact.countDocuments({ campaigns: campaign._id });
      console.log(`Contacts: ${contactCount}`);

      // Check if this is a CSV campaign without contacts
      if (campaign.name.includes('IS Campaign') || campaign.name.includes('CSV')) {
        console.log('\n⚠️  This looks like a CSV campaign');
        
        if (contactCount === 0) {
          console.log('❌ No contacts found! CSV upload likely failed.');
          
          // Update campaign to cancelled status  
          campaign.status = 'cancelled';
          campaign.description = (campaign.description || '') + ' [CSV import failed - no contacts]';
          await campaign.save();
          console.log('✅ Updated campaign status to cancelled');
        } else {
          console.log(`✅ Has ${contactCount} contacts`);
          
          // Update campaign stats if missing
          if (!campaign.stats || campaign.stats.totalContacts !== contactCount) {
            campaign.stats = campaign.stats || {};
            campaign.stats.totalContacts = contactCount;
            await campaign.save();
            console.log('✅ Updated campaign stats');
          }
        }
      }

      // Check campaign settings
      if (!campaign.settings) {
        campaign.settings = {
          callDelay: 90000, // 90 seconds default
          maxConcurrentCalls: 1,
          retryCount: 1,
          retryDelay: 3600000
        };
        await campaign.save();
        console.log('✅ Added default campaign settings');
      }

      // If campaign is active but has no contacts, pause it
      if (campaign.status === 'active' && contactCount === 0) {
        console.log('\n⚠️  Active campaign with no contacts - pausing');
        campaign.status = 'paused';
        campaign.description = (campaign.description || '') + ' [Paused - no contacts]';
        await campaign.save();
        
        // Stop the campaign engine for this campaign
        try {
          await stopCampaign(campaign._id.toString());
        } catch (e) {
          console.log('Campaign engine not running for this campaign');
        }
      }
    }

    // 3. Check for orphaned contacts
    console.log('\n' + '='.repeat(50));
    console.log('Checking for orphaned contacts...');
    
    const orphanedContacts = await Contact.find({ campaigns: { $size: 0 } });
    console.log(`Found ${orphanedContacts.length} orphaned contacts`);

    // 4. Check campaign engine status
    console.log('\n' + '='.repeat(50));
    console.log('Campaign Engine Status:');
    
    const activeCampaigns = await Campaign.find({ status: 'active' });
    console.log(`Active campaigns: ${activeCampaigns.length}`);
    
    for (const campaign of activeCampaigns) {
      const contacts = await Contact.countDocuments({ 
        campaigns: campaign._id,
        status: 'active'
      });
      console.log(`- ${campaign.name}: ${contacts} contacts ready to call`);
    }

    // 5. Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY:');
    console.log(`Total campaigns: ${allCampaigns.length}`);
    console.log(`Active campaigns: ${activeCampaigns.length}`);
    console.log(`Cancelled campaigns: ${allCampaigns.filter(c => c.status === 'cancelled').length}`);
    console.log(`Draft campaigns: ${allCampaigns.filter(c => c.status === 'draft').length}`);
    console.log(`Total contacts: ${await Contact.countDocuments()}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixCampaignSystem();