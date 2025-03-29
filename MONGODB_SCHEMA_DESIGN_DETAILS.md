# MongoDB Schema Design Details

This document provides a detailed overview of the MongoDB schema design for the ElevenLabs/Twilio integration project. It includes collection structures, relationships, validation rules, and indexing strategies.

## Database Overview

The MongoDB database for the ElevenLabs/Twilio integration consists of the following collections:

1. **Calls**: Stores comprehensive call metadata and status information
2. **CallEvents**: Stores detailed event logs for each call
3. **Recordings**: Stores metadata about call recordings
4. **Transcripts**: Stores detailed conversation transcripts with analysis
5. **Campaigns**: Stores information about outbound calling campaigns
6. **Contacts**: Stores contact information for call recipients
7. **CampaignContacts**: Links campaigns to contacts and tracks status
8. **Analytics**: Stores pre-aggregated analytics data for dashboards

## Collection Schemas

### 1. Calls Collection

The Calls collection is the central collection that stores comprehensive information about each call.

```javascript
{
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
    enum: ['outbound', 'inbound'], 
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
      'machine_end_silence', 'fax', 'unknown'
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
  
  // References to related collections
  recordingIds: [{ 
    type: ObjectId 
  }],
  transcriptId: { 
    type: ObjectId 
  },
  eventIds: [{ 
    type: ObjectId 
  }],
  
  // Google Sheets integration
  sheetInfo: {
    spreadsheetId: String,
    sheetName: String,
    rowIndex: Number
  }
}
```

#### Indexes:
- `{ callSid: 1 }` (unique): Fast lookups by Twilio Call SID
- `{ status: 1, createdAt: -1 }`: Active calls sorted by time
- `{ campaignId: 1, status: 1 }`: Campaign performance
- `{ agentId: 1, createdAt: -1 }`: Agent performance over time
- `{ from: 1, startTime: -1 }`: Search calls by caller phone number
- `{ to: 1, startTime: -1 }`: Search calls by recipient phone number
- `{ conversationId: 1 }`: Link to ElevenLabs conversation

### 2. CallEvents Collection

The CallEvents collection stores detailed event logs for each call, providing a chronological record of call progress.

```javascript
{
  // Core identifiers
  callSid: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'initiated', 'ringing', 'answered', 'in-progress',
      'completed', 'failed', 'busy', 'no-answer', 'canceled',
      'recording-started', 'recording-completed', 'recording-failed',
      'transcription-started', 'transcription-completed', 'transcription-failed',
      'webhook-received', 'webhook-processed', 'webhook-failed',
      'custom'
    ],
    index: true
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Event data
  data: {
    type: Object
  },
  
  // Source of the event
  source: {
    type: String,
    enum: ['twilio', 'elevenlabs', 'internal', 'custom'],
    default: 'internal'
  },
  
  // Additional metadata
  metadata: {
    type: Object
  }
}
```

#### Indexes:
- `{ callSid: 1, timestamp: 1 }`: Retrieve all events for a specific call in chronological order
- `{ eventType: 1, timestamp: -1 }`: Filter events by type and sort by time
- `{ timestamp: -1 }` with TTL: Support chronological queries and automatic data cleanup

### 3. Recordings Collection

The Recordings collection stores metadata about call recordings, including URLs and processing status.

```javascript
{
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
  
  // Recording details
  duration: {
    type: Number
  },
  channels: {
    type: Number,
    default: 1
  },
  source: {
    type: String,
    enum: ['twilio', 'elevenlabs', 'custom'],
    default: 'twilio'
  },
  
  // URLs
  url: {
    type: String
  },
  mediaUrl: {
    type: String
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
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
  endTime: {
    type: Date
  },
  
  // Processing metadata
  processingData: {
    type: Object
  },
  
  // Error information
  error: {
    message: String,
    code: String,
    details: Object
  }
}
```

#### Indexes:
- `{ recordingSid: 1 }` (unique): Fast lookups by Twilio Recording SID
- `{ callSid: 1 }`: Retrieve recordings for a specific call
- `{ status: 1, createdAt: -1 }`: Find recordings by status, sorted by creation time

### 4. Transcripts Collection

The Transcripts collection stores detailed conversation transcripts with sentiment analysis and other metadata.

```javascript
{
  // Core identifiers
  transcriptId: {
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
  conversationId: {
    type: String,
    index: true
  },
  recordingSid: {
    type: String,
    index: true
  },
  
  // Transcript data
  transcript: [{
    role: {
      type: String,
      enum: ['agent', 'user', 'system'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date
    }
  }],
  
  // Sentiment analysis
  sentiment: {
    overall: Number,
    segments: [{
      role: String,
      score: Number
    }]
  },
  
  // Topic analysis
  topics: [{
    name: String,
    confidence: Number,
    mentions: Number
  }],
  
  // Entity recognition
  entities: [{
    type: String,
    text: String,
    confidence: Number
  }],
  
  // Summary
  summary: {
    type: String
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date
  },
  
  // Error information
  error: {
    message: String,
    code: String,
    details: Object
  }
}
```

#### Indexes:
- `{ transcriptId: 1 }` (unique): Fast lookups by transcript ID
- `{ callSid: 1 }`: Retrieve transcript for a specific call
- `{ conversationId: 1 }`: Link to ElevenLabs conversation
- `{ "sentiment.overall": 1 }`: Find transcripts by sentiment score
- Text index on transcript text for full-text search

### 5. Campaigns Collection

The Campaigns collection stores information about outbound calling campaigns.

```javascript
{
  // Core identifiers
  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Campaign details
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String
  },
  
  // Campaign status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'canceled'],
    default: 'draft',
    index: true
  },
  
  // Campaign configuration
  config: {
    agentId: String,
    prompt: String,
    firstMessage: String,
    maxConcurrentCalls: Number,
    callsPerMinute: Number,
    retryConfig: {
      maxAttempts: Number,
      retryDelay: Number,
      retryReasons: [String]
    }
  },
  
  // Campaign progress
  progress: {
    totalContacts: Number,
    completedContacts: Number,
    successfulCalls: Number,
    failedCalls: Number,
    pendingCalls: Number
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date
  },
  startDate: {
    type: Date,
    index: true
  },
  endDate: {
    type: Date
  },
  
  // Google Sheets integration
  sheetInfo: {
    spreadsheetId: String,
    sheetName: String
  },
  
  // Owner information
  createdBy: {
    type: String
  },
  
  // Tags for categorization
  tags: [String]
}
```

#### Indexes:
- `{ campaignId: 1 }` (unique): Fast lookups by campaign ID
- `{ status: 1, startDate: -1 }`: Find campaigns by status, sorted by start date
- `{ name: 1 }`: Support name-based searches
- `{ "tags": 1 }`: Find campaigns by tag

### 6. Contacts Collection

The Contacts collection stores contact information for call recipients.

```javascript
{
  // Core identifiers
  contactId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Contact details
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    index: true
  },
  email: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Additional contact information
  details: {
    company: String,
    title: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    }
  },
  
  // Contact status
  status: {
    type: String,
    enum: ['active', 'inactive', 'do-not-call'],
    default: 'active',
    index: true
  },
  
  // Contact source
  source: {
    type: String,
    enum: ['manual', 'import', 'api', 'google-sheets'],
    default: 'manual'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date
  },
  lastContactedAt: {
    type: Date
  },
  
  // Google Sheets integration
  sheetInfo: {
    spreadsheetId: String,
    sheetName: String,
    rowIndex: Number
  },
  
  // Tags for categorization
  tags: [String],
  
  // Groups for segmentation
  groups: [String],
  
  // Custom fields
  customFields: {
    type: Object
  }
}
```

#### Indexes:
- `{ contactId: 1 }` (unique): Fast lookups by contact ID
- `{ phoneNumber: 1 }` (unique): Fast lookups by phone number
- `{ email: 1 }` (sparse): Support email-based lookups
- `{ name: 1 }`: Support name-based searches
- `{ "tags": 1 }`: Find contacts by tag
- `{ "groups": 1 }`: Find contacts by group
- `{ "details.address.location": "2dsphere" }`: Support geospatial queries

### 7. CampaignContacts Collection

The CampaignContacts collection links campaigns to contacts and tracks the status of each contact within a campaign.

```javascript
{
  // Core identifiers
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  contactId: {
    type: String,
    required: true,
    index: true
  },
  
  // Contact status within campaign
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'failed', 'skipped'],
    default: 'pending',
    index: true
  },
  
  // Call attempts
  attempts: [{
    callSid: String,
    timestamp: Date,
    status: String,
    duration: Number,
    outcome: String
  }],
  
  // Scheduling
  nextAttempt: {
    type: Date,
    index: true
  },
  
  // Priority
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Custom data for this contact in this campaign
  customData: {
    type: Object
  }
}
```

#### Indexes:
- `{ campaignId: 1, status: 1 }`: Retrieve contacts for a campaign filtered by status
- `{ contactId: 1, campaignId: 1 }`: Check if a contact is in a specific campaign
- `{ status: 1, nextAttempt: 1 }`: Find contacts due for calling based on status and scheduled time
- `{ campaignId: 1, priority: -1, nextAttempt: 1 }`: Find highest priority contacts for a campaign

### 8. Analytics Collection

The Analytics collection stores pre-aggregated analytics data for dashboards.

```javascript
{
  // Core identifiers
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'campaign', 'agent'],
    index: true
  },
  
  // Time period
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Reference IDs
  campaignId: {
    type: String,
    sparse: true,
    index: true
  },
  agentId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Call volume metrics
  callVolume: {
    total: Number,
    byStatus: {
      completed: Number,
      failed: Number,
      busy: Number,
      'no-answer': Number,
      canceled: Number
    },
    byHour: [Number], // 24 values
    byDirection: {
      inbound: Number,
      outbound: Number
    }
  },
  
  // Duration metrics
  duration: {
    total: Number,
    average: Number,
    min: Number,
    max: Number,
    distribution: [Number] // Distribution by duration ranges
  },
  
  // Outcome metrics
  outcomes: {
    held: Number,
    voicemail: Number,
    'no-answer': Number,
    failed: Number,
    unknown: Number,
    successRate: Number
  },
  
  // Sentiment metrics
  sentiment: {
    average: Number,
    positive: Number,
    neutral: Number,
    negative: Number,
    distribution: [Number] // Distribution by sentiment ranges
  },
  
  // Topic metrics
  topics: [{
    name: String,
    count: Number,
    percentage: Number
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date
  }
}
```

#### Indexes:
- `{ type: 1, date: -1 }`: Retrieve analytics by type and date
- `{ type: 1, campaignId: 1, date: -1 }`: Retrieve campaign analytics over time
- `{ type: 1, agentId: 1, date: -1 }`: Retrieve agent analytics over time
- `{ createdAt: 1 }` with TTL: Automatic cleanup of old analytics data

## Relationships Between Collections

The collections are related to each other through reference fields:

1. **Calls to CallEvents**: One-to-many relationship through the `callSid` field
2. **Calls to Recordings**: One-to-many relationship through the `callSid` field
3. **Calls to Transcripts**: One-to-one relationship through the `callSid` field
4. **Campaigns to CampaignContacts**: One-to-many relationship through the `campaignId` field
5. **Contacts to CampaignContacts**: One-to-many relationship through the `contactId` field
6. **CampaignContacts to Calls**: One-to-many relationship through the `callSid` field in the `attempts` array

## Indexing Strategy

The indexing strategy is designed to support the most common query patterns while minimizing the overhead of maintaining indexes:

### Primary Indexes
- Unique identifiers (e.g., `callSid`, `recordingSid`, `campaignId`)
- Foreign keys for relationships (e.g., `callSid` in Recordings, `campaignId` in CampaignContacts)
- Status fields with timestamps for filtering and sorting (e.g., `status` and `createdAt` in Calls)

### Compound Indexes
- `{ status: 1, createdAt: -1 }` in Calls: For retrieving active calls sorted by time
- `{ campaignId: 1, status: 1 }` in CampaignContacts: For retrieving contacts in a campaign filtered by status
- `{ type: 1, date: -1 }` in Analytics: For retrieving analytics by type and date

### Text Indexes
- Text index on transcript text in Transcripts: For full-text search of conversation content

### Geospatial Indexes
- `{ "details.address.location": "2dsphere" }` in Contacts: For location-based queries

### TTL Indexes
- `{ timestamp: -1 }` with TTL in CallEvents: For automatic cleanup of old events
- `{ createdAt: 1 }` with TTL in Analytics: For automatic cleanup of old analytics data

## Schema Validation

MongoDB schema validation is implemented for all collections to ensure data integrity:

```javascript
// Example validation for Calls collection
db.createCollection("calls", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["callSid", "status", "from", "to"],
      properties: {
        callSid: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        status: {
          enum: ["initiated", "queued", "ringing", "in-progress", "completed", "busy", "failed", "no-answer", "canceled"],
          description: "must be a valid status and is required"
        },
        from: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        to: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        // Additional properties...
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
});
```

## Data Migration Strategy

For migrating existing data to the new schema:

1. **Create New Collections**: Create the new collections with proper indexes and validation
2. **Migrate Data Incrementally**: Migrate data in batches to avoid performance impact
3. **Validate Data**: Validate migrated data for consistency and completeness
4. **Update References**: Update references between collections
5. **Switch Over**: Once migration is complete, switch the application to use the new collections

## Conclusion

This MongoDB schema design provides a robust foundation for the ElevenLabs/Twilio integration. It supports all the required functionality while maintaining performance and scalability. The schema is designed to be extensible, allowing for future enhancements and additional features.

Key features of the schema design:

1. **Comprehensive Data Model**: Captures all relevant data for calls, events, recordings, transcripts, campaigns, and contacts
2. **Optimized Indexing**: Supports efficient queries for common access patterns
3. **Proper Relationships**: Maintains relationships between collections for data integrity
4. **Schema Validation**: Ensures data consistency and prevents invalid data
5. **Extensibility**: Designed to accommodate future enhancements and additional features