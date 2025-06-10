# MongoDB Database Schema Design for ElevenLabs/Twilio Integration

## Overview

This document outlines the MongoDB database schema design for the ElevenLabs/Twilio integration project. The schema is designed to store comprehensive call data, support real-time updates via Socket.IO, maintain compatibility with Google Sheets integration, and enable future extensibility for new ElevenLabs features.

## Collections Structure

### 1. Calls Collection

The core collection that stores all call metadata and status information.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  sid: String,                  // Twilio Call SID (indexed)
  parentCallSid: String,        // Parent call SID for tracking transfers
  status: String,               // Call status (initiated, ringing, in-progress, completed, failed, etc.)
  from: String,                 // Caller phone number
  to: String,                   // Recipient phone number
  direction: String,            // "outbound" or "inbound"
  duration: Number,             // Call duration in seconds
  price: Number,                // Call cost (if available from Twilio)
  priceCurrency: String,        // Currency for price (e.g., "USD")
  startTime: Date,              // Call start timestamp
  endTime: Date,                // Call end timestamp
  createdAt: Date,              // Record creation timestamp
  updatedAt: Date,              // Record last update timestamp
  
  // ElevenLabs specific data
  agentId: String,              // ElevenLabs agent ID
  agentName: String,            // ElevenLabs agent name
  voiceId: String,              // ElevenLabs voice ID used
  
  // Campaign information (if part of a campaign)
  campaignId: ObjectId,         // Reference to campaigns collection
  
  // Contact information
  contactId: ObjectId,          // Reference to contacts collection
  contactName: String,          // Contact name (denormalized for quick access)
  
  // Call outcome data
  outcome: {
    status: String,             // success, no-answer, busy, failed, etc.
    reason: String,             // Detailed reason for outcome
    notes: String,              // Additional notes about the call
    followUpRequired: Boolean,  // Whether follow-up is needed
    followUpDate: Date          // When to follow up
  },
  
  // Call quality metrics
  qualityMetrics: {
    latency: Number,            // Call latency in ms
    jitter: Number,             // Jitter measurement
    packetLoss: Number,         // Packet loss percentage
    mos: Number                 // Mean Opinion Score (1-5)
  },
  
  // Custom metadata (extensible for future needs)
  metadata: {
    source: String,             // Source of the call (e.g., "google-sheets", "manual", "api")
    tags: [String],             // Array of tags for categorization
    customFields: Object        // Flexible object for custom data
  }
}
```

**Indexes:**
- `sid`: Unique index for fast lookups by Twilio SID
- `status`: For filtering calls by status
- `startTime`: For time-based queries and sorting
- `campaignId`: For retrieving all calls in a campaign
- `contactId`: For retrieving all calls to/from a contact
- `createdAt`: For chronological sorting and TTL index if needed

### 2. CallEvents Collection

Stores detailed event logs for each call, enabling comprehensive tracking and debugging.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  callSid: String,              // Reference to calls collection (indexed)
  eventType: String,            // Event type (e.g., initiated, ringing, answered, completed, etc.)
  timestamp: Date,              // When the event occurred
  data: Object,                 // Raw event data from Twilio webhook
  source: String,               // Source of the event (Twilio, ElevenLabs, internal)
  
  // For ElevenLabs conversation events
  conversationData: {
    speakerId: String,          // Who was speaking (agent or caller)
    text: String,               // Transcribed text
    sentiment: String,          // Detected sentiment (positive, neutral, negative)
    intent: String,             // Detected intent
    duration: Number            // Duration of this conversation segment
  }
}
```

**Indexes:**
- `callSid`: For retrieving all events for a specific call
- `timestamp`: For chronological sorting
- `eventType`: For filtering by event type

### 3. Recordings Collection

Stores metadata about call recordings (not the actual files).

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  callSid: String,              // Reference to calls collection (indexed)
  recordingSid: String,         // Twilio Recording SID
  duration: Number,             // Recording duration in seconds
  url: String,                  // URL to the recording file
  status: String,               // Recording status
  createdAt: Date,              // When the recording was created
  format: String,               // File format (e.g., "mp3", "wav")
  size: Number,                 // File size in bytes
  
  // Transcription data (if available)
  transcription: {
    status: String,             // Transcription status
    text: String,               // Full transcription text
    confidence: Number,         // Confidence score of transcription
    processingTime: Number      // Time taken to transcribe
  }
}
```

**Indexes:**
- `callSid`: For retrieving recordings for a specific call
- `recordingSid`: Unique index for Twilio recording SID

### 4. Campaigns Collection

Stores information about outbound calling campaigns.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  name: String,                 // Campaign name
  description: String,          // Campaign description
  status: String,               // active, paused, completed, scheduled
  createdAt: Date,              // When the campaign was created
  updatedAt: Date,              // When the campaign was last updated
  startDate: Date,              // When the campaign starts
  endDate: Date,                // When the campaign ends
  
  // Campaign configuration
  config: {
    maxConcurrentCalls: Number, // Maximum concurrent calls
    callbackUrl: String,        // Webhook URL for callbacks
    retryConfig: {
      maxAttempts: Number,      // Maximum retry attempts
      delayBetweenAttempts: Number, // Delay between retries in minutes
      retryStatuses: [String]   // Which call statuses to retry
    },
    scheduleConfig: {
      timeZone: String,         // Campaign timezone
      allowedHours: {           // Hours when calls are allowed
        start: String,          // Format: "HH:MM"
        end: String             // Format: "HH:MM"
      },
      allowedDays: [Number]     // Days of week when calls are allowed (0-6)
    }
  },
  
  // ElevenLabs configuration
  elevenlabsConfig: {
    agentId: String,            // ElevenLabs agent ID
    voiceId: String,            // ElevenLabs voice ID
    parameters: Object          // Additional ElevenLabs parameters
  },
  
  // Campaign statistics (updated in real-time)
  stats: {
    totalContacts: Number,      // Total contacts in campaign
    contactsAttempted: Number,  // Contacts that have been called
    contactsCompleted: Number,  // Contacts with completed calls
    successRate: Number,        // Success rate percentage
    totalCallTime: Number,      // Total call time in seconds
    averageCallTime: Number     // Average call time in seconds
  },
  
  // Google Sheets integration
  sheetIntegration: {
    spreadsheetId: String,      // Google Sheets ID
    sheetId: String,            // Specific sheet ID
    headerRow: Number,          // Header row number
    phoneColumn: String,        // Column with phone numbers
    nameColumn: String,         // Column with contact names
    statusColumn: String,       // Column to update with call status
    lastSyncTime: Date          // Last time synced with sheet
  }
}
```

**Indexes:**
- `status`: For filtering campaigns by status
- `startDate`: For time-based queries
- `createdAt`: For chronological sorting

### 5. CampaignContacts Collection

Links campaigns to contacts and tracks individual contact status within campaigns.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  campaignId: ObjectId,         // Reference to campaigns collection
  contactId: ObjectId,          // Reference to contacts collection
  status: String,               // pending, called, completed, failed, etc.
  attempts: Number,             // Number of call attempts
  lastAttempt: Date,            // Timestamp of last attempt
  nextAttempt: Date,            // Scheduled time for next attempt
  
  // Call results
  callResults: [{
    callSid: String,            // Reference to calls collection
    timestamp: Date,            // When the call was made
    status: String,             // Outcome of the call
    duration: Number,           // Call duration
    notes: String               // Notes about this specific call
  }],
  
  // Custom data for this contact in this campaign
  customData: Object            // Flexible object for campaign-specific contact data
}
```

**Indexes:**
- `campaignId`: For retrieving all contacts in a campaign
- `contactId`: For retrieving all campaigns for a contact
- `status`: For filtering by status
- `nextAttempt`: For scheduling next calls

### 6. Contacts Collection

Stores contact information for call recipients.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  phoneNumber: String,          // Contact phone number (indexed)
  name: String,                 // Contact name
  email: String,                // Contact email
  createdAt: Date,              // When the contact was created
  updatedAt: Date,              // When the contact was last updated
  
  // Contact details
  details: {
    company: String,            // Company name
    title: String,              // Job title
    address: Object,            // Address information
    timezone: String,           // Contact's timezone
    preferredCallTime: {        // Preferred time to call
      start: String,            // Format: "HH:MM"
      end: String               // Format: "HH:MM"
    }
  },
  
  // Contact history summary
  history: {
    totalCalls: Number,         // Total calls to this contact
    lastCallDate: Date,         // Date of last call
    lastCallStatus: String,     // Status of last call
    averageCallDuration: Number // Average call duration
  },
  
  // Tags and categorization
  tags: [String],               // Array of tags
  groups: [String],             // Array of group names
  source: String,               // Where the contact came from
  
  // Custom fields (extensible)
  customFields: Object          // Flexible object for custom data
}
```

**Indexes:**
- `phoneNumber`: Unique index for lookups
- `email`: For email lookups
- `tags`: For filtering by tags
- `groups`: For filtering by groups

### 7. Transcripts Collection

Stores detailed conversation transcripts with analysis.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  callSid: String,              // Reference to calls collection
  recordingSid: String,         // Reference to recordings collection
  createdAt: Date,              // When the transcript was created
  
  // Full conversation transcript
  transcript: [{
    speakerId: String,          // Who was speaking (agent or caller)
    text: String,               // Transcribed text
    startTime: Number,          // Start time in seconds from call start
    endTime: Number,            // End time in seconds
    confidence: Number          // Confidence score
  }],
  
  // Analysis of the conversation
  analysis: {
    sentiment: {
      overall: String,          // Overall sentiment (positive, neutral, negative)
      score: Number,            // Sentiment score
      segments: [{              // Sentiment by conversation segment
        startTime: Number,
        endTime: Number,
        sentiment: String,
        score: Number
      }]
    },
    keywords: [String],         // Extracted keywords
    entities: [{                // Named entities detected
      text: String,
      type: String,             // person, organization, location, etc.
      startTime: Number,
      endTime: Number
    }],
    summary: String,            // AI-generated summary of the call
    
    // ElevenLabs specific analysis
    criteriaChecks: [{          // Criteria checks from ElevenLabs
      name: String,             // Name of the check
      passed: Boolean,          // Whether it passed
      confidence: Number,       // Confidence score
      details: String           // Details about the check
    }]
  }
}
```

**Indexes:**
- `callSid`: For retrieving transcript for a specific call
- `recordingSid`: For linking to recording
- `createdAt`: For chronological sorting

### 8. Analytics Collection

Stores pre-aggregated analytics data for faster dashboard rendering.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  type: String,                 // Type of analytics (daily, weekly, monthly)
  date: Date,                   // Date this analytics record represents
  createdAt: Date,              // When this record was created
  
  // Call volume metrics
  callVolume: {
    total: Number,              // Total calls
    byStatus: {                 // Calls by status
      completed: Number,
      failed: Number,
      busy: Number,
      "no-answer": Number,
      // other statuses...
    },
    byHour: [Number],           // Array of 24 values for calls by hour
    byDirection: {              // Calls by direction
      inbound: Number,
      outbound: Number
    }
  },
  
  // Duration metrics
  duration: {
    total: Number,              // Total call duration in seconds
    average: Number,            // Average call duration
    byStatus: {                 // Average duration by status
      completed: Number,
      // other statuses...
    }
  },
  
  // Campaign metrics
  campaigns: {
    active: Number,             // Number of active campaigns
    completed: Number,          // Number of completed campaigns
    byId: [{                    // Metrics by campaign
      campaignId: ObjectId,
      name: String,
      calls: Number,
      successRate: Number
    }]
  },
  
  // Conversation analysis
  conversationAnalysis: {
    sentiment: {                // Sentiment distribution
      positive: Number,
      neutral: Number,
      negative: Number
    },
    topKeywords: [{             // Most frequent keywords
      keyword: String,
      count: Number
    }],
    criteriaSuccess: {          // Success rate of criteria checks
      overall: Number,
      byCheck: [{
        name: String,
        successRate: Number
      }]
    }
  }
}
```

**Indexes:**
- `type`: For filtering by analytics type
- `date`: For time-based queries
- Compound index on `[type, date]` for efficient lookups

## Relationships Between Collections

1. **Calls → CallEvents**: One-to-many relationship. Each call has multiple events.
2. **Calls → Recordings**: One-to-many relationship. Each call can have multiple recordings.
3. **Calls → Transcripts**: One-to-one relationship. Each call has one transcript.
4. **Campaigns → CampaignContacts**: One-to-many relationship. Each campaign has multiple contacts.
5. **Contacts → CampaignContacts**: One-to-many relationship. Each contact can be in multiple campaigns.
6. **Calls → Campaigns**: Many-to-one relationship. Multiple calls can belong to one campaign.
7. **Calls → Contacts**: Many-to-one relationship. Multiple calls can be to/from one contact.

## Implementation Phases

### Phase 1: Core Call Data Storage

1. Implement the Calls collection with basic fields
2. Implement the CallEvents collection for webhook data
3. Set up basic indexes for performance
4. Create repository layer for data access

### Phase 2: Campaign and Contact Management

1. Implement Campaigns collection
2. Implement Contacts collection
3. Implement CampaignContacts collection
4. Create Google Sheets integration for contact import/export
5. Develop campaign management API

### Phase 3: Advanced Call Analysis

1. Implement Recordings collection
2. Implement Transcripts collection
3. Integrate with ElevenLabs API for conversation analysis
4. Develop transcript analysis features

### Phase 4: Analytics and Reporting

1. Implement Analytics collection
2. Create aggregation pipelines for real-time analytics
3. Develop dashboard API endpoints
4. Implement caching strategies for performance

## Indexing Recommendations

### Performance-Critical Indexes

1. **Calls Collection**:
   - `{ sid: 1 }` (unique): Fast lookups by Twilio SID
   - `{ status: 1, startTime: -1 }`: For filtering active calls and sorting by time
   - `{ campaignId: 1, status: 1 }`: For campaign monitoring
   - `{ contactId: 1, startTime: -1 }`: For contact history

2. **CallEvents Collection**:
   - `{ callSid: 1, timestamp: 1 }`: For retrieving chronological events for a call

3. **CampaignContacts Collection**:
   - `{ campaignId: 1, status: 1 }`: For campaign progress tracking
   - `{ status: 1, nextAttempt: 1 }`: For call scheduling

4. **Analytics Collection**:
   - `{ type: 1, date: -1 }`: For dashboard data retrieval

### TTL Indexes

Consider TTL (Time-To-Live) indexes for automatic data cleanup:

1. **CallEvents Collection**:
   - `{ timestamp: 1 }` with TTL of 90 days for older events

2. **Analytics Collection**:
   - `{ createdAt: 1 }` with TTL for raw analytics data

## Caching Strategies

1. **In-Memory Cache**:
   - Cache active call data in Redis for real-time monitoring
   - Cache dashboard summary data with short TTL (15-30 seconds)
   - Cache campaign statistics with medium TTL (1-5 minutes)

2. **Database-Level Caching**:
   - Use the Analytics collection as a form of pre-computed cache
   - Update analytics in background jobs rather than on-demand

3. **API Response Caching**:
   - Cache common API responses with appropriate Cache-Control headers
   - Implement ETag support for efficient validation

## Scaling Considerations

1. **Sharding Strategy**:
   - Shard the Calls collection by date ranges as call volume increases
   - Consider sharding CallEvents by callSid for even distribution

2. **Read/Write Optimization**:
   - Use read replicas for dashboard and reporting queries
   - Optimize write patterns for CallEvents collection (bulk inserts)

3. **Data Lifecycle Management**:
   - Implement data archiving strategy for older calls
   - Consider moving older data to cold storage (e.g., AWS S3)

4. **Connection Pooling**:
   - Implement proper connection pooling for MongoDB
   - Monitor and adjust pool size based on load

## Schema Validation

Implement JSON Schema validation for all collections to ensure data integrity:

```javascript
db.createCollection("calls", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sid", "status", "from", "to", "startTime", "createdAt"],
      properties: {
        sid: {
          bsonType: "string",
          description: "Twilio Call SID - required and must be a string"
        },
        // Additional field validations...
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});
```

## Conclusion

This MongoDB schema design provides a comprehensive foundation for the ElevenLabs/Twilio integration project. The schema is designed to be flexible, scalable, and extensible to accommodate future requirements while maintaining high performance for real-time operations.

The phased implementation approach allows for incremental development and testing, with each phase building upon the previous one. As the system grows, the indexing and caching strategies can be refined based on actual usage patterns and performance metrics.