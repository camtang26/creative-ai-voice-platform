/**
 * Campaign Repository
 * Provides data access methods for the campaigns collection
 */
import Campaign from '../models/campaign.model.js';
import Contact from '../models/contact.model.js';
import { invalidateCacheByPattern } from '../utils/cache.js';

// Import Socket.IO integration
import {
  initializeCampaignMonitoring,
  updateCampaignStatusWithSocket,
  updateCampaignStatsWithSocket
} from '../../campaign-socket-integration.js';

/**
 * Save a new campaign to the database
 * @param {Object} campaignData - Campaign data to save
 * @returns {Promise<Object>} Saved campaign document
 * @throws {Error} If saving fails
 */
export async function saveCampaign(campaignData) {
  try {
    // Prepare campaign data without any defaults - let ElevenLabs handle all agent configuration
    const dataToSave = {
      ...campaignData,
      agentPrompt: campaignData.agentPrompt || null,  // Don't set a default - let ElevenLabs handle it
      firstMessage: campaignData.firstMessage || null,  // Don't set a default - let ElevenLabs handle it
    };

    // Create a new campaign document
    const campaign = new Campaign(dataToSave);
    
    // Save to database
    const savedCampaign = await campaign.save();
    console.log(`[MongoDB] Saved campaign: ${savedCampaign.name} (${savedCampaign._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern('campaign_');
    
    // Initialize real-time monitoring for the campaign
    initializeCampaignMonitoring(savedCampaign);
    
    return savedCampaign;
  } catch (error) {
    console.error('[MongoDB] Error saving campaign:', error);
    throw error;
  }
}

/**
 * Get campaign by ID
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign document
 * @throws {Error} If retrieval fails
 */
export async function getCampaignById(campaignId) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    return campaign;
  } catch (error) {
    console.error(`[MongoDB] Error getting campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Get campaigns with pagination and filtering
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Object with campaigns array and pagination metadata
 * @throws {Error} If retrieval fails
 */
export async function getCampaigns(filters = {}, pagination = {}) {
  try {
    const { status, search } = filters;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = pagination;
    
    // Build query
    const query = {};
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Execute query with pagination
    const campaigns = await Campaign.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Campaign.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${campaigns.length} campaigns (page ${page}, total: ${total})`);
    
    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[MongoDB] Error getting campaigns:', error);
    throw error;
  }
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated campaign document
 * @throws {Error} If update fails
 */
export async function updateCampaign(campaignId, updateData) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Find and update the campaign
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedCampaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated campaign: ${updatedCampaign.name} (${updatedCampaign._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    invalidateCacheByPattern('campaign_list');
    
    return updatedCampaign;
  } catch (error) {
    console.error(`[MongoDB] Error updating campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 * @throws {Error} If deletion fails
 */
export async function deleteCampaign(campaignId) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Find and delete the campaign
    const result = await Campaign.findByIdAndDelete(campaignId);
    
    if (!result) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return false;
    }
    
    console.log(`[MongoDB] Deleted campaign: ${result.name} (${result._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    invalidateCacheByPattern('campaign_list');
    
    return true;
  } catch (error) {
    console.error(`[MongoDB] Error deleting campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Add contacts to campaign
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} contactIds - Array of contact IDs
 * @returns {Promise<Object>} Updated campaign document
 * @throws {Error} If update fails
 */
export async function addContactsToCampaign(campaignId, contactIds) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      throw new Error('Contact IDs array is required');
    }
    
    // Find the campaign
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    // Update the campaign with new contact IDs
    campaign.contactIds = [...new Set([...campaign.contactIds, ...contactIds])];
    
    // Update the campaign stats
    campaign.stats.totalContacts = campaign.contactIds.length;
    
    // Save the updated campaign
    const updatedCampaign = await campaign.save();
    
    console.log(`[MongoDB] Added ${contactIds.length} contacts to campaign: ${updatedCampaign.name} (${updatedCampaign._id})`);
    
    // Update the contacts with the campaign ID
    await Contact.updateMany(
      { _id: { $in: contactIds } },
      { $addToSet: { campaignIds: campaignId } }
    );
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    
    return updatedCampaign;
  } catch (error) {
    console.error(`[MongoDB] Error adding contacts to campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Remove contacts from campaign
 * @param {string} campaignId - Campaign ID
 * @param {Array<string>} contactIds - Array of contact IDs
 * @returns {Promise<Object>} Updated campaign document
 * @throws {Error} If update fails
 */
export async function removeContactsFromCampaign(campaignId, contactIds) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      throw new Error('Contact IDs array is required');
    }
    
    // Find the campaign
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    // Remove the contact IDs from the campaign
    campaign.contactIds = campaign.contactIds.filter(
      id => !contactIds.includes(id.toString())
    );
    
    // Update the campaign stats
    campaign.stats.totalContacts = campaign.contactIds.length;
    
    // Save the updated campaign
    const updatedCampaign = await campaign.save();
    
    console.log(`[MongoDB] Removed ${contactIds.length} contacts from campaign: ${updatedCampaign.name} (${updatedCampaign._id})`);
    
    // Update the contacts to remove the campaign ID
    await Contact.updateMany(
      { _id: { $in: contactIds } },
      { $pull: { campaignIds: campaignId } }
    );
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    
    return updatedCampaign;
  } catch (error) {
    console.error(`[MongoDB] Error removing contacts from campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Get campaign contacts
 * @param {string} campaignId - Campaign ID
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Object with contacts array and pagination metadata
 * @throws {Error} If retrieval fails
 */
export async function getCampaignContacts(campaignId, pagination = {}) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    const { page = 1, limit = 50 } = pagination;
    
    // First get the campaign to get its contactIds
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found with ID: ${campaignId}`);
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Find ALL contacts that have this campaignId in their campaignIds array
    // This is more reliable than using campaign.contactIds which might not be populated
    const contacts = await Contact.find({ campaignIds: campaignId })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination - count contacts with this campaignId
    const total = await Contact.countDocuments({ campaignIds: campaignId });
    
    // Now fetch call statistics for each contact
    const contactsWithStats = await Promise.all(contacts.map(async (contact) => {
      // Import Call model at the top of the function if not already imported
      const Call = (await import('../models/call.model.js')).default;
      
      // Get all calls for this contact's phone number in this campaign
      // Normalize phone number to handle both formats (with/without + prefix)
      const phoneWithPlus = contact.phoneNumber.startsWith('+') ? contact.phoneNumber : `+${contact.phoneNumber}`;
      const phoneWithoutPlus = contact.phoneNumber.startsWith('+') ? contact.phoneNumber.substring(1) : contact.phoneNumber;
      
      const calls = await Call.find({
        $or: [
          { to: phoneWithPlus },
          { to: phoneWithoutPlus }
        ],
        campaignId: campaignId
      }).select('status answeredBy terminatedBy outcome duration');
      
      // Debug logging
      if (calls.length > 0) {
        console.log(`[MongoDB] Found ${calls.length} calls for contact ${contact.phoneNumber} in campaign ${campaignId}`);
        // Log call statuses for debugging live vs total count
        const callStatuses = calls.map(c => c.status);
        console.log(`[MongoDB] Call statuses for ${contact.phoneNumber}: ${callStatuses.join(', ')}`);
      }
      
      // Calculate live call count (calls that actually rang/connected)
      // These are calls that made it past the initial attempt phase and reached the recipient
      const liveCallCount = calls.filter(call => {
        // These statuses indicate the call actually rang on the recipient's phone
        const rangStatuses = [
          'ringing',      // Currently ringing
          'in-progress',  // Call was answered and is active
          'completed',    // Call connected and ended normally
          'busy',         // Reached recipient but line was busy
          'no-answer'     // Call rang but wasn't answered
        ];
        
        // Include if status shows it rang OR if it was answered (answeredBy field)
        // This catches edge cases where status might not be updated but call was answered
        return rangStatuses.includes(call.status) || call.answeredBy !== null;
      }).length;
      
      // Debug the live call count calculation
      if (calls.length > 0 && liveCallCount !== calls.length) {
        console.log(`[MongoDB] Contact ${contact.phoneNumber}: Total attempts = ${calls.length}, Live calls (rang) = ${liveCallCount}`);
      }
      
      // Get the last call for this contact
      const lastCall = calls.length > 0 ? calls[calls.length - 1] : null;
      
      // Log for debugging
      if (lastCall && (lastCall.answeredBy || lastCall.terminatedBy)) {
        console.log(`[MongoDB] Contact ${contact.phoneNumber} last call: answeredBy=${lastCall.answeredBy}, terminatedBy=${lastCall.terminatedBy}`);
      }
      
      // Determine answered by from the last call
      let answeredBy = null;
      if (lastCall) {
        if (lastCall.answeredBy) {
          answeredBy = lastCall.answeredBy;
        } else if (lastCall.status === 'no-answer') {
          answeredBy = 'no-answer';
        } else if (lastCall.status === 'busy') {
          answeredBy = 'busy';
        } else if (lastCall.status === 'failed') {
          answeredBy = 'failed';
        }
      }
      
      return {
        _id: contact._id,
        phoneNumber: contact.phoneNumber,
        name: contact.name || 'Unknown',
        status: contact.status,
        callCount: contact.callCount || 0, // Total attempts from backend
        liveCallCount: liveCallCount, // Calls that actually connected
        lastContacted: contact.lastCallDate || contact.lastContacted,
        lastCallResult: contact.lastCallResult,
        answeredBy: answeredBy,
        terminatedBy: lastCall?.terminatedBy || null,
        lastCallDuration: lastCall?.duration || null
      };
    }));
    
    console.log(`[MongoDB] Retrieved ${contacts.length} contacts for campaign ${campaignId} (page ${page}, total: ${total})`);
    
    return {
      contacts: contactsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error(`[MongoDB] Error getting contacts for campaign with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Update campaign status
 * @param {string} campaignId - Campaign ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated campaign document
 * @throws {Error} If update fails
 */
export async function updateCampaignStatus(campaignId, status) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    if (!status || !['draft', 'active', 'paused', 'completed', 'cancelled'].includes(status)) {
      throw new Error('Valid status is required');
    }
    
    // Find and update the campaign
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { 
        $set: { 
          status,
          ...(status === 'active' ? { lastExecuted: new Date() } : {})
        } 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedCampaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated campaign status to ${status}: ${updatedCampaign.name} (${updatedCampaign._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    invalidateCacheByPattern('campaign_list');
    
    // Update real-time status via Socket.IO
    updateCampaignStatusWithSocket(updatedCampaign, status);
    
    return updatedCampaign;
  } catch (error) {
    console.error(`[MongoDB] Error updating campaign status with ID ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Update campaign statistics
 * @param {string} campaignId - Campaign ID
 * @param {Object} stats - Statistics to update
 * @returns {Promise<Object>} Updated campaign document
 * @throws {Error} If update fails
 */
export async function updateCampaignStats(campaignId, stats) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    if (!stats || typeof stats !== 'object') {
      throw new Error('Stats object is required');
    }
    
    // Find the campaign
    const campaign = await Campaign.findById(campaignId);
    
    if (!campaign) {
      console.log(`[MongoDB] No campaign found with ID: ${campaignId}`);
      return null;
    }
    
    // Update the campaign stats
    Object.assign(campaign.stats, stats);
    
    // Save the updated campaign
    const updatedCampaign = await campaign.save();
    
    console.log(`[MongoDB] Updated campaign stats: ${updatedCampaign.name} (${updatedCampaign._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`campaign_${campaignId}`);
    
    // Update real-time stats via Socket.IO
    updateCampaignStatsWithSocket(updatedCampaign, updatedCampaign.stats);
    
    return updatedCampaign;
  } catch (error) {
    console.error(`[MongoDB] Error updating campaign stats with ID ${campaignId}:`, error);
    throw error;
  }
}

export default {
  saveCampaign,
  getCampaignById,
  getCampaigns,
  updateCampaign,
  deleteCampaign,
  addContactsToCampaign,
  removeContactsFromCampaign,
  getCampaignContacts,
  updateCampaignStatus,
  updateCampaignStats
};