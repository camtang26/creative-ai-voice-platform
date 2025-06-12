import mongoose from 'mongoose';
import { importContacts } from './db/repositories/contact.repository.js';
import Contact from './db/models/contact.model.js';
import Campaign from './db/models/campaign.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugContactImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('✅ Connected to MongoDB\n');

    // Create a test campaign first
    const testCampaign = new Campaign({
      name: 'Debug Test Campaign',
      description: 'Testing contact import',
      status: 'draft',
      agentPrompt: 'Test prompt',
      firstMessage: 'Test message'
    });
    await testCampaign.save();
    console.log(`📋 Created test campaign: ${testCampaign._id}\n`);

    // Test contacts data (same format as CSV upload)
    const testContacts = [
      {
        phoneNumber: '+14155552671',
        name: 'John Doe',
        email: 'john.doe@example.com',
        status: 'active',
        campaignIds: [testCampaign._id],
        customFields: {
          firstName: 'John',
          lastName: 'Doe'
        }
      },
      {
        phoneNumber: '+14155552672',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        status: 'active',
        campaignIds: [testCampaign._id],
        customFields: {
          firstName: 'Jane',
          lastName: 'Smith'
        }
      }
    ];

    console.log('🧪 Testing contact import...');
    console.log('Test contacts:', JSON.stringify(testContacts, null, 2));

    // Test the import function
    const importResults = await importContacts(testContacts, testCampaign._id);
    console.log('\n📊 Import Results:');
    console.log(JSON.stringify(importResults, null, 2));

    // Check what was actually created
    const createdContacts = await Contact.find({ campaignIds: testCampaign._id });
    console.log(`\n✅ Found ${createdContacts.length} contacts in database:`);
    createdContacts.forEach(contact => {
      console.log(`- ${contact.name} (${contact.phoneNumber}) - Campaigns: ${contact.campaignIds.length}`);
    });

    // Check all contacts with these phone numbers
    const phoneNumbers = testContacts.map(c => c.phoneNumber.replace(/\D/g, ''));
    console.log(`\n🔍 Checking for contacts with phone numbers: ${phoneNumbers.join(', ')}`);
    
    const allMatchingContacts = await Contact.find({ 
      phoneNumber: { $in: phoneNumbers }
    });
    
    console.log(`Found ${allMatchingContacts.length} contacts with matching phone numbers:`);
    allMatchingContacts.forEach(contact => {
      console.log(`- ${contact.name} (${contact.phoneNumber}) - Campaigns: ${contact.campaignIds.map(id => id.toString()).join(', ')}`);
    });

    // Cleanup
    await Contact.deleteMany({ campaignIds: testCampaign._id });
    await Campaign.deleteOne({ _id: testCampaign._id });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugContactImport();