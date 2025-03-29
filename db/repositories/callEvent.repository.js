/**
 * Call Event Repository
 * Provides data access methods for the callEvents collection
 */
import CallEvent from '../models/callEvent.model.js';

/**
 * Log a call event to the database
 * @param {string} callSid - Call SID
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {string} source - Event source
 * @returns {Promise<Object>} Saved event document
 * @throws {Error} If saving fails
 */
export async function logCallEvent(callSid, eventType, data, source = 'system') {
  try {
    if (!callSid) {
      throw new Error('Call SID is required for event logging');
    }
    
    if (!eventType) {
      throw new Error('Event type is required for event logging');
    }
    
    // Create event document
    const event = new CallEvent({
      callSid,
      eventType,
      data: data || {},
      source,
      timestamp: new Date()
    });
    
    // Save to database
    const savedEvent = await event.save();
    console.log(`[MongoDB] Logged ${eventType} event for call ${callSid}`);
    
    return savedEvent;
  } catch (error) {
    console.error(`[MongoDB] Error logging ${eventType} event for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get events for a specific call
 * @param {string} callSid - Call SID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of event documents
 * @throws {Error} If retrieval fails
 */
export async function getCallEvents(callSid, options = {}) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    const { 
      limit = 100, 
      page = 1, 
      eventType = null,
      sortDirection = 'desc'
    } = options;
    
    const skip = (page - 1) * limit;
    const sortOrder = sortDirection === 'asc' ? 1 : -1;
    
    // Build query
    const query = { callSid };
    if (eventType) {
      query.eventType = eventType;
    }
    
    // Execute query
    const events = await CallEvent.find(query)
      .sort({ timestamp: sortOrder })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await CallEvent.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${events.length} events for call ${callSid} (page ${page}, total: ${total})`);
    
    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error(`[MongoDB] Error getting events for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get events by type
 * @param {string} eventType - Event type
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of event documents
 * @throws {Error} If retrieval fails
 */
export async function getEventsByType(eventType, options = {}) {
  try {
    if (!eventType) {
      throw new Error('Event type is required');
    }
    
    const { 
      limit = 100, 
      page = 1,
      startDate = null,
      endDate = null,
      source = null
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { eventType };
    
    // Add date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Add source if provided
    if (source) {
      query.source = source;
    }
    
    // Execute query
    const events = await CallEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await CallEvent.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${events.length} ${eventType} events (page ${page}, total: ${total})`);
    
    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      query: {
        eventType,
        startDate,
        endDate,
        source
      }
    };
  } catch (error) {
    console.error(`[MongoDB] Error getting ${eventType} events:`, error);
    throw error;
  }
}

/**
 * Get recent events across all calls
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of event documents
 * @throws {Error} If retrieval fails
 */
export async function getRecentEvents(options = {}) {
  try {
    const { 
      limit = 100, 
      page = 1,
      eventTypes = null
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (eventTypes && Array.isArray(eventTypes) && eventTypes.length > 0) {
      query.eventType = { $in: eventTypes };
    }
    
    // Execute query
    const events = await CallEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await CallEvent.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${events.length} recent events (page ${page}, total: ${total})`);
    
    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[MongoDB] Error getting recent events:', error);
    throw error;
  }
}

/**
 * Create a centralized event logger function
 * @param {string} callSid - Call SID
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Saved event document
 */
export async function logEvent(callSid, eventType, data, options = {}) {
  try {
    const { source = 'system' } = options;
    
    // Add timestamp if not provided
    const eventData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    };
    
    return await logCallEvent(callSid, eventType, eventData, source);
  } catch (error) {
    console.error(`[MongoDB] Error in centralized event logger:`, error);
    // Don't throw, just log the error to prevent disrupting the main flow
    return null;
  }
}

export default {
  logCallEvent,
  getCallEvents,
  getEventsByType,
  getRecentEvents,
  logEvent
};