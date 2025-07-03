# AMD and Termination Data Flow Analysis

## Executive Summary

The `answeredBy` and `terminatedBy` data IS being captured and saved to MongoDB, but several related fields are being lost because they're not defined in the MongoDB schema.

## Current Status

### Working Fields (✅)
- **answeredBy**: Successfully captured from Twilio AMD webhook and saved to MongoDB (41.37% of calls have this data)
- **terminatedBy**: Successfully captured from call termination tracking and saved to MongoDB (48.81% of calls have this data)

### Missing Fields (❌)
- **enhancedAnsweredBy**: Being sent by AMD webhook but NOT saved (not in schema)
- **amdConfidence**: Being sent by AMD webhook but NOT saved (not in schema)
- **terminationReason**: Being sent by termination tracker but NOT saved (not in schema)
- **terminationSource**: Being sent by termination tracker but NOT saved (not in schema)

## Data Flow Analysis

### 1. AMD (Answering Machine Detection) Flow

```
Twilio Call Created (outbound.js:232)
    ↓
AMD configured with asyncAmd: 'true' (outbound.js:256)
    ↓
Twilio performs detection
    ↓
POST /amd-status-callback (server-mongodb.js:1191)
    ↓
Receives: AnsweredBy, MachineBehavior, etc.
    ↓
Enhanced detection applied (amd-config.js)
    ↓
updateCallStatus() called with:
  - answeredBy ✅ (saved)
  - enhancedAnsweredBy ❌ (NOT in schema)
  - amdConfidence ❌ (NOT in schema)
  - machineBehavior ✅ (saved)
```

### 2. Call Termination Flow

```
Call ends (various sources)
    ↓
trackTermination() called (call-termination-tracker.js:16)
    ↓
Determines terminatedBy based on source/reason
    ↓
POST /call-status-callback (server-mongodb.js:1255)
    ↓
updateCallStatus() called with:
  - terminatedBy ✅ (saved)
  - terminationReason ❌ (NOT in schema)
  - terminationSource ❌ (NOT in schema)
```

## Key Findings

### 1. Schema Mismatch
The MongoDB schema (`db/models/call.model.js`) is missing several fields that the application is trying to save:
- `enhancedAnsweredBy` (String)
- `amdConfidence` (Number)
- `terminationReason` (String)
- `terminationSource` (String)

### 2. Data Loss
These fields are being processed and sent to `updateCallStatus()` but are silently ignored because they don't exist in the schema.

### 3. Update Function Behavior
The `updateCallStatus()` function (line 85-92 in `call.repository.js`) attempts to save all metadata fields:
```javascript
Object.keys(metadata).forEach(key => {
  if (key !== 'callSid' && key !== 'CallSid' && key !== '_id') {
    const schemaKey = key.replace(/^([A-Z])/, c => c.toLowerCase());
    updateData[schemaKey] = metadata[key];
  }
});
```
However, Mongoose only saves fields that are defined in the schema.

## Recommendations

### Immediate Fix
Add the missing fields to the call schema in `db/models/call.model.js`:

```javascript
// After line 104 (terminatedBy field), add:

// Enhanced AMD fields
enhancedAnsweredBy: { 
  type: String,
  enum: [
    'human', 'machine_start', 'machine_end_beep',
    'machine_end_silence', 'machine_end_other', 'fax', 'unknown',
    'machine_enhanced'
  ]
},
amdConfidence: {
  type: Number,
  min: 0,
  max: 1
},

// Termination tracking fields
terminationReason: {
  type: String
},
terminationSource: {
  type: String
},
```

### Verification Steps
1. After adding fields, restart the server
2. Make test calls
3. Check MongoDB to verify all fields are being saved
4. Update any API responses or frontend code that might benefit from these additional fields

## Impact
- This will provide richer data for analytics
- Better understanding of why calls ended
- Improved AMD accuracy tracking with confidence scores
- No breaking changes - just additional data capture