// Removed node-fetch import - using native fetch
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Campaign from './db/models/campaign.model.js';
import Contact from './db/models/contact.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCompleteCSVFlow() {
  try {
    console.log('🧪 Testing Complete CSV Upload Flow\n');

    // 1. Connect to MongoDB to check before/after
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-calling');
    console.log('✅ Connected to MongoDB');

    // Count campaigns and contacts before
    const campaignsBefore = await Campaign.countDocuments();
    const contactsBefore = await Contact.countDocuments();
    console.log(`📊 Before: ${campaignsBefore} campaigns, ${contactsBefore} contacts\n`);

    // 2. Create form data for CSV upload
    const form = new FormData();
    
    // Add the test CSV file
    const csvPath = path.join(process.cwd(), 'test-contacts.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error('test-contacts.csv file not found!');
    }
    
    form.append('file', fs.createReadStream(csvPath));
    
    // Add campaign details
    const campaignName = `Test Campaign ${new Date().toISOString()}`;
    form.append('campaignName', campaignName);
    form.append('agentPrompt', 'You are a helpful assistant testing the CSV upload system.');
    form.append('firstMessage', 'Hello {name}, this is a test call to verify our system works.');
    form.append('callInterval', '90000'); // 90 seconds
    form.append('validatePhoneNumbers', 'true');

    console.log('📤 Uploading CSV with the following data:');
    console.log(`- Campaign Name: ${campaignName}`);
    console.log(`- Agent Prompt: Set`);
    console.log(`- First Message: Set with {name} placeholder`);
    console.log(`- Call Interval: 90 seconds`);
    console.log(`- Phone Validation: Enabled`);
    console.log(`- File: ${csvPath}\n`);

    // 3. Send the request to the server
    const response = await fetch('https://twilio-elevenlabs-app.onrender.com/api/db/campaigns/start-from-csv', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Request failed:');
      console.log(errorText);
      return;
    }

    const result = await response.json();
    console.log('📦 Response Data:');
    console.log(JSON.stringify(result, null, 2));

    // 4. Verify the results
    if (result.success) {
      console.log('\n✅ CSV Upload Reported Success!');
      console.log(`📋 Campaign ID: ${result.data?.campaignId || 'N/A'}`);
      console.log(`👥 Valid Contacts: ${result.data?.totalContacts || 0}`);
      console.log(`❌ Invalid Numbers: ${result.data?.invalidNumbers || 0}`);
      
      if (result.data?.invalidNumbersList?.length > 0) {
        console.log('\n📋 Invalid Numbers:');
        result.data.invalidNumbersList.forEach((inv, idx) => {
          console.log(`  ${idx + 1}. ${inv.name}: ${inv.phone} - ${inv.reason}`);
        });
      }

      // 5. Verify in database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second for DB operations
      
      console.log('\n🔍 Verifying in Database...');
      const campaignsAfter = await Campaign.countDocuments();
      const contactsAfter = await Contact.countDocuments();
      
      console.log(`📊 After: ${campaignsAfter} campaigns (+${campaignsAfter - campaignsBefore}), ${contactsAfter} contacts (+${contactsAfter - contactsBefore})`);

      // Find the new campaign
      const newCampaign = await Campaign.findOne({ name: campaignName });
      if (newCampaign) {
        console.log('\n🎯 Found Campaign in Database:');
        console.log(`- Name: ${newCampaign.name}`);
        console.log(`- Status: ${newCampaign.status}`);
        console.log(`- Prompt: ${newCampaign.prompt ? 'Set' : 'Missing'}`);
        console.log(`- First Message: ${newCampaign.firstMessage ? 'Set' : 'Missing'}`);
        
        // Count contacts for this campaign
        const campaignContacts = await Contact.countDocuments({ campaigns: newCampaign._id });
        console.log(`- Associated Contacts: ${campaignContacts}`);
        
        if (campaignContacts > 0) {
          console.log('\n📞 Sample Contacts:');
          const sampleContacts = await Contact.find({ campaigns: newCampaign._id }).limit(3);
          sampleContacts.forEach((contact, idx) => {
            console.log(`  ${idx + 1}. ${contact.name} - ${contact.phoneNumber}`);
          });
        }
      } else {
        console.log('❌ Campaign not found in database!');
      }

    } else {
      console.log('\n❌ CSV Upload Failed!');
      console.log(`Error: ${result.error || 'Unknown error'}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }

  } catch (error) {
    console.error('\n💥 Test Failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. The backend server is running (node server-mongodb.js)');
    console.log('2. MongoDB is running and accessible');
    console.log('3. The test-contacts.csv file exists');
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

testCompleteCSVFlow();