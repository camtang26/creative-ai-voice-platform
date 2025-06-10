/**
 * MongoDB API Test Script
 * 
 * This script tests the MongoDB API endpoints and generates a report of what's stored in the database.
 * It can be used to verify that calls, recordings, and transcripts are being properly stored.
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';

// Default values
const DEFAULT_SERVER_URL = "http://localhost:8000";

// Get server URL from environment or default to localhost
const SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;

// Command line arguments
const args = process.argv.slice(2);
const callSidArg = args[0]; // Optional Call SID to focus on
const serverUrl = args[1] || SERVER_URL;
const searchTermArg = args[2]; // Optional search term for transcript search

/**
 * Fetch data from an API endpoint
 * @param {string} endpoint - The API endpoint to fetch from
 * @returns {Promise<object>} The response data
 */
async function fetchApi(endpoint) {
  try {
    const url = `${serverUrl}${endpoint}`;
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * Generate a report of what's stored in the database
 */
async function generateReport() {
  console.log('Generating MongoDB database report...');
  
  // Create a report object to store all the data
  const report = {
    timestamp: new Date().toISOString(),
    server: serverUrl,
    calls: null,
    recordings: null,
    transcripts: null,
    searchResults: null
  };
  
  // Fetch calls
  if (callSidArg) {
    console.log(`\n--- Fetching specific call: ${callSidArg} ---`);
    report.calls = await fetchApi(`/api/db/calls/${callSidArg}`);
  } else {
    console.log('\n--- Fetching recent calls ---');
    const callsResponse = await fetchApi('/api/db/calls?limit=10');
    report.calls = callsResponse;
  }
  
  // If we have calls, fetch recordings and transcripts for the first call
  if (report.calls && (Array.isArray(report.calls.data) ? report.calls.data.length > 0 : report.calls.data)) {
    const callSid = callSidArg || (Array.isArray(report.calls.data) ? report.calls.data[0].callSid : report.calls.data.callSid);
    
    console.log(`\n--- Fetching recordings for call: ${callSid} ---`);
    report.recordings = await fetchApi(`/api/db/calls/${callSid}/recordings`);
    
    console.log(`\n--- Fetching transcript for call: ${callSid} ---`);
    report.transcripts = await fetchApi(`/api/db/calls/${callSid}/transcript`);
  }
  
  // If a search term was provided, search transcripts
  if (searchTermArg) {
    console.log(`\n--- Searching transcripts for: "${searchTermArg}" ---`);
    report.searchResults = await fetchApi(`/api/db/transcripts/search?q=${encodeURIComponent(searchTermArg)}`);
  }
  
  // Print the report
  console.log('\n=== MongoDB Database Report ===');
  console.log(`Generated at: ${report.timestamp}`);
  console.log(`Server: ${report.server}`);
  
  // Print calls
  console.log('\n--- Calls ---');
  if (report.calls) {
    if (Array.isArray(report.calls.data)) {
      console.log(`Total calls: ${report.calls.total || report.calls.data.length}`);
      report.calls.data.forEach((call, index) => {
        console.log(`\nCall ${index + 1}:`);
        console.log(`  SID: ${call.callSid}`);
        console.log(`  Status: ${call.status}`);
        console.log(`  From: ${call.from}`);
        console.log(`  To: ${call.to}`);
        console.log(`  Duration: ${call.duration || 'N/A'}`);
        console.log(`  Start Time: ${call.startTime || 'N/A'}`);
        console.log(`  End Time: ${call.endTime || 'N/A'}`);
      });
    } else {
      console.log(`SID: ${report.calls.data.callSid}`);
      console.log(`Status: ${report.calls.data.status}`);
      console.log(`From: ${report.calls.data.from}`);
      console.log(`To: ${report.calls.data.to}`);
      console.log(`Duration: ${report.calls.data.duration || 'N/A'}`);
      console.log(`Start Time: ${report.calls.data.startTime || 'N/A'}`);
      console.log(`End Time: ${report.calls.data.endTime || 'N/A'}`);
    }
  } else {
    console.log('No calls found');
  }
  
  // Print recordings
  console.log('\n--- Recordings ---');
  if (report.recordings && report.recordings.data && report.recordings.data.length > 0) {
    console.log(`Total recordings: ${report.recordings.data.length}`);
    report.recordings.data.forEach((recording, index) => {
      console.log(`\nRecording ${index + 1}:`);
      console.log(`  SID: ${recording.recordingSid}`);
      console.log(`  URL: ${recording.url}`);
      console.log(`  Duration: ${recording.duration || 'N/A'}`);
      console.log(`  Channels: ${recording.channels || 'N/A'}`);
      console.log(`  Status: ${recording.status}`);
    });
  } else {
    console.log('No recordings found');
  }
  
  // Print transcript
  console.log('\n--- Transcript ---');
  if (report.transcripts && report.transcripts.data && report.transcripts.data.transcript) {
    const transcript = report.transcripts.data.transcript;
    console.log(`Transcript for call: ${report.transcripts.data.callSid}`);
    console.log(`Total messages: ${transcript.length}`);
    
    transcript.forEach((message, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log(`  Role: ${message.role}`);
      console.log(`  Text: ${message.text}`);
      console.log(`  Timestamp: ${message.timestamp || 'N/A'}`);
    });
    
    // Print sentiment if available
    if (report.transcripts.data.sentiment) {
      console.log('\nSentiment Analysis:');
      console.log(`  Overall: ${report.transcripts.data.sentiment.overall}`);
      
      if (report.transcripts.data.sentiment.segments) {
        console.log('  Segments:');
        report.transcripts.data.sentiment.segments.forEach((segment, index) => {
          console.log(`    ${index + 1}. ${segment.role}: ${segment.score}`);
        });
      }
    }
  } else {
    console.log('No transcript found');
  }
  
  // Print search results
  if (searchTermArg) {
    console.log(`\n--- Search Results for "${searchTermArg}" ---`);
    if (report.searchResults && report.searchResults.data && report.searchResults.data.length > 0) {
      console.log(`Total matches: ${report.searchResults.data.length}`);
      
      report.searchResults.data.forEach((result, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log(`  Call SID: ${result.callSid}`);
        console.log(`  Matched Text: "${result.matchedText}"`);
        console.log(`  Context: "${result.context}"`);
      });
    } else {
      console.log('No search results found');
    }
  }
  
  // Save the report to a file
  const reportFileName = `mongodb-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportFileName}`);
}

console.log(`
MongoDB API Test Script (v1.0.0)
--------------------------------
Usage: node test-mongodb-api.js [call_sid] [server_url] [search_term]
Examples:
  node test-mongodb-api.js                         # Test all endpoints with recent calls
  node test-mongodb-api.js CA123456789             # Test with a specific call SID
  node test-mongodb-api.js CA123456789 http://localhost:8000
  node test-mongodb-api.js CA123456789 http://localhost:8000 "test"  # Search for "test" in transcripts

Server URL: ${serverUrl}
Call SID: ${callSidArg || 'Not specified (will use most recent)'}
Search Term: ${searchTermArg || 'Not specified'}
`);

// Generate the report
generateReport();