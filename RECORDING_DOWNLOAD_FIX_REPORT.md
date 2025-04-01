# Recording Download Route Fix Report

## Issue Summary

The `/api/recordings/:recordingSid/download` route was failing with 404 errors in two different ways:
- On Render: Requests didn't reach the Fastify application at all (blocked at platform level)
- On Railway: Requests reached the application but resulted in a Fastify 404 "Route not found" error

## Root Cause Analysis

After investigating the code and behavior, we identified the following potential causes:

1. **URL Pattern Edge Case in Fastify v4**: The specific route pattern `/api/{noun}/:param/{verb}` appears to trigger an edge case in Fastify's router, particularly after downgrading from v5-pre to v4.

2. **Route Structure and Precedence**: Routes with dynamic parameters followed by static segments (like `:recordingSid/download`) may be handled differently between Fastify v4 and v5, or may have precedence issues with other routes.

3. **Platform-Specific URL Handling**: Render's routing/proxy layer might have specific handling for URLs with this pattern, causing requests to be rejected before reaching the application.

## Solution Implemented

We implemented a multi-pronged approach to ensure maximum compatibility:

### 1. Alternative Route Structure Addition

Added two alternative routes with different patterns while keeping the original for backward compatibility:

```javascript
// Original (problematic) route - kept for backward compatibility
fastify.get('/api/recordings/:recordingSid/download', async (request, reply) => {...});

// Alternative 1: Verb-first pattern
fastify.get('/api/download/recordings/:recordingSid', async (request, reply) => {...});

// Alternative 2: Query parameter approach
fastify.get('/api/recordings/download', async (request, reply) => {...});
```

### 2. Frontend Component Update

Updated the `recording-item.tsx` component to use the new, more reliable route structure:

```typescript
// Previous implementation
const proxyUrl = `/api/recordings/${recording.recordingSid}/download`;

// New implementation
const primaryProxyUrl = `/api/download/recordings/${recording.recordingSid}`;
const fallbackQueryUrl = `/api/recordings/download?recordingSid=${recording.recordingSid}`;
const originalProxyUrl = `/api/recordings/${recording.recordingSid}/download`;

// Use the new primary URL for both audio player and download
const audioUrl = primaryProxyUrl;
const downloadUrl = primaryProxyUrl;
```

## Why This Approach Works

1. **Improved Route Structure**: 
   - Moving the static segment `download` before the parameter (`/api/download/recordings/:recordingSid`) creates a more predictable route pattern that's less likely to be affected by Fastify's router edge cases.
   - Query parameter approach (`/api/recordings/download?recordingSid=XYZ`) avoids dynamic path segments entirely, which is often more reliable with complex routers and proxies.

2. **Compatibility Safety**:
   - Keeping the original route maintains compatibility with any existing clients or cached URLs.
   - Having multiple route definitions increases the chance of successful routing across different platforms and Fastify versions.

3. **Precedence Optimization**:
   - The new routes follow patterns more similar to other working routes in the application, making them more likely to be properly processed by the router.

## Deployment and Testing

After deploying these changes:

1. The primary new route (`/api/download/recordings/:recordingSid`) should be the main path used by the frontend.
2. If issues persist, the frontend can be updated to use the query parameter approach as a fallback.
3. Both routes should allow users to:
   - Download recordings directly through the browser
   - Stream audio to the waveform player component

## Monitoring and Verification

When testing this fix, monitor:

1. Server logs for `[API Download Alt1]` and `[API Download Alt2]` messages which indicate the new routes are being hit.
2. Network requests in the browser developer tools to confirm the correct URLs are being used.
3. Any 404 errors in both the browser console and server logs.

## Additional Considerations

For future development, consider:

1. Standardizing route patterns across the application (e.g., consistently using either `/api/verb/noun/:param` or query parameters).
2. Implementing more robust client-side fallback mechanisms to try alternative URLs if the primary one fails.
3. Adding specific Fastify hooks to log and analyze route matching issues in more detail.
