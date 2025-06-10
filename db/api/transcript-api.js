/**
 * Transcript API Routes
 * Provides API endpoints for retrieving transcript data (aligned with ElevenLabs structure) from MongoDB
 */
import {
  getTranscriptByCallSid,
  getTranscriptByConversationId,
  // Removed imports for searchTranscripts, getTranscriptsBySentiment, saveTranscript
} from '../repositories/transcript.repository.js';

/**
 * Register transcript API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerTranscriptApiRoutes(fastify, options = {}) {
  console.log('[API Register] Registering Transcript API routes...');

  // Get transcript for a call by Call SID
  fastify.get('/api/db/calls/:callSid/transcript', async (request, reply) => {
    console.log(`[API Handler] Received request for GET /api/db/calls/${request.params?.callSid}/transcript`);
    try {
      const { callSid } = request.params;

      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }

      // This now fetches the document with the full ElevenLabs structure
      const transcript = await getTranscriptByCallSid(callSid);

      if (!transcript) {
        return reply.code(404).send({
          success: false,
          error: `Transcript not found for call: ${callSid}`,
          timestamp: new Date().toISOString()
        });
      }

      // The 'transcript' object here contains the full data (transcript array, analysis object, etc.)
      return {
        success: true,
        // Rename 'data' to 'transcript' for consistency with previous frontend expectations?
        // Or keep as 'data' and update frontend lib/api.ts? Let's keep as 'data' for now.
        data: transcript,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving transcript by Call SID:`, error);
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
     console.log(`[API Handler] Received request for GET /api/db/transcripts/conversation/${request.params?.conversationId}`);
    try {
      const { conversationId } = request.params;

      if (!conversationId) {
        return reply.code(400).send({
          success: false,
          error: 'Conversation ID is required',
          timestamp: new Date().toISOString()
        });
      }

      // This now fetches the document with the full ElevenLabs structure
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
      console.error(`[API] Error retrieving transcript by Conversation ID:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving transcript',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // --- Removed Obsolete Routes ---
  // Removed GET /api/db/transcripts/search
  // Removed POST /api/db/transcripts
  // Removed GET /api/db/transcripts/sentiment/:sentiment
  // --- End Removed Obsolete Routes ---

  console.log('[API Register] Transcript API routes registered.');
}

export default {
  registerTranscriptApiRoutes
};