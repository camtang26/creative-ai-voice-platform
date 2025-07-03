import twilio from 'twilio';
import Call from './db/models/call.model.js';
import { initializeMongoDB } from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * Enhanced termination detection using multiple data sources
 */
async function detectTermination(callSid, dbCall) {
  try {
    // 1. Fetch the call details from Twilio
    const twilioCall = await client.calls(callSid).fetch();
    
    // 2. Check if we have transcript data that might indicate who hung up
    let transcriptIndicator = null;
    if (dbCall.transcriptId) {
      // Look for common patterns in transcripts that indicate termination
      // This would require analyzing the actual transcript content
      // For now, we'll use the conversation completion status from ElevenLabs
      if (dbCall.terminationReason === 'conversation_completed') {
        transcriptIndicator = 'agent'; // AI completed the conversation
      }
    }
    
    // 3. Analyze call duration and patterns
    const duration = parseInt(twilioCall.duration) || 0;
    
    // Very short calls (under 3 seconds) - likely immediate hangup by callee
    if (duration < 3) {
      return {
        terminatedBy: 'callee',
        confidence: 'high',
        reason: 'Very short call duration indicates immediate hangup'
      };
    }
    
    // Calls that weren't answered
    if (twilioCall.status === 'no-answer' || twilioCall.status === 'busy') {
      return {
        terminatedBy: 'system',
        confidence: 'high',
        reason: `Call status: ${twilioCall.status}`
      };
    }
    
    // Failed calls
    if (twilioCall.status === 'failed') {
      return {
        terminatedBy: 'system',
        confidence: 'high',
        reason: 'Call failed to connect'
      };
    }
    
    // Machine detection - machines don't hang up, so if it ended it was our system
    if (twilioCall.answeredBy === 'machine_start' || twilioCall.answeredBy === 'machine_end_beep' ||
        twilioCall.answeredBy === 'machine_end_silence' || twilioCall.answeredBy === 'machine_end_other') {
      return {
        terminatedBy: 'system',
        confidence: 'high',
        reason: 'Answering machine detected - system terminated'
      };
    }
    
    // Check our existing data from ElevenLabs webhook
    if (dbCall.terminationSource === 'elevenlabs_webhook' && dbCall.terminatedBy === 'agent') {
      return {
        terminatedBy: 'agent',
        confidence: 'high',
        reason: 'ElevenLabs webhook confirmed conversation completion'
      };
    }
    
    // Medium duration calls (3-15 seconds) - often indicate quick rejection
    if (duration >= 3 && duration < 15) {
      return {
        terminatedBy: 'callee',
        confidence: 'medium',
        reason: 'Short call duration suggests callee hangup'
      };
    }
    
    // Longer calls (15+ seconds) - harder to determine without more data
    if (duration >= 15) {
      // If we have transcript indicator, use it
      if (transcriptIndicator) {
        return {
          terminatedBy: transcriptIndicator,
          confidence: 'medium',
          reason: 'Based on conversation completion status'
        };
      }
      
      // Default assumption for longer calls without clear indicators
      return {
        terminatedBy: 'unknown',
        confidence: 'low',
        reason: 'Cannot determine from available data - need Voice Insights'
      };
    }
    
    return {
      terminatedBy: 'unknown',
      confidence: 'low',
      reason: 'Insufficient data to determine termination'
    };
    
  } catch (error) {
    console.error(`Error detecting termination for ${callSid}:`, error);
    return {
      terminatedBy: 'unknown',
      confidence: 'low',
      reason: `Error: ${error.message}`
    };
  }
}

async function updateCallsWithEnhancedDetection() {
  console.log('Starting enhanced termination detection...');
  
  try {
    await initializeMongoDB();
    
    // Find calls that need termination detection
    const calls = await Call.find({
      status: 'completed',
      callSid: { $exists: true, $ne: null },
      $or: [
        { terminatedBy: 'agent' }, // Re-check these as they might be wrong
        { terminatedBy: 'conversation_completed' },
        { terminatedBy: { $exists: false } }
      ]
    }).limit(100);
    
    console.log(`Found ${calls.length} calls to analyze`);
    
    let updatedCount = 0;
    const results = {
      callee: 0,
      agent: 0,
      system: 0,
      unknown: 0
    };
    
    for (const call of calls) {
      const detection = await detectTermination(call.callSid, call);
      
      console.log(`\n${call.callSid}:`);
      console.log(`  Current: ${call.terminatedBy}`);
      console.log(`  Detected: ${detection.terminatedBy} (${detection.confidence} confidence)`);
      console.log(`  Reason: ${detection.reason}`);
      
      // Update if we have a high or medium confidence result that's different
      if (detection.confidence !== 'low' && detection.terminatedBy !== 'unknown' && 
          detection.terminatedBy !== call.terminatedBy) {
        await Call.updateOne(
          { _id: call._id },
          {
            $set: {
              terminatedBy: detection.terminatedBy,
              terminationReason: detection.reason,
              terminationSource: 'enhanced_detection'
            }
          }
        );
        updatedCount++;
      }
      
      results[detection.terminatedBy]++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total calls analyzed: ${calls.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log('\nDetection results:');
    console.log(`  Callee: ${results.callee}`);
    console.log(`  Agent: ${results.agent}`);
    console.log(`  System: ${results.system}`);
    console.log(`  Unknown: ${results.unknown}`);
    
    console.log('\nNote: Without Voice Insights API access, these are educated guesses based on:');
    console.log('- Call duration patterns');
    console.log('- Call status and answering machine detection');
    console.log('- ElevenLabs webhook data when available');
    console.log('\nFor accurate "who hung up" data, Voice Insights API access is required.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

// Also export as an API endpoint function
export async function enhancedTerminationDetection(req, res) {
  try {
    console.log('[Enhanced Detection] Starting termination detection...');
    
    const calls = await Call.find({
      status: 'completed',
      callSid: { $exists: true, $ne: null },
      $or: [
        { terminatedBy: 'agent' },
        { terminatedBy: 'conversation_completed' },
        { terminatedBy: { $exists: false } }
      ]
    }).limit(50); // Smaller batch for API endpoint
    
    let updatedCount = 0;
    const updates = [];
    
    for (const call of calls) {
      const detection = await detectTermination(call.callSid, call);
      
      if (detection.confidence !== 'low' && detection.terminatedBy !== 'unknown' && 
          detection.terminatedBy !== call.terminatedBy) {
        await Call.updateOne(
          { _id: call._id },
          {
            $set: {
              terminatedBy: detection.terminatedBy,
              terminationReason: detection.reason,
              terminationSource: 'enhanced_detection'
            }
          }
        );
        
        updates.push({
          callSid: call.callSid,
          oldValue: call.terminatedBy,
          newValue: detection.terminatedBy,
          confidence: detection.confidence,
          reason: detection.reason
        });
        
        updatedCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      success: true,
      message: `Analyzed ${calls.length} calls with enhanced detection`,
      updatedCount: updatedCount,
      sampleUpdates: updates.slice(0, 10)
    };
    
  } catch (error) {
    console.error('[Enhanced Detection] Error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateCallsWithEnhancedDetection();
}