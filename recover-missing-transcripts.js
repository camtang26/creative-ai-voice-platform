/**
 * Script to recover missing transcripts from ElevenLabs
 * This will find all calls with conversation IDs but no transcripts and fetch them from ElevenLabs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Call from './db/models/call.model.js';
import Transcript from './db/models/transcript.model.js';
import { createOrUpdateTranscriptFromElevenLabs } from './db/repositories/transcript.repository.js';

// Load environment variables
dotenv.config();

async function recoverMissingTranscripts() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find calls with conversation IDs but no transcripts
    console.log('🔍 Finding calls with missing transcripts...');
    
    // Get all completed calls with conversation IDs
    const callsWithConvIds = await Call.find({
      conversationId: { $exists: true, $ne: null },
      status: 'completed'
    }).sort({ createdAt: -1 }); // Most recent first
    
    console.log(`📊 Found ${callsWithConvIds.length} completed calls with conversation IDs`);
    
    let recovered = 0;
    let failed = 0;
    let alreadyHad = 0;
    const failedCalls = [];
    
    // Check each call
    for (let i = 0; i < callsWithConvIds.length; i++) {
      const call = callsWithConvIds[i];
      
      // Check if transcript already exists
      const existingTranscript = await Transcript.findOne({ callSid: call.callSid });
      
      if (existingTranscript) {
        alreadyHad++;
        console.log(`✓ Call ${call.callSid} already has transcript`);
        continue;
      }
      
      console.log(`\n🔄 Processing ${i + 1}/${callsWithConvIds.length}: ${call.callSid}`);
      console.log(`  📞 To: ${call.to}, Contact: ${call.contactName}`);
      console.log(`  🆔 Conversation ID: ${call.conversationId}`);
      
      try {
        // Fetch from ElevenLabs API
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          throw new Error('Missing ELEVENLABS_API_KEY');
        }
        
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${call.conversationId}`;
        console.log(`  🌐 Fetching from ElevenLabs...`);
        
        const response = await fetch(elevenLabsUrl, {
          method: 'GET',
          headers: { 'xi-api-key': apiKey }
        });
        
        if (response.ok) {
          const elevenLabsData = await response.json();
          
          // Check if we got actual transcript data
          if (elevenLabsData.transcript && elevenLabsData.transcript.length > 0) {
            // Save the transcript
            await createOrUpdateTranscriptFromElevenLabs(call.callSid, elevenLabsData);
            recovered++;
            console.log(`  ✅ Successfully recovered transcript (${elevenLabsData.transcript.length} messages)`);
          } else {
            console.log(`  ⚠️  No transcript data available from ElevenLabs`);
            failed++;
            failedCalls.push({
              callSid: call.callSid,
              conversationId: call.conversationId,
              reason: 'No transcript data in response'
            });
          }
        } else {
          const errorText = await response.text();
          console.error(`  ❌ ElevenLabs API error ${response.status}: ${errorText}`);
          failed++;
          failedCalls.push({
            callSid: call.callSid,
            conversationId: call.conversationId,
            reason: `API error ${response.status}`
          });
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        failed++;
        failedCalls.push({
          callSid: call.callSid,
          conversationId: call.conversationId,
          reason: error.message
        });
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RECOVERY SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total calls checked: ${callsWithConvIds.length}`);
    console.log(`Already had transcripts: ${alreadyHad}`);
    console.log(`Successfully recovered: ${recovered} ✅`);
    console.log(`Failed to recover: ${failed} ❌`);
    
    if (failedCalls.length > 0) {
      console.log('\n❌ Failed calls:');
      failedCalls.forEach(f => {
        console.log(`  - ${f.callSid}: ${f.reason}`);
      });
    }
    
    console.log('\n✅ Recovery process complete!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the recovery
console.log('🚀 Starting transcript recovery process...\n');
recoverMissingTranscripts();