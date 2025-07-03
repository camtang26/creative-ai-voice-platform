/**
 * Call Termination Tracker
 * Enhanced tracking of who terminated the call and why
 */

// Map to store termination reasons for each call
const callTerminationReasons = new Map();

/**
 * Track a termination event
 * @param {string} callSid - The call SID
 * @param {string} source - Source of termination (elevenlabs, twilio, api, system, timeout, etc.)
 * @param {string} reason - Specific reason for termination
 * @param {Object} metadata - Additional metadata about the termination
 */
export function trackTermination(callSid, source, reason, metadata = {}) {
  if (!callSid) return;
  
  const terminationInfo = {
    source,
    reason,
    timestamp: new Date(),
    metadata,
    // Determine who likely hung up based on source and reason
    terminatedBy: determineTerminatedBy(source, reason, metadata)
  };
  
  // Store termination info
  callTerminationReasons.set(callSid, terminationInfo);
  
  console.log(`[Termination Tracker] Call ${callSid} terminated by: ${terminationInfo.terminatedBy}, source: ${source}, reason: ${reason}`);
  
  return terminationInfo;
}

/**
 * Determine who terminated the call based on available information
 * @param {string} source - Source of termination
 * @param {string} reason - Specific reason
 * @param {Object} metadata - Additional metadata
 * @returns {string} Who terminated the call
 */
function determineTerminatedBy(source, reason, metadata) {
  // ElevenLabs conversation completed normally - likely agent finished
  if (source === 'elevenlabs' && reason === 'conversation_completed') {
    return 'agent';
  }
  
  // User hung up during conversation
  if (source === 'elevenlabs' && reason === 'user_hangup') {
    return 'user';
  }
  
  // Twilio stream ended unexpectedly
  if (source === 'twilio' && reason === 'stream_stop') {
    // Check if conversation was still active
    if (metadata.conversationActive) {
      return 'user'; // User likely hung up
    }
    return 'system'; // System issue
  }
  
  // API request to terminate
  if (source === 'api') {
    return 'api_request';
  }
  
  // Machine detection
  if (source === 'amd' || reason.includes('machine_detected')) {
    return 'amd_machine';
  }
  
  // Timeout scenarios
  if (reason === 'inactivity' || reason === 'duration-limit') {
    return 'system_timeout';
  }
  
  // WebSocket disconnection
  if (source === 'websocket' && reason === 'twilio_disconnected') {
    return 'user'; // User likely hung up
  }
  
  if (source === 'websocket' && reason === 'elevenlabs_disconnected') {
    return 'agent'; // Agent side disconnection
  }
  
  // Call status changes from Twilio
  if (source === 'twilio_status') {
    switch (reason) {
      case 'completed':
        // Check metadata for more clues
        if (metadata.duration && metadata.duration < 5) {
          return 'user'; // Very short call, user likely hung up immediately
        }
        if (metadata.hasTranscript) {
          return 'normal_completion'; // Normal conversation end
        }
        return 'unknown';
      case 'busy':
        return 'user_busy';
      case 'no-answer':
        return 'user_no_answer';
      case 'failed':
        return 'system_error';
      case 'canceled':
        return 'system_canceled';
    }
  }
  
  // Default cases
  if (reason === 'normal' || reason === 'completed') {
    return 'normal_completion';
  }
  
  return 'unknown';
}

/**
 * Get termination info for a call
 * @param {string} callSid - The call SID
 * @returns {Object|null} Termination info or null if not found
 */
export function getTerminationInfo(callSid) {
  return callTerminationReasons.get(callSid) || null;
}

/**
 * Clear termination info for a call
 * @param {string} callSid - The call SID
 */
export function clearTerminationInfo(callSid) {
  callTerminationReasons.delete(callSid);
}

/**
 * Get termination statistics
 * @returns {Object} Statistics about terminations
 */
export function getTerminationStats() {
  const stats = {
    total: 0,
    byTerminator: {},
    bySource: {},
    byReason: {}
  };
  
  for (const [callSid, info] of callTerminationReasons.entries()) {
    stats.total++;
    
    // Count by who terminated
    stats.byTerminator[info.terminatedBy] = (stats.byTerminator[info.terminatedBy] || 0) + 1;
    
    // Count by source
    stats.bySource[info.source] = (stats.bySource[info.source] || 0) + 1;
    
    // Count by reason
    stats.byReason[info.reason] = (stats.byReason[info.reason] || 0) + 1;
  }
  
  return stats;
}

/**
 * Clean up old termination records
 * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns {number} Number of records cleaned
 */
export function cleanupOldRecords(maxAge = 60 * 60 * 1000) {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [callSid, info] of callTerminationReasons.entries()) {
    const age = now - info.timestamp.getTime();
    if (age > maxAge) {
      callTerminationReasons.delete(callSid);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Termination Tracker] Cleaned ${cleaned} old termination records`);
  }
  
  return cleaned;
}

// Set up periodic cleanup every 30 minutes
setInterval(() => {
  cleanupOldRecords();
}, 30 * 60 * 1000);

export default {
  trackTermination,
  getTerminationInfo,
  clearTerminationInfo,
  getTerminationStats,
  cleanupOldRecords
};