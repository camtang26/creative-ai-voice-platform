/**
 * Campaign Socket Integration Module
 * Enhances campaign operations with real-time updates via Socket.IO
 */
import {
  setCampaignData,
  updateCampaignStatus,
  updateCampaignProgress,
  emitCampaignUpdate,
  emitActiveCampaignsList
} from './socket-server.js';

/**
 * Initialize campaign data for real-time monitoring
 * @param {Object} campaign - Campaign document
 */
export function initializeCampaignMonitoring(campaign) {
  if (!campaign || !campaign._id) return;
  
  const campaignId = campaign._id.toString();
  
  // Format campaign data for Socket.IO
  const campaignData = {
    id: campaignId,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    createdAt: campaign.createdAt,
    stats: campaign.stats || {
      totalContacts: campaign.contactIds?.length || 0,
      callsPlaced: 0,
      callsCompleted: 0,
      callsAnswered: 0,
      callsFailed: 0,
      averageDuration: 0
    },
    // Calculate progress based on completed calls vs total contacts
    progress: calculateProgress(campaign)
  };
  
  // Store campaign data
  setCampaignData(campaignId, campaignData);
  
  // Emit active campaigns list update
  emitActiveCampaignsList();
  
  console.log(`[Campaign Socket] Initialized monitoring for campaign: ${campaign.name} (${campaignId})`);
}

/**
 * Update campaign status with real-time notification
 * @param {Object} campaign - Campaign document
 * @param {string} status - New status
 */
export function updateCampaignStatusWithSocket(campaign, status) {
  if (!campaign || !campaign._id) return;
  
  const campaignId = campaign._id.toString();
  
  // Update campaign status in Socket.IO
  updateCampaignStatus(campaignId, status, {
    name: campaign.name,
    stats: campaign.stats,
    progress: calculateProgress(campaign)
  });
  
  console.log(`[Campaign Socket] Updated status for campaign: ${campaign.name} (${campaignId}) to ${status}`);
}

/**
 * Update campaign stats with real-time notification
 * @param {Object} campaign - Campaign document
 * @param {Object} stats - New stats data
 */
export function updateCampaignStatsWithSocket(campaign, stats) {
  if (!campaign || !campaign._id) return;
  
  const campaignId = campaign._id.toString();
  const progress = calculateProgress(campaign);
  
  // Update campaign progress in Socket.IO
  updateCampaignProgress(campaignId, progress, stats);
  
  console.log(`[Campaign Socket] Updated stats for campaign: ${campaign.name} (${campaignId}), progress: ${progress}%`);
}

/**
 * Emit a campaign event for a specific action
 * @param {Object} campaign - Campaign document
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
export function emitCampaignEvent(campaign, eventType, data) {
  if (!campaign || !campaign._id) return;
  
  const campaignId = campaign._id.toString();
  
  // Emit custom campaign event
  emitCampaignUpdate(campaignId, eventType, {
    name: campaign.name,
    ...data
  });
  
  console.log(`[Campaign Socket] Emitted ${eventType} event for campaign: ${campaign.name} (${campaignId})`);
}

/**
 * Calculate campaign progress percentage
 * @param {Object} campaign - Campaign document
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(campaign) {
  if (!campaign || !campaign.stats) return 0;
  
  const totalContacts = campaign.stats.totalContacts || campaign.contactIds?.length || 0;
  
  if (totalContacts === 0) return 0;
  
  const completedCalls = campaign.stats.callsCompleted || 0;
  const progress = Math.min(100, Math.round((completedCalls / totalContacts) * 100));
  
  return progress;
}

/**
 * Process a completed call for a campaign
 * @param {Object} campaign - Campaign document
 * @param {Object} callData - Call data
 */
export function processCampaignCall(campaign, callData) {
  if (!campaign || !campaign._id || !callData) return;
  
  const campaignId = campaign._id.toString();
  
  // Update the campaign stats based on call data
  const currentStats = campaign.stats || {
    totalContacts: campaign.contactIds?.length || 0,
    callsPlaced: 0,
    callsCompleted: 0,
    callsAnswered: 0,
    callsFailed: 0,
    averageDuration: 0
  };
  
  // Process based on call status
  const newStats = { ...currentStats };
  
  if (callData.status === 'completed') {
    newStats.callsCompleted = (newStats.callsCompleted || 0) + 1;
    
    // Handle answer detection
    if (callData.answeredBy === 'human') {
      newStats.callsAnswered = (newStats.callsAnswered || 0) + 1;
    }
    
    // Handle outcome detection
    if (callData.outcome === 'successful') {
      newStats.successfulCalls = (newStats.successfulCalls || 0) + 1;
    } else if (callData.outcome === 'failed') {
      newStats.failedCalls = (newStats.failedCalls || 0) + 1;
    }
    
    // Update average duration
    if (callData.duration) {
      const totalDuration = (newStats.averageDuration || 0) * (newStats.callsCompleted - 1) + callData.duration;
      newStats.averageDuration = Math.round(totalDuration / newStats.callsCompleted);
    }
  } else if (['initiated', 'queued', 'ringing'].includes(callData.status)) {
    newStats.callsPlaced = (newStats.callsPlaced || 0) + 1;
  }
  
  // Calculate success rate
  if (newStats.callsCompleted > 0) {
    newStats.successRate = Math.round((newStats.successfulCalls || 0) / newStats.callsCompleted * 100);
  }
  
  // Update campaign stats in Socket.IO
  const progress = calculateProgress({ ...campaign, stats: newStats });
  updateCampaignProgress(campaignId, progress, newStats);
  
  // Emit call event for the campaign
  emitCampaignUpdate(campaignId, 'call_update', {
    call: {
      sid: callData.sid || callData.callSid,
      status: callData.status,
      contactName: callData.name || callData.contactName,
      phoneNumber: callData.to,
      timestamp: new Date().toISOString()
    }
  });
  
  console.log(`[Campaign Socket] Processed call for campaign: ${campaign.name} (${campaignId}), progress: ${progress}%`);
  
  return newStats;
}

export default {
  initializeCampaignMonitoring,
  updateCampaignStatusWithSocket,
  updateCampaignStatsWithSocket,
  emitCampaignEvent,
  processCampaignCall
};