/**
 * Campaign API Routes
 * Provides API endpoints for campaign management
 */
import {
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
} from '../repositories/campaign.repository.js';
import { getCacheValue, setCacheValue } from '../utils/cache.js';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 300000;

/**
 * Register campaign API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerCampaignApiRoutes(fastify, options = {}) {
  // Get all campaigns
  fastify.get('/api/db/campaigns', async (request, reply) => {
    try {
      const { status, search, page, limit, sortBy, sortOrder } = request.query;
      
      // Generate cache key based on query parameters
      const cacheKey = `campaign_list_${status || 'all'}_${search || 'none'}_${page || 1}_${limit || 20}_${sortBy || 'createdAt'}_${sortOrder || -1}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached campaign list data`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Build filters
      const filters = {};
      if (status) filters.status = status;
      if (search) filters.search = search;
      
      // Build pagination
      const pagination = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder ? parseInt(sortOrder) : -1
      };
      
      // Get campaigns
      const result = await getCampaigns(filters, pagination);
      
      // Cache the data
      setCacheValue(cacheKey, result, CACHE_TTL);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting campaigns:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting campaigns',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get campaign by ID
  fastify.get('/api/db/campaigns/:campaignId', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate cache key
      const cacheKey = `campaign_${campaignId}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached campaign data for ${campaignId}`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get campaign
      const campaign = await getCampaignById(campaignId);
      
      if (!campaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Cache the data
      setCacheValue(cacheKey, campaign, CACHE_TTL);
      
      return {
        success: true,
        data: campaign,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Create campaign
  fastify.post('/api/db/campaigns', async (request, reply) => {
    try {
      const campaignData = request.body;
      
      if (!campaignData) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign data is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!campaignData.name) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign name is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Save campaign
      const savedCampaign = await saveCampaign(campaignData);
      
      return {
        success: true,
        data: savedCampaign,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error creating campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error creating campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update campaign
  fastify.put('/api/db/campaigns/:campaignId', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      const updateData = request.body;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!updateData) {
        return reply.code(400).send({
          success: false,
          error: 'Update data is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update campaign
      const updatedCampaign = await updateCampaign(campaignId, updateData);
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error updating campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error updating campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Delete campaign
  fastify.delete('/api/db/campaigns/:campaignId', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Delete campaign
      const result = await deleteCampaign(campaignId);
      
      if (!result) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        message: `Campaign deleted successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error deleting campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error deleting campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get campaign contacts
  fastify.get('/api/db/campaigns/:campaignId/contacts', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      const { page, limit } = request.query;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate cache key
      const cacheKey = `campaign_${campaignId}_contacts_${page || 1}_${limit || 20}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached campaign contacts data for ${campaignId}`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Build pagination
      const pagination = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20
      };
      
      // Get campaign contacts
      const result = await getCampaignContacts(campaignId, pagination);
      
      // Cache the data
      setCacheValue(cacheKey, result, CACHE_TTL);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting campaign contacts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting campaign contacts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Add contacts to campaign
  fastify.post('/api/db/campaigns/:campaignId/contacts', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      const { contactIds } = request.body;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Contact IDs array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Add contacts to campaign
      const updatedCampaign = await addContactsToCampaign(campaignId, contactIds);
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: `Added ${contactIds.length} contacts to campaign`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error adding contacts to campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error adding contacts to campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Remove contacts from campaign
  fastify.delete('/api/db/campaigns/:campaignId/contacts', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      const { contactIds } = request.body;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Contact IDs array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove contacts from campaign
      const updatedCampaign = await removeContactsFromCampaign(campaignId, contactIds);
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: `Removed ${contactIds.length} contacts from campaign`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error removing contacts from campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error removing contacts from campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Start campaign
  fastify.post('/api/db/campaigns/:campaignId/start', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update campaign status to active
      const updatedCampaign = await updateCampaignStatus(campaignId, 'active');
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: 'Campaign started successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error starting campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error starting campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Pause campaign
  fastify.post('/api/db/campaigns/:campaignId/pause', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update campaign status to paused
      const updatedCampaign = await updateCampaignStatus(campaignId, 'paused');
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: 'Campaign paused successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error pausing campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error pausing campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Resume campaign
  fastify.post('/api/db/campaigns/:campaignId/resume', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update campaign status to active
      const updatedCampaign = await updateCampaignStatus(campaignId, 'active');
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: 'Campaign resumed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error resuming campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error resuming campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Stop campaign
  fastify.post('/api/db/campaigns/:campaignId/stop', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Update campaign status to completed
      const updatedCampaign = await updateCampaignStatus(campaignId, 'completed');
      
      if (!updatedCampaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedCampaign,
        message: 'Campaign stopped successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error stopping campaign:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error stopping campaign',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get campaign statistics
  fastify.get('/api/db/campaigns/:campaignId/stats', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate cache key
      const cacheKey = `campaign_${campaignId}_stats`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached campaign stats data for ${campaignId}`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get campaign
      const campaign = await getCampaignById(campaignId);
      
      if (!campaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Prepare stats data
      const statsData = {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          createdAt: campaign.createdAt,
          lastExecuted: campaign.lastExecuted
        },
        stats: campaign.stats,
        contactCount: campaign.contactIds.length
      };
      
      // Cache the data
      setCacheValue(cacheKey, statsData, CACHE_TTL);
      
      return {
        success: true,
        data: statsData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting campaign statistics:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting campaign statistics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  console.log('[MongoDB] Registered campaign API routes');
}

export default {
  registerCampaignApiRoutes
};