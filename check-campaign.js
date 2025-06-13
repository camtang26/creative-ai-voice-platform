#!/usr/bin/env node

/**
 * Check the campaign that was just created to see if contacts were imported
 */

import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkLatestCampaign() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('✅ Connected to MongoDB\n');

    // Find the most recent campaign
    const latestCampaign = await Campaign.findOne().sort({ createdAt: -1 });
    
    if (!latestCampaign) {
      console.log('❌ No campaigns found');
      return;
    }

    console.log('📋 Latest Campaign:');
    console.log('Name:', latestCampaign.name);
    console.log('ID:', latestCampaign._id);
    console.log('Status:', latestCampaign.status);
    console.log('Agent Prompt:', latestCampaign.agentPrompt || '(using ElevenLabs default)');
    console.log('First Message:', latestCampaign.firstMessage);
    console.log('Created:', latestCampaign.createdAt);
    console.log('Stats:', latestCampaign.stats);
    
    // Find contacts associated with this campaign
    const contacts = await Contact.find({ campaignIds: latestCampaign._id });
    console.log(`\n👥 Found ${contacts.length} contacts for this campaign:`);
    
    contacts.forEach(contact => {
      console.log(`- ${contact.name} (${contact.phoneNumber}) - Status: ${contact.status}`);
    });
    
    if (contacts.length === 0) {
      console.log('\n🔍 Checking all contacts in database...');
      const allContacts = await Contact.find().sort({ createdAt: -1 }).limit(10);
      console.log(`Found ${allContacts.length} total contacts in database (showing last 10):`);
      allContacts.forEach(contact => {
        console.log(`- ${contact.name} (${contact.phoneNumber}) - Campaigns: ${contact.campaignIds.length}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkLatestCampaign();