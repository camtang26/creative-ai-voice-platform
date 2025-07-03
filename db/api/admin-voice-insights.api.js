import Call from '../models/call.model.js';
import twilio from 'twilio';
import { getTerminationFromVoiceInsights } from '../../twilio-voice-insights.js';

/**
 * Admin API endpoint to fix terminatedBy using Voice Insights
 */
export async function fixTerminatedByWithVoiceInsights(req, res) {
  try {
    console.log('[Admin] Starting Voice Insights terminatedBy fix...');
    
    // Initialize Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Find all completed calls that need updating
    const calls = await Call.find({ 
      status: 'completed',
      callSid: { $exists: true, $ne: null },
      $or: [
        { terminatedBy: 'conversation_completed' },
        { terminatedBy: 'agent' }, // Re-check these too
        { terminatedBy: { $exists: false } }
      ]
    }).limit(100); // Limit to 100 to avoid timeout
    
    console.log(`[Admin] Found ${calls.length} calls to check with Voice Insights`);

    let updatedCount = 0;
    let voiceInsightsCount = 0;
    const updates = [];
    
    // Process calls
    for (const call of calls) {
      try {
        // Get Voice Insights data
        const voiceInsights = await getTerminationFromVoiceInsights(twilioClient, call.callSid);
        
        if (voiceInsights.available && voiceInsights.whoHungUp) {
          // We have Voice Insights data!
          voiceInsightsCount++;
          
          if (voiceInsights.whoHungUp !== call.terminatedBy) {
            await Call.updateOne(
              { _id: call._id },
              { 
                $set: { 
                  terminatedBy: voiceInsights.whoHungUp,
                  terminationReason: 'Updated from Voice Insights API',
                  terminationSource: 'voice_insights'
                } 
              }
            );
            
            updates.push({
              callSid: call.callSid,
              oldValue: call.terminatedBy,
              newValue: voiceInsights.whoHungUp,
              duration: call.duration,
              answeredBy: call.answeredBy
            });
            
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`[Admin] Error processing call ${call.callSid}:`, error.message);
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Admin] Voice Insights check complete. Updated ${updatedCount} calls`);
    
    return {
      success: true,
      message: `Checked ${calls.length} calls with Voice Insights`,
      voiceInsightsAvailable: voiceInsightsCount,
      updatedCount: updatedCount,
      sampleUpdates: updates.slice(0, 10)
    };

  } catch (error) {
    console.error('[Admin] Failed to fix terminatedBy with Voice Insights:', error);
    throw error;
  }
}