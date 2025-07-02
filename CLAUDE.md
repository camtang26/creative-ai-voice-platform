# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an advanced Twilio-ElevenLabs integration project that enables AI-powered outbound calling. The system consists of:
- **Backend**: Node.js server with MongoDB integration (Fastify framework)
- **Frontend**: Next.js 14 dashboard with TypeScript
- **Architecture**: Dual WebSocket connections (Twilio ↔ Server ↔ ElevenLabs)

## Key Commands

### Backend Development
```bash
# Development with auto-reload
npm run dev

# Production server
npm start

# MongoDB-specific testing
npm run test-mongodb          # Basic integration test
npm run test-mongodb-all      # Run all MongoDB tests
npm run test-mongodb-e2e      # End-to-end test
npm run test-mongodb-deletion # Test cascade deletions

# Make test calls
npm run test-call             # Basic test call
npm run custom-call -- +61412345678 "Custom message"  # Note: Australian numbers default
npm run sheet-call -- SPREADSHEET_ID  # Google Sheets integration
```

### Frontend Development
```bash
cd frontend
npm run dev    # Development server on port 3000
npm run build  # Production build
npm run lint   # Run linting
```

### Environment Setup
```bash
# Required: Copy .env.example to .env and fill in credentials
cp .env.example .env

# IMPORTANT: Backend is ALWAYS run through production on Render
# DO NOT run the backend locally - Cameron uses the production backend at:
# https://twilio-elevenlabs-app.onrender.com

# For frontend development only:
cd frontend
npm run dev  # Runs on port 3000
```

## Architecture Overview

### Backend Architecture
1. **Server Entry**: `server-mongodb.js` - Main Fastify server with MongoDB integration
2. **WebSocket Handling**: Dual WebSocket pattern for Twilio ↔ ElevenLabs bridging
3. **Database Layer**: MongoDB models in `/db/models/` with repositories in `/db/repositories/`
4. **API Structure**: RESTful APIs organized by feature (`/db/api/`)
5. **Call Flow**: Twilio webhook → Server WebSocket → ElevenLabs Agent → Audio streaming

### Frontend Architecture
1. **Framework**: Next.js 14 with App Router (TypeScript)
2. **API Layer**: `frontend/src/lib/api.ts` - Centralized API client with mock data support
3. **State Management**: React hooks with real-time WebSocket updates
4. **UI Components**: Shadcn UI library in `frontend/src/components/ui/`
5. **Real-time Features**: Live call monitoring via Socket.io connection

### Key Integration Points
1. **API Base URL**: Backend runs on Render.com production server, frontend proxies via Next.js config
2. **WebSocket Endpoints**: 
   - `/outbound-media-stream` - Twilio audio streaming
   - Socket.io connection to production backend for dashboard updates
3. **MongoDB Collections**: calls, campaigns, contacts, analytics, recordings
4. **CORS Configuration**: Dynamic origin validation for production deployments
5. **Phone Validation**: Defaults to Australian (+61) for numbers without country codes
   - Numbers with + are preserved as-is
   - Numbers starting with 0 have it removed before adding +61
   - See `docs/guides/AUSTRALIAN_PHONE_VALIDATION.md` for details

## Critical Implementation Details

### Call Recording Flow
- Automatic dual-channel recording via Twilio
- Recordings stored with MongoDB metadata
- Accessible via `/api/calls/:callSid/recordings`

### Call Termination Logic
- Multiple detection methods: ElevenLabs events, transcript patterns, 60s inactivity
- Cross-module communication via shared `activeCalls` Map
- Webhook handler can trigger termination across modules

### Frontend API Patterns
- Mock data toggle: `USE_MOCK_DATA` in `frontend/src/lib/api.ts`
- Backend endpoints require `/api/db/` prefix (e.g., `/api/db/analytics/dashboard`)
- Data transformation layer handles backend/frontend format differences

### Production Deployment
- Backend: Deployed on Render.com
- Frontend: Set `NEXT_PUBLIC_API_URL` to backend URL
- CORS: Backend auto-detects common platforms (.vercel.app, .netlify.app, .onrender.com)

## Common Pitfalls

1. **CORS Issues**: Backend logs will show rejected origins - check CORS configuration in `server-mongodb.js`
2. **API Endpoint Mismatches**: Frontend expects specific endpoint names - verify in `api.ts`
3. **WebSocket Connection**: Ensure ngrok URL is updated in `.env` for local development
4. **MongoDB Connection**: Check `MONGODB_URI` in environment variables
5. **Call Not Ending**: Verify `ELEVENLABS_WEBHOOK_SECRET` is configured correctly
6. **Phone Number Format**: System defaults to Australian (+61) for numbers without country codes
7. **Twilio Balance Issues**: When Twilio runs out of balance:
   - Campaigns automatically pause to prevent infinite retry loops
   - Contacts are marked as 'failed' (NOT 'pending') to avoid repeated call attempts
   - Run `node stop-all-campaigns.js` for emergency campaign stopping
   - Campaign control buttons (start/stop/pause) now properly persist state

## Testing Strategy

- Backend: Comprehensive test suite for MongoDB operations
- Frontend: Manual testing with mock data support
- E2E: Use `test-mongodb-e2e.js` for full flow testing
- WebSocket: `test-mongodb-socketio-stress.js` for real-time features