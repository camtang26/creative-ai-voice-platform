/**
 * Transcript Model
 * Mongoose schema for the transcripts collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Message Schema
 * For transcript messages
 */
const messageSchema = new Schema({
  role: { 
    type: String, 
    enum: ['agent', 'user'], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  confidence: { 
    type: Number, 
    min: 0, 
    max: 1 
  }
});

/**
 * Analysis Schema
 * For transcript analysis
 */
const analysisSchema = new Schema({
  transcript_summary: String, // Added summary field here
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral']
  },
  topics: [String],
  callSuccessful: Boolean,
  criteria: { // Added explicit criteria object
    confused: { type: String, enum: ['Success', 'Failure', 'Unknown', null], default: null },
    interested: { type: String, enum: ['Success', 'Failure', 'Unknown', null], default: null },
    no_call_back: { type: String, enum: ['Success', 'Failure', 'Unknown', null], default: null },
    // Add other criteria fields here if needed
  },
  customFields: Schema.Types.Mixed // Keep for other potential analysis fields
}, { _id: false }); // Make this a subdocument without its own _id

/**
 * Transcript Schema
 * Stores detailed conversation transcripts
 */
const transcriptSchema = new Schema({
  // Core identifiers
  callSid: { 
    type: String, 
    required: true, 
    index: true 
  },
  conversationId: { 
    type: String, 
    index: true 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Transcript content
  // summary: String, // Removed top-level summary, moved into analysisSchema
  messages: [messageSchema],
  analysis: analysisSchema, // Uses updated analysisSchema
  
  // Text search fields
  fullText: { 
    type: String, 
    index: 'text' 
  },
  keywords: [{ 
    type: String, 
    index: true 
  }]
}, {
  timestamps: true,
  collection: 'transcripts'
});

// Create compound indexes
transcriptSchema.index({ callSid: 1, createdAt: -1 });

// Create the model
const Transcript = mongoose.model('Transcript', transcriptSchema);

export default Transcript;