# Areas Needing Attention - Post Dashboard Fix

## 1. 🔴 **Critical: Missing Socket.IO Events in WebSocket Handler**

The WebSocket handler (`/outbound-media-stream` in `server-mongodb.js`) doesn't emit ANY Socket.IO events during active conversations:

**Missing Events:**
- When ElevenLabs connection is established
- When conversation starts
- Real-time transcript messages
- When conversation ends
- Conversation metadata (conversation_id)

**Impact:** Frontend can't show live transcripts or conversation progress

**Fix Required:** Add Socket.IO emissions in the WebSocket handler

## 2. 🟡 **Uncommitted Frontend Changes**

Two components have uncommitted changes that look like incomplete fixes:
- `frontend/src/components/agent-performance-table.tsx` - Has array validation logic
- `frontend/src/components/conversation-quality-chart.tsx` - Switched to different API endpoint

**Action:** Review and either complete or revert these changes

## 3. 🟡 **Test File Accumulation**

We have 18+ test files in the root directory. Recent ones:
- `test-dashboard-api.js`
- `test-socket-client.js`  
- `test-socket-updates.js`

**Action:** Move to a `/tests` directory or add to `.gitignore`

## 4. 🟡 **Frontend/Backend Data Format Mismatches**

Dashboard fix revealed a pattern. Other potential mismatches:
- Campaign endpoints
- Analytics endpoints
- Call detail endpoints

**Action:** Audit all API endpoints for data format consistency

## 5. 🟢 **Working Well**

These are properly emitting Socket.IO events:
- New call creation ✅
- Call status changes via webhooks ✅
- AMD (machine detection) results ✅
- Call quality metrics ✅

## Priority Recommendations

1. **Immediate:** Fix WebSocket handler to emit Socket.IO events for real-time transcripts
2. **Soon:** Review and commit/revert the uncommitted frontend changes
3. **Cleanup:** Organize test files
4. **Long-term:** Create API response transformation layer for consistency