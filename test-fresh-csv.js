#!/usr/bin/env node

/**
 * Test CSV upload with fresh phone numbers to verify the complete workflow
 */

// Removed node-fetch import - using native fetch
import FormData from 'form-data';
import fs from 'fs';

const CSV_CONTENT = `ID,FirstName,LastName,Email,Phone
1,Test,User1,test1@example.com,+1415555999${Math.floor(Math.random() * 10)}
2,Test,User2,test2@example.com,+1415555999${Math.floor(Math.random() * 10)}
3,Test,User3,test3@example.com,+1415555999${Math.floor(Math.random() * 10)}`;

async function testFreshCsvUpload() {
  console.log('🧪 Testing fresh CSV upload workflow...');
  
  // Create temporary CSV file
  const csvPath = '/tmp/test-fresh.csv';
  fs.writeFileSync(csvPath, CSV_CONTENT);
  console.log('📄 Created test CSV with fresh phone numbers');
  
  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath), {
      filename: 'test-fresh.csv',
      contentType: 'text/csv'
    });
    formData.append('campaignName', 'Fresh Test Campaign');
    formData.append('agentPrompt', ''); // Test with blank agent prompt
    formData.append('firstMessage', 'Hello {name}, this is a test call!');
    formData.append('callInterval', '60000'); // 60 seconds
    formData.append('validatePhoneNumbers', 'true');
    
    console.log('📤 Uploading CSV...');
    
    const response = await fetch('https://twilioel-production.up.railway.app/api/db/campaigns/start-from-csv', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log('\n📊 Upload Response:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('Full Result:', JSON.stringify(result, null, 2));
    
    if (result.data) {
      console.log('\n📈 Campaign Data:');
      console.log('Campaign ID:', result.data.campaignId);
      console.log('Campaign Name:', result.data.campaignName);
      console.log('Total Contacts:', result.data.totalContacts);
      console.log('Invalid Numbers:', result.data.invalidNumbers);
      console.log('Call Interval:', result.data.callInterval, 'seconds');
    }
    
    if (result.error) {
      console.log('\n❌ Error:', result.error);
    }
    
    // Clean up
    fs.unlinkSync(csvPath);
    console.log('\n🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    // Clean up on error
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
  }
}

// Run the test
testFreshCsvUpload();