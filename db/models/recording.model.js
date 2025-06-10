/**
 * Recording Model
 * Mongoose schema for the recordings collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Recording Schema
 * Stores metadata about call recordings (not the actual files)
 */
const recordingSchema = new Schema({
  // Core identifiers
  recordingSid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  callSid: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Recording metadata
  url: { 
    type: String 
  },
  duration: { 
    type: Number 
  },
  channels: { 
    type: Number, 
    default: 1 
  },
  format: { 
    type: String, 
    enum: ['mp3', 'wav', 'audio/x-wav'], 
    default: 'mp3' 
  },
  status: { 
    type: String, 
    enum: ['in-progress', 'completed', 'failed', 'absent'], 
    default: 'completed' 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Additional URLs for different formats
  mp3Url: { 
    type: String 
  },
  wavUrl: { 
    type: String 
  },
  
  // Recording type
  source: { 
    type: String, 
    enum: ['customer', 'agent', 'both'], 
    default: 'both' 
  },
  type: { 
    type: String, 
    default: 'call' 
  },
  
  // Additional metadata
  size: { 
    type: Number 
  },
  processingStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  transcriptionStatus: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'failed', 'not-requested'], 
    default: 'not-requested' 
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'recordings' // Explicitly set collection name
});

// Create indexes
recordingSchema.index({ callSid: 1, createdAt: -1 });

// Create the model
const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;