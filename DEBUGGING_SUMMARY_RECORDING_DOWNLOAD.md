# Comprehensive Debugging Report: Recording Download & Playback Issues

**Date of Report:** 2025-05-12 (Resumed from 2025-04-01)
**Project:** ElevenLabs Conversational AI with Twilio Integration
**Primary Focus of this Report:** Resolving issues with downloading and playing Twilio call recordings.

## 1. Project Goal & Context

The overall project aims to integrate ElevenLabs call transcripts and analysis into an application. This involves:
*   Handling ElevenLabs webhooks for real-time call events.
*   Storing call data, including Twilio call recordings and ElevenLabs transcripts/analysis, in MongoDB.
*   Displaying this information on a Next.js/React frontend, including a call logs page, call details page, and a recordings page.
*   Allowing users to play back and download call recordings.

## 2. Core Problem: Recording Download/Playback Failures

After successfully resolving initial issues with ElevenLabs webhook signature verification (related to raw request body access in a Fastify/Render environment), several critical problems emerged concerning Twilio call recordings:

*   **Recordings Page (`/recordings`):**
    *   Metadata display issues (e.g., "Invalid Date").
    *   Embedded `WaveformPlayer` showed "Failed to load audio file" with a 401 Unauthorized error when trying to fetch directly from `api.twilio.com`.
*   **Call Details Page (`/call-details/[id]`):**
    *   The audio player's play button did not initiate playback. The browser console initially showed an `AbortError`, later just no playback.
*   **Download Button (Both Pages):**
    *   Clicking the download button for a recording resulted in a "File wasn't available on site" error, indicating a 404 Not Found for the backend proxy URL (initially `/api/recordings/:recordingSid/download`).
    *   Crucially, backend logs (on both Render and later Railway deployments) **did not show the route handler for this download path being hit**, even when other API routes were functioning.

The primary focus of the extensive debugging session was to resolve the 404 error on the download/playback proxy route, as this was fundamental to both playing and downloading recordings.

## 3. System Context

*   **Backend Server:** Node.js application using Fastify.
    *   Filename: [`server-mongodb.js`](./server-mongodb.js)
    *   Key Dependencies (at end of debugging session):
        *   `fastify`: `^4.29.0` (downgraded from `^5.2.1`)
        *   `fastify-socket.io`: `^5.1.0` (upgraded from `^4.0.0-1`)
        *   `@fastify/formbody`: `^7.4.0` (downgraded from `^8.0.2`)
        *   `mongoose`: `^7.5.0`
        *   `twilio`: `^4.19.0`
        *   `node-fetch`: `^2.7.0`
    *   Database: MongoDB Atlas.
    *   Type: ES Modules (`"type": "module"` in [`package.json`](./package.json)).
*   **Frontend Application:** Next.js / React.
    *   Key Components:
        *   [`frontend/src/components/recording-item.tsx`](./frontend/src/components/recording-item.tsx) (displays individual recordings, includes player and download button)
        *   [`frontend/src/app/call-details/[id]/page.tsx`](./frontend/src/app/call-details/[id]/page.tsx) (displays detailed call info, includes player and download button)
        *   [`frontend/src/components/waveform-player.tsx`](./frontend/src/components/waveform-player.tsx) (audio player component)
    *   API Interaction: Uses relative paths (e.g., `/api/recordings/...`) to call the backend.
*   **Deployment Platforms:**
    *   **Render:** Primary deployment platform where the 404 issue was first observed. Requests to the problematic route seemed to be blocked before reaching the Fastify application.
    *   **Railway:** Secondary deployment platform (`twilioel-production.up.railway.app`) used for comparative testing. Requests *did* reach the Fastify application here but initially failed with a Fastify 404 "Route not found" error, suggesting a routing mismatch within the app itself on this platform.
*   **Relevant Backend Files for Routing/Downloads:**
    *   [`db/api/recording-api.js`](./db/api/recording-api.js): Defines the recording-related API routes, including the download proxy.
    *   [`db/index.js`](./db/index.js): Contains `initializeMongoDB` which registers all database-related API routes.
    *   [`server-mongodb.js`](./server-mongodb.js): Main server file, initializes Fastify, registers plugins, and calls `initializeMongoDB`.
    *   [`api-middleware.js`](./api-middleware.js): Defines global middleware (CORS, rate limiting).

## 4. Detailed Chronological Summary of Debugging Steps & Results

**Phase 0: Initial Fixes (Pre-Download Issue Focus)**
*   **Webhook Signature Verification:** Successfully fixed by using Fastify's `addContentTypeParser` to capture the raw request buffer before parsing, and ensuring `disableBodyParser: true` was removed from the webhook route.

**Phase 1: Recordings Page Audio Player & Metadata (Partial)**
*   **URL Usage:** Confirmed `RecordingItem` was intended to pass a proxy URL (`/api/recordings/.../download`) to `WaveformPlayer`.
*   **`WaveformPlayer` Implementation:** Confirmed it correctly used the `audioUrl` prop.
*   **Timestamp Fix:** Corrected date display in `RecordingItem` to use `recording.createdAt` instead of `recording.timestamp`. This was applied, but player issues (due to the 404 on the proxy URL) prevented full verification of playback.
    *   *File affected:* [`frontend/src/components/recording-item.tsx`](./frontend/src/components/recording-item.tsx)

**Phase 2: Call Details Page Player (Partial)**
*   Similar issues to Recordings Page player, likely due to the same root 404 cause on the backend proxy URL.

**Phase 3: Fix Download Button 404 Error (Extensive Debugging)**
This became the primary focus. The original path was `/api/recordings/:recordingSid/download`.

1.  **Verified Route Path & Definition:**
    *   Action: Compared frontend link generation with backend route definition in [`db/api/recording-api.js`](./db/api/recording-api.js).
    *   Result: Paths matched. Handler logic (fetching from DB, then Twilio, then streaming) appeared sound.

2.  **Verified Route Registration Context:**
    *   Action: Examined [`db/index.js`](./db/index.js) to confirm `registerRecordingApiRoutes` was called correctly within `initializeMongoDB` with the Fastify instance. Added logs.
    *   Result: Startup logs (on both Render and Railway) confirmed `registerRecordingApiRoutes` was being called.

3.  **Route Isolation Test:**
    *   Action: Commented out original registration in [`db/index.js`](./db/index.js). Added the download route definition directly into [`server-mongodb.js`](./server-mongodb.js).
    *   Result: Broke other DB-related routes (e.g., fetching recordings for Call Details page). Reverted. This indicated the original registration mechanism was generally working for other routes from the same module.

4.  **Middleware Check:**
    *   Action: Reviewed [`api-middleware.js`](./api-middleware.js).
    *   Result: Global CORS and rate-limiting applied to `/api/*`. No specific auth middleware found on the problematic route. Unlikely to cause a 404 without hitting the handler.

5.  **`preHandler` Hook Logging (Render):**
    *   Action: Added a global `preHandler` hook in [`server-mongodb.js`](./server-mongodb.js) to log all incoming `request.raw.url` values before routing.
    *   Result: **Crucial Finding:** On Render, requests to `/healthz` and other working API routes *were* logged by this hook. Requests to `/api/recordings/:recordingSid/download` were *NOT* logged, indicating the request was not reaching the Fastify application. Hook removed.

6.  **Dependency Version Alignment (Major Effort):**
    *   Initial State: `fastify@^5.2.1` (pre-release), `fastify-socket.io@^4.0.0-1` (for Fastify v4), `@fastify/formbody@^8.0.2` (for Fastify v5).
    *   Action 1: Uninstalled `@fastify/websocket` (unused, for v4).
    *   Action 2: Downgraded `fastify` to `^4.x.x` (resolved to `4.29.0`) and installed latest `fastify-socket.io` (`5.1.0`, which has peer dep for Fastify v4).
    *   Result 2: Caused `FST_ERR_PLUGIN_VERSION_MISMATCH` for `@fastify/formbody`.
    *   Action 3: Downgraded `@fastify/formbody` to `^7.x.x` (resolved to `7.4.0`).
    *   Result 3: Dependencies aligned. Server deployed successfully on Render and Railway.
    *   **Test on Render (Post-Alignment):** Pointed frontend to Render. Download still failed (404, no handler logs).
    *   **Test on Railway (Post-Alignment):** Pointed frontend to Railway. Request *reached* Railway Fastify app but resulted in Fastify's own 404 "Route ... not found" JSON response. Handler logs *still not hit*. Browser downloaded an HTML error page. This indicated that even with aligned dependencies, Fastify on Railway was not matching the route.

7.  **URL Structure Variations (Tested on Railway, frontend pointing to Railway):**
    *   Rationale: To see if specific parts of the path (`/api/`, `/recordings/`, `/download`, parameter position) caused issues.
    *   Attempt 1: `/api/fetch-recording/:recordingSid`
    *   Attempt 2: `/api/recordings/download/:recordingSid`
    *   Attempt 3: `/fetch-recording-audio/:recordingSid` (removed `/api` prefix)
    *   Result: All variations still resulted in Fastify 404 "Route not found" on Railway, with no handler logs hit. All path changes were reverted.

8.  **Fastify Plugin Registration Style (`done` callback vs. `async`):**
    *   Action: Modified `registerRecordingApiRoutes` to use the `done` callback.
    *   Result: Caused `FST_ERR_PLUGIN_INVALID_ASYNC_HANDLER` on deployment. Reverted.

9.  **Stream Handling (`reply.raw` vs. `reply.send(stream)`):**
    *   Action: Refactored download handler in [`db/api/recording-api.js`](./db/api/recording-api.js) to use `reply.header()` and `return reply.send(response.body)` instead of `reply.raw.setHeader()` and `response.body.pipe(reply.raw)`.
    *   Result: No change in behavior (still 404, no handler logs on Render/Railway).

10. **Explicit `OPTIONS *` Handler Removal:**
    *   Issue: A deployment failed with `FST_ERR_DUPLICATED_ROUTE` for `OPTIONS *`.
    *   Action: Removed the explicit `server.options('*', ...)` handler from [`api-middleware.js`](./api-middleware.js).
    *   Result: Deployment succeeded. This was unrelated to the download 404 but fixed a deployment blocker.

**5. Current State of the Code (at end of debugging session):**
*   All experimental path changes have been reverted. The target route is `/api/recordings/:recordingSid/download`.
*   Frontend components point to this relative path (implicitly targeting the Render backend).
*   Dependencies are aligned: `fastify@^4.29.0`, `fastify-socket.io@^5.1.0`, `@fastify/formbody@^7.4.0`.
*   The download handler in [`db/api/recording-api.js`](./db/api/recording-api.js) uses `reply.send(stream)`.

**6. Key Mysteries & Unresolved Questions for New AI Instance:**

*   **Render - Request Not Reaching App:** Why are requests to `/api/recordings/:recordingSid/download` (and its variations) apparently being blocked or misrouted by Render's infrastructure *before* reaching the Fastify application, even when other API routes work? The `preHandler` hook test was key here.
*   **Railway - Route Not Matched:** Even with aligned Fastify v4 dependencies, and with requests *reaching* the Fastify application on Railway, why does the router fail to match the `/api/recordings/:recordingSid/download` route (and its variations) to its handler, despite startup logs confirming the registration function for these routes executes? This suggests a subtle routing issue within Fastify itself or its interaction with plugins in that environment for this specific pattern.
*   **Is there a very subtle, deeply nested conflict?** Could a plugin, even if not directly interacting with these routes, be affecting Fastify's global routing table or parameter parsing in an unexpected way for this specific path structure?
*   **Environment Differences:** Are there any unspotted differences between the local dev environment (where it presumably worked at some point) and the Render/Railway environments that could affect routing (e.g., specific Node.js flags, hidden proxy behaviors, file system case sensitivity if paths were ever subtly different)?

**7. Additional Important Information:**
*   The user has confirmed that other parameterized routes, such as `/api/db/calls/:callSid/transcript`, *are* working correctly on the Render deployment. This makes the failure of the download route particularly specific.
*   The initial problem that led to this extensive debugging was that the download button resulted in a 404, and the audio players (which use the same underlying proxy route) were failing to load audio.
*   The project uses `type: "module"` in [`package.json`](./package.json).
*   The user has mentioned past issues with Fastify and WebSocket interactions, which led to the current setup of using `fastify-socket.io` for client Socket.IO and a manual `ws` server for Twilio media streams. This history might be relevant if any considered fix risks reintroducing those WebSocket conflicts.

This report should provide a solid foundation for a new AI instance to understand the problem's depth and the extensive efforts already made. The core issue seems to be a very stubborn routing anomaly.