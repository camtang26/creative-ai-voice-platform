# Project Architecture Overview

This document outlines the architecture of the ElevenLabs/Twilio outbound calling application based on an analysis of the codebase.

## 1. Technology Stack

*   **Backend:** Node.js, Fastify (web framework), Socket.IO (real-time client communication), MongoDB (database via Mongoose), Twilio SDK, ElevenLabs API (via WebSockets and Webhooks).
*   **Frontend:** Next.js (React framework), TypeScript, Socket.IO Client, Tailwind CSS.
*   **Deployment:** Railway (using Nixpacks builder).

## 2. Architecture Diagram

The system is designed around a central Node.js/Fastify backend that orchestrates communication between a Next.js frontend, external services (Twilio, ElevenLabs), and a MongoDB database. Real-time updates are crucial and handled via Socket.IO.

```mermaid
graph LR
    subgraph "User Interface"
        direction LR
        Frontend[Next.js Frontend]
    end

    subgraph "Backend Services (Railway)"
        direction TB
        Fastify[Fastify Server (server-mongodb.js)]
        subgraph "API Layer"
            direction TB
            GeneralAPI[General API (/api/...)]
            DB_API[Database API (db/api/...)]
        end
        WebSocket[Socket.IO Server (socket-server.js)]
        MediaProxy[WebSocket Proxy (/outbound-media-stream)]
        Handlers[Call/Recording Handlers]
        DB_Logic[DB Repositories/Webhook Handler]
        MemoryCache[(In-Memory Cache - activeCalls)]
    end

    subgraph "Database"
        direction TB
        MongoDB[(MongoDB)]
    end

    subgraph "External Services"
        direction TB
        Twilio[Twilio (Voice, Recordings, Webhooks, Media Streams)]
        ElevenLabs[ElevenLabs (Conversational AI, Webhooks)]
        CRM[CRM Endpoint]
    end

    %% Frontend Communication
    Frontend -- REST API Requests --> GeneralAPI
    Frontend -- REST API Requests --> DB_API
    Frontend <--> WebSocket

    %% Backend Internal Communication
    Fastify --> GeneralAPI
    Fastify --> DB_API
    Fastify --> WebSocket
    Fastify --> MediaProxy
    Fastify --> Handlers
    Fastify --> DB_Logic

    GeneralAPI -- Uses --> MemoryCache
    GeneralAPI -- Calls --> Twilio

    DB_API -- Uses --> DB_Logic

    WebSocket -- Uses --> MemoryCache
    WebSocket -- Emits Events --> Frontend

    Handlers -- Updates --> MemoryCache
    Handlers -- Calls --> Twilio
    Handlers -- Triggers --> WebSocket

    DB_Logic -- Reads/Writes --> MongoDB
    DB_Logic -- Triggers --> WebSocket

    MediaProxy -- Streams Audio --> ElevenLabs
    MediaProxy <-- Streams Audio -- ElevenLabs
    MediaProxy -- Streams Audio --> Twilio
    MediaProxy <-- Streams Audio -- Twilio

    %% External Service Communication
    Twilio -- Webhooks (Recordings, Status) --> Fastify
    Twilio -- Media Stream --> MediaProxy
    Fastify -- API Calls --> Twilio

    ElevenLabs -- Webhooks (Transcript, Completion) --> Fastify
    ElevenLabs -- WebSocket --> MediaProxy

    DB_Logic -- Forwards Data --> CRM

    %% Database Interaction
    DB_Logic -- CRUD --> MongoDB
```

## 3. Communication Flow

*   **Frontend <-> Backend (Real-time):**
    *   The frontend establishes a persistent Socket.IO connection managed by `SocketProvider` (`frontend/src/lib/socket-context.tsx`).
    *   The backend (`socket-server.js`) pushes updates (active calls, call status changes, new transcripts, campaign updates) to subscribed frontend clients based on events triggered by handlers or webhook processing. Data often originates from the in-memory `activeCalls` map or database updates.
*   **Frontend -> Backend (Requests):**
    *   The frontend uses REST API calls (likely via `frontend/src/lib/api.ts` or similar) to fetch data not pushed in real-time (e.g., historical call logs, detailed recording info from DB, call statistics) or to initiate actions (e.g., making a new call via `/api/make-call` defined in `outbound.js`).
    *   It interacts with both general API routes (`api-routes.js`) and database-specific API routes (`db/api/...`).
*   **External Services -> Backend (Webhooks):**
    *   **Twilio:** Sends webhooks for recording status updates (`/recording-status-callback`) and potentially call status changes.
    *   **ElevenLabs:** Sends webhooks for `post_call_transcription` and `conversation_completed` (`/webhooks/elevenlabs`). The `webhook-handler-db.js` processes these, updates MongoDB, and triggers Socket.IO events.
*   **Backend <-> External Services (Direct Communication):**
    *   **Twilio:** The backend uses the Twilio SDK (`twilioClient`) to make outbound calls, terminate calls, and potentially fetch call/recording details via the API.
    *   **ElevenLabs:** The backend establishes a WebSocket connection (`/outbound-media-stream`) to ElevenLabs' Conversational API to stream audio bi-directionally during a call, proxied via Twilio Media Streams.
    *   **CRM:** The backend sends processed call data (from ElevenLabs webhooks) to an external CRM endpoint.

## 4. Key Findings & Considerations

*   **Dual API Structure:** The system uses both general API routes (often interacting with in-memory state or Twilio) and database-specific API routes (for direct DB interaction).
*   **In-Memory State:** The `activeCalls` map plays a significant role in providing immediate data for API responses and Socket.IO updates. Ensuring its consistency with the database (especially on restarts or scaling) is important. The `syncActiveCallsToMongoDB` function attempts to address this on startup.
*   **Real-time Focus:** Socket.IO is central to the user experience, providing live updates for calls, transcripts, and campaigns.
*   **Media Proxy:** The `/outbound-media-stream` WebSocket route is a critical piece, directly handling the low-level audio streaming between Twilio and ElevenLabs.
*   **Modularity:** The backend logic is reasonably well-modularized into handlers, repositories, API routes, and specific integration points.
*   **Database Interaction Points:** Database writes primarily occur within webhook handlers (`webhook-handler-db.js`) and specific routes in `server-mongodb.js` (like `/recording-status-callback`). Database reads happen via the dedicated `db/api/...` routes and potentially within analytics functions.