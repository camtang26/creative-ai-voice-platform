/**
 * Script to fix terminatedBy values using actual Twilio Voice Insights data
 * This will fetch the real "Who Hung Up" data from Twilio for all existing calls
 */

import mongoose from 'mongoose';
import twilio from 'twilio';
import dotenv from 'dotenv';
import Call from './db/models/call.model.js';
import { getTerminationFromVoiceInsights } from './twilio-voice-insights.js';

dotenv.config();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function fixTerminatedByWithVoiceInsights() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[MongoDB] Connected successfully');

    // Find all completed calls
    const calls = await Call.find({ 
      status: 'completed',
      callSid: { $exists: true, $ne: null }
    });
    
    console.log(`[Fix] Found ${calls.length} completed calls to update`);

    let updatedCount = 0;
    let voiceInsightsAvailable = 0;
    let failedCount = 0;
    const updates = [];
    
    // Process calls in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (call) => {
        try {
          console.log(`[Processing] Call ${call.callSid} (${i + 1}/${calls.length})`);
          
          // First try Voice Insights
          const voiceInsights = await getTerminationFromVoiceInsights(twilioClient, call.callSid);
          
          let newTerminatedBy = null;
          let dataSource = 'none';
          
          if (voiceInsights.available && voiceInsights.whoHungUp) {
            // We have Voice Insights data!
            newTerminatedBy = voiceInsights.whoHungUp;
            dataSource = 'voice_insights';
            voiceInsightsAvailable++;
            console.log(`[Voice Insights] Call ${call.callSid}: Who hung up = ${newTerminatedBy}`);
          } else {
            // Fallback: Try to get basic call details from Twilio
            try {
              const callDetails = await twilioClient.calls(call.callSid).fetch();
              
              // Use call details to make an educated guess
              if (callDetails.duration < 5) {
                newTerminatedBy = 'user'; // Very short calls are usually immediate hangups
                dataSource = 'duration_heuristic';
              } else if (callDetails.duration > 120) {
                newTerminatedBy = 'agent'; // Longer calls likely completed by AI
                dataSource = 'duration_heuristic';
              } else if (call.answeredBy === 'human' && callDetails.duration > 30) {
                newTerminatedBy = 'agent'; // Human answered and talked for a while
                dataSource = 'answered_by_heuristic';
              } else if (call.answeredBy && call.answeredBy.startsWith('machine')) {
                newTerminatedBy = 'agent'; // Machine calls usually complete
                dataSource = 'answered_by_heuristic';
              }
              
              // Log what we found
              console.log(`[Fallback] Call ${call.callSid}: Using ${dataSource} -> ${newTerminatedBy}`);
            } catch (twilioError) {
              console.error(`[Error] Failed to fetch call details for ${call.callSid}:`, twilioError.message);
              failedCount++;
              return;
            }
          }
          
          // Update the call if we determined a terminator
          if (newTerminatedBy && newTerminatedBy !== call.terminatedBy) {
            await Call.updateOne(
              { _id: call._id },
              { 
                $set: { 
                  terminatedBy: newTerminatedBy,
                  terminationReason: `Updated from Voice Insights (${dataSource})`,
                  terminationSource: dataSource
                } 
              }
            );
            
            updates.push({
              callSid: call.callSid,
              oldValue: call.terminatedBy,
              newValue: newTerminatedBy,
              dataSource: dataSource,
              duration: call.duration,
              answeredBy: call.answeredBy
            });
            
            updatedCount++;
          }
        } catch (error) {
          console.error(`[Error] Failed to process call ${call.callSid}:`, error.message);
          failedCount++;
        }
      }));
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < calls.length) {
        console.log(`[Progress] Processed ${Math.min(i + batchSize, calls.length)}/${calls.length} calls`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log('\n[Summary]');
    console.log(`- Total calls processed: ${calls.length}`);
    console.log(`- Calls updated: ${updatedCount}`);
    console.log(`- Voice Insights available: ${voiceInsightsAvailable}`);
    console.log(`- Failed to process: ${failedCount}`);
    
    if (updates.length > 0) {
      console.log('\n[Sample Updates]');
      updates.slice(0, 10).forEach(update => {
        console.log(`- ${update.callSid}: ${update.oldValue || 'null'} -> ${update.newValue} (source: ${update.dataSource})`);
      });
    }

  } catch (error) {
    console.error('[Error] Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed');
  }
}

// Run the fix
console.log('[Script] Starting Voice Insights data fetch...');
console.log('[Note] This may take a while for large datasets due to API rate limits');
fixTerminatedByWithVoiceInsights();