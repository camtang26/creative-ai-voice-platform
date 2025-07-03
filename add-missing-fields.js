// Script to add missing fields to MongoDB schema
// These fields are being sent by the webhooks but not saved because they're not in the schema

const missingFields = `
  // Enhanced AMD fields
  enhancedAnsweredBy: { 
    type: String,
    enum: [
      'human', 'machine_start', 'machine_end_beep',
      'machine_end_silence', 'machine_end_other', 'fax', 'unknown',
      'machine_enhanced' // Enhanced detection result
    ]
  },
  amdConfidence: {
    type: Number, // Confidence score from enhanced detection (0-1)
    min: 0,
    max: 1
  },
  
  // Termination tracking fields
  terminationReason: {
    type: String // Specific reason for termination
  },
  terminationSource: {
    type: String // Source system that triggered termination
  },
`;

console.log('Add these fields to the callSchema in db/models/call.model.js:');
console.log('');
console.log('After line 104 (terminatedBy field), add:');
console.log(missingFields);
console.log('');
console.log('This will allow the webhook data to be properly saved to MongoDB.');