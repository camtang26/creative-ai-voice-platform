/**
 * Cleanup Stuck Campaigns
 * 
 * This script finds and completes campaigns that have no contacts left to call
 * Run this to fix campaigns that are stuck in "active" state
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';

dotenv.config();

async function cleanupStuckCampaigns() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all active campaigns
    const activeCampaigns = await Campaign.find({ status: 'active' });
    console.log(`Found ${activeCampaigns.length} active campaigns`);
    
    for (const campaign of activeCampaigns) {
      console.log(`\nChecking campaign: ${campaign.name} (${campaign._id})`);
      
      // Check if there are any contacts that can be called
      const pendingContacts = await Contact.countDocuments({
        campaignIds: campaign._id,
        status: 'pending',
        callCount: 0
      });
      
      const callingContacts = await Contact.countDocuments({
        campaignIds: campaign._id,
        status: 'calling'
      });
      
      console.log(`  - Pending contacts (callCount=0): ${pendingContacts}`);
      console.log(`  - Calling contacts: ${callingContacts}`);
      
      // Also check contacts that might be callable (any pending regardless of callCount)
      const anyPendingContacts = await Contact.countDocuments({
        campaignIds: campaign._id,
        status: 'pending'
      });
      
      console.log(`  - Total pending contacts (any callCount): ${anyPendingContacts}`);
      
      // If no callable contacts, mark campaign as completed
      if (pendingContacts === 0 && callingContacts === 0) {
        await Campaign.updateOne(
          { _id: campaign._id },
          { 
            $set: { 
              status: 'completed',
              completedAt: new Date()
            }
          }
        );
        console.log(`  ✅ Marked campaign as COMPLETED`);
      } else {
        console.log(`  ⏳ Campaign still has callable contacts`);
      }
    }
    
    console.log('\n✅ Cleanup complete');
    
  } catch (error) {
    console.error('Error cleaning up campaigns:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
cleanupStuckCampaigns();