/**
 * Call Event API
 * Provides API endpoints for call events
 */
import { getCallEventRepository } from '../index.js';

/**
 * Register call event API routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Options
 */
export function registerCallEventApiRoutes(fastify, options = {}) {
  const callEventRepository = getCallEventRepository();
  
  // Get events for a specific call
  fastify.get('/api/db/events/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;
      const { limit, page, eventType, sortDirection } = request.query;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required'
        });
      }
      
      const events = await callEventRepository.getCallEvents(callSid, {
        limit: limit ? parseInt(limit) : 100,
        page: page ? parseInt(page) : 1,
        eventType,
        sortDirection
      });
      
      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('[API] Error getting call events:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call events',
        details: error.message
      });
    }
  });
  
  // Get events by type
  fastify.get('/api/db/events/type/:eventType', async (request, reply) => {
    try {
      const { eventType } = request.params;
      const { limit, page, startDate, endDate, source } = request.query;
      
      if (!eventType) {
        return reply.code(400).send({
          success: false,
          error: 'Event type is required'
        });
      }
      
      const events = await callEventRepository.getEventsByType(eventType, {
        limit: limit ? parseInt(limit) : 100,
        page: page ? parseInt(page) : 1,
        startDate,
        endDate,
        source
      });
      
      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('[API] Error getting events by type:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get events by type',
        details: error.message
      });
    }
  });
  
  // Get recent events
  fastify.get('/api/db/events', async (request, reply) => {
    try {
      const { limit, page, eventTypes } = request.query;
      
      const events = await callEventRepository.getRecentEvents({
        limit: limit ? parseInt(limit) : 100,
        page: page ? parseInt(page) : 1,
        eventTypes: eventTypes ? eventTypes.split(',') : null
      });
      
      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('[API] Error getting recent events:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get recent events',
        details: error.message
      });
    }
  });
  
  // Log a new event
  fastify.post('/api/db/events', async (request, reply) => {
    try {
      const { callSid, eventType, data, source } = request.body;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required'
        });
      }
      
      if (!eventType) {
        return reply.code(400).send({
          success: false,
          error: 'Event type is required'
        });
      }
      
      const event = await callEventRepository.logEvent(callSid, eventType, data || {}, {
        source: source || 'system'
      });
      
      return {
        success: true,
        data: {
          event
        }
      };
    } catch (error) {
      console.error('[API] Error logging event:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to log event',
        details: error.message
      });
    }
  });
  
  console.log('[MongoDB] Registered call event API routes');
}

export default {
  registerCallEventApiRoutes
};