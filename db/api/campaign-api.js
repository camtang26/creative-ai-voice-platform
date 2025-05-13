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
import { saveContact, getContactByPhoneNumber } from '../repositories/contact.repository.js'; // Corrected import
import { getCacheValue, setCacheValue } from '../utils/cache.js';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import csvParser from 'fast-csv';
import os from 'node:os';
import path from 'node:path';


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
// Start campaign from CSV upload
  fastify.post('/api/db/campaigns/start-from-csv', async (request, reply) => {
    try {
      console.log('[API /start-from-csv] Received request. Processing parts...');
      const parts = request.parts();
      let csvFileStream;
      const campaignDetails = {};
      let fileReceived = false;

      for await (const part of parts) {
        console.log(`[API /start-from-csv] Part fieldname: ${part.fieldname}, type: ${part.type}`);
        if (part.type === 'file' && part.fieldname === 'file') {
          csvFileStream = part.file;
          fileReceived = true;
          console.log(`[API /start-from-csv] CSV file stream identified for fieldname: ${part.fieldname}`);
        } else if (part.type === 'field') {
          campaignDetails[part.fieldname] = part.value;
          console.log(`[API /start-from-csv] Campaign detail field: ${part.fieldname}, value: "${part.value}"`);
        }
      }
      
      console.log('[API /start-from-csv] Finished processing parts.');
      console.log('[API /start-from-csv] File received flag:', fileReceived);
      console.log('[API /start-from-csv] campaignDetails content:', JSON.stringify(campaignDetails));

      if (!csvFileStream) { // Or check fileReceived
        console.error('[API /start-from-csv] Validation Error: CSV file stream is missing.');
        return reply.code(400).send({ success: false, error: 'CSV file is required.' });
      }

      const { campaignName, agentPrompt, firstMessage } = campaignDetails;
      console.log(`[API /start-from-csv] Extracted - Campaign Name: "${campaignName}", Agent Prompt: "${agentPrompt}", First Message: "${firstMessage}"`);

      if (!campaignName || campaignName.trim().length === 0) {
        console.error('[API /start-from-csv] Validation Error: Campaign name is missing or empty.');
        return reply.code(400).send({ success: false, error: 'Campaign name is required and cannot be empty.' });
      }

      const contacts = [];
      const processingPromises = [];
      
      // Define header synonyms
      const phoneSynonyms = ['phonenumber', 'phone_number', 'phone', 'mobile', 'telephone', 'contactnumber', 'contact_number'];
      const nameSynonyms = ['name', 'fullname', 'contactname', 'contact_name', 'customername', 'customer_name'];
      const emailSynonyms = ['email', 'emailaddress', 'e-mail', 'email_address'];

      let headerRow = null;
      let columnIndexMap = { phone: -1, name: -1, email: -1 };
      let rowCount = 0;

      const stream = csvFileStream.pipe(csvParser.parse({ headers: false })) // Parse without auto-headers first
        .on('error', error => {
          console.error('[API] CSV parsing error:', error);
          if (!reply.sent) {
            reply.code(500).send({ success: false, error: 'Error parsing CSV file.', details: error.message });
          }
        })
        .on('data', async (rowArray) => {
          rowCount++;
          if (!headerRow) {
            headerRow = rowArray.map(h => String(h || '').toLowerCase().trim().replace(/\s+/g, '')); // Normalize headers
            
            headerRow.forEach((header, index) => {
              if (phoneSynonyms.includes(header)) columnIndexMap.phone = index;
              if (nameSynonyms.includes(header)) columnIndexMap.name = index;
              if (emailSynonyms.includes(header)) columnIndexMap.email = index;
            });

            // Basic check: if phone column not found by header, try to infer by content (simple regex)
            // This is a very basic heuristic and can be expanded.
            if (columnIndexMap.phone === -1) {
                // Try to find a column that looks like phone numbers in the first few data rows (if available)
                // For simplicity, we'll just error out if not found by header for now.
                // A more advanced version would buffer a few rows to make this inference.
                console.warn('[API] Phone number column header not identified clearly. Will rely on first column or content sniffing if implemented.');
            }
            
            // If critical phone header is still not found, we might have to stop or use a default.
            // For now, if not found, subsequent rows will likely fail to get a phone number.
            return; // Skip processing the header row as data
          }

          // Process data rows using columnIndexMap
          const phoneNumber = columnIndexMap.phone !== -1 ? String(rowArray[columnIndexMap.phone] || '').trim() : String(rowArray[0] || '').trim(); // Fallback to first column if not mapped
          const name = columnIndexMap.name !== -1 ? String(rowArray[columnIndexMap.name] || '').trim() : '';
          const email = columnIndexMap.email !== -1 ? String(rowArray[columnIndexMap.email] || '').trim() : '';
          
          if (phoneNumber && phoneNumber.length > 0) {
            const contactData = {
              phoneNumber,
              name,
              email,
              status: 'active',
            };
            
            processingPromises.push(
              (async () => {
                try {
                  let existingContact = await getContactByPhoneNumber(contactData.phoneNumber);
                  if (existingContact) {
                    contacts.push(existingContact._id.toString());
                  } else {
                    const savedContact = await saveContact(contactData);
                    contacts.push(savedContact._id.toString());
                  }
                } catch (contactError) {
                  console.error(`[API] Error processing contact data: ${JSON.stringify(contactData)}, Error: ${contactError}`);
                }
              })()
            );
          } else {
            console.warn(`[API] Skipping row ${rowCount} due to missing or empty phone number: ${JSON.stringify(rowArray)}`);
          }
        });
      
      await new Promise((resolve, reject) => {
        stream.on('end', async () => { // rowCount from fast-csv is not reliable with headers:false
          try {
            await Promise.all(processingPromises);
            const actualDataRowCount = headerRow ? rowCount - 1 : rowCount;
            console.log(`[API] Processed ${actualDataRowCount} data rows from CSV. Found ${contacts.length} valid contacts for campaign.`);

            if (columnIndexMap.phone === -1 && contacts.length === 0 && actualDataRowCount > 0) {
                 if (!reply.sent) {
                    reply.code(400).send({ success: false, error: 'Could not identify a phone number column in the CSV. Please ensure your CSV has a clear header for phone numbers (e.g., "Phone", "Mobile", "phoneNumber") or that phone numbers are in the first column.' });
                 }
                 return resolve();
            }

            if (contacts.length === 0) {
              if (!reply.sent) {
                reply.code(400).send({ success: false, error: 'No valid contacts with phone numbers found in CSV to process.' });
              }
              return resolve();
            }
            
            const campaignData = {
              name: campaignName,
              agentPrompt, // Will use default in repository if empty
              firstMessage, // Will use default in repository if empty
              status: 'pending',
              contacts,
            };

            const savedCampaign = await saveCampaign(campaignData);
            
            if (!reply.sent) {
              reply.send({
                success: true,
                message: 'Campaign created successfully from CSV.',
                data: {
                  campaign: savedCampaign,
                  contactsProcessed: contacts.length,
                },
                timestamp: new Date().toISOString()
              });
            }
            resolve();
          } catch (dbError) {
            console.error('[API] Error saving contacts/campaign from CSV during stream end:', dbError);
            if (!reply.sent) {
               reply.code(500).send({ success: false, error: 'Database error after CSV processing.', details: dbError.message });
            }
            reject(dbError);
          }
        });
        stream.on('error', (streamError) => { // Catch errors from the stream itself
            console.error('[API] CSV Stream processing error:', streamError);
            if (!reply.sent) {
                reply.code(500).send({ success: false, error: 'Error processing CSV stream.', details: streamError.message });
            }
            reject(streamError);
        });
      });

    } catch (error) {
      console.error('[API] Error processing start-from-csv route:', error);
      if (!reply.sent) { 
        reply.code(500).send({
          success: false,
          error: 'Error processing CSV for campaign.',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

export default {
  registerCampaignApiRoutes
};