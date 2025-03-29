# MongoDB Indexing Recommendations for ElevenLabs/Twilio Integration

This document provides detailed indexing recommendations for the MongoDB database implementation in the ElevenLabs/Twilio integration project. Proper indexing is critical for maintaining performance as the database grows with increasing call volume.

## Indexing Principles

When designing indexes for the ElevenLabs/Twilio integration, we follow these core principles:

1. **Support Query Patterns**: Indexes should align with actual query patterns used in the application
2. **Minimize Index Overhead**: Create only necessary indexes to reduce write overhead and storage requirements
3. **Optimize for Read/Write Balance**: Consider the read/write ratio for each collection
4. **Consider Cardinality**: Index on fields with high cardinality for better selectivity
5. **Monitor and Refine**: Continuously evaluate index performance and refine as needed

## Collection-Specific Indexes

### 1. Calls Collection

The Calls collection is the most frequently accessed collection and requires careful indexing to support various query patterns.

#### Primary Indexes:

```javascript
// Create indexes for Calls collection
db.calls.createIndex({ "sid": 1 }, { unique: true, background: true });
db.calls.createIndex({ "status": 1, "startTime": -1 }, { background: true });
db.calls.createIndex({ "campaignId": 1, "status": 1 }, { background: true });
db.calls.createIndex({ "contactId": 1, "startTime": -1 }, { background: true });
db.calls.createIndex({ "createdAt": -1 }, { background: true });
```

#### Index Justifications:

1. **{ "sid": 1 }** (Unique)
   - **Purpose**: Fast lookups by Twilio Call SID
   - **Query Pattern**: `db.calls.findOne({ sid: "CA123456789" })`
   - **Importance**: Critical - This is the primary lookup field for webhook processing
   - **Cardinality**: Very high (each call has a unique SID)

2. **{ "status": 1, "startTime": -1 }**
   - **Purpose**: Efficiently retrieve calls by status, sorted by start time
   - **Query Pattern**: `db.calls.find({ status: "in-progress" }).sort({ startTime: -1 })`
   - **Importance**: High - Used for active call monitoring and dashboard displays
   - **Cardinality**: Medium for status (limited set of values), high for startTime

3. **{ "campaignId": 1, "status": 1 }**
   - **Purpose**: Retrieve calls for a specific campaign, filtered by status
   - **Query Pattern**: `db.calls.find({ campaignId: ObjectId("..."), status: "completed" })`
   - **Importance**: High - Used for campaign monitoring and reporting
   - **Cardinality**: Medium for both fields

4. **{ "contactId": 1, "startTime": -1 }**
   - **Purpose**: Retrieve call history for a specific contact, sorted by time
   - **Query Pattern**: `db.calls.find({ contactId: ObjectId("...") }).sort({ startTime: -1 })`
   - **Importance**: Medium - Used for contact history views
   - **Cardinality**: Medium for contactId, high for startTime

5. **{ "createdAt": -1 }**
   - **Purpose**: Support chronological sorting and pagination
   - **Query Pattern**: `db.calls.find().sort({ createdAt: -1 }).limit(20).skip(20)`
   - **Importance**: Medium - Used for general call listing and pagination
   - **Cardinality**: Very high (timestamp)

#### Additional Specialized Indexes:

```javascript
// Create specialized indexes for specific query patterns
db.calls.createIndex({ "from": 1, "startTime": -1 }, { background: true });
db.calls.createIndex({ "to": 1, "startTime": -1 }, { background: true });
db.calls.createIndex({ "agentId": 1, "startTime": -1 }, { background: true });
db.calls.createIndex({ "metadata.tags": 1 }, { background: true });
```

#### Specialized Index Justifications:

1. **{ "from": 1, "startTime": -1 }**
   - **Purpose**: Search calls by caller phone number
   - **Query Pattern**: `db.calls.find({ from: "+1234567890" }).sort({ startTime: -1 })`
   - **Importance**: Medium - Used for caller-based filtering
   - **Cardinality**: High for phone numbers

2. **{ "to": 1, "startTime": -1 }**
   - **Purpose**: Search calls by recipient phone number
   - **Query Pattern**: `db.calls.find({ to: "+1234567890" }).sort({ startTime: -1 })`
   - **Importance**: Medium - Used for recipient-based filtering
   - **Cardinality**: High for phone numbers

3. **{ "agentId": 1, "startTime": -1 }**
   - **Purpose**: Retrieve calls handled by a specific ElevenLabs agent
   - **Query Pattern**: `db.calls.find({ agentId: "agent-123" }).sort({ startTime: -1 })`
   - **Importance**: Medium - Used for agent performance analysis
   - **Cardinality**: Medium for agentId (limited number of agents)

4. **{ "metadata.tags": 1 }**
   - **Purpose**: Support tag-based filtering
   - **Query Pattern**: `db.calls.find({ "metadata.tags": "follow-up" })`
   - **Importance**: Low to Medium - Used for specialized filtering
   - **Cardinality**: Medium (limited set of tags)

### 2. CallEvents Collection

The CallEvents collection stores detailed event logs for each call and requires efficient indexing for chronological retrieval.

#### Primary Indexes:

```javascript
// Create indexes for CallEvents collection
db.callEvents.createIndex({ "callSid": 1, "timestamp": 1 }, { background: true });
db.callEvents.createIndex({ "eventType": 1, "timestamp": -1 }, { background: true });
db.callEvents.createIndex({ "timestamp": -1 }, { background: true, expireAfterSeconds: 7776000 }); // 90 days TTL
```

#### Index Justifications:

1. **{ "callSid": 1, "timestamp": 1 }**
   - **Purpose**: Retrieve all events for a specific call in chronological order
   - **Query Pattern**: `db.callEvents.find({ callSid: "CA123456789" }).sort({ timestamp: 1 })`
   - **Importance**: Critical - Used for call timeline views and debugging
   - **Cardinality**: High for callSid, very high for timestamp

2. **{ "eventType": 1, "timestamp": -1 }**
   - **Purpose**: Filter events by type and sort by time
   - **Query Pattern**: `db.callEvents.find({ eventType: "ringing" }).sort({ timestamp: -1 })`
   - **Importance**: Medium - Used for event type analysis
   - **Cardinality**: Low for eventType (limited set of event types), very high for timestamp

3. **{ "timestamp": -1 }** with TTL
   - **Purpose**: Support chronological queries and automatic data cleanup
   - **Query Pattern**: `db.callEvents.find().sort({ timestamp: -1 }).limit(100)`
   - **Importance**: Medium - Used for recent events listing
   - **Cardinality**: Very high (timestamp)
   - **Special**: Includes TTL for automatic deletion of old events after 90 days

### 3. Recordings Collection

The Recordings collection stores metadata about call recordings and requires indexes for efficient retrieval.

#### Primary Indexes:

```javascript
// Create indexes for Recordings collection
db.recordings.createIndex({ "callSid": 1 }, { background: true });
db.recordings.createIndex({ "recordingSid": 1 }, { unique: true, background: true });
db.recordings.createIndex({ "createdAt": -1 }, { background: true });
```

#### Index Justifications:

1. **{ "callSid": 1 }**
   - **Purpose**: Retrieve recordings for a specific call
   - **Query Pattern**: `db.recordings.find({ callSid: "CA123456789" })`
   - **Importance**: High - Used for call detail views
   - **Cardinality**: High (each call may have multiple recordings)

2. **{ "recordingSid": 1 }** (Unique)
   - **Purpose**: Fast lookups by Twilio Recording SID
   - **Query Pattern**: `db.recordings.findOne({ recordingSid: "RE123456789" })`
   - **Importance**: High - Used for webhook processing
   - **Cardinality**: Very high (each recording has a unique SID)

3. **{ "createdAt": -1 }**
   - **Purpose**: Support chronological sorting and pagination
   - **Query Pattern**: `db.recordings.find().sort({ createdAt: -1 }).limit(20)`
   - **Importance**: Medium - Used for recordings listing
   - **Cardinality**: Very high (timestamp)

### 4. Campaigns Collection

The Campaigns collection stores information about outbound calling campaigns and requires indexes for efficient management.

#### Primary Indexes:

```javascript
// Create indexes for Campaigns collection
db.campaigns.createIndex({ "status": 1, "startDate": -1 }, { background: true });
db.campaigns.createIndex({ "createdAt": -1 }, { background: true });
db.campaigns.createIndex({ "name": 1 }, { background: true });
```

#### Index Justifications:

1. **{ "status": 1, "startDate": -1 }**
   - **Purpose**: Filter campaigns by status and sort by start date
   - **Query Pattern**: `db.campaigns.find({ status: "active" }).sort({ startDate: -1 })`
   - **Importance**: High - Used for campaign management views
   - **Cardinality**: Low for status (limited set of statuses), high for startDate

2. **{ "createdAt": -1 }**
   - **Purpose**: Support chronological sorting and pagination
   - **Query Pattern**: `db.campaigns.find().sort({ createdAt: -1 }).limit(20)`
   - **Importance**: Medium - Used for campaign listing
   - **Cardinality**: Very high (timestamp)

3. **{ "name": 1 }**
   - **Purpose**: Support name-based searches
   - **Query Pattern**: `db.campaigns.find({ name: /Marketing/ })`
   - **Importance**: Medium - Used for campaign search
   - **Cardinality**: High (campaign names are typically unique)

### 5. CampaignContacts Collection

The CampaignContacts collection links campaigns to contacts and requires indexes for efficient campaign operations.

#### Primary Indexes:

```javascript
// Create indexes for CampaignContacts collection
db.campaignContacts.createIndex({ "campaignId": 1, "status": 1 }, { background: true });
db.campaignContacts.createIndex({ "contactId": 1, "campaignId": 1 }, { background: true });
db.campaignContacts.createIndex({ "status": 1, "nextAttempt": 1 }, { background: true });
```

#### Index Justifications:

1. **{ "campaignId": 1, "status": 1 }**
   - **Purpose**: Retrieve contacts for a campaign filtered by status
   - **Query Pattern**: `db.campaignContacts.find({ campaignId: ObjectId("..."), status: "pending" })`
   - **Importance**: Critical - Used for campaign execution
   - **Cardinality**: Medium for both fields

2. **{ "contactId": 1, "campaignId": 1 }**
   - **Purpose**: Check if a contact is in a specific campaign
   - **Query Pattern**: `db.campaignContacts.findOne({ contactId: ObjectId("..."), campaignId: ObjectId("...") })`
   - **Importance**: Medium - Used for contact management
   - **Cardinality**: High for the combination

3. **{ "status": 1, "nextAttempt": 1 }**
   - **Purpose**: Find contacts due for calling based on status and scheduled time
   - **Query Pattern**: `db.campaignContacts.find({ status: "scheduled", nextAttempt: { $lte: new Date() } })`
   - **Importance**: Critical - Used for call scheduling
   - **Cardinality**: Low for status, high for nextAttempt

### 6. Contacts Collection

The Contacts collection stores contact information and requires indexes for efficient lookups and filtering.

#### Primary Indexes:

```javascript
// Create indexes for Contacts collection
db.contacts.createIndex({ "phoneNumber": 1 }, { unique: true, background: true });
db.contacts.createIndex({ "email": 1 }, { sparse: true, background: true });
db.contacts.createIndex({ "tags": 1 }, { background: true });
db.contacts.createIndex({ "groups": 1 }, { background: true });
```

#### Index Justifications:

1. **{ "phoneNumber": 1 }** (Unique)
   - **Purpose**: Fast lookups by phone number
   - **Query Pattern**: `db.contacts.findOne({ phoneNumber: "+1234567890" })`
   - **Importance**: Critical - Primary lookup field
   - **Cardinality**: Very high (each contact has a unique phone number)

2. **{ "email": 1 }** (Sparse)
   - **Purpose**: Support email-based lookups
   - **Query Pattern**: `db.contacts.findOne({ email: "user@example.com" })`
   - **Importance**: Medium - Secondary lookup field
   - **Cardinality**: High (emails are typically unique)
   - **Special**: Sparse index since not all contacts may have an email

3. **{ "tags": 1 }**
   - **Purpose**: Support tag-based filtering
   - **Query Pattern**: `db.contacts.find({ tags: "VIP" })`
   - **Importance**: Medium - Used for segmentation
   - **Cardinality**: Medium (limited set of tags)

4. **{ "groups": 1 }**
   - **Purpose**: Support group-based filtering
   - **Query Pattern**: `db.contacts.find({ groups: "sales-leads" })`
   - **Importance**: Medium - Used for segmentation
   - **Cardinality**: Medium (limited set of groups)

### 7. Transcripts Collection

The Transcripts collection stores conversation transcripts and requires indexes for efficient retrieval and search.

#### Primary Indexes:

```javascript
// Create indexes for Transcripts collection
db.transcripts.createIndex({ "callSid": 1 }, { background: true });
db.transcripts.createIndex({ "recordingSid": 1 }, { background: true });
db.transcripts.createIndex({ "createdAt": -1 }, { background: true });
db.transcripts.createIndex({ "analysis.keywords": 1 }, { background: true });
```

#### Index Justifications:

1. **{ "callSid": 1 }**
   - **Purpose**: Retrieve transcript for a specific call
   - **Query Pattern**: `db.transcripts.findOne({ callSid: "CA123456789" })`
   - **Importance**: High - Used for call detail views
   - **Cardinality**: Very high (one-to-one with calls)

2. **{ "recordingSid": 1 }**
   - **Purpose**: Link transcript to recording
   - **Query Pattern**: `db.transcripts.findOne({ recordingSid: "RE123456789" })`
   - **Importance**: Medium - Used for recording-transcript association
   - **Cardinality**: Very high (one-to-one with recordings)

3. **{ "createdAt": -1 }**
   - **Purpose**: Support chronological sorting and pagination
   - **Query Pattern**: `db.transcripts.find().sort({ createdAt: -1 }).limit(20)`
   - **Importance**: Medium - Used for transcript listing
   - **Cardinality**: Very high (timestamp)

4. **{ "analysis.keywords": 1 }**
   - **Purpose**: Support keyword-based searching
   - **Query Pattern**: `db.transcripts.find({ "analysis.keywords": "pricing" })`
   - **Importance**: Medium - Used for transcript search
   - **Cardinality**: High (many possible keywords)

### 8. Analytics Collection

The Analytics collection stores pre-aggregated analytics data and requires indexes for efficient dashboard rendering.

#### Primary Indexes:

```javascript
// Create indexes for Analytics collection
db.analytics.createIndex({ "type": 1, "date": -1 }, { background: true });
db.analytics.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000, background: true }); // 90 days TTL
```

#### Index Justifications:

1. **{ "type": 1, "date": -1 }**
   - **Purpose**: Retrieve analytics by type and date
   - **Query Pattern**: `db.analytics.find({ type: "daily", date: { $gte: startDate, $lte: endDate } })`
   - **Importance**: Critical - Used for dashboard data retrieval
   - **Cardinality**: Low for type (limited set of types), high for date

2. **{ "createdAt": 1 }** with TTL
   - **Purpose**: Automatic cleanup of old analytics data
   - **Importance**: Medium - Data lifecycle management
   - **Cardinality**: Very high (timestamp)
   - **Special**: Includes TTL for automatic deletion of old analytics after 90 days

## Advanced Indexing Strategies

### 1. Text Indexes for Full-Text Search

For advanced transcript searching, implement a text index:

```javascript
// Create text index for transcript search
db.transcripts.createIndex(
  { 
    "transcript.text": "text",
    "analysis.summary": "text"
  },
  {
    weights: {
      "transcript.text": 1,
      "analysis.summary": 2
    },
    default_language: "english",
    background: true
  }
);
```

**Usage Example:**
```javascript
// Search transcripts for specific phrases
db.transcripts.find(
  { $text: { $search: "pricing discount" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

### 2. Compound Indexes for Complex Queries

For complex query patterns, create compound indexes that cover multiple fields:

```javascript
// Create compound index for call analytics
db.calls.createIndex(
  { 
    "status": 1,
    "agentId": 1,
    "startTime": -1,
    "duration": -1
  },
  { background: true }
);
```

**Usage Example:**
```javascript
// Find completed calls by a specific agent, sorted by duration
db.calls.find(
  { 
    status: "completed",
    agentId: "agent-123",
    startTime: { $gte: new Date("2025-01-01") }
  }
).sort({ duration: -1 });
```

### 3. Partial Indexes for Selective Indexing

For active calls monitoring, create a partial index that only includes active calls:

```javascript
// Create partial index for active calls
db.calls.createIndex(
  { "startTime": -1 },
  { 
    partialFilterExpression: { 
      status: { $in: ["initiated", "ringing", "in-progress"] } 
    },
    background: true
  }
);
```

**Usage Example:**
```javascript
// Find recent active calls
db.calls.find(
  { status: { $in: ["initiated", "ringing", "in-progress"] } }
).sort({ startTime: -1 });
```

### 4. Geospatial Indexes for Location-Based Queries

If contact location data is stored, implement geospatial indexes:

```javascript
// Create 2dsphere index for geospatial queries
db.contacts.createIndex(
  { "details.address.location": "2dsphere" },
  { background: true }
);
```

**Usage Example:**
```javascript
// Find contacts near a specific location
db.contacts.find({
  "details.address.location": {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749] // San Francisco
      },
      $maxDistance: 50000 // 50 km
    }
  }
});
```

## Index Maintenance Strategies

### 1. Index Statistics Monitoring

Regularly check index usage statistics to identify unused or underused indexes:

```javascript
// Check index usage statistics
db.calls.aggregate([
  { $indexStats: {} },
  { $sort: { accesses: { ops: -1 } } }
]);
```

### 2. Index Rebuilding

Periodically rebuild indexes to optimize performance:

```javascript
// Rebuild an index
db.calls.reIndex();
```

### 3. Hidden Indexes for Testing

Test the impact of removing an index by hiding it first:

```javascript
// Hide an index to test its impact
db.calls.hideIndex({ "someField": 1 });

// Unhide the index if needed
db.calls.unhideIndex({ "someField": 1 });
```

## Phased Index Implementation

### Phase 1: Core Indexes

Implement essential indexes for basic functionality:

```javascript
// Phase 1 indexes
db.calls.createIndex({ "sid": 1 }, { unique: true, background: true });
db.calls.createIndex({ "status": 1, "startTime": -1 }, { background: true });
db.callEvents.createIndex({ "callSid": 1, "timestamp": 1 }, { background: true });
db.campaigns.createIndex({ "status": 1, "startDate": -1 }, { background: true });
db.contacts.createIndex({ "phoneNumber": 1 }, { unique: true, background: true });
```

### Phase 2: Performance Optimization Indexes

Add indexes to optimize common query patterns:

```javascript
// Phase 2 indexes
db.calls.createIndex({ "campaignId": 1, "status": 1 }, { background: true });
db.calls.createIndex({ "contactId": 1, "startTime": -1 }, { background: true });
db.campaignContacts.createIndex({ "campaignId": 1, "status": 1 }, { background: true });
db.campaignContacts.createIndex({ "status": 1, "nextAttempt": 1 }, { background: true });
db.recordings.createIndex({ "callSid": 1 }, { background: true });
```

### Phase 3: Advanced Indexes

Implement specialized indexes for advanced features:

```javascript
// Phase 3 indexes
db.transcripts.createIndex({ "callSid": 1 }, { background: true });
db.transcripts.createIndex({ "analysis.keywords": 1 }, { background: true });
db.analytics.createIndex({ "type": 1, "date": -1 }, { background: true });
db.calls.createIndex({ "metadata.tags": 1 }, { background: true });
```

### Phase 4: Optimization and Refinement

Refine indexes based on actual usage patterns:

```javascript
// Phase 4 - Add, modify, or remove indexes based on performance monitoring
// Example: Add compound index for frequently used query pattern
db.calls.createIndex(
  { 
    "status": 1,
    "agentId": 1,
    "startTime": -1
  },
  { background: true }
);

// Example: Remove unused index
db.calls.dropIndex({ "someUnusedField": 1 });
```

## Performance Monitoring and Tuning

### 1. Query Performance Analysis

Use the explain method to analyze query performance:

```javascript
// Analyze query performance
db.calls.find({ status: "completed", campaignId: ObjectId("...") })
  .sort({ startTime: -1 })
  .explain("executionStats");
```

### 2. Index Size Monitoring

Monitor index sizes to ensure they don't consume excessive storage:

```javascript
// Check collection and index sizes
db.calls.stats();
```

### 3. Slow Query Logging

Enable slow query logging to identify problematic queries:

```javascript
// Enable profiling for slow queries
db.setProfilingLevel(1, 100); // Log queries slower than 100ms
```

## Conclusion

This indexing strategy provides a comprehensive approach to optimizing the MongoDB database for the ElevenLabs/Twilio integration. By implementing the recommended indexes in phases, the system can maintain high performance as it scales.

Key recommendations:

1. Implement core indexes early to support basic functionality
2. Add specialized indexes as features are developed
3. Monitor index usage and query performance
4. Refine indexes based on actual usage patterns
5. Consider advanced indexing strategies for specific requirements

Following these recommendations will ensure that the database can efficiently handle increasing call volumes while maintaining responsive performance for real-time monitoring and analytics.