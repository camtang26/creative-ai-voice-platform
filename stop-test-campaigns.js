import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/twilio_elevenlabs';

// Campaign schema
const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'completed', 'failed'],
    default: 'draft'
  },
  contactCount: { type: Number, default: 0 },
  callsCompleted: { type: Number, default: 0 },
  callsInProgress: { type: Number, default: 0 },
  callsQueued: { type: Number, default: 0 }
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', campaignSchema);

// Contact schema  
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  status: {
    type: String,
    enum: ['pending', 'calling', 'completed', 'failed', 'no-answer', 'busy'],
    default: 'pending'
  }
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

async function stopTestCampaigns() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all contacts with the test number
    const testContacts = await Contact.find({ 
      phoneNumber: { $regex: '.*415.*555.*9998.*|.*\\+1.*415.*555.*9998.*' }
    });
    
    console.log(`Found ${testContacts.length} test contacts`);
    
    // Get unique campaign IDs from these contacts
    const campaignIds = [...new Set(testContacts.map(c => c.campaignId?.toString()).filter(Boolean))];
    
    console.log(`Found ${campaignIds.length} campaigns with test contacts`);
    
    // Stop all these campaigns
    for (const campaignId of campaignIds) {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        console.log(`\nCampaign: ${campaign.name} (${campaign._id})`);
        console.log(`Status: ${campaign.status}`);
        console.log(`Calls in progress: ${campaign.callsInProgress}`);
        console.log(`Calls queued: ${campaign.callsQueued}`);
        
        if (campaign.status === 'active') {
          // Update campaign to paused
          campaign.status = 'paused';
          campaign.callsInProgress = 0;
          campaign.callsQueued = 0;
          await campaign.save();
          console.log('✅ Campaign STOPPED');
        }
      }
    }
    
    // Also delete all test contacts to prevent future issues
    const deleteResult = await Contact.deleteMany({ 
      phoneNumber: { $regex: '.*415.*555.*9998.*|.*\\+1.*415.*555.*9998.*' }
    });
    
    console.log(`\n✅ Deleted ${deleteResult.deletedCount} test contacts`);
    
    // Find and stop ANY active campaigns just to be safe
    const activeCampaigns = await Campaign.find({ status: 'active' });
    console.log(`\nFound ${activeCampaigns.length} active campaigns total`);
    
    for (const campaign of activeCampaigns) {
      console.log(`\nActive Campaign: ${campaign.name}`);
      campaign.status = 'paused';
      campaign.callsInProgress = 0;
      campaign.callsQueued = 0;
      await campaign.save();
      console.log('✅ Campaign PAUSED');
    }
    
    console.log('\n🛑 All test campaigns stopped and test contacts deleted!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

stopTestCampaigns();