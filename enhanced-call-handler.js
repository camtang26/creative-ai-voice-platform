/**
 * Enhanced Call Handler for Twilio Integration
 * Provides improved call handling, recording management, and automatic termination
 */
import Twilio from 'twilio';
import { ApiError } from './api-utils.js';
import { handleCallStatusChange } from './socket-server.js';

// Reference to the active calls map
let activeCalls = null;
let twilioClient = null;

// Set active calls reference
export function setActiveCallsReference(callsMap) {
  activeCalls = callsMap;
}

// Set Twilio client reference
export function setTwilioClientReference(client) {
  twilioClient = client;
}

// Store call activity timestamps for inactivity detection
const callActivityTimestamps = new Map();

/**
 * Terminate a call via Twilio API
 * @param {string} callSid - The Call SID to terminate
 * @param {Object} options - Options for call termination
 * @param {boolean} options.force - Force termination even if call is not active
 * @param {string} options.reason - Reason for termination
 * @returns {Promise<Object>} Result object with status and details
 * @throws {ApiError} If call cannot be terminated
 */
export async function terminateCall(callSid, options = {}) {
  const { force = false, reason = 'system' } = options;

  // Validate inputs
  if (!callSid || typeof callSid !== 'string') {
    throw ApiError.badRequest(
      'Invalid call SID',
      'INVALID_CALL_SID',
      { providedSid: callSid }
    );
  }

  // Check if we have Twilio client
  if (!twilioClient) {
    throw ApiError.serviceUnavailable(
      'No Twilio client available for terminating call',
      'TWILIO_CLIENT_UNAVAILABLE'
    );
  }

  try {
    // Check if call exists in our tracking
    const callExists = activeCalls && activeCalls.has(callSid);
    
    if (!callExists && !force) {
      throw ApiError.notFound(
        `Call ${callSid} not found in active calls`,
        'CALL_NOT_FOUND',
        { callSid }
      );
    }

    // Check if call is active (unless force is true)
    if (callExists && !force) {
      const callInfo = activeCalls.get(callSid);
      const isActive = ['initiated', 'ringing', 'in-progress'].includes(callInfo.status);
      
      if (!isActive) {
        throw ApiError.badRequest(
          `Call ${callSid} is not active (status: ${callInfo.status})`,
          'CALL_NOT_ACTIVE',
          { callSid, status: callInfo.status }
        );
      }
    }

    console.log(`[Call Control] Terminating call ${callSid} via Twilio API, reason: ${reason}`);
    
    // Try to terminate via Twilio API
    await twilioClient.calls(callSid).update({ status: 'completed' });
    
    console.log(`[Call Control] Successfully terminated call ${callSid}`);
    
    // Update call status in our tracking
    if (callExists) {
      const callInfo = activeCalls.get(callSid);
      callInfo.status = 'completed';
      callInfo.endTime = new Date();
      callInfo.terminatedBy = reason;
      activeCalls.set(callSid, callInfo);
      
      // Emit socket event
      handleCallStatusChange(callSid, 'completed', callInfo);
    }
    
    return {
      success: true,
      callSid,
      status: 'completed',
      timestamp: new Date().toISOString(),
      reason
    };
  } catch (error) {
    // Check if this is already an ApiError
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Check if this is a Twilio API error
    if (error.status === 404 || error.code === 20404) {
      throw ApiError.notFound(
        `Call ${callSid} not found on Twilio`,
        'TWILIO_CALL_NOT_FOUND',
        { callSid, twilioCode: error.code }
      );
    }
    
    console.error(`[Call Control] Error terminating call ${callSid}:`, error);
    
    throw ApiError.serviceUnavailable(
      `Error terminating call: ${error.message}`,
      'TERMINATION_ERROR',
      { callSid, twilioCode: error.code, twilioMessage: error.message }
    );
  }
}

/**
 * Update call activity timestamp
 * @param {string} callSid - The Call SID
 */
export function updateCallActivity(callSid) {
  callActivityTimestamps.set(callSid, Date.now());
}

/**
 * Check all active calls for inactivity or exceeded duration
 * and terminate if necessary
 */
export function checkAndTerminateInactiveCalls() {
  if (!activeCalls) return;
  
  const now = Date.now();
  const MAX_INACTIVITY_MS = 60000; // 60 seconds of inactivity
  const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes maximum call duration
  
  for (const [callSid, callInfo] of activeCalls.entries()) {
    // Only check in-progress calls
    if (['in-progress', 'ringing'].includes(callInfo.status)) {
      /* // DISABLED: Inactivity check - This is now handled within the WebSocket handler in server-mongodb.js
      const lastActivity = callActivityTimestamps.get(callSid) || 0;
      if (lastActivity > 0 && now - lastActivity > MAX_INACTIVITY_MS) {
        console.log(`[Call Control] Call ${callSid} inactive for ${(now - lastActivity)/1000} seconds, terminating (DISABLED)`);
        // terminateCall(callSid, { reason: 'inactivity' }).catch(err => {
        //   console.error(`[Call Control] Error auto-terminating inactive call ${callSid}:`, err);
        // });
        // continue;
      }
      */
      
      // Check for maximum duration (Keep this as a safety net)
      if (callInfo.startTime) {
        const callDuration = now - new Date(callInfo.startTime).getTime();
        if (callDuration > MAX_DURATION_MS) {
          console.log(`[Call Control] Call ${callSid} exceeded maximum duration (${callDuration/1000} seconds), terminating`);
          terminateCall(callSid, { reason: 'duration-limit' }).catch(err => {
            console.error(`[Call Control] Error auto-terminating call ${callSid} that exceeded duration limit:`, err);
          });
          continue;
        }
      }
    }
  }
}

/**
 * Process call recording data
 * @param {Object} recordingData - Twilio recording data
 */
export function processRecording(recordingData) {
  const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, 
          RecordingDuration, RecordingChannels, RecordingSource } = recordingData;
  
  if (!activeCalls || !CallSid) return;
  
  // Get or create call info
  let callInfo = activeCalls.has(CallSid) 
    ? activeCalls.get(CallSid) 
    : { 
        sid: CallSid, 
        recordings: [],
        recordingMetadata: {}
      };
  
  // Update recording metadata
  callInfo.recordingMetadata = {
    ...callInfo.recordingMetadata,
    lastStatus: RecordingStatus,
    channels: RecordingChannels,
    source: RecordingSource,
    lastUpdated: new Date().toISOString()
  };
  
  // Handle different recording statuses
  if (RecordingStatus === 'completed' && RecordingUrl && RecordingSid) {
    // Add the completed recording to the call info
    const recordingInfo = {
      sid: RecordingSid,
      url: RecordingUrl,
      duration: RecordingDuration,
      channels: RecordingChannels,
      source: RecordingSource,
      status: RecordingStatus,
      timestamp: new Date().toISOString()
    };
    
    // Create alternate format URLs
    const baseUrl = RecordingUrl.split('.')[0]; // Remove extension
    recordingInfo.mp3Url = `${baseUrl}.mp3`;
    recordingInfo.wavUrl = `${baseUrl}.wav`;
    
    // Add the recording
    if (!callInfo.recordings) {
      callInfo.recordings = [];
    }
    
    // Check if recording already exists
    const existingIndex = callInfo.recordings.findIndex(r => r.sid === RecordingSid);
    if (existingIndex >= 0) {
      // Update existing recording
      callInfo.recordings[existingIndex] = {
        ...callInfo.recordings[existingIndex],
        ...recordingInfo
      };
    } else {
      // Add new recording
      callInfo.recordings.push(recordingInfo);
    }
    
    console.log(`[Recording] Completed recording for call ${CallSid}: ${RecordingSid}`);
  } 
  else if (RecordingStatus === 'in-progress') {
    console.log(`[Recording] Recording in progress for call ${CallSid}`);
    callInfo.isRecording = true;
  }
  
  // Update call info in the map
  activeCalls.set(CallSid, callInfo);
}

/**
 * Process machine detection results
 * @param {Object} amdData - Twilio Answering Machine Detection data
 */
export function processMachineDetection(amdData) {
  const { CallSid, AnsweredBy, MachineBehavior } = amdData;
  
  if (!activeCalls || !CallSid) return;
  
  // Get call info
  let callInfo = activeCalls.has(CallSid) 
    ? activeCalls.get(CallSid) 
    : {
        sid: CallSid,
        status: 'in-progress',
        startTime: new Date().toISOString()
      };
  
  // Update call info with machine detection results
  callInfo.answeredBy = AnsweredBy;
  callInfo.machineBehavior = MachineBehavior;
  
  console.log(`[Machine Detection] Call ${CallSid} answered by: ${AnsweredBy}`);
  
  // Update call info in the map
  activeCalls.set(CallSid, callInfo);
  
  // Emit socket update
  handleCallStatusChange(CallSid, callInfo.status, {
    ...callInfo,
    answeredBy: AnsweredBy,
    machineBehavior: MachineBehavior
  });
}

// Set up heartbeat for monitoring calls
let heartbeatInterval = null;

/**
 * Start the call monitoring heartbeat
 * @param {number} intervalMs - Interval between checks in milliseconds
 */
export function startCallMonitoringHeartbeat(intervalMs = 5000) {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Set new interval
  heartbeatInterval = setInterval(() => {
    checkAndTerminateInactiveCalls();
  }, intervalMs);
  
  console.log(`[Call Control] Started call monitoring heartbeat (${intervalMs}ms interval)`);
  
  return heartbeatInterval;
}

/**
 * Stop the call monitoring heartbeat
 */
export function stopCallMonitoringHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Call Control] Stopped call monitoring heartbeat');
  }
}

export default {
  setActiveCallsReference,
  setTwilioClientReference,
  terminateCall,
  updateCallActivity,
  processRecording,
  processMachineDetection,
  startCallMonitoringHeartbeat,
  stopCallMonitoringHeartbeat
};
