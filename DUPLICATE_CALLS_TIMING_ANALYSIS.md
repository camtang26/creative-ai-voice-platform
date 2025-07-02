# Duplicate Calls Timing Analysis

## Overview
After analyzing the `campaign-engine.js` code, I've identified several timing issues that could lead to duplicate calls to the same contact.

## Key Findings

### 1. Race Condition in Contact Selection and Status Update

**Location**: Lines 304-329 in `getNextContactsToCall()` and Lines 337-420 in `makeCallToContact()`

**Issue**: There's a timing window between when contacts are fetched and when they're marked as called:
1. `getNextContactsToCall()` queries for contacts with `status: 'pending'` and `callCount: 0`
2. Multiple campaign cycles could fetch the same contacts before any are marked as called
3. Even though `updateContact()` is called immediately (line 374), it's not atomic with the query

**Scenario**:
- Campaign cycle 1 starts at T+0ms, queries and gets Contact A
- Campaign cycle 2 starts at T+5000ms (default 5s interval), queries and gets Contact A again
- Both cycles proceed to call Contact A before either updates the database

### 2. Non-Atomic Update Operations

**Location**: Lines 373-378 in `makeCallToContact()`

```javascript
await contactRepository.updateContact(contact._id, {
    callCount: (contact.callCount || 0) + 1,
    lastContacted: new Date()
});
```

**Issue**: This uses `findByIdAndUpdate()` but doesn't use MongoDB's atomic operators like `$inc` for incrementing. Multiple concurrent calls could read the same `callCount` value and both set it to 1.

### 3. No Database-Level Locking

**Issue**: The code doesn't use:
- MongoDB transactions
- Optimistic concurrency control (version fields)
- Database-level unique constraints or locks
- Atomic findAndModify operations with conditions

### 4. Campaign Execution Interval vs Processing Time

**Location**: Lines 86-87 in `startCampaign()`

```javascript
const callDelay = campaign.settings?.callDelay || DEFAULT_CALL_DELAY; // 5000ms default
const interval = setInterval(() => executeCampaignCycle(campaignId), callDelay);
```

**Issue**: If processing a campaign cycle takes longer than `callDelay`, cycles can overlap:
- Cycle 1 starts at T+0, still processing at T+5000
- Cycle 2 starts at T+5000 while Cycle 1 is still running
- Both cycles might process the same contacts

### 5. Multiple Campaign Instances

**Issue**: If the server is restarted or multiple instances are running (e.g., during deployment), multiple campaign engines could be processing the same campaign simultaneously.

### 6. Pre-marking Strategy Limitations

**Location**: Lines 372-378

While the code does "pre-mark" contacts immediately after selection, this approach has limitations:
- It's not atomic with the selection query
- Network latency between query and update creates a race window
- No rollback mechanism if the call fails to initiate

## Recommendations to Fix

### 1. Use Atomic MongoDB Operations
```javascript
// Use findOneAndUpdate with conditions to atomically claim a contact
const contact = await Contact.findOneAndUpdate(
    {
        campaignId,
        status: 'pending',
        callCount: 0,
        // Add a "processing" flag to prevent double-selection
        processing: { $ne: true }
    },
    {
        $set: { 
            processing: true,
            processingStartedAt: new Date()
        },
        $inc: { callCount: 1 }
    },
    { 
        new: true,
        sort: { createdAt: 1 }
    }
);
```

### 2. Implement a Locking Mechanism
Add a `lockedUntil` field to contacts and use it to prevent concurrent processing:
```javascript
const contact = await Contact.findOneAndUpdate(
    {
        campaignId,
        status: 'pending',
        $or: [
            { lockedUntil: { $exists: false } },
            { lockedUntil: { $lt: new Date() } }
        ]
    },
    {
        $set: { 
            lockedUntil: new Date(Date.now() + 60000) // Lock for 1 minute
        }
    }
);
```

### 3. Use MongoDB Transactions
Wrap the contact selection and update in a transaction to ensure atomicity.

### 4. Implement Cycle Overlap Prevention
Check if the previous cycle is still running before starting a new one:
```javascript
const cycleInProgress = new Map();

async function executeCampaignCycle(campaignId) {
    if (cycleInProgress.get(campaignId)) {
        console.log(`Skipping cycle - previous cycle still in progress`);
        return;
    }
    
    cycleInProgress.set(campaignId, true);
    try {
        // ... existing cycle logic
    } finally {
        cycleInProgress.delete(campaignId);
    }
}
```

### 5. Add Distributed Lock for Multiple Instances
Use Redis or MongoDB-based distributed locking to prevent multiple server instances from processing the same campaign.

### 6. Implement Idempotency Keys
Add a unique identifier to each call attempt to prevent duplicate calls even if the same contact is selected twice.

## Immediate Fix

The quickest fix would be to modify `getNextContactsToCall()` to use atomic operations:

```javascript
async function getNextContactsToCall(campaignId, limit = 1) {
    const contacts = [];
    for (let i = 0; i < limit; i++) {
        const contact = await Contact.findOneAndUpdate(
            {
                campaignId,
                status: 'pending',
                callCount: 0
            },
            {
                $inc: { callCount: 1 },
                $set: { 
                    status: 'processing',
                    lastContacted: new Date()
                }
            },
            { new: true, sort: { createdAt: 1 } }
        );
        
        if (contact) {
            contacts.push(contact);
        } else {
            break; // No more contacts available
        }
    }
    return contacts;
}
```

This ensures that each contact is atomically claimed before being returned for calling.