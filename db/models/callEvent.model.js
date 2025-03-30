/**
 * Call Event Model
 * Mongoose schema for the callEvents collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Call Event Schema
 * Stores detailed event data for calls
 */
const callEventSchema = new Schema({
  // Core identifiers
  callSid: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Event metadata
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'status_change',
      'recording',
      'machine_detection',
      // 'transcript', // Use more specific types
      'transcript_segment', // ADDED for stream updates
      'agent_response',
      'user_message', // Keep if used elsewhere
      'user_transcript', // ADDED based on logs
      'agent_response_correction', // ADDED based on logs
      'call_quality',
      'error',
      'custom'
    ],
    index: true
  },
  
  // Timestamps
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Event data
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  
  // Event source
  source: {
    type: String,
    enum: ['twilio', 'elevenlabs', 'system', 'user', 'test', 'elevenlabs_stream', 'api'], // ADDED sources
    default: 'system',
    index: true
  }
}, {
  timestamps: true,
  collection: 'callEvents'
});

// Create compound indexes for common query patterns
callEventSchema.index({ callSid: 1, timestamp: -1 });
callEventSchema.index({ callSid: 1, eventType: 1 });
callEventSchema.index({ eventType: 1, timestamp: -1 });
callEventSchema.index({ timestamp: -1 });

// Create the model
const CallEvent = mongoose.model('CallEvent', callEventSchema);

export default CallEvent;