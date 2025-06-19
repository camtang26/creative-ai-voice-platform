#!/usr/bin/env node
/**
 * Check Recent Call Transcripts
 * Analyzes the last 20 calls to examine transcript quality
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkRecentTranscripts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Call = (await import('./db/models/call.model.js')).default;
    
    // Get last 20 calls with transcripts
    const recentCalls = await Call.find()
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log(`\nAnalyzing ${recentCalls.length} recent calls...\n`);
    console.log('=' .repeat(80));
    
    let transcriptIssues = 0;
    let emptyTranscripts = 0;
    let shortTranscripts = 0;
    
    for (let i = 0; i < recentCalls.length; i++) {
      const call = recentCalls[i];
      const transcript = call.transcript || '';
      const lines = transcript.split('\n').filter(line => line.trim());
      
      console.log(`\nCall ${i + 1}: ${call.callSid}`);
      console.log(`To: ${call.to}`);
      console.log(`Duration: ${call.duration}s`);
      console.log(`Status: ${call.status}`);
      console.log(`Created: ${new Date(call.createdAt).toLocaleString()}`);
      
      if (!transcript || transcript.trim() === '') {
        console.log(`❌ EMPTY TRANSCRIPT`);
        emptyTranscripts++;
        transcriptIssues++;
      } else if (lines.length < 3 && call.duration > 10) {
        console.log(`⚠️  SHORT TRANSCRIPT (${lines.length} lines for ${call.duration}s call)`);
        console.log(`Transcript preview:`);
        console.log(transcript.substring(0, 200) + (transcript.length > 200 ? '...' : ''));
        shortTranscripts++;
        transcriptIssues++;
      } else {
        console.log(`✅ Transcript lines: ${lines.length}`);
        console.log(`First 3 lines:`);
        lines.slice(0, 3).forEach((line, idx) => {
          console.log(`  ${idx + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        });
      }
      
      console.log('-'.repeat(80));
    }
    
    // Summary
    console.log('\n📊 TRANSCRIPT ANALYSIS SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total calls analyzed: ${recentCalls.length}`);
    console.log(`Calls with issues: ${transcriptIssues} (${Math.round(transcriptIssues/recentCalls.length*100)}%)`);
    console.log(`  - Empty transcripts: ${emptyTranscripts}`);
    console.log(`  - Short transcripts: ${shortTranscripts}`);
    console.log(`Calls with good transcripts: ${recentCalls.length - transcriptIssues}`);
    
    // Check for patterns
    console.log('\n🔍 PATTERN ANALYSIS:');
    const callsByStatus = {};
    recentCalls.forEach(call => {
      callsByStatus[call.status] = (callsByStatus[call.status] || 0) + 1;
    });
    console.log('Calls by status:', callsByStatus);
    
    // Check if transcript updates are coming through
    const transcriptUpdateCounts = recentCalls.map(call => {
      return {
        sid: call.callSid,
        updateCount: call.transcriptUpdateCount || 0,
        hasTranscript: !!call.transcript
      };
    });
    
    console.log('\n📝 TRANSCRIPT UPDATE COUNTS:');
    transcriptUpdateCounts.forEach(({ sid, updateCount, hasTranscript }) => {
      console.log(`${sid.slice(-8)}: ${updateCount} updates, has transcript: ${hasTranscript}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentTranscripts();