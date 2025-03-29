# Enhanced Call Control API

This document provides an overview of the enhanced Call Control API implemented in this project.

## Key Improvements

1. **Robust Error Handling**
   - Standardized API error types with meaningful error codes
   - Detailed error messages with context and troubleshooting hints
   - Consistent error response format across all endpoints

2. **Authentication for Sensitive Operations**
   - Bearer token authentication for sensitive endpoints
   - Environment variable-based API key configuration
   - Protection for call termination endpoints

3. **Unified API Response Format**
   - Consistent success/error response structure
   - Request IDs for error tracking
   - Timestamps included in all responses
   - Detailed data formatting

## API Response Format

### Success Responses

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-03-25T12:34:56.789Z",
  "requestId": "req_1234567890abcdef"
}
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "message": "Error message describing what went wrong",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "timestamp": "2025-03-25T12:34:56.789Z",
  "requestId": "req_1234567890abcdef"
}
```

## Error Codes and HTTP Status Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Request conflicts with current state |
| `INTERNAL_ERROR` | 500 | Server-side error |
| `SERVICE_UNAVAILABLE` | 503 | External service unavailable |

## Authentication

Sensitive endpoints require Bearer token authentication:

```
Authorization: Bearer YOUR_API_KEY
```

Configure your API key in the `.env` file:

```
API_KEY=your_secure_api_key
```

## Available Endpoints

### Call Management

#### Get Call Information
```
GET /api/calls/:callSid
```

#### Get Call Recordings
```
GET /api/calls/:callSid/recordings
```

#### Terminate Call
```
POST /api/calls/:callSid/terminate
```
*Requires authentication*

#### Get Active Calls
```
GET /api/calls/active
```

#### Get Call Statistics
```
GET /api/call-stats
```

### Monitoring & Analytics

#### Get Call Quality Metrics
```
GET /api/calls/:callSid/metrics
```

#### Get Recent Calls
```
GET /api/recent-calls?count=10
```

## Examples

### Terminating a Call

**Request:**
```
POST /api/calls/CA1234567890abcdef1234567890abcdef/terminate
Authorization: Bearer your_api_key
Content-Type: application/json

{
  "force": false,
  "reason": "user-initiated"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Call CA1234567890abcdef1234567890abcdef terminated successfully",
  "data": {
    "callSid": "CA1234567890abcdef1234567890abcdef",
    "timestamp": "2025-03-25T12:34:56.789Z",
    "wasActive": true,
    "terminationMethod": "twilio-api",
    "reason": "user-initiated"
  },
  "timestamp": "2025-03-25T12:34:56.789Z",
  "requestId": "req_1234567890abcdef"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Call CA1234567890abcdef1234567890abcdef cannot be terminated (status: completed)",
    "code": "CALL_TERMINATION_CONFLICT",
    "details": {
      "currentStatus": "completed",
      "recommendation": "Use force=true to attempt termination anyway"
    }
  },
  "timestamp": "2025-03-25T12:34:56.789Z",
  "requestId": "req_1234567890abcdef"
}
```

## Implementing In Your Code

### Making API Requests

```javascript
// Example using fetch
async function terminateCall(callSid, apiKey) {
  try {
    const response = await fetch(`/api/calls/${callSid}/terminate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        force: false,
        reason: 'user-initiated'
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`${data.error.code}: ${data.error.message}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error terminating call:', error);
    throw error;
  }
}
```

## Error Handling Best Practices

1. **Check the success flag first**
   ```javascript
   if (!response.success) {
     // Handle error
   }
   ```

2. **Handle specific error codes**
   ```javascript
   if (response.error && response.error.code === 'CALL_NOT_FOUND') {
     // Handle specific error
   }
   ```

3. **Use the details object for additional context**
   ```javascript
   if (response.error && response.error.details && response.error.details.recommendation) {
     console.log(`Recommended action: ${response.error.details.recommendation}`);
   }
   ```

4. **Include the requestId in error reports**
   ```javascript
   console.error(`Error [${response.requestId}]: ${response.error.message}`);
   ```
