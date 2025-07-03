/**
 * One-time API endpoint to fix terminatedBy values
 * This can be called via HTTP request to update the database
 */

const express = require('express');
const mongoose = require('mongoose');
const Call = require('./db/models/call.model');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('[MongoDB] Connected successfully');
}).catch(err => {
  console.error('[MongoDB] Connection error:', err);
});

// Fix endpoint
app.get('/fix-terminated-by', async (req, res) => {
  try {
    console.log('[Fix] Starting terminatedBy fix...');
    
    // Find all calls with terminatedBy = "conversation_completed"
    const callsToFix = await Call.find({ 
      terminatedBy: 'conversation_completed' 
    });
    
    console.log(`[Fix] Found ${callsToFix.length} calls to update`);

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
        console.log(`[Progress] Updated ${updatedCount}/${callsToFix.length} calls`);
      }
    }

    console.log(`[Fix] Successfully updated ${updatedCount} calls`);
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} calls`,
      totalProcessed: callsToFix.length,
      sampleUpdates: updates.slice(0, 10)
    });

  } catch (error) {
    console.error('[Error] Failed to fix terminatedBy values:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fix-terminated-by' });
});

app.listen(PORT, () => {
  console.log(`[Server] Fix script running on port ${PORT}`);
  console.log(`[Server] Visit http://localhost:${PORT}/fix-terminated-by to run the fix`);
});