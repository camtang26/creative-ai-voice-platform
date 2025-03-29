/**
 * Campaign Model
 * Mongoose schema for the campaigns collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Sheet Info Schema
 * For Google Sheets integration
 */
const sheetInfoSchema = new Schema({
  spreadsheetId: { 
    type: String, 
    required: true 
  },
  sheetName: { 
    type: String, 
    required: true 
  },
  phoneColumn: { 
    type: String, 
    required: true 
  },
  nameColumn: { 
    type: String 
  },
  statusColumn: { 
    type: String 
  },
  customMessageColumn: { 
    type: String 
  }
}, { _id: false });

/**
 * Campaign Stats Schema
 * For tracking campaign performance
 */
const campaignStatsSchema = new Schema({
  totalContacts: { 
    type: Number, 
    default: 0 
  },
  callsPlaced: { 
    type: Number, 
    default: 0 
  },
  callsCompleted: { 
    type: Number, 
    default: 0 
  },
  callsAnswered: { 
    type: Number, 
    default: 0 
  },
  callsFailed: { 
    type: Number, 
    default: 0 
  },
  averageDuration: { 
    type: Number, 
    default: 0 
  }
}, { _id: false });

/**
 * Campaign Settings Schema
 * For campaign execution settings
 */
const campaignSettingsSchema = new Schema({
  callDelay: { 
    type: Number, 
    default: 5000,  // 5 seconds between calls
    min: 1000,      // Minimum 1 second
    max: 60000      // Maximum 1 minute
  },
  maxConcurrentCalls: { 
    type: Number, 
    default: 5,     // 5 concurrent calls
    min: 1,         // Minimum 1 call
    max: 20         // Maximum 20 calls
  },
  retryCount: { 
    type: Number, 
    default: 1,     // 1 retry attempt
    min: 0,         // Minimum 0 retries
    max: 5          // Maximum 5 retries
  },
  retryDelay: { 
    type: Number, 
    default: 3600000, // 1 hour between retries
    min: 60000,       // Minimum 1 minute
    max: 86400000     // Maximum 24 hours
  }
}, { _id: false });

/**
 * Campaign Schema
 * Stores campaign data for outbound calling
 */
const campaignSchema = new Schema({
  // Basic campaign information
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  description: { 
    type: String, 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },
  
  // Campaign configuration
  prompt: { 
    type: String 
  },
  firstMessage: { 
    type: String 
  },
  callerId: { 
    type: String 
  },
  region: { 
    type: String,
    default: 'us1'
  },
  
  // Google Sheets integration
  sheetInfo: sheetInfoSchema,
  
  // Campaign statistics
  stats: {
    type: campaignStatsSchema,
    default: () => ({})
  },
  
  // Campaign settings
  settings: {
    type: campaignSettingsSchema,
    default: () => ({})
  },
  
  // Execution tracking
  lastExecuted: {
    type: Date
  },
  nextExecution: {
    type: Date
  },
  
  // References to related collections
  contactIds: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  callIds: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Call'
  }]
}, {
  timestamps: true,
  collection: 'campaigns'
});

// Create indexes for common query patterns
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, nextExecution: 1 });

// Create the model
const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;