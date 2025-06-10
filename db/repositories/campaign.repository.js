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
    // Define default values
    const DEFAULT_AGENT_PROMPT = "You are a helpful AI assistant. Your goal is to engage the contact and achieve the objective outlined in the campaign description. Be polite, professional, and concise.";
    const DEFAULT_FIRST_MESSAGE = "Hello, I'm calling from [Company Name], is now a good time to talk briefly?";

    // Prepare campaign data with defaults
    const dataToSave = {
      ...campaignData,
      agentPrompt: campaignData.agentPrompt && campaignData.agentPrompt.trim() !== '' ? campaignData.agentPrompt : DEFAULT_AGENT_PROMPT,
      firstMessage: campaignData.firstMessage && campaignData.firstMessage.trim() !== '' ? campaignData.firstMessage : DEFAULT_FIRST_MESSAGE,
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
    
    const { page = 1, limit = 20 } = pagination;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Find contacts for the campaign
    const contacts = await Contact.find({ campaignIds: campaignId })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Contact.countDocuments({ campaignIds: campaignId });
    
    console.log(`[MongoDB] Retrieved ${contacts.length} contacts for campaign ${campaignId} (page ${page}, total: ${total})`);
    
    return {
      contacts,
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