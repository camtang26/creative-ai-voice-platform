# MongoDB Integration Guide for ElevenLabs/Twilio Outbound Calling

This guide provides comprehensive documentation for the MongoDB integration with the ElevenLabs/Twilio outbound calling system. It covers the database schema design, implementation phases, indexing strategies, caching mechanisms, and scaling considerations.

## Table of Contents

1. [Database Schema Design](#database-schema-design)
2. [Implementation Phases](#implementation-phases)
3. [Indexing Strategies](#indexing-strategies)
4. [Caching Mechanisms](#caching-mechanisms)
5. [Scaling Considerations](#scaling-considerations)
6. [API Endpoints](#api-endpoints)
7. [Webhook Integration](#webhook-integration)
8. [Campaign Management](#campaign-management)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Database Schema Design

The MongoDB integration uses the following collections to store data:

### Call Collection

Stores comprehensive call data including metadata, status, and timestamps.

```javascript
{
  callSid: String,            // Twilio Call SID (primary identifier)
  conversationId: String,     // ElevenLabs conversation ID
  status: String,             // Call status (initiated, ringing, in-progress, completed, etc.)
  from: String,               // Caller phone number
  to: String,                 // Recipient phone number
  direction: String,          // Call direction (outbound-api, inbound)
  startTime: Date,            // Call start time
  endTime: Date,              // Call end time
  duration: Number,           // Call duration in seconds
  answeredBy: String,         // Who answered (human, machine)
  machineBehavior: String,    // Machine detection behavior
  agentId: String,            // ElevenLabs agent ID
  contactName: String,        // Name of the contact
  campaignId: ObjectId,       // Reference to campaign (if part of a campaign)
  contactId: ObjectId,        // Reference to contact
  metadata: Object,           // Additional metadata
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

### Recording Collection

Stores metadata about call recordings.

```javascript
{
  recordingSid: String,       // Twilio Recording SID (primary identifier)
  callSid: String,            // Reference to the call
  url: String,                // Recording URL
  duration: Number,           // Recording duration in seconds
  status: String,             // Recording status
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

### Transcript Collection

Stores conversation transcripts.

```javascript
{
  callSid: String,            // Reference to the call
  conversationId: String,     // ElevenLabs conversation ID
  transcript: Array,          // Array of transcript segments
  summary: String,            // Conversation summary
  sentiment: Object,          // Sentiment analysis results
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

### Call Event Collection

Stores detailed call events for timeline and analytics.

```javascript
{
  callSid: String,            // Reference to the call
  eventType: String,          // Event type (status-change, dtmf, etc.)
  timestamp: Date,            // Event timestamp
  data: Object,               // Event data
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

### Campaign Collection

Stores campaign data for batch calling.

```javascript
{
  name: String,               // Campaign name
  description: String,        // Campaign description
  status: String,             // Campaign status (draft, active, paused, completed, cancelled)
  prompt: String,             // ElevenLabs agent prompt
  firstMessage: String,       // First message to say
  callerId: String,           // Caller ID to use
  region: String,             // Twilio region
  sheetInfo: {                // Google Sheets integration
    spreadsheetId: String,
    sheetName: String,
    phoneColumn: String,
    nameColumn: String,
    statusColumn: String,
    customMessageColumn: String
  },
  stats: {                    // Campaign statistics
    totalContacts: Number,
    callsPlaced: Number,
    callsCompleted: Number,
    callsAnswered: Number,
    callsFailed: Number,
    averageDuration: Number
  },
  settings: {                 // Campaign settings
    callDelay: Number,
    maxConcurrentCalls: Number,
    retryCount: Number,
    retryDelay: Number
  },
  lastExecuted: Date,         // Last execution timestamp
  nextExecution: Date,        // Next scheduled execution
  contactIds: [ObjectId],     // References to contacts
  callIds: [ObjectId],        // References to calls
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

### Contact Collection

Stores contact data for outbound calling.

```javascript
{
  phoneNumber: String,        // Contact phone number
  name: String,               // Contact name
  email: String,              // Contact email
  tags: [String],             // Contact tags
  notes: String,              // Contact notes
  lastContacted: Date,        // Last contacted timestamp
  callCount: Number,          // Number of calls made to this contact
  callIds: [ObjectId],        // References to calls
  campaignIds: [ObjectId],    // References to campaigns
  sheetInfo: {                // Google Sheets integration
    spreadsheetId: String,
    sheetName: String,
    rowIndex: Number
  },
  customFields: Map,          // Custom fields (flexible schema)
  status: String,             // Contact status (active, inactive, do-not-call)
  priority: Number,           // Contact priority (0-10)
  createdAt: Date,            // Document creation timestamp
  updatedAt: Date             // Document update timestamp
}
```

## Implementation Phases

The MongoDB integration is implemented in four phases:

### Phase 1: Core Call Data Storage

- Implement basic call data storage
- Store call metadata (SID, status, timestamps, etc.)
- Implement webhook handling for call status updates
- Create basic API endpoints for call data retrieval

### Phase 2: Recording and Transcript Integration

- Store recording metadata
- Implement transcript storage
- Create API endpoints for recordings and transcripts
- Integrate with ElevenLabs webhook for conversation data

### Phase 3: Analytics and Real-time Monitoring

- Implement call event timeline
- Create analytics aggregation functions
- Implement real-time data updates via Socket.IO
- Create dashboard API endpoints

### Phase 4: Campaign and Contact Management

- Implement campaign management
- Create contact database with Google Sheets integration
- Implement campaign execution engine
- Create API endpoints for campaigns and contacts

## Indexing Strategies

The following indexes are created to optimize query performance:

### Call Collection Indexes

```javascript
// Primary index on callSid
callSchema.index({ callSid: 1 }, { unique: true });

// Index for status-based queries
callSchema.index({ status: 1 });

// Index for time-based queries
callSchema.index({ createdAt: -1 });
callSchema.index({ startTime: -1 });

// Compound index for campaign calls
callSchema.index({ campaignId: 1, status: 1 });

// Compound index for contact calls
callSchema.index({ contactId: 1, createdAt: -1 });
```

### Recording Collection Indexes

```javascript
// Primary index on recordingSid
recordingSchema.index({ recordingSid: 1 }, { unique: true });

// Index for call-based queries
recordingSchema.index({ callSid: 1 });
```

### Transcript Collection Indexes

```javascript
// Primary index on callSid
transcriptSchema.index({ callSid: 1 }, { unique: true });

// Index for conversation-based queries
transcriptSchema.index({ conversationId: 1 });
```

### Call Event Collection Indexes

```javascript
// Compound index for call timeline
callEventSchema.index({ callSid: 1, timestamp: 1 });

// Index for event type queries
callEventSchema.index({ eventType: 1 });
```

### Campaign Collection Indexes

```javascript
// Index for name-based queries
campaignSchema.index({ name: 1 });

// Index for status-based queries
campaignSchema.index({ status: 1 });

// Index for time-based queries
campaignSchema.index({ createdAt: -1 });

// Compound index for active campaigns
campaignSchema.index({ status: 1, nextExecution: 1 });
```

### Contact Collection Indexes

```javascript
// Index for phone number queries
contactSchema.index({ phoneNumber: 1 });

// Index for name-based queries
contactSchema.index({ name: 1 });

// Index for email-based queries
contactSchema.index({ email: 1 });

// Index for tag-based queries
contactSchema.index({ tags: 1 });

// Compound index for campaign contacts
contactSchema.index({ campaignIds: 1, status: 1 });

// Unique compound index for phone number and campaign
contactSchema.index({ phoneNumber: 1, campaignIds: 1 }, { unique: true });
```

## Caching Mechanisms

The MongoDB integration implements a caching layer to improve performance for frequently accessed data:

### In-Memory Cache

- Simple in-memory cache with TTL (Time-To-Live)
- Cache key generation based on query parameters
- Automatic cache invalidation on data updates
- Cache statistics for monitoring

### Cached Endpoints

The following API endpoints use caching:

- Dashboard overview data (60-second TTL)
- Real-time dashboard data (15-second TTL)
- Call details with combined data (30-second TTL)
- Campaign details and statistics (5-minute TTL)
- Contact details and call history (5-minute TTL)

### Cache Invalidation

Cache invalidation is triggered by:

- Call status updates
- Campaign updates
- Contact updates
- Recording or transcript additions

## Scaling Considerations

The MongoDB integration is designed to scale with increasing call volume:

### Connection Pooling

- Implement connection pooling to efficiently manage database connections
- Configure optimal pool size based on expected load
- Monitor connection usage and adjust as needed

### Query Optimization

- Use projection to limit fields returned
- Implement pagination for large result sets
- Use aggregation pipeline for complex queries
- Leverage indexes for frequent query patterns

### Sharding Strategy

For high-volume deployments:

- Shard by callSid for the calls collection
- Shard by campaignId for the campaigns collection
- Shard by phoneNumber for the contacts collection

### Time-Based Data Management

- Implement TTL indexes for temporary data
- Create data archiving strategy for historical data
- Implement data aggregation for long-term storage

## API Endpoints

The MongoDB integration provides the following API endpoints:

### Call API

- `GET /api/db/calls` - Get call history with pagination and filtering
- `GET /api/db/calls/:callSid` - Get call details by SID
- `POST /api/db/calls` - Create a new call record
- `PUT /api/db/calls/:callSid/status` - Update call status
- `DELETE /api/db/calls/:callSid` - Delete a call record

### Recording API

- `GET /api/db/recordings` - Get recordings with pagination and filtering
- `GET /api/db/recordings/:recordingSid` - Get recording details by SID
- `GET /api/db/calls/:callSid/recordings` - Get recordings for a call
- `POST /api/db/recordings` - Create a new recording record
- `DELETE /api/db/recordings/:recordingSid` - Delete a recording record

### Transcript API

- `GET /api/db/transcripts/:callSid` - Get transcript for a call
- `POST /api/db/transcripts` - Create a new transcript record
- `PUT /api/db/transcripts/:callSid` - Update a transcript record

### Analytics API

- `GET /api/db/analytics/call-volume` - Get call volume statistics
- `GET /api/db/analytics/call-duration` - Get call duration statistics
- `GET /api/db/analytics/call-outcomes` - Get call outcome distribution
- `GET /api/db/analytics/conversation-sentiment` - Get conversation sentiment analysis

### Dashboard API

- `GET /api/db/dashboard/overview` - Get dashboard overview data
- `GET /api/db/dashboard/activity` - Get call activity data
- `GET /api/db/dashboard/call/:callSid` - Get call details with combined data
- `GET /api/db/dashboard/realtime` - Get real-time dashboard data

### Campaign API

- `GET /api/db/campaigns` - Get campaigns with pagination and filtering
- `GET /api/db/campaigns/:campaignId` - Get campaign details by ID
- `POST /api/db/campaigns` - Create a new campaign
- `PUT /api/db/campaigns/:campaignId` - Update a campaign
- `DELETE /api/db/campaigns/:campaignId` - Delete a campaign
- `GET /api/db/campaigns/:campaignId/contacts` - Get contacts for a campaign
- `POST /api/db/campaigns/:campaignId/contacts` - Add contacts to a campaign
- `DELETE /api/db/campaigns/:campaignId/contacts` - Remove contacts from a campaign
- `POST /api/db/campaigns/:campaignId/start` - Start a campaign
- `POST /api/db/campaigns/:campaignId/pause` - Pause a campaign
- `POST /api/db/campaigns/:campaignId/resume` - Resume a campaign
- `POST /api/db/campaigns/:campaignId/stop` - Stop a campaign
- `GET /api/db/campaigns/:campaignId/stats` - Get campaign statistics

### Contact API

- `GET /api/db/contacts` - Get contacts with pagination and filtering
- `GET /api/db/contacts/:contactId` - Get contact details by ID
- `GET /api/db/contacts/phone/:phoneNumber` - Get contact by phone number
- `POST /api/db/contacts` - Create a new contact
- `PUT /api/db/contacts/:contactId` - Update a contact
- `DELETE /api/db/contacts/:contactId` - Delete a contact
- `POST /api/db/contacts/:contactId/tags` - Add tags to a contact
- `DELETE /api/db/contacts/:contactId/tags` - Remove tags from a contact
- `GET /api/db/contacts/:contactId/calls` - Get call history for a contact
- `POST /api/db/contacts/import` - Import contacts from array

## Webhook Integration

The MongoDB integration provides webhook handlers for Twilio and ElevenLabs:

### Twilio Webhook Handler

- Call status updates
- Recording status updates
- Call events (DTMF, speech, etc.)

### ElevenLabs Webhook Handler

- Conversation updates
- Transcript segments
- Conversation summary
- Sentiment analysis

## Campaign Management

The campaign management system includes:

### Campaign Execution Engine

- Manages active campaigns
- Controls call pacing and concurrency
- Handles campaign status (start, pause, resume, stop)
- Updates campaign statistics

### Contact Management

- Stores contact information
- Tracks call history
- Supports tagging and prioritization
- Integrates with Google Sheets

### Google Sheets Integration

- Import contacts from Google Sheets
- Update contact status in Google Sheets
- Sync campaign results back to Google Sheets

## Performance Optimization

The MongoDB integration includes several performance optimizations:

### Query Optimization

- Use of proper indexes for common query patterns
- Projection to limit fields returned
- Pagination for large result sets
- Aggregation pipeline for complex queries

### Caching Strategy

- In-memory cache for frequently accessed data
- Cache invalidation on data updates
- TTL-based cache expiration
- Cache statistics for monitoring

### Connection Management

- Connection pooling
- Automatic reconnection
- Connection monitoring
- Error handling and retry logic

## Troubleshooting

Common issues and solutions:

### Connection Issues

- Check MongoDB connection string
- Verify network connectivity
- Check MongoDB server status
- Verify authentication credentials

### Performance Issues

- Check query execution plans
- Verify indexes are being used
- Monitor cache hit/miss ratio
- Check for slow queries in MongoDB logs

### Data Consistency Issues

- Check for validation errors
- Verify webhook handling
- Check for duplicate records
- Verify transaction handling

### API Errors

- Check request parameters
- Verify API endpoint URLs
- Check authentication tokens
- Verify error handling in API routes