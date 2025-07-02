/**
 * Contact Repository
 * Provides data access methods for the contacts collection
 */
import Contact from '../models/contact.model.js';
import { invalidateCacheByPattern } from '../utils/cache.js';

/**
 * Save a new contact to the database
 * @param {Object} contactData - Contact data to save
 * @returns {Promise<Object>} Saved contact document
 * @throws {Error} If saving fails
 */
export async function saveContact(contactData) {
  try {
    // Format phone number (remove non-numeric characters)
    if (contactData.phoneNumber) {
      contactData.phoneNumber = contactData.phoneNumber.replace(/\D/g, '');
    }
    
    // Create a new contact document
    const contact = new Contact(contactData);
    
    // Save to database
    const savedContact = await contact.save();
    console.log(`[MongoDB] Saved contact: ${savedContact.name || savedContact.phoneNumber} (${savedContact._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern('contact_');
    
    return savedContact;
  } catch (error) {
    console.error('[MongoDB] Error saving contact:', error);
    throw error;
  }
}

/**
 * Get contact by ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<Object>} Contact document
 * @throws {Error} If retrieval fails
 */
export async function getContactById(contactId) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    const contact = await Contact.findById(contactId);
    
    if (!contact) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return null;
    }
    
    return contact;
  } catch (error) {
    console.error(`[MongoDB] Error getting contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Get contact by phone number
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>} Contact document
 * @throws {Error} If retrieval fails
 */
export async function getContactByPhoneNumber(phoneNumber) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    // Format phone number (remove non-numeric characters)
    const formattedPhoneNumber = phoneNumber.replace(/\D/g, '');
    
    const contact = await Contact.findOne({ phoneNumber: formattedPhoneNumber });
    
    if (!contact) {
      console.log(`[MongoDB] No contact found with phone number: ${formattedPhoneNumber}`);
      return null;
    }
    
    return contact;
  } catch (error) {
    console.error(`[MongoDB] Error getting contact with phone number ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Get contacts with pagination and filtering
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Object with contacts array and pagination metadata
 * @throws {Error} If retrieval fails
 */
export async function getContacts(filters = {}, pagination = {}) {
  try {
    const { status, search, tags, campaignId } = filters;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = pagination;
    
    // Build query
    const query = {};
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Add campaign filter if provided
    if (campaignId) {
      query.campaignIds = campaignId;
    }
    
    // Add tags filter if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Execute query with pagination
    const contacts = await Contact.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Contact.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${contacts.length} contacts (page ${page}, total: ${total})`);
    console.log('[MongoDB] First contact raw:', contacts[0]);
    console.log('[MongoDB] First contact _id:', contacts[0]?._id);
    console.log('[MongoDB] First contact id:', contacts[0]?.id);
    
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
    console.error('[MongoDB] Error getting contacts:', error);
    throw error;
  }
}

/**
 * Update contact
 * @param {string} contactId - Contact ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated contact document
 * @throws {Error} If update fails
 */
export async function updateContact(contactId, updateData) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    // Format phone number if provided
    if (updateData.phoneNumber) {
      updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, '');
    }
    
    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedContact) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated contact: ${updatedContact.name || updatedContact.phoneNumber} (${updatedContact._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`contact_${contactId}`);
    invalidateCacheByPattern('contact_list');
    
    return updatedContact;
  } catch (error) {
    console.error(`[MongoDB] Error updating contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Delete contact
 * @param {string} contactId - Contact ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 * @throws {Error} If deletion fails
 */
export async function deleteContact(contactId) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    // Find and delete the contact
    const result = await Contact.findByIdAndDelete(contactId);
    
    if (!result) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return false;
    }
    
    console.log(`[MongoDB] Deleted contact: ${result.name || result.phoneNumber} (${result._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`contact_${contactId}`);
    invalidateCacheByPattern('contact_list');
    
    return true;
  } catch (error) {
    console.error(`[MongoDB] Error deleting contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Add tags to contact
 * @param {string} contactId - Contact ID
 * @param {Array<string>} tags - Array of tags
 * @returns {Promise<Object>} Updated contact document
 * @throws {Error} If update fails
 */
export async function addTagsToContact(contactId, tags) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags array is required');
    }
    
    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { $addToSet: { tags: { $each: tags } } },
      { new: true, runValidators: true }
    );
    
    if (!updatedContact) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return null;
    }
    
    console.log(`[MongoDB] Added tags to contact: ${updatedContact.name || updatedContact.phoneNumber} (${updatedContact._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`contact_${contactId}`);
    
    return updatedContact;
  } catch (error) {
    console.error(`[MongoDB] Error adding tags to contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Remove tags from contact
 * @param {string} contactId - Contact ID
 * @param {Array<string>} tags - Array of tags
 * @returns {Promise<Object>} Updated contact document
 * @throws {Error} If update fails
 */
export async function removeTagsFromContact(contactId, tags) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      throw new Error('Tags array is required');
    }
    
    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { $pull: { tags: { $in: tags } } },
      { new: true, runValidators: true }
    );
    
    if (!updatedContact) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return null;
    }
    
    console.log(`[MongoDB] Removed tags from contact: ${updatedContact.name || updatedContact.phoneNumber} (${updatedContact._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`contact_${contactId}`);
    
    return updatedContact;
  } catch (error) {
    console.error(`[MongoDB] Error removing tags from contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Update contact call history
 * @param {string} contactId - Contact ID
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Updated contact document
 * @throws {Error} If update fails
 */
export async function updateContactCallHistory(contactId, callId) {
  try {
    if (!contactId) {
      throw new Error('Contact ID is required');
    }
    
    if (!callId) {
      throw new Error('Call ID is required');
    }
    
    // Find and update the contact
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { 
        $addToSet: { callIds: callId },
        $inc: { callCount: 1 },
        $set: { lastContacted: new Date() }
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedContact) {
      console.log(`[MongoDB] No contact found with ID: ${contactId}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated call history for contact: ${updatedContact.name || updatedContact.phoneNumber} (${updatedContact._id})`);
    
    // Invalidate cache
    invalidateCacheByPattern(`contact_${contactId}`);
    
    return updatedContact;
  } catch (error) {
    console.error(`[MongoDB] Error updating call history for contact with ID ${contactId}:`, error);
    throw error;
  }
}

/**
 * Atomically claim a contact for calling
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object|null>} Claimed contact or null if none available
 * @throws {Error} If operation fails
 */
export async function claimNextContactForCalling(campaignId) {
  try {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    
    // Atomically find and update a contact with pending status and no calls
    const contact = await Contact.findOneAndUpdate(
      {
        campaignIds: campaignId,
        status: 'pending',
        callCount: 0
      },
      {
        $inc: { callCount: 1 },
        $set: { 
          lastContacted: new Date(),
          status: 'calling'  // Mark as calling to prevent any other process from selecting it
        }
      },
      {
        new: true,  // Return the updated document
        sort: { createdAt: 1 }  // Process contacts in order they were added
      }
    );
    
    if (contact) {
      console.log(`[MongoDB] Atomically claimed contact for calling: ${contact.name || contact.phoneNumber} (${contact._id})`);
    }
    
    return contact;
  } catch (error) {
    console.error(`[MongoDB] Error claiming contact for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Import contacts from array
 * @param {Array<Object>} contacts - Array of contact objects
 * @param {string} campaignId - Optional campaign ID to associate contacts with
 * @returns {Promise<Object>} Import results
 * @throws {Error} If import fails
 */
export async function importContacts(contacts, campaignId = null) {
  try {
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new Error('Contacts array is required');
    }
    
    const results = {
      total: contacts.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };
    
    // Process each contact
    for (const contactData of contacts) {
      try {
        // Format phone number
        if (contactData.phoneNumber) {
          contactData.phoneNumber = contactData.phoneNumber.replace(/\D/g, '');
        } else {
          results.failed++;
          results.errors.push({
            data: contactData,
            error: 'Phone number is required'
          });
          continue;
        }
        
        // Add campaign ID if provided
        if (campaignId) {
          contactData.campaignIds = [campaignId];
        }
        
        // Check if contact already exists
        const existingContact = await Contact.findOne({ phoneNumber: contactData.phoneNumber });
        
        if (existingContact) {
          // Update existing contact
          const updateData = { ...contactData };
          
          // Add campaign ID if provided and not already present
          if (campaignId && !existingContact.campaignIds.includes(campaignId)) {
            updateData.campaignIds = [...existingContact.campaignIds, campaignId];
            // CRITICAL: Reset contact for new campaign
            updateData.callCount = 0;
            updateData.status = 'pending';
            updateData.lastCallResult = null;
            updateData.lastCallDate = null;
            console.log(`[MongoDB] Resetting contact ${existingContact.phoneNumber} for new campaign ${campaignId}`);
          }
          
          await Contact.updateOne(
            { _id: existingContact._id },
            { $set: updateData }
          );
          
          results.updated++;
        } else {
          // Create new contact
          await Contact.create(contactData);
          results.created++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          data: contactData,
          error: error.message
        });
      }
    }
    
    console.log(`[MongoDB] Imported contacts: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);
    
    // Invalidate cache
    invalidateCacheByPattern('contact_list');
    if (campaignId) {
      invalidateCacheByPattern(`campaign_${campaignId}`);
    }
    
    return results;
  } catch (error) {
    console.error('[MongoDB] Error importing contacts:', error);
    throw error;
  }
}

export default {
  saveContact,
  getContactById,
  getContactByPhoneNumber,
  getContacts,
  updateContact,
  deleteContact,
  addTagsToContact,
  removeTagsFromContact,
  updateContactCallHistory,
  importContacts,
  claimNextContactForCalling
};