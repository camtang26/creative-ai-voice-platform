/**
 * Script to fix terminatedBy values for existing calls in the database
 * This will update calls that have "conversation_completed" to more specific values
 * based on call characteristics
 */

const mongoose = require('mongoose');
const Call = require('./db/models/call.model');
require('dotenv').config();

async function fixTerminatedByValues() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[MongoDB] Connected successfully');

    // Find all calls with terminatedBy = "conversation_completed"
    const callsToFix = await Call.find({ 
      terminatedBy: 'conversation_completed' 
    });
    
    console.log(`[Fix] Found ${callsToFix.length} calls to update`);

    let updatedCount = 0;
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
            terminationReason: call.terminationReason || `Updated from ${call.terminatedBy}`
          } 
        }
      );
      
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`[Progress] Updated ${updatedCount}/${callsToFix.length} calls`);
      }
    }

    console.log(`[Fix] Successfully updated ${updatedCount} calls`);
    
    // Show some examples of the updates
    const updatedCalls = await Call.find({ 
      terminationReason: { $regex: /Updated from/ } 
    }).limit(10);
    
    console.log('\n[Examples] Sample of updated calls:');
    updatedCalls.forEach(call => {
      console.log(`- Call ${call.callSid}: ${call.answeredBy} -> terminatedBy: ${call.terminatedBy}`);
    });

  } catch (error) {
    console.error('[Error] Failed to fix terminatedBy values:', error);
  } finally {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed');
  }
}

// Run the fix
fixTerminatedByValues();