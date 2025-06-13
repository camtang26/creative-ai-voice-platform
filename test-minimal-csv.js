#!/usr/bin/env node

/**
 * Minimal test of CSV upload with just the required fields
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const CSV_CONTENT = `FirstName,LastName,Phone
Test,User,+14155559999`;

async function testMinimalCsv() {
  console.log('🧪 Testing minimal CSV upload...');
  
  // Create temporary CSV file
  const csvPath = '/tmp/test-minimal.csv';
  fs.writeFileSync(csvPath, CSV_CONTENT);
  console.log('📄 Created minimal test CSV');
  
  try {
    // Prepare minimal form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath), {
      filename: 'test-minimal.csv',
      contentType: 'text/csv'
    });
    formData.append('campaignName', 'Minimal Test Campaign');
    formData.append('agentPrompt', ''); // Blank agent prompt
    formData.append('firstMessage', 'Hello {name}!');
    formData.append('callInterval', '60000');
    formData.append('validatePhoneNumbers', 'false');
    
    console.log('📤 Uploading minimal CSV...');
    
    const response = await fetch('https://twilioel-production.up.railway.app/api/db/campaigns/start-from-csv', {
      method: 'POST',
      body: formData
    });
    
    console.log('\n📊 Response Status:', response.status);
    
    if (response.status === 500) {
      console.log('💥 Internal Server Error - checking response text...');
      const errorText = await response.text();
      console.log('Error Details:', errorText);
    } else {
      const result = await response.json();
      console.log('Response:', JSON.stringify(result, null, 2));
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

testMinimalCsv();