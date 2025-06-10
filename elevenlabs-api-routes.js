/**
 * API Routes for proxying requests to the ElevenLabs API
 */
import fetch from 'node-fetch';
import { 
  asyncHandler, 
  createSuccessResponse, 
  ApiError 
} from './api-utils.js';

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * Register ElevenLabs proxy API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options (unused for now)
 */
export async function registerElevenLabsApiRoutes(fastify, options = {}) {
  console.log('[API Register] Attempting to register ElevenLabs proxy routes...');

  fastify.get('/api/elevenlabs/conversation/:conversationId', asyncHandler(async (request, reply) => {
    const { conversationId } = request.params;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log(`[API Handler] Received request for GET /api/elevenlabs/conversation/${conversationId}`);

    if (!conversationId) {
      throw ApiError.badRequest('Conversation ID is required in the path.');
    }

    if (!apiKey) {
      console.error('[API Error] ELEVENLABS_API_KEY environment variable is not set.');
      throw ApiError.internalServerError('Server configuration error: Missing API key.');
    }

    const elevenLabsUrl = `${ELEVENLABS_API_BASE_URL}/convai/conversations/${conversationId}`;
    console.log(`[API Proxy] Fetching from ElevenLabs: ${elevenLabsUrl}`);

    try {
      const response = await fetch(elevenLabsUrl, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[API Proxy] ElevenLabs response status: ${response.status}`);

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
          console.error(`[API Proxy] ElevenLabs Error Response Body:`, JSON.stringify(errorBody));
        } catch (e) {
          errorBody = await response.text();
           console.error(`[API Proxy] ElevenLabs Error Response Text:`, errorBody);
        }
        
        // Map ElevenLabs status codes to appropriate ApiErrors
        if (response.status === 401) {
           throw ApiError.unauthorized('Authentication failed with ElevenLabs API. Check API Key.', 'ELEVENLABS_AUTH_ERROR');
        }
        if (response.status === 404) {
           throw ApiError.notFound(`Conversation ${conversationId} not found on ElevenLabs.`, 'ELEVENLABS_NOT_FOUND', { conversationId });
        }
         if (response.status === 422) {
           throw ApiError.badRequest(`Validation error from ElevenLabs API: ${JSON.stringify(errorBody?.detail) || 'Unknown validation error'}`, 'ELEVENLABS_VALIDATION_ERROR', { errorBody });
        }
        // Generic error for other non-OK statuses
        throw ApiError.serviceUnavailable(`ElevenLabs API returned status ${response.status}`, 'ELEVENLABS_API_ERROR', { status: response.status, body: errorBody });
      }

      const data = await response.json();
      console.log(`[API Proxy] Successfully fetched data for conversation ${conversationId}`);
      
      // Return the data wrapped in our standard success response
      return createSuccessResponse(data, 'Conversation details retrieved successfully from ElevenLabs.');

    } catch (error) {
      // Handle network errors or errors already thrown as ApiError
      if (error instanceof ApiError) {
        throw error; // Re-throw ApiErrors to be handled by the global error handler
      }
      console.error(`[API Proxy] Network or other error fetching from ElevenLabs:`, error);
      throw ApiError.internalServerError('Failed to communicate with ElevenLabs API.', 'ELEVENLABS_NETWORK_ERROR', { originalError: error.message });
    }
  }));

  console.log('[API Register] Registered GET /api/elevenlabs/conversation/:conversationId');
}

export default {
  registerElevenLabsApiRoutes
};