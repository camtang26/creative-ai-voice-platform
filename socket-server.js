/**
 * Enhanced Socket.IO Server Implementation
 * Provides real-time call updates, status tracking, and transcript updates
 */
// Import Server type for type hints, but we won't create a new instance here
import { Server } from 'socket.io'; 

// Global reference to Socket.IO server (will be assigned from Fastify)
export let io = null; 

// Reference to the active calls map
let activeCalls = null;

// Reference to campaigns for real-time monitoring
let activeCampaigns = new Map();

/**
 * Initialize Socket.IO server logic using the instance attached by fastify-socket.io
 * @param {FastifyInstance} server - The Fastify server instance (decorated with server.io)
 * @param {Map} activeCallsMap - Reference to the active calls map
 * @returns {Server} The Socket.IO server instance from the plugin
 */
export function initializeSocketServer(server, activeCallsMap) {
  // Set active calls reference
  activeCalls = activeCallsMap;

  // Check if Socket.IO is already initialized via the plugin
  if (io) {
      console.log('[Socket.IO] Socket.IO server logic already initialized.');
      return io;
  }
  
  // Access the io instance decorated onto the Fastify server by the plugin
  if (!server.io) {
      console.error('[Socket.IO] fastify-socket.io plugin did not decorate server.io. Initialization failed.');
      throw new Error('Socket.IO instance not found on Fastify server.');
  }
  
  io = server.io; // Use the instance from the plugin
  console.log('[Socket.IO] Using Socket.IO instance from fastify-socket.io plugin.');

  // Connection event handler (attach directly to the plugin's io instance)
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Track connection status
    let isReconnection = socket.handshake.query.reconnect === 'true';
    if (isReconnection) {
      console.log(`[Socket.IO] Client ${socket.id} reconnected`);
    }

    // Send initial active calls data to the newly connected client
    const activeCallsData = getActiveCallsData();
    socket.emit('active_calls', activeCallsData);

    // Handle client subscription to call updates
    socket.on('subscribe_to_calls', () => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to call updates`);
      socket.join('call-updates');
      // Send initial active calls data after subscription
      socket.emit('active_calls', getActiveCallsData());
    });

    // Handle client subscription to specific call
    socket.on('subscribe_to_call', (callSid) => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to call ${callSid}`);
      socket.join(`call-${callSid}`);
      // Send initial call data if available
      if (activeCalls && activeCalls.has(callSid)) {
        const callData = activeCalls.get(callSid);
        socket.emit('call_data', {
          callSid,
          data: callData,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle client subscription to transcript updates
    socket.on('subscribe_to_transcripts', () => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to transcript updates`);
      socket.join('transcript-updates');
    });

    // Handle client subscription to specific call's transcript
    socket.on('subscribe_to_call_transcript', (callSid) => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to transcript for call ${callSid}`);
      socket.join(`transcript-${callSid}`);
    });

    // Handle client subscription to campaign updates
    socket.on('subscribe_to_campaigns', () => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to campaign updates`);
      socket.join('campaign-updates');
      // Send initial active campaigns data
      socket.emit('active_campaigns', getActiveCampaignsData());
    });

    // Handle client subscription to specific campaign
    socket.on('subscribe_to_campaign', (campaignId) => {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to campaign ${campaignId}`);
      socket.join(`campaign-${campaignId}`);

      // Send initial campaign data if available
      if (activeCampaigns.has(campaignId)) {
        const campaignData = activeCampaigns.get(campaignId);
        socket.emit('campaign_data', {
          campaignId,
          data: campaignData,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Enhanced reconnection event handlers
    socket.on('reconnect', (attempt) => {
      console.log(`[Socket.IO] Client ${socket.id} reconnected after ${attempt} attempts`);
      // Re-emit active calls data after reconnection
      socket.emit('active_calls', getActiveCallsData());
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket.IO] Client ${socket.id} reconnection attempt ${attempt}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error(`[Socket.IO] Client ${socket.id} reconnection error:`, error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error(`[Socket.IO] Client ${socket.id} failed to reconnect after all attempts`);
    });

    // Disconnect event handler
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        console.log(`[Socket.IO] Server disconnected client ${socket.id}, attempting reconnect`);
        socket.connect();
      }
    });

    // Error event handler
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Client ${socket.id} error:`, error.message);
    });
  });

  console.log('[Socket.IO] Attached event listeners to Socket.IO server instance');

  return io;
}

/**
 * Set the reference to the active calls map
 * @param {Map} callsMap - The active calls map
 */
export function setActiveCallsReference(callsMap) {
  activeCalls = callsMap;
}

/**
 * Get formatted active calls data
 * @returns {Array} Array of active call objects
 */
function getActiveCallsData() {
  if (!activeCalls) return [];

  return Array.from(activeCalls.entries())
    .filter(([_, call]) => ['initiated', 'ringing', 'in-progress'].includes(call.status))
    .map(([sid, call]) => ({
      sid,
      status: call.status,
      to: call.to,
      from: call.from,
      startTime: call.startTime,
      duration: call.duration || 0,
      answeredBy: call.answeredBy || 'unknown',
      recordingCount: call.recordings ? call.recordings.length : 0
    }));
}

/**
 * Emit a call update event to all connected clients
 * @param {string} callSid - Call SID
 * @param {string} eventType - Event type (new_call, status_update, call_ended)
 * @param {Object} data - Call data
 */
export function emitCallUpdate(callSid, eventType, data) {
  if (!io) return;

  const updateData = {
    type: eventType,
    callSid,
    timestamp: new Date().toISOString(),
    data
  };

  // Emit to all clients in the call-updates room
  io.to('call-updates').emit('call_update', updateData);

  // Also emit to clients subscribed to this specific call
  io.to(`call-${callSid}`).emit('call_data', {
    callSid,
    ...data,
    timestamp: new Date().toISOString()
  });

  console.log(`[Socket.IO] Emitted ${eventType} for call ${callSid}`);
}

/**
 * Emit active calls list to all connected clients
 */
export function emitActiveCallsList() {
  if (!io) return;

  const activeCallsData = getActiveCallsData();
  io.emit('active_calls', activeCallsData);

  console.log(`[Socket.IO] Emitted active calls list with ${activeCallsData.length} calls`);
}

/**
 * Call status change handler - emits appropriate events based on status
 * @param {string} callSid - Call SID
 * @param {string} status - New call status
 */
export function handleCallStatusChange(callSid, status, callData) {
  if (!io) return;

  // Determine event type based on status
  let eventType = 'status_update';

  if (status === 'initiated' || status === 'queued') {
    eventType = 'new_call';
  } else if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
    eventType = 'call_ended';
  }

  // Emit the event
  emitCallUpdate(callSid, eventType, callData || { status });

  // Also update the active calls list
  emitActiveCallsList();
}

/**
 * Format transcript data for Socket.IO transmission
 * @param {Object} transcript - Transcript document from MongoDB
 * @returns {Object} Formatted transcript data
 */
function formatTranscriptData(transcript) {
  if (!transcript) return null;

  return {
    _id: transcript._id,
    callSid: transcript.callSid,
    conversationId: transcript.conversationId,
    summary: transcript.summary, // Assuming summary is directly on the doc or in analysis
    // Use the correct field name 'transcript' from the schema
    messages: transcript.transcript?.map(msg => ({
      role: msg.role,
      message: msg.message,
      timestamp: msg.timestamp
    })),
    sentiment: transcript.analysis?.sentiment || 'neutral',
    topics: transcript.analysis?.topics || [],
    createdAt: transcript.createdAt,
    updatedAt: transcript.updatedAt
  };
}

/**
 * Emit a transcript update event to all subscribed clients
 * @param {string} callSid - Call SID
 * @param {Object} transcript - Transcript document
 */
export function emitTranscriptUpdate(callSid, transcript) {
  if (!io) return;

  const formattedTranscript = formatTranscriptData(transcript);
  if (!formattedTranscript) return;

  const updateData = {
    callSid,
    transcript: formattedTranscript,
    timestamp: new Date().toISOString()
  };

  // Emit to all clients in the transcript-updates room
  io.to('transcript-updates').emit('transcript_update', updateData);

  // Also emit to clients subscribed to this specific call's transcript
  io.to(`transcript-${callSid}`).emit('call_transcript', updateData);

  console.log(`[Socket.IO] Emitted transcript update for call ${callSid}`);
}

/**
 * Emit a transcript message update event
 * @param {string} callSid - Call SID
 * @param {Object} message - New transcript message
 */
export function emitTranscriptMessage(callSid, message) {
  if (!io || !message) return;

  const messageData = {
    callSid,
    message: {
      role: message.role,
      message: message.message,
      timestamp: message.timestamp || new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  // Emit to all clients in the transcript-updates room
  io.to('transcript-updates').emit('transcript_message', messageData);

  // Also emit to clients subscribed to this specific call's transcript
  io.to(`transcript-${callSid}`).emit('call_transcript_message', messageData);

  console.log(`[Socket.IO] Emitted transcript message for call ${callSid}`);
}

/**
 * Set or update campaign data for real-time monitoring
 * @param {string} campaignId - Campaign ID
 * @param {Object} campaignData - Campaign data to store
 */
export function setCampaignData(campaignId, campaignData) {
  if (!campaignId) return;

  activeCampaigns.set(campaignId, {
    ...campaignData,
    lastUpdated: new Date().toISOString()
  });
}

/**
 * Get formatted active campaigns data
 * @returns {Array} Array of active campaign objects
 */
export function getActiveCampaignsData() {
  return Array.from(activeCampaigns.entries())
    .filter(([_, campaign]) => campaign.status === 'active' || campaign.status === 'in-progress')
    .map(([id, campaign]) => ({
      id,
      name: campaign.name,
      status: campaign.status,
      stats: campaign.stats || {},
      progress: campaign.progress || 0,
      lastUpdated: campaign.lastUpdated
    }));
}

/**
 * Emit campaign update to subscribed clients
 * @param {string} campaignId - Campaign ID
 * @param {string} eventType - Event type (status_update, progress_update, etc.)
 * @param {Object} data - Update data
 */
export function emitCampaignUpdate(campaignId, eventType, data) {
  if (!io || !campaignId) return;

  const updateData = {
    type: eventType,
    campaignId,
    timestamp: new Date().toISOString(),
    data
  };

  // Emit to all clients in the campaign-updates room
  io.to('campaign-updates').emit('campaign_update', updateData);

  // Also emit to clients subscribed to this specific campaign
  io.to(`campaign-${campaignId}`).emit('campaign_data', {
    campaignId,
    ...data,
    timestamp: new Date().toISOString()
  });

  console.log(`[Socket.IO] Emitted ${eventType} for campaign ${campaignId}`);
}

/**
 * Emit active campaigns list to all connected clients
 */
export function emitActiveCampaignsList() {
  if (!io) return;

  const activeCampaignsData = getActiveCampaignsData();
  io.emit('active_campaigns', activeCampaignsData);

  console.log(`[Socket.IO] Emitted active campaigns list with ${activeCampaignsData.length} campaigns`);
}

/**
 * Update campaign status and emit updates
 * @param {string} campaignId - Campaign ID
 * @param {string} status - New status
 * @param {Object} data - Additional data
 */
export function updateCampaignStatus(campaignId, status, data = {}) {
  if (!campaignId) return;

  // Get existing campaign data or create new entry
  const campaign = activeCampaigns.get(campaignId) || {};

  // Update status and any additional data
  const updatedCampaign = {
    ...campaign,
    status,
    ...data,
    lastUpdated: new Date().toISOString()
  };

  // Store updated campaign
  activeCampaigns.set(campaignId, updatedCampaign);

  // Emit update events
  emitCampaignUpdate(campaignId, 'status_update', { status, ...data });
  emitActiveCampaignsList();

  console.log(`[Socket.IO] Updated campaign ${campaignId} status to ${status}`);
}

/**
 * Update campaign progress and emit updates
 * @param {string} campaignId - Campaign ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} stats - Campaign statistics
 */
export function updateCampaignProgress(campaignId, progress, stats = {}) {
  if (!campaignId) return;

  // Get existing campaign data or create new entry
  const campaign = activeCampaigns.get(campaignId) || {};

  // Update progress and stats
  const updatedCampaign = {
    ...campaign,
    progress: Math.min(100, Math.max(0, progress)), // Ensure progress is between 0-100
    stats: {
      ...campaign.stats || {},
      ...stats
    },
    lastUpdated: new Date().toISOString()
  };

  // Store updated campaign
  activeCampaigns.set(campaignId, updatedCampaign);

  // Emit update events
  emitCampaignUpdate(campaignId, 'progress_update', {
    progress: updatedCampaign.progress,
    stats: updatedCampaign.stats
  });

  console.log(`[Socket.IO] Updated campaign ${campaignId} progress to ${progress}%`);
}

export default {
  initializeSocketServer,
  setActiveCallsReference,
  emitCallUpdate,
  emitActiveCallsList,
  handleCallStatusChange,
  emitTranscriptUpdate,
  emitTranscriptMessage,
  setCampaignData,
  getActiveCampaignsData,
  emitCampaignUpdate,
  emitActiveCampaignsList,
  updateCampaignStatus,
  updateCampaignProgress
};
