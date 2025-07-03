const Call = require('../models/call.model');

/**
 * Admin API endpoints for maintenance tasks
 */

/**
 * Fix historical terminatedBy values in the database
 * Updates calls that have 'conversation_completed' to more accurate values
 */
async function fixTerminatedByValues(req, res) {
  try {
    console.log('[Admin] Starting terminatedBy fix...');
    
    // Find all calls with terminatedBy = "conversation_completed"
    const callsToFix = await Call.find({ 
      terminatedBy: 'conversation_completed' 
    });
    
    console.log(`[Admin] Found ${callsToFix.length} calls to update`);

    let updatedCount = 0;
    const updates = [];
    
    for (const call of callsToFix) {
      let newTerminatedBy = 'agent'; // default
      
      // Determine the actual terminator based on call characteristics
      if (call.status === 'failed' || call.status === 'busy') {
        newTerminatedBy = 'system';
      } else if (call.status === 'no-answer') {
        newTerminatedBy = 'system';
      } else if (call.answeredBy === 'failed' || call.answeredBy === 'no-answer' || call.answeredBy === 'busy') {
        newTerminatedBy = 'system';
      } else if (call.direction === 'outbound-api' && !call.answeredBy) {
        newTerminatedBy = 'system';
      } else if (call.duration && call.duration < 5) {
        // Very short calls are typically system terminated
        newTerminatedBy = 'system';
      } else if (call.answeredBy === 'human' && call.duration && call.duration > 30) {
        // Longer human calls are typically agent terminated (AI completed conversation)
        newTerminatedBy = 'agent';
      } else if (call.answeredBy && call.answeredBy.startsWith('machine')) {
        // Machine answered calls are typically agent terminated
        newTerminatedBy = 'agent';
      }
      
      // Update the call
      await Call.updateOne(
        { _id: call._id },
        { 
          $set: { 
            terminatedBy: newTerminatedBy,
            terminationReason: call.terminationReason || `Updated from conversation_completed`
          } 
        }
      );
      
      updates.push({
        callSid: call.callSid,
        oldValue: 'conversation_completed',
        newValue: newTerminatedBy,
        answeredBy: call.answeredBy,
        duration: call.duration,
        status: call.status
      });
      
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`[Admin] Progress: Updated ${updatedCount}/${callsToFix.length} calls`);
      }
    }

    console.log(`[Admin] Successfully updated ${updatedCount} calls`);
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} calls with correct terminatedBy values`,
      totalProcessed: callsToFix.length,
      sampleUpdates: updates.slice(0, 10)
    });

  } catch (error) {
    console.error('[Admin] Failed to fix terminatedBy values:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  fixTerminatedByValues
};