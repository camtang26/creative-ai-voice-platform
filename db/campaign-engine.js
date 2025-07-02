/**
 * Campaign Execution Engine
 * Manages the execution of outbound calling campaigns
 */
import { getCampaignRepository, getContactRepository, getCallRepository } from './index.js';
import { makeOutboundCall } from '../outbound.js';
import { updateCampaignStatusWithSocket } from '../campaign-socket-integration.js';

// Active campaigns map
const activeCampaigns = new Map();

// Campaign execution intervals
const campaignIntervals = new Map();

// Track if campaign cycle is currently executing to prevent overlaps
const campaignCycleInProgress = new Map();

// Maximum concurrent calls per campaign
const MAX_CONCURRENT_CALLS = 5;

// Default call delay in milliseconds
// INCREASED from 5000ms to prevent race conditions
const DEFAULT_CALL_DELAY = 10000;  // 10 seconds between campaign cycles

/**
 * Initialize campaign engine
 * @returns {Promise<void>}
 */
export async function initializeCampaignEngine() {
  try {
    console.log('[Campaign Engine] Initializing campaign engine');
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Get active campaigns
    const { campaigns } = await campaignRepository.getCampaigns({ status: 'active' });
    
    console.log(`[Campaign Engine] Found ${campaigns.length} active campaigns`);
    
    // Start each active campaign
    for (const campaign of campaigns) {
      await startCampaign(campaign._id);
    }
    
    console.log('[Campaign Engine] Campaign engine initialized');
  } catch (error) {
    console.error('[Campaign Engine] Error initializing campaign engine:', error);
  }
}

/**
 * Start a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success status
 */
export async function startCampaign(campaignId) {
  try {
    console.log(`[Campaign Engine] Starting campaign: ${campaignId}`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(`[Campaign Engine] Campaign not found: ${campaignId}`);
      return false;
    }
    
    // Check if campaign is already active
    if (activeCampaigns.has(campaignId)) {
      console.log(`[Campaign Engine] Campaign already active: ${campaignId}`);
      return true;
    }
    
    // Update campaign status to active
    await campaignRepository.updateCampaignStatus(campaignId, 'active');
    
    // Add campaign to active campaigns map
    activeCampaigns.set(campaignId, {
      id: campaignId,
      name: campaign.name,
      activeCalls: new Map(),
      settings: campaign.settings || {},
      stats: campaign.stats || {}
    });
    
    // Start campaign execution interval
    const callDelay = campaign.settings?.callDelay || DEFAULT_CALL_DELAY;
    const interval = setInterval(() => executeCampaignCycle(campaignId), callDelay);
    
    // Store interval reference
    campaignIntervals.set(campaignId, interval);
    
    console.log(`[Campaign Engine] Campaign started: ${campaign.name} (${campaignId})`);
    
    // Execute first cycle immediately
    executeCampaignCycle(campaignId);
    
    return true;
  } catch (error) {
    console.error(`[Campaign Engine] Error starting campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Pause a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success status
 */
export async function pauseCampaign(campaignId) {
  try {
    console.log(`[Campaign Engine] Pausing campaign: ${campaignId}`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Check if campaign is active
    if (!activeCampaigns.has(campaignId)) {
      console.log(`[Campaign Engine] Campaign not active: ${campaignId}`);
      return false;
    }
    
    // Clear execution interval FIRST to prevent any more cycles
    const interval = campaignIntervals.get(campaignId);
    if (interval) {
      clearInterval(interval);
      campaignIntervals.delete(campaignId);
      console.log(`[Campaign Engine] Interval cleared for campaign: ${campaignId}`);
    }
    
    // Update campaign status to paused in database
    await campaignRepository.updateCampaignStatus(campaignId, 'paused');
    
    // CRITICAL FIX: Remove campaign from active campaigns entirely
    // This prevents any possibility of executeCampaignCycle running
    activeCampaigns.delete(campaignId);
    
    console.log(`[Campaign Engine] Campaign paused and removed from active campaigns: ${campaignId}`);
    
    return true;
  } catch (error) {
    console.error(`[Campaign Engine] Error pausing campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Resume a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success status
 */
export async function resumeCampaign(campaignId) {
  try {
    console.log(`[Campaign Engine] Resuming campaign: ${campaignId}`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(`[Campaign Engine] Campaign not found: ${campaignId}`);
      return false;
    }
    
    // Add campaign to active campaigns map 
    // (it was removed when paused, so we always need to re-add it)
    activeCampaigns.set(campaignId, {
      id: campaignId,
      name: campaign.name,
      activeCalls: new Map(),
      settings: campaign.settings || {},
      stats: campaign.stats || {}
    });
    
    // Update campaign status to active
    await campaignRepository.updateCampaignStatus(campaignId, 'active');
    
    // Start campaign execution interval
    const callDelay = campaign.settings?.callDelay || DEFAULT_CALL_DELAY;
    const interval = setInterval(() => executeCampaignCycle(campaignId), callDelay);
    
    // Store interval reference
    campaignIntervals.set(campaignId, interval);
    
    console.log(`[Campaign Engine] Campaign resumed: ${campaign.name} (${campaignId})`);
    
    // Execute first cycle immediately
    executeCampaignCycle(campaignId);
    
    return true;
  } catch (error) {
    console.error(`[Campaign Engine] Error resuming campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Stop a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success status
 */
export async function stopCampaign(campaignId) {
  try {
    console.log(`[Campaign Engine] Stopping campaign: ${campaignId}`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Check if campaign is active
    if (!activeCampaigns.has(campaignId)) {
      console.log(`[Campaign Engine] Campaign not active: ${campaignId}`);
      return false;
    }
    
    // Clear execution interval
    const interval = campaignIntervals.get(campaignId);
    if (interval) {
      clearInterval(interval);
      campaignIntervals.delete(campaignId);
    }
    
    // Get campaign for Socket.IO update
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    // Update campaign status to completed
    await campaignRepository.updateCampaignStatus(campaignId, 'completed');
    
    // Emit Socket.IO event for campaign completion
    if (campaign) {
      updateCampaignStatusWithSocket(campaign, 'completed');
    }
    
    // Remove campaign from active campaigns map
    activeCampaigns.delete(campaignId);
    
    console.log(`[Campaign Engine] Campaign stopped: ${campaignId}`);
    
    return true;
  } catch (error) {
    console.error(`[Campaign Engine] Error stopping campaign ${campaignId}:`, error);
    return false;
  }
}

/**
 * Execute a campaign cycle
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<void>}
 */
async function executeCampaignCycle(campaignId) {
  // CRITICAL FIX: Prevent concurrent execution cycles
  if (campaignCycleInProgress.get(campaignId)) {
    console.log(`[Campaign Engine] Skipping cycle - previous cycle still in progress for campaign: ${campaignId}`);
    return;
  }
  
  // Mark cycle as in progress
  campaignCycleInProgress.set(campaignId, true);
  
  try {
    // Get campaign data
    const campaignData = activeCampaigns.get(campaignId);
    
    if (!campaignData) {
      console.error(`[Campaign Engine] Campaign not found in active campaigns: ${campaignId}`);
      return;
    }
    
    // Check if campaign is paused
    if (campaignData.paused) {
      return;
    }
    
    // Get campaign repositories
    const campaignRepository = getCampaignRepository();
    const contactRepository = getContactRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(`[Campaign Engine] Campaign not found in database: ${campaignId}`);
      return;
    }
    
    // Get maximum concurrent calls
    const maxConcurrentCalls = campaign.settings?.maxConcurrentCalls || MAX_CONCURRENT_CALLS;
    
    // Check if we've reached the maximum concurrent calls
    const activeCalls = campaignData.activeCalls.size;
    if (activeCalls >= maxConcurrentCalls) {
      console.log(`[Campaign Engine] Maximum concurrent calls reached for campaign: ${campaignId} (${activeCalls}/${maxConcurrentCalls})`);
      return;
    }
    
    // CRITICAL FIX: Use atomic contact claiming to prevent duplicate calls
    const availableSlots = maxConcurrentCalls - activeCalls;
    
    // Claim contacts atomically one by one
    let claimedContacts = 0;
    for (let i = 0; i < availableSlots; i++) {
      const contact = await contactRepository.claimNextContactForCalling(campaignId);
      if (!contact) {
        if (claimedContacts === 0) {
          console.log(`[Campaign Engine] No more contacts to call for campaign: ${campaignId}`);
          
          // Check if campaign should be marked as complete
          await checkAndCompleteCampaign(campaignId);
        }
        break;
      }
      
      claimedContacts++;
      // Make call to the atomically claimed contact
      await makeCallToContact(campaignId, contact);
    }
  } catch (error) {
    console.error(`[Campaign Engine] Error executing campaign cycle for ${campaignId}:`, error);
  } finally {
    // CRITICAL: Always clear the in-progress flag
    campaignCycleInProgress.delete(campaignId);
  }
}

/**
 * Get next contacts to call
 * @deprecated Use atomic contact claiming in executeCampaignCycle instead
 * @param {string} campaignId - Campaign ID
 * @param {number} limit - Maximum number of contacts to return
 * @returns {Promise<Array>} Contacts to call
 */
async function getNextContactsToCall(campaignId, limit = 1) {
  try {
    // Get contact repository
    const contactRepository = getContactRepository();
    
    // Get contacts for campaign that haven't been called yet
    // DEPRECATED: This function is no longer used - see executeCampaignCycle
    const { contacts } = await contactRepository.getContacts(
      {
        campaignId,
        status: 'pending'  // Only get contacts that are pending
        // REMOVED: callCount: 0 - this prevented reset contacts from being selected
      },
      {
        limit,
        sortBy: 'priority',
        sortOrder: -1  // Sort by priority descending, then by creation date
      }
    );
    
    return contacts;
  } catch (error) {
    console.error(`[Campaign Engine] Error getting next contacts to call for campaign ${campaignId}:`, error);
    return [];
  }
}

/**
 * Make a call to a contact
 * @param {string} campaignId - Campaign ID
 * @param {Object} contact - Contact data
 * @returns {Promise<void>}
 */
async function makeCallToContact(campaignId, contact) {
  try {
    // Get campaign data
    const campaignData = activeCampaigns.get(campaignId);
    
    if (!campaignData) {
      console.error(`[Campaign Engine] Campaign not found in active campaigns: ${campaignId}`);
      return;
    }
    
    // Get campaign repositories
    const campaignRepository = getCampaignRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(`[Campaign Engine] Campaign not found in database: ${campaignId}`);
      return;
    }
    
    console.log(`[Campaign Engine] Making call to contact: ${contact.name} (${contact.phoneNumber}) for campaign: ${campaign.name}`);
    
    // Prepare call parameters
    const callParams = {
      to: contact.phoneNumber,
      from: campaign.callerId,
      region: campaign.region || 'us1',
      prompt: campaign.prompt,
      firstMessage: campaign.firstMessage,
      name: contact.name,
      campaignId: campaignId,
      contactId: contact._id
    };
    
    // Contact is already atomically claimed with incremented callCount
    // No need to update again here - this prevents the race condition
    console.log(`[Campaign Engine] Processing atomically claimed contact: ${contact.name} (${contact._id})`);
    
    // Make outbound call
    const callResult = await makeOutboundCall(callParams);
    
    if (callResult.success) {
      console.log(`[Campaign Engine] Call initiated successfully: ${callResult.callSid}`);
      
      // Add call to active calls map
      campaignData.activeCalls.set(callResult.callSid, {
        contactId: contact._id,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        startTime: new Date()
      });
      
      // Update campaign stats
      campaignData.stats.callsPlaced = (campaignData.stats.callsPlaced || 0) + 1;
      activeCampaigns.set(campaignId, campaignData);
      
      // Update campaign stats in database
      await campaignRepository.updateCampaignStats(campaignId, {
        callsPlaced: (campaign.stats?.callsPlaced || 0) + 1
      });
      
      // Update contact call history with the actual call ID
      await updateContactCallHistory(contact._id, callResult.callSid);
    } else {
      console.error(`[Campaign Engine] Failed to initiate call: ${callResult.error}`);
      // Mark contact as failed instead of decrementing call count
      // This prevents the system from immediately retrying failed numbers
      await contactRepository.updateContact(contact._id, {
        status: 'failed',
        lastCallResult: 'failed_to_initiate',
        lastCallError: callResult.error,
        lastCallDate: new Date()
      });
      console.log(`[Campaign Engine] Marked contact as failed due to call initiation error: ${contact.name}`);
    }
  } catch (error) {
    console.error(`[Campaign Engine] Error making call to contact for campaign ${campaignId}:`, error);
  }
}

/**
 * Update contact call history
 * @param {string} contactId - Contact ID
 * @param {string} callSid - Call SID
 * @returns {Promise<void>}
 */
async function updateContactCallHistory(contactId, callSid) {
  try {
    // Get contact repository
    const contactRepository = getContactRepository();
    const callRepository = getCallRepository();
    
    // Get call
    const call = await callRepository.getCallBySid(callSid);
    
    if (!call) {
      console.error(`[Campaign Engine] Call not found: ${callSid}`);
      return;
    }
    
    // Update contact call history
    await contactRepository.updateContactCallHistory(contactId, call._id);
  } catch (error) {
    console.error(`[Campaign Engine] Error updating contact call history:`, error);
  }
}

/**
 * Handle call status update
 * @param {string} callSid - Call SID
 * @param {string} status - Call status
 * @returns {Promise<void>}
 */
export async function handleCallStatusUpdate(callSid, status) {
  try {
    // Find campaign for this call
    let campaignId = null;
    let campaignData = null;
    
    for (const [id, data] of activeCampaigns.entries()) {
      if (data.activeCalls.has(callSid)) {
        campaignId = id;
        campaignData = data;
        break;
      }
    }
    
    if (!campaignId || !campaignData) {
      // Call not found in active campaigns
      return;
    }
    
    console.log(`[Campaign Engine] Call status update for campaign ${campaignId}: ${callSid} -> ${status}`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(`[Campaign Engine] Campaign not found in database: ${campaignId}`);
      return;
    }
    
    // Handle different call statuses
    if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
      // Call has ended
      const callData = campaignData.activeCalls.get(callSid);
      
      if (callData) {
        // Calculate call duration
        const duration = callData.startTime ? Math.floor((Date.now() - callData.startTime) / 1000) : 0;
        
        // Update campaign stats
        const statsUpdate = {};
        
        if (status === 'completed') {
          statsUpdate.callsCompleted = (campaign.stats?.callsCompleted || 0) + 1;
          statsUpdate.averageDuration = calculateAverageDuration(
            campaign.stats?.averageDuration || 0,
            campaign.stats?.callsCompleted || 0,
            duration
          );
        } else if (['failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
          statsUpdate.callsFailed = (campaign.stats?.callsFailed || 0) + 1;
        }
        
        // Update campaign stats in database
        await campaignRepository.updateCampaignStats(campaignId, statsUpdate);
        
        // Update contact status based on call outcome
        if (callData.contactId) {
          const contactRepository = getContactRepository();
          const contactStatus = status === 'completed' ? 'completed' : 'failed';
          await contactRepository.updateContact(callData.contactId, {
            status: contactStatus,
            lastCallResult: status,
            lastCallDate: new Date()
          });
          console.log(`[Campaign Engine] Updated contact ${callData.contactId} status to ${contactStatus}`);
        }
        
        // Remove call from active calls map
        campaignData.activeCalls.delete(callSid);
        
        // Update campaign data
        Object.assign(campaignData.stats, statsUpdate);
        activeCampaigns.set(campaignId, campaignData);
        
        // Check if campaign should be completed after this call ends
        // Add a small delay to ensure all database updates are complete
        setTimeout(async () => {
          await checkAndCompleteCampaign(campaignId);
        }, 1000);
      }
    } else if (status === 'in-progress') {
      // Call has been answered
      const callData = campaignData.activeCalls.get(callSid);
      
      if (callData) {
        // Update campaign stats
        const statsUpdate = {
          callsAnswered: (campaign.stats?.callsAnswered || 0) + 1
        };
        
        // Update campaign stats in database
        await campaignRepository.updateCampaignStats(campaignId, statsUpdate);
        
        // Update campaign data
        Object.assign(campaignData.stats, statsUpdate);
        activeCampaigns.set(campaignId, campaignData);
      }
    }
  } catch (error) {
    console.error(`[Campaign Engine] Error handling call status update for ${callSid}:`, error);
  }
}

/**
 * Calculate average duration
 * @param {number} currentAverage - Current average duration
 * @param {number} currentCount - Current count of calls
 * @param {number} newDuration - New call duration
 * @returns {number} New average duration
 */
function calculateAverageDuration(currentAverage, currentCount, newDuration) {
  if (currentCount === 0) {
    return newDuration;
  }
  
  const totalDuration = currentAverage * currentCount;
  return Math.round((totalDuration + newDuration) / (currentCount + 1));
}

/**
 * Check if campaign is complete and stop it if all contacts have been processed
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<void>}
 */
async function checkAndCompleteCampaign(campaignId) {
  try {
    const campaignData = activeCampaigns.get(campaignId);
    if (!campaignData) return;
    
    // Check if there are any active calls
    if (campaignData.activeCalls.size > 0) {
      console.log(`[Campaign Engine] Campaign ${campaignId} still has ${campaignData.activeCalls.size} active calls`);
      return;
    }
    
    // Get repositories
    const contactRepository = getContactRepository();
    const campaignRepository = getCampaignRepository();
    
    // Check if there are any contacts still pending
    const pendingResult = await contactRepository.getContacts(
      {
        campaignId,
        status: 'pending'
      },
      {
        limit: 1  // We just need to know if any exist
      }
    );
    
    // Debug log to check structure
    console.log(`[Campaign Engine] Pending result structure:`, JSON.stringify(pendingResult, null, 2));
    
    const pendingContacts = pendingResult?.pagination?.total || 0;
    
    // Check if there are any contacts in 'calling' status (being processed)
    const callingResult = await contactRepository.getContacts(
      {
        campaignId,
        status: 'calling'
      },
      {
        limit: 1
      }
    );
    
    // Debug log to check structure
    console.log(`[Campaign Engine] Calling result structure:`, JSON.stringify(callingResult, null, 2));
    
    const callingContacts = callingResult?.pagination?.total || 0;
    
    console.log(`[Campaign Engine] Campaign ${campaignId} completion check: pending=${pendingContacts}, calling=${callingContacts}, activeCalls=${campaignData.activeCalls.size}`);
    
    if (pendingContacts === 0 && callingContacts === 0) {
      console.log(`[Campaign Engine] All contacts processed for campaign ${campaignId}. Marking as completed.`);
      
      // Stop the campaign
      await stopCampaign(campaignId);
      
      // Update status to completed
      await campaignRepository.updateCampaignStatus(campaignId, 'completed');
      
      console.log(`[Campaign Engine] Campaign ${campaignId} has been automatically completed`);
    } else {
      console.log(`[Campaign Engine] Campaign ${campaignId} still has contacts to process or active calls`);
    }
  } catch (error) {
    console.error(`[Campaign Engine] Error checking campaign completion for ${campaignId}:`, error);
  }
}

/**
 * Get active campaigns
 * @returns {Array} Active campaigns
 */
export function getActiveCampaigns() {
  return Array.from(activeCampaigns.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    activeCalls: data.activeCalls.size,
    paused: data.paused || false,
    stats: data.stats
  }));
}

export default {
  initializeCampaignEngine,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  handleCallStatusUpdate,
  getActiveCampaigns
};