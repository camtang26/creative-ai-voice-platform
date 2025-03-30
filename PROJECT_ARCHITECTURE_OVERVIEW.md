# Project Architecture Overview

This document outlines the architecture of the ElevenLabs/Twilio outbound calling application based on an analysis of the codebase.

## 1. Technology Stack

*   **Backend:** Node.js, Fastify (web framework), Socket.IO (real-time client communication), MongoDB (database via Mongoose), Twilio SDK, ElevenLabs API (via WebSockets and Webhooks).
*   **Frontend:** Next.js (React framework), TypeScript, Socket.IO Client, Tailwind CSS.
*   **Deployment:** Railway (using Nixpacks builder).

## 2. Architecture Diagram

The system is deployed on Railway as two distinct backend services:
1.  **Main App Service:** A Node.js/Fastify application (`server-mongodb.js`) handling API requests, Socket.IO connections, database interactions, and webhook processing.
2.  **Media Proxy Service:** A dedicated Node.js application (`media-proxy-server.js`) handling the real-time audio streaming WebSocket connection between Twilio Media Streams and the ElevenLabs Conversational API.

This separation isolates the high-throughput media streaming from the main application logic.

```mermaid
graph LR
    subgraph "User Interface"
        direction LR
        Frontend[Next.js Frontend]
    end

    subgraph "Backend Services (Railway)"
        direction TB
        subgraph "Main App Service (server-mongodb.js)"
            id1[ ] %% Dummy node for spacing
            subgraph "API Layer"
                direction TB
                GeneralAPI[General API (/api/...)]
                DB_API[Database API (db/api/...)]
            end
            WebSocket[Socket.IO Server (socket-server.js)]
            Handlers[Call/Recording Handlers]
            DB_Logic[DB Repositories/Webhook Handler]
            MemoryCache[(In-Memory Cache - activeCalls)]
        end
        subgraph "Media Proxy Service (media-proxy-server.js)"
            id2[ ] %% Dummy node for spacing
            MediaProxy[WebSocket Proxy (/outbound-media-stream)]
        end
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
    GeneralAPI -- Uses --> DB_Logic

    DB_API -- Uses --> DB_Logic

    WebSocket -- Uses --> MemoryCache
    WebSocket -- Emits Events --> Frontend

    Handlers -- Updates --> MemoryCache
    Handlers -- Calls --> Twilio
    Handlers -- Triggers --> WebSocket

    DB_Logic -- Reads/Writes --> MongoDB
    DB_Logic -- Triggers --> WebSocket

    %% Media Proxy Service Communication
    MediaProxy -- Streams Audio --> ElevenLabs
    MediaProxy <-- Streams Audio -- ElevenLabs
    MediaProxy -- Streams Audio --> Twilio
    MediaProxy <-- Streams Audio -- Twilio

    %% External Service Communication
    Twilio -- Webhooks (Recordings, Status) --> GeneralAPI %% Webhooks hit the main app
    Twilio -- Media Stream --> MediaProxy %% Media stream connects to the proxy service
    GeneralAPI -- API Calls --> Twilio %% API calls originate from the main app

    ElevenLabs -- Webhooks (Transcript, Completion) --> GeneralAPI %% Webhooks hit the main app
    ElevenLabs -- WebSocket --> MediaProxy %% WebSocket connects to the proxy service

    DB_Logic -- Forwards Data --> CRM

    %% Database Interaction
    DB_Logic -- CRUD --> MongoDB

    %% Inter-Service Communication (Implicit via Twilio TwiML)
    %% GeneralAPI -- Generates TwiML pointing to --> MediaProxy
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
    *   **ElevenLabs:** The dedicated **Media Proxy Service** establishes a WebSocket connection to ElevenLabs' Conversational API to stream audio bi-directionally during a call, proxied via Twilio Media Streams. The **Main App Service** initiates the call via Twilio, providing TwiML that directs Twilio's Media Stream to the Media Proxy Service.
    *   **CRM:** The **Main App Service** sends processed call data (from ElevenLabs webhooks) to an external CRM endpoint.

## 4. Key Findings & Considerations

*   **Service Separation:** The architecture now consists of two distinct Railway services: `main-app` (API, DB, Socket.IO, Webhooks) and `media-proxy` (Twilio/ElevenLabs audio streaming). This isolates concerns and potentially improves stability.
*   **Dual API Structure:** The `main-app` service uses both general API routes (often interacting with in-memory state or Twilio) and database-specific API routes (for direct DB interaction).
*   **In-Memory State:** The `activeCalls` map within the `main-app` service remains important for immediate data. Consistency with the database is crucial.
*   **Real-time Focus:** Socket.IO (handled by `main-app`) is central to the user experience.
*   **Media Proxy Responsibility:** The `media-proxy` service is solely responsible for the low-level audio streaming WebSocket connection. It receives context (like prompt, name) via TwiML parameters generated by the `main-app`.
*   **Inter-Service Dependency:** The `main-app` depends on the `media-proxy` service being available at the URL specified in the `MEDIA_PROXY_URL` environment variable to generate the correct TwiML for outbound calls.
*   **Modularity:** The separation enhances modularity, though introduces the need to manage two services.
*   **Database Interaction Points:** Database interactions remain within the `main-app` service, primarily in webhook handlers and API routes.