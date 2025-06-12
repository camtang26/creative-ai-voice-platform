import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testCSVUpload() {
  try {
    console.log('Testing CSV upload functionality...\n');

    // Create form data
    const form = new FormData();
    
    // Add the test CSV file
    const csvPath = path.join(process.cwd(), 'test-contacts.csv');
    form.append('file', fs.createReadStream(csvPath));
    
    // Add campaign details
    form.append('campaignName', 'Test CSV Upload - ' + new Date().toISOString());
    form.append('agentPrompt', 'You are a friendly assistant testing the system.');
    form.append('firstMessage', 'Hello {name}, this is a test call.');
    form.append('callInterval', '120000'); // 2 minutes
    form.append('validatePhoneNumbers', 'true');

    console.log('Uploading test CSV file...');
    console.log('File:', csvPath);

    // Make the request
    const response = await fetch('https://twilio-elevenlabs-app.onrender.com/api/db/campaigns/start-from-csv', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ CSV upload successful!');
      console.log(`Campaign ID: ${result.data.campaignId}`);
      console.log(`Valid contacts: ${result.data.totalContacts}`);
      console.log(`Invalid numbers: ${result.data.invalidNumbers}`);
      
      if (result.data.invalidNumbersList && result.data.invalidNumbersList.length > 0) {
        console.log('\nInvalid numbers:');
        result.data.invalidNumbersList.forEach(inv => {
          console.log(`- ${inv.name}: ${inv.phone} (${inv.reason})`);
        });
      }
    } else {
      console.log('\n❌ CSV upload failed!');
      console.log('Error:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. The backend server is running (node server-mongodb.js)');
    console.log('2. It\'s listening on port 3003');
    console.log('3. The test-contacts.csv file exists');
  }
}

testCSVUpload();