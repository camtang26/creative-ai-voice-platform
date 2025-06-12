import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import Call from './db/models/call.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function monitorCampaigns() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    
    console.clear();
    console.log('📊 Real-Time Campaign Monitor');
    console.log('=' * 50);
    
    while (true) {
      // Get current counts
      const totalCampaigns = await Campaign.countDocuments();
      const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
      const draftCampaigns = await Campaign.countDocuments({ status: 'draft' });
      const totalContacts = await Contact.countDocuments();
      const totalCalls = await Call.countDocuments();
      
      // Get recent campaigns
      const recentCampaigns = await Campaign.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name status createdAt stats');
      
      // Clear and display
      console.clear();
      console.log('📊 Real-Time Campaign Monitor');
      console.log('═'.repeat(80));
      console.log(`🎯 Total Campaigns: ${totalCampaigns} | 🟢 Active: ${activeCampaigns} | 📝 Draft: ${draftCampaigns}`);
      console.log(`👥 Total Contacts: ${totalContacts} | 📞 Total Calls: ${totalCalls}`);
      console.log();
      
      console.log('📋 Recent Campaigns:');
      console.log('─'.repeat(80));
      
      if (recentCampaigns.length === 0) {
        console.log('   No campaigns found');
      } else {
        recentCampaigns.forEach(campaign => {
          const age = Math.floor((Date.now() - campaign.createdAt) / 1000 / 60); // minutes
          const statusIcon = campaign.status === 'active' ? '🟢' : 
                           campaign.status === 'draft' ? '📝' : 
                           campaign.status === 'completed' ? '✅' : 
                           campaign.status === 'paused' ? '⏸️' : '❌';
          
          console.log(`   ${statusIcon} ${campaign.name}`);
          console.log(`      Status: ${campaign.status} | Created: ${age}m ago`);
          if (campaign.stats) {
            console.log(`      Contacts: ${campaign.stats.totalContacts || 0} | Calls: ${campaign.stats.callsPlaced || 0}`);
          }
          console.log();
        });
      }
      
      console.log(`🔄 Last updated: ${new Date().toLocaleTimeString()}`);
      console.log('Press Ctrl+C to exit');
      
      // Wait 5 seconds before next update
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
  } catch (error) {
    console.error('Monitor error:', error);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down monitor...');
  await mongoose.disconnect();
  process.exit(0);
});

monitorCampaigns();