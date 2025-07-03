# Twilio Voice Insights Integration Research

## Executive Summary

After researching the codebase and Twilio's Voice Insights feature, here's what we found about integrating Voice Insights to get detailed call termination data.

## Current State Analysis

### 1. Existing Call Data Collection

The application currently collects call data through:

- **Twilio Status Callbacks** (`/call-status-callback`): Receives basic call status updates
- **AMD Webhooks** (`/amd-status-callback`): Receives answering machine detection results
- **Custom Termination Tracking** (`call-termination-tracker.js`): Attempts to determine who terminated based on various signals

### 2. Current `terminatedBy` Logic

The application uses a custom heuristic approach in `call-termination-tracker.js` to determine who terminated:
- `agent`: ElevenLabs conversation completed normally
- `user`: User hung up during conversation
- `system`: System issues or timeouts
- `amd_machine`: Machine detected by AMD
- `api_request`: Terminated via API

### 3. Missing Twilio Call Details

The codebase does NOT currently:
- Fetch additional call details from Twilio's Call Resource API
- Use Voice Insights API
- Access the actual `terminatedBy` field that Twilio provides

## Twilio Voice Insights Overview

### What Voice Insights Provides

Voice Insights is a separate Twilio product that provides:

1. **Call Quality Metrics**:
   - MOS (Mean Opinion Score)
   - Jitter, packet loss, latency
   - Audio codec information
   - Network carrier details

2. **Call Event Timeline**:
   - Detailed event logs
   - SIP messaging details
   - Call routing information

3. **Termination Details**:
   - Who terminated the call (caller/callee/system)
   - Termination reasons
   - Error codes if applicable

### Key Differences from Regular Call API

1. **Regular Call Resource API** (`/v1/Calls/{CallSid}`):
   - Basic call metadata
   - Does NOT include detailed `terminatedBy` information
   - Available immediately after call

2. **Voice Insights API** (`/v1/Voice/{CallSid}/Summary`):
   - Requires separate product activation
   - Provides deep analytics
   - May have processing delay (1-5 minutes)
   - Additional cost per call analyzed

## Integration Recommendations

### Option 1: Use Call Resource API (Immediate, No Extra Cost)

The standard Twilio Call Resource API can provide additional details not currently captured:

```javascript
// Add to enhanced-call-handler.js or create new module
export async function fetchCallDetails(callSid) {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }
  
  try {
    const call = await twilioClient.calls(callSid).fetch();
    
    // Extract additional details
    return {
      answeredBy: call.answeredBy,  // human, machine, fax, unknown
      callerName: call.callerName,
      direction: call.direction,
      duration: call.duration,
      endTime: call.endTime,
      forwardedFrom: call.forwardedFrom,
      price: call.price,
      priceUnit: call.priceUnit,
      status: call.status,
      subresourceUris: call.subresourceUris,
      // Note: terminatedBy is NOT available in standard API
    };
  } catch (error) {
    console.error(`[Call Details] Failed to fetch details for ${callSid}:`, error);
    throw error;
  }
}
```

### Option 2: Integrate Voice Insights API (Requires Product Activation)

If Voice Insights is activated on your Twilio account:

```javascript
// Voice Insights integration
export async function fetchVoiceInsights(callSid, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds
  
  try {
    // Voice Insights uses a different endpoint structure
    const response = await fetch(
      `https://insights.twilio.com/v1/Voice/${callSid}/Summary`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64')
        }
      }
    );
    
    if (response.status === 404 && retryCount < MAX_RETRIES) {
      // Insights may not be ready yet, retry
      console.log(`[Voice Insights] Data not ready for ${callSid}, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchVoiceInsights(callSid, retryCount + 1);
    }
    
    if (!response.ok) {
      throw new Error(`Voice Insights API error: ${response.status} ${response.statusText}`);
    }
    
    const insights = await response.json();
    
    // Extract termination details
    return {
      terminatedBy: insights.call_state?.terminated_by, // 'caller', 'callee', 'system'
      disconnectReason: insights.call_state?.disconnect_reason,
      callQuality: {
        mos: insights.metrics?.mos,
        jitter: insights.metrics?.jitter,
        packetLoss: insights.metrics?.packet_loss
      },
      carrierInfo: insights.carrier,
      sipDetails: insights.sip,
      events: insights.events
    };
  } catch (error) {
    console.error(`[Voice Insights] Failed to fetch insights for ${callSid}:`, error);
    throw error;
  }
}
```

### Option 3: Enhanced Status Callback Processing

Improve the existing webhook handling to extract more data:

```javascript
// In server-mongodb.js, enhance the /call-status-callback endpoint
app.post('/call-status-callback', async (request, reply) => {
  const data = request.body;
  
  // Extract additional fields that may be present
  const enhancedData = {
    ...data,
    // These fields might be available in callbacks
    answeredBy: data.AnsweredBy,
    callerName: data.CallerName,
    callDuration: data.CallDuration,
    recordingUrl: data.RecordingUrl,
    recordingSid: data.RecordingSid,
    // Custom logic to determine termination
    terminatedBy: determineTerminationFromCallback(data)
  };
  
  // Update call with enhanced data
  await updateCallStatus(enhancedData);
});

function determineTerminationFromCallback(data) {
  // Enhanced logic based on callback data
  if (data.CallStatus === 'completed') {
    // Check duration and other factors
    if (data.CallDuration && parseInt(data.CallDuration) < 5) {
      return 'user_immediate_hangup';
    }
    // Add more heuristics
  }
  return 'unknown';
}
```

## Implementation Plan

### Phase 1: Immediate Improvements (No Voice Insights Required)

1. **Enhance Status Callback Processing**:
   - Extract all available fields from Twilio callbacks
   - Add missing fields to MongoDB schema
   - Improve termination detection logic

2. **Add Call Details Fetching**:
   - Implement `fetchCallDetails()` function
   - Call it in the 'completed' status callback
   - Store additional metadata

3. **Fix Schema Issues**:
   - Add missing fields identified in AMD-TERMINATION-DATA-FLOW-ANALYSIS.md
   - Ensure all captured data is persisted

### Phase 2: Voice Insights Integration (If Available)

1. **Check Voice Insights Availability**:
   - Verify if Voice Insights is activated on the Twilio account
   - Test API access with a sample call

2. **Implement Delayed Fetching**:
   - Add a background job to fetch insights 2-5 minutes after call completion
   - Store insights data in a separate collection or enhanced call record

3. **Update Frontend**:
   - Display Voice Insights data when available
   - Show accurate `terminatedBy` information
   - Add call quality metrics to analytics

## Cost Considerations

1. **Standard Call API**: No additional cost
2. **Voice Insights**: Additional per-minute charge (check current Twilio pricing)
3. **Storage**: Minimal additional MongoDB storage for extra fields

## Conclusion

The application can be significantly enhanced without Voice Insights by:
1. Properly capturing all available Twilio callback data
2. Fetching call details via standard API
3. Improving the termination detection logic

Voice Insights would provide the most accurate `terminatedBy` data and call quality metrics, but requires:
- Product activation on Twilio account
- Additional per-call costs
- Delayed data availability (not real-time)

The recommended approach is to first implement Phase 1 improvements, then evaluate if Voice Insights is needed based on business requirements.