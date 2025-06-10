/**
 * Call Model
 * Mongoose schema for the calls collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Call Schema
 * Stores comprehensive call data from Twilio and ElevenLabs
 */
const callSchema = new Schema({
  // Core call identifiers
  callSid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  conversationId: { 
    type: String, 
    index: true 
  },
  
  // Call routing information
  status: { 
    type: String, 
    required: true,
    enum: [
      'initiated', 'queued', 'ringing', 'in-progress', 
      'completed', 'busy', 'failed', 'no-answer', 'canceled'
    ],
    default: 'initiated',
    index: true
  },
  from: { 
    type: String, 
    required: true,
    index: true 
  },
  to: { 
    type: String, 
    required: true,
    index: true 
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound', 'outbound-api'],
    default: 'outbound'
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  startTime: { 
    type: Date 
  },
  answerTime: { 
    type: Date 
  },
  endTime: { 
    type: Date 
  },
  
  // Duration information
  duration: { 
    type: Number 
  },
  billableDuration: { 
    type: Number 
  },
  
  // Call routing information
  region: { 
    type: String 
  },
  callerId: { 
    type: String 
  },
  
  // Machine detection
  answeredBy: { 
    type: String,
    enum: [
      'human', 'machine_start', 'machine_end_beep',
      'machine_end_silence', 'machine_end_other', 'fax', 'unknown'
    ]
  },
  machineBehavior: { 
    type: String 
  },
  
  // Call outcome
  outcome: { 
    type: String,
    enum: ['held', 'voicemail', 'no-answer', 'failed', 'unknown']
  },
  terminatedBy: { 
    type: String 
  },
  
  // Call quality metrics
  qualityMetrics: {
    mos: Number,
    jitter: Number,
    latency: Number,
    packetLoss: Number
  },
  
  // Metadata
  agentId: { 
    type: String,
    index: true 
  },
  prompt: { 
    type: String 
  },
  firstMessage: { 
    type: String 
  },
  contactName: { 
    type: String,
    index: true 
  },
  campaignId: { 
    type: String,
    index: true 
  },
  tags: [{ 
    type: String,
    index: true 
  }],
  
  // References to related collections (will be implemented in later phases)
  recordingIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Recording' // Added ref to enable population
  }],
  transcriptId: {
    type: Schema.Types.ObjectId 
  },
  eventIds: [{ 
    type: Schema.Types.ObjectId 
  }],
  
  // Google Sheets integration
  sheetInfo: {
    spreadsheetId: String,
    sheetName: String,
    rowIndex: Number
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'calls' // Explicitly set collection name
});

// Create compound indexes for common query patterns
callSchema.index({ status: 1, createdAt: -1 }); // Active calls sorted by time
callSchema.index({ campaignId: 1, status: 1 }); // Campaign performance
callSchema.index({ agentId: 1, createdAt: -1 }); // Agent performance over time

// Create the model
const Call = mongoose.model('Call', callSchema);

export default Call;