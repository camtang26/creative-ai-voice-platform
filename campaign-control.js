#!/usr/bin/env node
/**
 * Campaign Control Utility
 * Use this to manage campaigns safely
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
  startCampaign as startCampaignEngine, 
  stopCampaign as stopCampaignEngine,
  pauseCampaign as pauseCampaignEngine,
  getActiveCampaigns
} from './db/campaign-engine.js';

dotenv.config();

const command = process.argv[2];
const campaignId = process.argv[3];

async function showHelp() {
  console.log(`
Campaign Control Utility
=======================

Usage: node campaign-control.js <command> [campaignId]

Commands:
  list                    - List all campaigns and their status
  active                  - Show active campaigns
  stop <campaignId>       - Stop a specific campaign
  stop-all                - Stop ALL active campaigns
  pause <campaignId>      - Pause a specific campaign
  start <campaignId>      - Start a campaign (BE CAREFUL!)
  fix                     - Fix any stuck campaigns
  help                    - Show this help

Examples:
  node campaign-control.js list
  node campaign-control.js stop 68538d0fe5380a5507052870
  node campaign-control.js stop-all
`);
}

async function listCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    console.log('\nAll Campaigns:');
    console.log('=' .repeat(80));
    
    for (const campaign of campaigns) {
      const Contact = (await import('./db/models/contact.model.js')).default;
      const contactCount = await Contact.countDocuments({ campaigns: campaign._id, status: 'active' });
      const calledCount = await Contact.countDocuments({ 
        campaigns: campaign._id, 
        callCount: { $gt: 0 } 
      });
      
      console.log(`
ID: ${campaign._id}
Name: ${campaign.name}
Status: ${campaign.status}
Total Contacts: ${contactCount}
Contacts Called: ${calledCount}
Calls Placed: ${campaign.stats?.callsPlaced || 0}
Created: ${campaign.createdAt}
`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function showActiveCampaigns() {
  try {
    const activeCampaigns = getActiveCampaigns();
    console.log('\nActive Campaigns in Engine:');
    console.log('=' .repeat(80));
    
    if (activeCampaigns.length === 0) {
      console.log('No active campaigns in engine');
    } else {
      for (const campaign of activeCampaigns) {
        console.log(`
ID: ${campaign.id}
Name: ${campaign.name}
Active Calls: ${campaign.activeCalls}
Paused: ${campaign.paused}
Stats:`, campaign.stats);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function stopCampaign(campaignId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    
    // Stop in engine
    await stopCampaignEngine(campaignId);
    
    // Update database
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = 'completed';
      await campaign.save();
      console.log(`✅ Stopped campaign: ${campaign.name}`);
    } else {
      console.log('❌ Campaign not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function stopAllCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    
    const activeCampaigns = await Campaign.find({ status: 'active' });
    console.log(`Found ${activeCampaigns.length} active campaigns`);
    
    for (const campaign of activeCampaigns) {
      // Stop in engine
      await stopCampaignEngine(campaign._id.toString());
      
      // Update database
      campaign.status = 'completed';
      await campaign.save();
      console.log(`✅ Stopped: ${campaign.name}`);
    }
    
    console.log('\n✅ All campaigns stopped!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function pauseCampaign(campaignId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    
    // Pause in engine
    await pauseCampaignEngine(campaignId);
    
    // Update database
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = 'paused';
      await campaign.save();
      console.log(`⏸️  Paused campaign: ${campaign.name}`);
    } else {
      console.log('❌ Campaign not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function startCampaign(campaignId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Campaign = (await import('./db/models/campaign.model.js')).default;
    const Contact = (await import('./db/models/contact.model.js')).default;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      console.log('❌ Campaign not found');
      await mongoose.disconnect();
      return;
    }
    
    // Check contacts
    const totalContacts = await Contact.countDocuments({ 
      campaigns: campaign._id, 
      status: 'active' 
    });
    const uncalledContacts = await Contact.countDocuments({ 
      campaigns: campaign._id, 
      status: 'active',
      callCount: 0
    });
    
    console.log(`
⚠️  WARNING: About to start campaign!
Campaign: ${campaign.name}
Total Contacts: ${totalContacts}
Uncalled Contacts: ${uncalledContacts}

Are you sure? Type 'yes' to continue: `);
    
    // Wait for user confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        // Start in engine
        await startCampaignEngine(campaignId);
        
        // Update database
        campaign.status = 'active';
        await campaign.save();
        console.log(`✅ Started campaign: ${campaign.name}`);
      } else {
        console.log('❌ Cancelled');
      }
      
      rl.close();
      await mongoose.disconnect();
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function fixStuckCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Contact = (await import('./db/models/contact.model.js')).default;
    
    // Reset any contacts that have callCount > 0 but no callIds
    const stuckContacts = await Contact.find({
      callCount: { $gt: 0 },
      $or: [
        { callIds: { $size: 0 } },
        { callIds: { $exists: false } }
      ]
    });
    
    console.log(`Found ${stuckContacts.length} stuck contacts`);
    
    for (const contact of stuckContacts) {
      contact.callCount = 0;
      await contact.save();
      console.log(`Fixed: ${contact.name} (${contact.phoneNumber})`);
    }
    
    console.log('✅ Fixed stuck campaigns');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  switch (command) {
    case 'list':
      await listCampaigns();
      break;
    case 'active':
      await showActiveCampaigns();
      break;
    case 'stop':
      if (!campaignId) {
        console.log('❌ Please provide a campaign ID');
        showHelp();
      } else {
        await stopCampaign(campaignId);
      }
      break;
    case 'stop-all':
      await stopAllCampaigns();
      break;
    case 'pause':
      if (!campaignId) {
        console.log('❌ Please provide a campaign ID');
        showHelp();
      } else {
        await pauseCampaign(campaignId);
      }
      break;
    case 'start':
      if (!campaignId) {
        console.log('❌ Please provide a campaign ID');
        showHelp();
      } else {
        await startCampaign(campaignId);
      }
      break;
    case 'fix':
      await fixStuckCampaigns();
      break;
    case 'help':
    default:
      showHelp();
  }
}

main();