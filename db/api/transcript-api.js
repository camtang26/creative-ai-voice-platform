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
      let transcript = await getTranscriptByCallSid(callSid);

      // If transcript not found, try to recover it from ElevenLabs
      if (!transcript) {
        console.log(`[API Handler] Transcript not found in DB for ${callSid}, attempting recovery from ElevenLabs`);
        
        // First, get the call to find conversation ID
        const { getCallBySid } = await import('../repositories/call.repository.js');
        const call = await getCallBySid(callSid);
        
        if (call && call.conversationId) {
          console.log(`[API Handler] Found conversation ID ${call.conversationId}, fetching from ElevenLabs`);
          
          // Try to fetch and save the transcript
          const { createOrUpdateTranscriptFromElevenLabs } = await import('../repositories/transcript.repository.js');
          
          try {
            // Fetch from ElevenLabs API
            const apiKey = process.env.ELEVENLABS_API_KEY;
            if (apiKey) {
              const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${call.conversationId}`;
              const response = await fetch(elevenLabsUrl, {
                method: 'GET',
                headers: { 'xi-api-key': apiKey }
              });
              
              if (response.ok) {
                const elevenLabsData = await response.json();
                // Save the transcript
                transcript = await createOrUpdateTranscriptFromElevenLabs(callSid, elevenLabsData);
                console.log(`[API Handler] Successfully recovered transcript for ${callSid} from ElevenLabs`);
              } else {
                console.error(`[API Handler] ElevenLabs API error: ${response.status}`);
              }
            }
          } catch (error) {
            console.error(`[API Handler] Error recovering transcript from ElevenLabs:`, error);
          }
        }
        
        // If still not found, return 404
        if (!transcript) {
          return reply.code(404).send({
            success: false,
            error: `Transcript not found for call: ${callSid}`,
            timestamp: new Date().toISOString()
          });
        }
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

  // Bulk recover missing transcripts
  fastify.post('/api/db/transcripts/recover-missing', async (request, reply) => {
    console.log('[API Handler] Received request to recover missing transcripts');
    try {
      const { limit = 50 } = request.body || {};
      
      // Find calls with conversation IDs but no transcripts
      const Call = (await import('../models/call.model.js')).default;
      const Transcript = (await import('../models/transcript.model.js')).default;
      
      // Get all calls with conversation IDs
      const callsWithConvIds = await Call.find({
        conversationId: { $exists: true, $ne: null },
        status: 'completed'
      }).limit(limit);
      
      console.log(`[API Handler] Found ${callsWithConvIds.length} completed calls with conversation IDs`);
      
      let recovered = 0;
      let failed = 0;
      const results = [];
      
      for (const call of callsWithConvIds) {
        // Check if transcript already exists
        const existingTranscript = await Transcript.findOne({ callSid: call.callSid });
        
        if (!existingTranscript) {
          console.log(`[API Handler] Attempting to recover transcript for ${call.callSid}`);
          
          try {
            // Fetch from ElevenLabs API
            const apiKey = process.env.ELEVENLABS_API_KEY;
            if (apiKey) {
              const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${call.conversationId}`;
              const response = await fetch(elevenLabsUrl, {
                method: 'GET',
                headers: { 'xi-api-key': apiKey }
              });
              
              if (response.ok) {
                const elevenLabsData = await response.json();
                // Save the transcript
                const { createOrUpdateTranscriptFromElevenLabs } = await import('../repositories/transcript.repository.js');
                await createOrUpdateTranscriptFromElevenLabs(call.callSid, elevenLabsData);
                
                recovered++;
                results.push({
                  callSid: call.callSid,
                  conversationId: call.conversationId,
                  status: 'recovered'
                });
                console.log(`[API Handler] Successfully recovered transcript for ${call.callSid}`);
              } else {
                failed++;
                results.push({
                  callSid: call.callSid,
                  conversationId: call.conversationId,
                  status: 'failed',
                  error: `ElevenLabs API error: ${response.status}`
                });
              }
            }
          } catch (error) {
            failed++;
            results.push({
              callSid: call.callSid,
              conversationId: call.conversationId,
              status: 'failed',
              error: error.message
            });
            console.error(`[API Handler] Error recovering transcript for ${call.callSid}:`, error);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return {
        success: true,
        summary: {
          checked: callsWithConvIds.length,
          recovered,
          failed,
          alreadyHadTranscripts: callsWithConvIds.length - recovered - failed
        },
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[API Handler] Error in bulk transcript recovery:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('[API Register] Transcript API routes registered.');
}

export default {
  registerTranscriptApiRoutes
};