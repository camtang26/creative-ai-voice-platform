/**
 * Transcript API Routes
 * Provides API endpoints for retrieving and searching transcript data from MongoDB
 */
import {
  getTranscriptByCallSid,
  getTranscriptByConversationId,
  searchTranscripts,
  getTranscriptsBySentiment,
  saveTranscript
} from '../repositories/transcript.repository.js';

/**
 * Register transcript API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerTranscriptApiRoutes(fastify, options = {}) {
  // Get transcript for a call
  fastify.get('/api/db/calls/:callSid/transcript', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const transcript = await getTranscriptByCallSid(callSid);
      
      if (!transcript) {
        return reply.code(404).send({
          success: false,
          error: `Transcript not found for call: ${callSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: transcript,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving transcript:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving transcript',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get transcript by conversation ID
  fastify.get('/api/db/transcripts/conversation/:conversationId', async (request, reply) => {
    try {
      const { conversationId } = request.params;
      
      if (!conversationId) {
        return reply.code(400).send({
          success: false,
          error: 'Conversation ID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const transcript = await getTranscriptByConversationId(conversationId);
      
      if (!transcript) {
        return reply.code(404).send({
          success: false,
          error: `Transcript not found for conversation: ${conversationId}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: transcript,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving transcript:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving transcript',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Search transcripts
  fastify.get('/api/db/transcripts/search', async (request, reply) => {
    try {
      const { q, limit, page } = request.query;
      
      if (!q) {
        return reply.code(400).send({
          success: false,
          error: 'Search query (q) is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const options = {
        limit: limit ? parseInt(limit) : 20,
        page: page ? parseInt(page) : 1
      };
      
      const result = await searchTranscripts(q, options);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error searching transcripts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error searching transcripts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Create a new transcript
  fastify.post('/api/db/transcripts', async (request, reply) => {
    try {
      const transcriptData = request.body;
      
      if (!transcriptData) {
        return reply.code(400).send({
          success: false,
          error: 'Transcript data is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!transcriptData.callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!transcriptData.messages || !Array.isArray(transcriptData.messages) || transcriptData.messages.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Transcript messages are required',
          timestamp: new Date().toISOString()
        });
      }
      
      const savedTranscript = await saveTranscript(transcriptData);
      
      return {
        success: true,
        data: savedTranscript,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error creating transcript:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error creating transcript',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get transcripts by sentiment
  fastify.get('/api/db/transcripts/sentiment/:sentiment', async (request, reply) => {
    try {
      const { sentiment } = request.params;
      const { limit, page } = request.query;
      
      if (!sentiment || !['positive', 'negative', 'neutral'].includes(sentiment)) {
        return reply.code(400).send({
          success: false,
          error: 'Valid sentiment is required (positive, negative, neutral)',
          timestamp: new Date().toISOString()
        });
      }
      
      const options = {
        limit: limit ? parseInt(limit) : 20,
        page: page ? parseInt(page) : 1
      };
      
      const result = await getTranscriptsBySentiment(sentiment, options);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving transcripts by sentiment:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving transcripts by sentiment',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}

export default {
  registerTranscriptApiRoutes
};