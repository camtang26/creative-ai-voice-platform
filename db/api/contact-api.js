/**
 * Contact API Routes
 * Provides API endpoints for contact management
 */
import {
  saveContact,
  getContactById,
  getContactByPhoneNumber,
  getContacts,
  updateContact,
  deleteContact,
  addTagsToContact,
  removeTagsFromContact,
  updateContactCallHistory,
  importContacts
} from '../repositories/contact.repository.js';
import { getCacheValue, setCacheValue } from '../utils/cache.js';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 300000;

// Helper function to transform MongoDB document to frontend-compatible format
function transformContact(contact) {
  if (!contact) return null;
  
  // Handle Mongoose documents
  let contactObj;
  if (contact.toObject && typeof contact.toObject === 'function') {
    contactObj = contact.toObject();
  } else if (contact._doc) {
    // Some Mongoose documents have _doc property
    contactObj = { ...contact._doc };
  } else {
    // Plain object
    contactObj = { ...contact };
  }
  
  // Transform _id to id
  if (contactObj._id) {
    contactObj.id = contactObj._id.toString();
    delete contactObj._id;
  }
  
  // Remove __v if present
  delete contactObj.__v;
  
  console.log('[API Transform] Original:', contact);
  console.log('[API Transform] Transformed:', contactObj);
  
  return contactObj;
}

/**
 * Register contact API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerContactApiRoutes(fastify, options = {}) {
  // Get all contacts
  fastify.get('/api/db/contacts', async (request, reply) => {
    try {
      const { status, search, tags, campaignId, page, limit, sortBy, sortOrder } = request.query;
      
      // Generate cache key based on query parameters
      const cacheKey = `contact_list_${status || 'all'}_${search || 'none'}_${tags || 'none'}_${campaignId || 'none'}_${page || 1}_${limit || 20}_${sortBy || 'createdAt'}_${sortOrder || -1}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached contact list data`);
        // Ensure cached data has id field (for backwards compatibility)
        if (cachedData.contacts && Array.isArray(cachedData.contacts)) {
          cachedData.contacts = cachedData.contacts.map(contact => {
            if (contact._id && !contact.id) {
              return {
                ...contact,
                id: contact._id.toString(),
                _id: undefined
              };
            }
            return contact;
          });
        }
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
      if (tags) filters.tags = tags.split(',');
      if (campaignId) filters.campaignId = campaignId;
      
      // Build pagination
      const pagination = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder ? parseInt(sortOrder) : -1
      };
      
      // Get contacts
      const result = await getContacts(filters, pagination);
      
      // Transform MongoDB _id to id for frontend compatibility
      const transformedResult = {
        ...result,
        contacts: result.contacts.map(contact => transformContact(contact))
      };
      
      // Cache the transformed data
      setCacheValue(cacheKey, transformedResult, CACHE_TTL);
      
      return {
        success: true,
        data: transformedResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting contacts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting contacts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get contact by ID
  fastify.get('/api/db/contacts/:contactId', async (request, reply) => {
    try {
      const { contactId } = request.params;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate cache key
      const cacheKey = `contact_${contactId}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached contact data for ${contactId}`);
        // Ensure cached data has id field (for backwards compatibility)
        if (cachedData._id && !cachedData.id) {
          cachedData.id = cachedData._id.toString();
          delete cachedData._id;
        }
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get contact
      const contact = await getContactById(contactId);
      
      if (!contact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Transform MongoDB _id to id for frontend compatibility
      const transformedContact = transformContact(contact);
      
      // Cache the transformed data
      setCacheValue(cacheKey, transformedContact, CACHE_TTL);
      
      return {
        success: true,
        data: transformedContact,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get contact by phone number
  fastify.get('/api/db/contacts/phone/:phoneNumber', async (request, reply) => {
    try {
      const { phoneNumber } = request.params;
      
      if (!phoneNumber) {
        return reply.code(400).send({
          success: false,
          error: 'Phone number is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Format phone number (remove non-numeric characters)
      const formattedPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Generate cache key
      const cacheKey = `contact_phone_${formattedPhoneNumber}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached contact data for phone ${formattedPhoneNumber}`);
        // Ensure cached data has id field (for backwards compatibility)
        if (cachedData._id && !cachedData.id) {
          cachedData.id = cachedData._id.toString();
          delete cachedData._id;
        }
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get contact
      const contact = await getContactByPhoneNumber(formattedPhoneNumber);
      
      if (!contact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with phone number: ${formattedPhoneNumber}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Transform MongoDB _id to id for frontend compatibility
      const transformedContact = transformContact(contact);
      
      // Cache the data
      setCacheValue(cacheKey, transformedContact, CACHE_TTL);
      
      return {
        success: true,
        data: transformedContact,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting contact by phone number:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting contact by phone number',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Create contact
  fastify.post('/api/db/contacts', async (request, reply) => {
    try {
      const contactData = request.body;
      
      if (!contactData) {
        return reply.code(400).send({
          success: false,
          error: 'Contact data is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!contactData.phoneNumber) {
        return reply.code(400).send({
          success: false,
          error: 'Phone number is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Save contact
      const savedContact = await saveContact(contactData);
      
      // Transform MongoDB _id to id for frontend compatibility
      const transformedContact = transformContact(savedContact);
      
      return {
        success: true,
        data: transformedContact,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error creating contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error creating contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update contact
  fastify.put('/api/db/contacts/:contactId', async (request, reply) => {
    try {
      const { contactId } = request.params;
      const updateData = request.body;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
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
      
      // Update contact
      const updatedContact = await updateContact(contactId, updateData);
      
      if (!updatedContact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Transform MongoDB _id to id for frontend compatibility
      const transformedContact = transformContact(updatedContact);
      
      return {
        success: true,
        data: transformedContact,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error updating contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error updating contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Delete contact
  fastify.delete('/api/db/contacts/:contactId', async (request, reply) => {
    try {
      const { contactId } = request.params;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Delete contact
      const result = await deleteContact(contactId);
      
      if (!result) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        message: `Contact deleted successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error deleting contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error deleting contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Add tags to contact
  fastify.post('/api/db/contacts/:contactId/tags', async (request, reply) => {
    try {
      const { contactId } = request.params;
      const { tags } = request.body;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Tags array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Add tags to contact
      const updatedContact = await addTagsToContact(contactId, tags);
      
      if (!updatedContact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedContact,
        message: `Added ${tags.length} tags to contact`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error adding tags to contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error adding tags to contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Remove tags from contact
  fastify.delete('/api/db/contacts/:contactId/tags', async (request, reply) => {
    try {
      const { contactId } = request.params;
      const { tags } = request.body;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Tags array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove tags from contact
      const updatedContact = await removeTagsFromContact(contactId, tags);
      
      if (!updatedContact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedContact,
        message: `Removed ${tags.length} tags from contact`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error removing tags from contact:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error removing tags from contact',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get contact call history
  fastify.get('/api/db/contacts/:contactId/calls', async (request, reply) => {
    try {
      const { contactId } = request.params;
      
      if (!contactId) {
        return reply.code(400).send({
          success: false,
          error: 'Contact ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate cache key
      const cacheKey = `contact_${contactId}_calls`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached contact call history data for ${contactId}`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get contact
      const contact = await getContactById(contactId);
      
      if (!contact) {
        return reply.code(404).send({
          success: false,
          error: `Contact not found with ID: ${contactId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Populate call IDs
      await contact.populate('callIds');
      
      // Prepare call history data
      const callHistoryData = {
        contact: {
          id: contact._id,
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email
        },
        callCount: contact.callCount,
        lastContacted: contact.lastContacted,
        calls: contact.callIds
      };
      
      // Cache the data
      setCacheValue(cacheKey, callHistoryData, CACHE_TTL);
      
      return {
        success: true,
        data: callHistoryData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error getting contact call history:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error getting contact call history',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Bulk delete contacts
  fastify.post('/api/db/contacts/bulk-delete', async (request, reply) => {
    try {
      const { contactIds } = request.body;
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Contact IDs array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[API] Bulk deleting ${contactIds.length} contacts`);
      
      // Delete contacts one by one and track results
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const contactId of contactIds) {
        try {
          const result = await deleteContact(contactId);
          if (result) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({ id: contactId, error: 'Contact not found' });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ id: contactId, error: error.message });
        }
      }
      
      return {
        success: true,
        data: results,
        message: `Deleted ${results.success} contacts successfully, ${results.failed} failed`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error bulk deleting contacts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error bulk deleting contacts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Import contacts
  fastify.post('/api/db/contacts/import', async (request, reply) => {
    try {
      const { contacts, campaignId } = request.body;
      
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Contacts array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Import contacts
      const result = await importContacts(contacts, campaignId);
      
      return {
        success: true,
        data: result,
        message: `Imported ${result.created} new contacts, updated ${result.updated} existing contacts`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error importing contacts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error importing contacts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  console.log('[MongoDB] Registered contact API routes');
}

export default {
  registerContactApiRoutes
};