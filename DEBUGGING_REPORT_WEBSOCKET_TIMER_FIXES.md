# Debugging Report: Resolving WebSocket and Call Termination Issues (Mar 30, 2025)

## Introduction

This document summarizes a debugging session focused on resolving critical issues preventing successful outbound calls using the Twilio/ElevenLabs integration. The primary problems were:

1.  **Agent Silence:** The ElevenLabs agent connected via WebSocket stream would not speak, despite the call connecting.
2.  **Premature Call Hangup:** Calls consistently terminated around the 60-65 second mark, even during active conversation.

## Issue 1: Agent Silence / Twilio Error 31951 (Invalid WebSocket Message)

### Symptoms

*   Outbound calls connected, but the user heard silence instead of the ElevenLabs agent's voice.
*   Twilio call logs consistently showed **Warning 31951: Stream - Protocol - Invalid message**, indicating Twilio received a malformed message over the WebSocket media stream (`wss://.../outbound-media-stream`).

### Investigation & Solution

1.  **WebSocket Handler:** The primary focus was the manual WebSocket upgrade handler in `server-mongodb.js`, responsible for proxying audio between Twilio (`<Stream>`) and the ElevenLabs ConvAI WebSocket API.
2.  **Payload Encoding:** We reviewed the data flow: ElevenLabs sends Base64 encoded audio chunks (`audio_event.audio_base_64`). Twilio's `<Stream>` expects Base64 encoded audio in the `media.payload` field of outgoing `media` events.
3.  **Root Cause Identified:** The code in `server-mongodb.js` was incorrectly **re-encoding** the already Base64 encoded audio received from ElevenLabs before sending it to Twilio. This double encoding resulted in an invalid payload format, triggering Twilio's 31951 error.
4.  **Fix Applied (Commit `32b3ebd`):** Removed the redundant `Buffer.from(...).toString('base64')` logic. The `audio_event.audio_base_64` payload from ElevenLabs is now sent directly within the `media.payload` to Twilio.
5.  **Logging Enhanced (Commit `f8ee085`):** Added detailed debug logging to show the exact JSON structure of `media` and `clear` messages being sent to Twilio's WebSocket, aiding further diagnosis if the 31951 error persisted.

### Outcome

*   Removing the double encoding immediately allowed the agent's audio to be streamed correctly to the user.
*   The 31951 error seemed to resolve implicitly after fixing the encoding and later the timer issues, suggesting it was primarily caused by the encoding or potentially exacerbated by abrupt connection closures due to the timer bug.

## Issue 2: Premature Call Hangup (~60 seconds)

### Symptoms

*   Despite fixing the audio streaming, calls consistently terminated around 60-65 seconds.
*   This happened even if the user or agent was actively speaking.

### Investigation & Solution

1.  **Initial Focus (WS Timer):** We initially suspected the inactivity timer within the WebSocket handler (`server-mongodb.js`). This timer was intended to terminate calls if no WebSocket activity was detected.
2.  **Debugging WS Timer:**
    *   Increased the timeout significantly (to 5 minutes) for testing (Commit `a83a0a7`).
    *   Enabled `debug` level logging for Fastify to see detailed timer logs (Commit `a83a0a7`).
    *   Added specific logs to track timer setting, clearing, and callback execution (Commits `ca8f9f8`, `86f9499`).
3.  **Timer Paradox:** Logs showed the `updateActivity()` function (triggered by WS messages) was being called frequently, and the code *appeared* to be resetting the timer (`clearTimeout` followed by `setTimeout`). However, the call still terminated around the original ~60s mark.
4.  **Hypothesis: `clearTimeout` Unreliable:** We suspected `clearTimeout` might not be functioning reliably in the Render environment, allowing old timer callbacks to execute despite resets.
5.  **Refactored Timer Logic (Flag-Based):** Implemented a flag (`isTimerActive`) to control timer execution instead of relying solely on `clearTimeout`. `updateActivity` sets the flag to `false`, and the timer callback checks the flag before terminating (Commit `86f9499`).
6.  **Persistent Termination & **Key Insight (Big Picture):**** Even with the flag-based timer seemingly working (logs showed activity resets), the call *still* terminated around 60s. Crucially, the termination log message (`[Call Control] Call ... inactive for ... seconds, terminating`) was traced back to **`enhanced-call-handler.js`**, not the WebSocket timer logic in `server-mongodb.js`. This revealed a **second, conflicting inactivity timer** was running.
7.  **Conflicting Timer Analysis:** The timer in `enhanced-call-handler.js` (`checkAndTerminateInactiveCalls`) monitored the `activeCalls` map using a separate `callActivityTimestamps` map. This timestamp map was *not* being updated by the real-time WebSocket activity, causing this timer to fire incorrectly after 60 seconds of perceived inactivity.
8.  **Final Fix (Commit `6e472ba`):**
    *   Disabled the conflicting inactivity check within `checkAndTerminateInactiveCalls` in `enhanced-call-handler.js` by commenting out the relevant block.
    *   Reverted the primary WebSocket timer timeout in `server-mongodb.js` back to 60 seconds (using the reliable flag-based logic).

### Outcome

*   Disabling the conflicting timer in `enhanced-call-handler.js` resolved the premature hangup issue. Calls now proceed for their full duration, governed only by the (now correctly functioning) flag-based timer in the WebSocket handler or natural conversation completion/manual hangup.

## Other Issues Addressed

*   **Mongoose Validation Errors:** Added missing `eventType` enum values (`user_transcript`, `agent_response_correction`) to `db/models/callEvent.model.js` to fix database logging errors (Commits `3ac044a`, `f6cd276`).
*   **Logging Visibility:** Explicitly set Fastify logger level to `debug` in `server-mongodb.js` to ensure necessary diagnostic logs were visible (Commit `a83a0a7`).

## Conclusion

The primary issues stemmed from incorrect WebSocket message formatting (double Base64 encoding) and conflicting inactivity timer logic across different application modules. Resolving these required careful debugging of the WebSocket data flow and recognizing the need to look beyond the immediate area of focus (`server-mongodb.js`) to identify the interfering timer in `enhanced-call-handler.js`. This highlights the importance of a holistic view when debugging complex, interacting systems.