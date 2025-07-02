/**
 * Global WebSocket Registry
 * Manages WebSocket connections for calls to enable cross-module communication
 */

// Map of callSid -> { twilioWs, elevenLabsWs, created, lastActivity }
const activeWebSockets = new Map();

/**
 * Register WebSocket connections for a call
 * @param {string} callSid - The call SID
 * @param {Object} connections - WebSocket connections
 * @param {WebSocket} connections.twilioWs - Twilio WebSocket
 * @param {WebSocket} connections.elevenLabsWs - ElevenLabs WebSocket
 */
export function registerWebSockets(callSid, connections) {
  if (!callSid) {
    console.error('[WebSocket Registry] Cannot register without callSid');
    return;
  }
  
  const entry = {
    ...connections,
    created: new Date(),
    lastActivity: new Date()
  };
  
  activeWebSockets.set(callSid, entry);
  console.log(`[WebSocket Registry] Registered WebSockets for call ${callSid}`);
}

/**
 * Get WebSocket connections for a call
 * @param {string} callSid - The call SID
 * @returns {Object|null} WebSocket connections or null if not found
 */
export function getWebSockets(callSid) {
  return activeWebSockets.get(callSid) || null;
}

/**
 * Update last activity timestamp for a call
 * @param {string} callSid - The call SID
 */
export function updateActivity(callSid) {
  const entry = activeWebSockets.get(callSid);
  if (entry) {
    entry.lastActivity = new Date();
  }
}

/**
 * Close and remove WebSocket connections for a call
 * @param {string} callSid - The call SID
 * @param {string} reason - Reason for closing
 */
export function closeWebSockets(callSid, reason = 'normal') {
  const entry = activeWebSockets.get(callSid);
  
  if (!entry) {
    console.log(`[WebSocket Registry] No WebSockets found for call ${callSid}`);
    return;
  }
  
  console.log(`[WebSocket Registry] Closing WebSockets for call ${callSid}, reason: ${reason}`);
  
  // Close ElevenLabs WebSocket first
  if (entry.elevenLabsWs) {
    try {
      if (entry.elevenLabsWs.readyState === 1) { // OPEN
        // Send termination message before closing
        entry.elevenLabsWs.send(JSON.stringify({
          type: 'conversation_termination',
          reason: reason
        }));
        entry.elevenLabsWs.close(1000, reason);
      }
    } catch (error) {
      console.error(`[WebSocket Registry] Error closing ElevenLabs WebSocket:`, error);
    }
  }
  
  // Close Twilio WebSocket
  if (entry.twilioWs) {
    try {
      if (entry.twilioWs.readyState === 1) { // OPEN
        entry.twilioWs.close(1000, reason);
      }
    } catch (error) {
      console.error(`[WebSocket Registry] Error closing Twilio WebSocket:`, error);
    }
  }
  
  // Remove from registry
  activeWebSockets.delete(callSid);
  console.log(`[WebSocket Registry] Removed WebSockets for call ${callSid}`);
}

/**
 * Close ElevenLabs WebSocket only (for AMD handling)
 * @param {string} callSid - The call SID
 * @param {string} reason - Reason for closing
 */
export function closeElevenLabsWebSocket(callSid, reason = 'machine_detected') {
  const entry = activeWebSockets.get(callSid);
  
  if (!entry || !entry.elevenLabsWs) {
    console.log(`[WebSocket Registry] No ElevenLabs WebSocket found for call ${callSid}`);
    return false;
  }
  
  console.log(`[WebSocket Registry] Closing ElevenLabs WebSocket for call ${callSid}, reason: ${reason}`);
  
  try {
    if (entry.elevenLabsWs.readyState === 1) { // OPEN
      // Send termination message
      entry.elevenLabsWs.send(JSON.stringify({
        type: 'conversation_termination',
        reason: reason,
        message: 'Call terminated due to answering machine detection'
      }));
      
      // Close the connection
      entry.elevenLabsWs.close(1000, reason);
      
      // Clear the reference but keep the entry for Twilio cleanup
      entry.elevenLabsWs = null;
      
      return true;
    }
  } catch (error) {
    console.error(`[WebSocket Registry] Error closing ElevenLabs WebSocket:`, error);
  }
  
  return false;
}

/**
 * Get all active WebSocket connections
 * @returns {Array} Array of { callSid, created, lastActivity }
 */
export function getAllActiveConnections() {
  const connections = [];
  
  for (const [callSid, entry] of activeWebSockets.entries()) {
    connections.push({
      callSid,
      created: entry.created,
      lastActivity: entry.lastActivity,
      hasElevenLabs: !!entry.elevenLabsWs,
      hasTwilio: !!entry.twilioWs
    });
  }
  
  return connections;
}

/**
 * Clean up stale WebSocket connections
 * @param {number} maxAge - Maximum age in milliseconds (default: 15 minutes)
 * @returns {number} Number of connections cleaned
 */
export function cleanupStaleConnections(maxAge = 15 * 60 * 1000) {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [callSid, entry] of activeWebSockets.entries()) {
    const age = now - entry.created.getTime();
    
    if (age > maxAge) {
      console.log(`[WebSocket Registry] Cleaning up stale connection for call ${callSid} (age: ${Math.round(age/1000)}s)`);
      closeWebSockets(callSid, 'stale_connection');
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[WebSocket Registry] Cleaned ${cleaned} stale connections`);
  }
  
  return cleaned;
}

// Set up periodic cleanup every 5 minutes
setInterval(() => {
  cleanupStaleConnections();
}, 5 * 60 * 1000);

export default {
  registerWebSockets,
  getWebSockets,
  updateActivity,
  closeWebSockets,
  closeElevenLabsWebSocket,
  getAllActiveConnections,
  cleanupStaleConnections
};