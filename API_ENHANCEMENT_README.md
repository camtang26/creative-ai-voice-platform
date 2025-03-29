# Enhanced Call Control API

This document outlines the security and standardization improvements made to the Twilio-ElevenLabs API endpoints.

## Key Improvements

### 1. Standardized API Responses

All API endpoints now return responses in a consistent format:

#### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-03-25T12:34:56.789Z"
}
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "code": "ERROR_CODE",
    "details": {
      // Additional error details if available
    }
  },
  "timestamp": "2025-03-25T12:34:56.789Z"
}
```

### 2. API Authentication for Sensitive Operations

Sensitive operations (like call termination) now require API key authentication:

- Add the API key to your `.env` file:
  ```
  API_KEY=api_L8uA2gfxH6w9TzR5vJ3pK7mD1yE0nP4q
  ```

- Authentication Methods:
  - Bearer Token in Authorization header:
    ```
    Authorization: Bearer api_L8uA2gfxH6w9TzR5vJ3pK7mD1yE0nP4q
    ```
  - Query Parameter:
    ```
    ?api_key=api_L8uA2gfxH6w9TzR5vJ3pK7mD1yE0nP4q
    ```

### 3. Comprehensive Error Handling

- Detailed error messages with specific error codes
- Contextual error details
- Consistent HTTP status codes
- Proper handling of Twilio API errors

### 4. Rate Limiting

Basic rate limiting has been implemented to protect the API from abuse:

- 100 requests per minute per endpoint
- Rate limit headers are included in responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 99
  X-RateLimit-Reset: 1617234567
  ```

## API Endpoints

### Get Call Information
```
GET /api/call/:callSid
```

Returns detailed information about a specific call.

### Get Active Calls
```
GET /api/calls/active
```

Returns a list of all currently active calls.

### Get Call Recordings
```
GET /api/calls/:callSid/recordings
```

Returns all recordings associated with a specific call.

### Get Call Metrics
```
GET /api/calls/:callSid/metrics
```

Returns quality metrics for a specific call.

### Terminate Call (Authenticated)
```
POST /api/calls/:callSid/terminate
```

Terminates an active call. Requires API key authentication.

Request body:
```json
{
  "force": false,  // Optional: force termination even if call is not active
  "reason": "user-requested"  // Optional: reason for termination
}
```

### Send Email (Authenticated)
```
POST /api/email/send
```

Sends an email. Requires API key authentication.

Request body:
```json
{
  "to_email": "recipient@example.com",
  "subject": "Email Subject",
  "content": "<h1>Email Content</h1><p>This is the email body.</p>",
  "customer_name": "Optional Customer Name"
}
```

## Error Codes

The API uses the following error codes:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication is required or failed |
| `FORBIDDEN` | Authentication succeeded but permission denied |
| `NOT_FOUND` | Requested resource not found |
| `BAD_REQUEST` | Invalid request parameters |
| `VALIDATION_ERROR` | Request validation failed |
| `INTERNAL_ERROR` | Server-side error |
| `SERVICE_UNAVAILABLE` | External service unavailable (e.g., Twilio) |
| `CONFLICT` | Request conflicts with current state |
| `RATE_LIMITED` | Too many requests |
| `CALL_NOT_FOUND` | Specified call not found |
| `CALL_NOT_ACTIVE` | Call exists but is not in active state |
| `TWILIO_CALL_NOT_FOUND` | Call not found on Twilio |
| `TWILIO_API_ERROR` | Error from Twilio API |
| `TERMINATION_ERROR` | Error while terminating call |
| `RECORDINGS_NOT_FOUND` | No recordings found for call |
| `METRICS_NOT_FOUND` | No metrics available for call |
| `EMAIL_DELIVERY_FAILED` | Failed to send email |

## Frontend Integration

### API Wrapper
```typescript
// api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  message?: string;
  timestamp: string;
}

export async function apiRequest<T>(
  path: string, 
  options: RequestInit = {}, 
  requiresAuth: boolean = false
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;
  
  // Set up headers
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  // Add authentication if required
  if (requiresAuth && API_KEY) {
    headers.set('Authorization', `Bearer ${API_KEY}`);
  }
  
  // Create request
  const request = new Request(url, {
    ...options,
    headers
  });
  
  // Make request
  try {
    const response = await fetch(request);
    const data = await response.json();
    
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message || 'Network error',
        code: 'NETWORK_ERROR'
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Example function to get active calls
export async function getActiveCalls() {
  return apiRequest<{ calls: Call[], count: number }>('/api/calls/active');
}

// Example function to terminate a call (requires auth)
export async function terminateCall(callSid: string, force: boolean = false) {
  return apiRequest<{ callSid: string; status: string }>(
    `/api/calls/${callSid}/terminate`,
    {
      method: 'POST',
      body: JSON.stringify({ force })
    },
    true // Requires authentication
  );
}
```

### Error Handling in React Components
```tsx
import { getActiveCalls } from '../lib/api';
import { useState, useEffect } from 'react';

function CallsList() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      const response = await getActiveCalls();
      
      if (response.success) {
        setCalls(response.data.calls);
        setError(null);
      } else {
        setCalls([]);
        setError({
          message: response.error.message,
          code: response.error.code
        });
      }
      
      setLoading(false);
    }
    
    fetchCalls();
  }, []);
  
  if (loading) return <div>Loading calls...</div>;
  
  if (error) {
    return (
      <div className="error-container">
        <h3>Error Loading Calls</h3>
        <p>{error.message}</p>
        <p>Error code: {error.code}</p>
      </div>
    );
  }
  
  if (calls.length === 0) {
    return <div>No active calls.</div>;
  }
  
  return (
    <div>
      <h2>Active Calls ({calls.length})</h2>
      <ul>
        {calls.map(call => (
          <li key={call.sid}>{call.from} → {call.to} ({call.status})</li>
        ))}
      </ul>
    </div>
  );
}
```

## Implementation Notes

1. The enhanced API uses middleware functions for consistent error handling and authentication.

2. New API endpoints follow RESTful conventions.

3. All responses include timestamps for proper tracking.

4. Authentication is required only for sensitive operations to maintain ease of use.

5. Environment variables are used for configuration settings.

## Future Enhancements

1. **JWT Authentication**: Replace simple API key with JWT tokens for more granular access control.

2. **Comprehensive Validation**: Add schema validation for all request bodies.

3. **API Documentation**: Generate OpenAPI/Swagger documentation.

4. **Caching**: Implement response caching for frequently accessed data.

5. **Pagination**: Add pagination for endpoints returning large datasets.
