/**
 * Contact Model
 * Mongoose schema for the contacts collection
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Sheet Info Schema
 * For Google Sheets integration
 */
const sheetInfoSchema = new Schema({
  spreadsheetId: { 
    type: String 
  },
  sheetName: { 
    type: String 
  },
  rowIndex: { 
    type: Number 
  }
}, { _id: false });

/**
 * Contact Schema
 * Stores contact data for outbound calling
 */
const contactSchema = new Schema({
  // Basic contact information
  phoneNumber: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  name: { 
    type: String, 
    trim: true,
    index: true
  },
  email: { 
    type: String, 
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    index: true
  },
  
  // Contact metadata
  tags: [{ 
    type: String,
    index: true 
  }],
  notes: { 
    type: String 
  },
  
  // Call history
  lastContacted: { 
    type: Date,
    index: true
  },
  callCount: { 
    type: Number,
    default: 0
  },
  callIds: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Call'
  }],
  
  // Campaign association
  campaignIds: [{ 
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  }],
  
  // Google Sheets integration
  sheetInfo: sheetInfoSchema,
  
  // Custom fields (flexible schema)
  customFields: {
    type: Map,
    of: Schema.Types.Mixed
  },
  
  // Contact status
  status: {
    type: String,
    enum: ['active', 'inactive', 'do-not-call', 'completed', 'failed', 'pending', 'calling'],
    default: 'pending',
    index: true
  },
  
  // Last call result tracking
  lastCallResult: {
    type: String,
    enum: ['completed', 'failed', 'busy', 'no-answer', 'canceled', 'failed_to_initiate', null],
    default: null
  },
  
  lastCallDate: {
    type: Date,
    default: null
  },
  
  lastCallError: {
    type: String,
    default: null
  },
  
  // Contact priority (for campaign execution)
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
    index: true
  }
}, {
  timestamps: true,
  collection: 'contacts'
});

// Create indexes for common query patterns
contactSchema.index({ createdAt: -1 });
contactSchema.index({ 'customFields.company': 1 });
contactSchema.index({ status: 1, priority: -1 });
contactSchema.index({ campaignIds: 1, status: 1 });

// Create compound indexes
contactSchema.index({ phoneNumber: 1, campaignIds: 1 }, { unique: true });

// Create the model
const Contact = mongoose.model('Contact', contactSchema);

export default Contact;