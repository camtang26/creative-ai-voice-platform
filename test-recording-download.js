/**
 * Test script for recording download routes
 * Tests all three route patterns to ensure they work correctly
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const baseUrl = process.env.BASE_URL || 'http://localhost:8000'; // Default to local development
const testRecordingSid = process.argv[2]; // Pass recording SID as command line argument

if (!testRecordingSid) {
  console.error('Please provide a recording SID as an argument.');
  console.error('Example: node test-recording-download.js RE123456789abcdef');
  process.exit(1);
}

// Test all route patterns including the new base64 approach
const routesToTest = [
  // Original path (known to be problematic)
  `/api/recordings/${testRecordingSid}/download`,
  
  // Alternative 1: Standard media route (avoiding 'download' keyword)
  `/api/media/recordings/${testRecordingSid}`,
  
  // Alternative 2: Query parameter approach
  `/api/recordings/download?recordingSid=${testRecordingSid}`,
  
  // Alternative 3: Base64 encoded JSON response
  `/api/recordings/data/${testRecordingSid}`
];

async function testDownload(route, index) {
  console.log(`\n[TEST ${index + 1}] Testing route: ${route}`);
  
  try {
    const fullUrl = `${baseUrl}${route}`;
    console.log(`Making request to: ${fullUrl}`);
    
    const startTime = Date.now();
    const response = await fetch(fullUrl);
    const endTime = Date.now();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response time: ${endTime - startTime}ms`);
    
    if (!response.ok) {
      console.log(`[FAILED] Route ${route} returned status: ${response.status}`);
      return {
        route,
        success: false,
        status: response.status,
        error: response.statusText
      };
    }
    
    // Get content-type header
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    // Handle JSON response differently (for base64 endpoint)
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      console.log(`[SUCCESS] Route ${route} returned JSON data.`);
      
      // Check if it's our base64 format
      if (jsonResponse.data && jsonResponse.data.base64Data && jsonResponse.data.contentType) {
        console.log(`Base64 data received (${jsonResponse.data.sizeBytes} bytes, ${jsonResponse.data.contentType})`);
        
        // Save a small sample to file
        const sampleFilename = `sample_${index + 1}_${testRecordingSid}.json`;
        fs.writeFileSync(
          path.join(__dirname, sampleFilename), 
          JSON.stringify({
            ...jsonResponse.data,
            base64Data: jsonResponse.data.base64Data.substring(0, 100) + '...' // Truncate for the sample
          }, null, 2)
        );
        
        console.log(`Saved JSON sample to ${sampleFilename}`);
        
        return {
          route,
          success: true,
          status: response.status,
          contentType: 'application/json',
          isBase64: true,
          audioContentType: jsonResponse.data.contentType,
          sampleFilename
        };
      }
      
      // Regular JSON response
      const sampleFilename = `sample_${index + 1}_${testRecordingSid}.json`;
      fs.writeFileSync(path.join(__dirname, sampleFilename), JSON.stringify(jsonResponse, null, 2));
      
      return {
        route,
        success: true,
        status: response.status,
        contentType,
        sampleFilename
      };
    }
    
    // Binary response (audio data)
    // Check if it's an audio type
    if (!contentType || !contentType.includes('audio')) {
      console.log(`[WARNING] Expected audio content type but got: ${contentType}`);
    }
    
    // Download a small portion of the file to verify it's working
    const buffer = await response.buffer();
    const sampleSize = Math.min(buffer.length, 1024); // First 1KB or less
    
    // Save sample to file for manual verification if needed
    const sampleFilename = `sample_${index + 1}_${testRecordingSid}.bin`;
    fs.writeFileSync(path.join(__dirname, sampleFilename), buffer.slice(0, sampleSize));
    
    console.log(`[SUCCESS] Route ${route} returned audio data.`);
    console.log(`Saved first ${sampleSize} bytes to ${sampleFilename}`);
    
    return {
      route,
      success: true,
      status: response.status,
      contentType,
      sampleSize,
      sampleFilename
    };
  } catch (error) {
    console.error(`[ERROR] Exception testing route ${route}:`, error.message);
    return {
      route,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log(`\n=== Testing Recording Download Routes ===`);
  console.log(`Using recording SID: ${testRecordingSid}`);
  
  const results = [];
  
  for (let i = 0; i < routesToTest.length; i++) {
    const result = await testDownload(routesToTest[i], i);
    results.push(result);
  }
  
  // Summary
  console.log(`\n=== TEST SUMMARY ===`);
  let successCount = 0;
  
  results.forEach((result, index) => {
    console.log(`\n[Route ${index + 1}] ${result.route}`);
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      successCount++;
      console.log(`Status: ${result.status}, Content-Type: ${result.contentType}`);
      console.log(`Sample: ${result.sampleSize} bytes saved to ${result.sampleFilename}`);
    } else {
      console.log(`Error: ${result.error || result.status}`);
    }
  });
  
  console.log(`\n--- ${successCount} of ${routesToTest.length} routes working ---`);
  
  if (successCount === 0) {
    console.log('\n❌ All routes failed. Please check your server configuration and environment variables.');
  } else if (successCount < routesToTest.length) {
    console.log('\n⚠️ Some routes failed. The working routes should be used in the frontend.');
  } else {
    console.log('\n✅ All routes are working! Your fix is successful.');
  }
}

runTests().catch(err => {
  console.error('Unhandled exception:', err);
  process.exit(1);
});
