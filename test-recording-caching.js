/**
 * Test Recording Caching Functionality
 * This script tests the server-side file caching and streaming of Twilio recordings
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getRecordingBySid } from './db/repositories/recording.repository.js';
import { MongoDBClient } from './db/mongodb-connection.js';
import recordingCache from './db/utils/recording-cache.js';

// Configuration
const TEST_DOWNLOAD_DIR = path.join(os.tmpdir(), 'twilio-test-downloads');
const SERVER_PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${SERVER_PORT}`;

// Create test download directory
if (!fs.existsSync(TEST_DOWNLOAD_DIR)) {
  fs.mkdirSync(TEST_DOWNLOAD_DIR, { recursive: true });
  console.log(`Created test download directory: ${TEST_DOWNLOAD_DIR}`);
}

/**
 * Tests file caching functionality directly
 */
async function testRecordingCache(recordingSid) {
  console.log(`\n--- Testing Direct Cache Mechanism for ${recordingSid} ---`);
  
  try {
    // Get recording from MongoDB
    const recording = await getRecordingBySid(recordingSid);
    if (!recording || !recording.url) {
      console.error(`Recording ${recordingSid} not found or URL missing`);
      return false;
    }
    
    console.log(`Found recording: ${recording.recordingSid}`);
    console.log(`Twilio URL: ${recording.url}`);
    
    // Check if already cached
    const isCached = await recordingCache.isRecordingCached(recordingSid);
    console.log(`Recording already cached: ${isCached}`);
    
    // Get or cache the recording
    const filePath = await recordingCache.getRecordingFile(
      recording.url,
      recordingSid,
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    console.log(`Cached file path: ${filePath}`);
    
    // Check if file exists and has content
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`File exists: ${stats.size} bytes`);
      return true;
    } else {
      console.error(`File does not exist: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error('Error testing recording cache:', error);
    return false;
  }
}

/**
 * Tests the enhanced media endpoint
 */
async function testMediaEndpoint(recordingSid) {
  console.log(`\n--- Testing Enhanced Media Endpoint for ${recordingSid} ---`);
  
  try {
    const url = `${BASE_URL}/api/media/recordings/${recordingSid}`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      console.error(`Error response: ${await response.text()}`);
      return false;
    }
    
    // Download the file to test directory
    const outputPath = path.join(TEST_DOWNLOAD_DIR, `media_endpoint_${recordingSid}.mp3`);
    const fileStream = fs.createWriteStream(outputPath);
    
    return new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', (err) => {
        console.error('Download stream error:', err);
        reject(err);
      });
      
      fileStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`Downloaded file to: ${outputPath} (${stats.size} bytes)`);
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        console.error('File write error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error testing media endpoint:', error);
    return false;
  }
}

/**
 * Tests the download endpoint
 */
async function testDownloadEndpoint(recordingSid) {
  console.log(`\n--- Testing Download Endpoint for ${recordingSid} ---`);
  
  try {
    const url = `${BASE_URL}/api/recordings/${recordingSid}/download`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Disposition: ${response.headers.get('content-disposition')}`);
    
    if (!response.ok) {
      console.error(`Error response: ${await response.text()}`);
      return false;
    }
    
    // Download the file to test directory
    const outputPath = path.join(TEST_DOWNLOAD_DIR, `download_endpoint_${recordingSid}.mp3`);
    const fileStream = fs.createWriteStream(outputPath);
    
    return new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', (err) => {
        console.error('Download stream error:', err);
        reject(err);
      });
      
      fileStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`Downloaded file to: ${outputPath} (${stats.size} bytes)`);
        resolve(true);
      });
      
      fileStream.on('error', (err) => {
        console.error('File write error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error testing download endpoint:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await MongoDBClient.connect();
    console.log('✅ Connected to MongoDB');
    
    // Get recent recording to test with
    const recentRecording = await MongoDBClient.db.collection('recordings').findOne(
      { url: { $exists: true, $ne: "" } },
      { sort: { createdAt: -1 } }
    );
    
    if (!recentRecording) {
      console.error('No valid recordings found for testing');
      await MongoDBClient.close();
      return;
    }
    
    const recordingSid = recentRecording.recordingSid;
    console.log(`📝 Using recording: ${recordingSid}`);
    
    // Run tests
    console.log('\n🧪 RUNNING TESTS\n');
    
    // Test direct caching
    const cacheResult = await testRecordingCache(recordingSid);
    console.log(`Cache Test: ${cacheResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test enhanced media endpoint
    const mediaResult = await testMediaEndpoint(recordingSid);
    console.log(`Media Endpoint Test: ${mediaResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test download endpoint
    const downloadResult = await testDownloadEndpoint(recordingSid);
    console.log(`Download Endpoint Test: ${downloadResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test results
    console.log('\n📊 TEST RESULTS\n');
    console.log(`Cache Mechanism: ${cacheResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Media Endpoint: ${mediaResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Download Endpoint: ${downloadResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log(`\n🗂️ Test files available in: ${TEST_DOWNLOAD_DIR}`);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await MongoDBClient.close();
  }
}

// Run tests
console.log('🚀 Starting Recording Cache & Stream Tests');
runTests().catch(console.error);
