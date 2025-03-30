/**
 * Enhanced API routes for the ElevenLabs Twilio integration
 * Provides standardized response formats, error handling, and authentication
 */

import { fetchRecentCalls } from './call-statistics.js';
import { 
  asyncHandler, 
  createSuccessResponse, 
  ApiError, 
  authenticate,
  isValidCallSid,
  validateActiveCall
} from './api-utils.js';
import {
  terminateCall
} from './enhanced-call-handler.js';

/**
 * Register enhanced API routes with standardized response formats and error handling
 * @param {Object} server - Fastify server instance
 * @param {Object} twilioClient - Twilio client
 * @param {Map} activeCalls - Map of active calls
 */
export function registerApiRoutes(server, twilioClient, activeCalls) {
  // Register the authentication decorator
  server.decorate('authenticate', authenticate);

  // Add error handler to the server
  server.setErrorHandler((error, request, reply) => {
    const isApiError = error instanceof ApiError;
    const statusCode = isApiError ? error.statusCode : 500;
    
    let errorResponse = {
      success: false,
      error: {
        message: error.message,
        code: isApiError ? error.errorCode : 'UNKNOWN_ERROR',
        details: isApiError ? error.details : null,
      },
      timestamp: new Date().toISOString(),
      requestId: request.requestId || 'unknown'
    };
    
    console.error(`[API Error] [${request.requestId || 'unknown'}] ${error.message}`, error);
    
    return reply.code(statusCode).send(errorResponse);
  });

  // Get call statistics
  server.get('/api/call-stats', asyncHandler(async (request, reply) => {
    // Basic stats about calls
    const stats = {
      totalCalls: activeCalls.size,
      callsByStatus: {},
      activeCalls: [],
      completedCalls: []
    };
    
    // Count calls by status
    for (const [sid, call] of activeCalls.entries()) {
      if (!stats.callsByStatus[call.status]) {
        stats.callsByStatus[call.status] = 0;
      }
      stats.callsByStatus[call.status]++;
      
      // Add to the right list
      const callSummary = {
        sid: call.sid,
        status: call.status,
        to: call.to || 'unknown',
        from: call.from || 'unknown',
        startTime: call.startTime,
        duration: call.duration || 'unknown',
        recordingCount: call.recordings ? call.recordings.length : 0,
        answeredBy: call.answeredBy || 'unknown'
      };
      
      if (['initiated', 'ringing', 'in-progress'].includes(call.status)) {
        stats.activeCalls.push(callSummary);
      } else {
        stats.completedCalls.push(callSummary);
      }
    }
    
    return createSuccessResponse(stats, 'Call statistics retrieved successfully');
  }));

  // Get recent calls
  server.get('/api/recent-calls', asyncHandler(async (request, reply) => {
    const count = request.query.count ? parseInt(request.query.count, 10) : 5;
    
    if (isNaN(count) || count < 1 || count > 100) {
      throw ApiError.badRequest(
        'Invalid count parameter. Must be a number between 1 and 100.',
        'INVALID_PARAMETER',
        { parameter: 'count', value: request.query.count }
      );
    }
    
    const recentCalls = fetchRecentCalls(count);
    
    return createSuccessResponse(
      { calls: recentCalls, totalCount: recentCalls.length },
      'Recent calls retrieved successfully'
    );
  }));

  // Get call by ID
  server.get('/api/calls/:callSid', asyncHandler(async (request, reply) => {
    const { callSid } = request.params;
    
    if (!isValidCallSid(callSid)) {
      throw ApiError.badRequest(
        `Invalid call SID format: ${callSid}`,
        'INVALID_CALL_SID',
        { providedSid: callSid }
      );
    }
    
    // First check our local cache
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      return createSuccessResponse(
        { callInfo },
        'Call information retrieved successfully'
      );
    }
    
    // If not in cache and we have Twilio client, try to fetch from Twilio
    if (twilioClient) {
      try {
        const call = await twilioClient.calls(callSid).fetch();
        const recordings = await twilioClient.recordings.list({callSid});
        
        const callInfo = {
          sid: call.sid,
          status: call.status,
          from: call.from,
          to: call.to,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
          recordings: recordings.map(rec => ({
            sid: rec.sid,
            url: rec.mediaUrl,
            duration: rec.duration,
            timestamp: rec.dateCreated
          }))
        };
        
        return createSuccessResponse(
          { callInfo, source: 'twilio' },
          'Call information retrieved from Twilio'
        );
      } catch (error) {
        if (error.status === 404 || error.code === 20404) {
          throw ApiError.notFound(
            `Call not found: ${callSid}`,
            'CALL_NOT_FOUND',
            { providedSid: callSid }
          );
        }
        
        throw ApiError.serviceUnavailable(
          `Twilio API error: ${error.message}`,
          'TWILIO_API_ERROR',
          { twilioErrorCode: error.code, twilioMessage: error.message }
        );
      }
    }
    
    // If we don't have info or Twilio client
    throw ApiError.notFound(
      `Call not found: ${callSid}`,
      'CALL_NOT_FOUND',
      { providedSid: callSid, twilioClientAvailable: !!twilioClient }
    );
  }));

  // Get active calls
  server.get('/api/calls/active', asyncHandler(async (request, reply) => {
    if (!activeCalls) {
      return createSuccessResponse(
        { calls: [], count: 0 },
        'No active calls found'
      );
    }
    
    const activeCallsList = Array.from(activeCalls.entries())
      .filter(([_, call]) => ['initiated', 'ringing', 'in-progress'].includes(call.status))
      .map(([sid, call]) => ({
        sid,
        status: call.status,
        to: call.to || 'unknown',
        from: call.from || 'unknown',
        startTime: call.startTime,
        duration: call.duration || 0,
        answeredBy: call.answeredBy || 'unknown',
        recordingCount: call.recordings ? call.recordings.length : 0
      }));
    
    return createSuccessResponse(
      { calls: activeCallsList, count: activeCallsList.length },
      `${activeCallsList.length} active calls found`
    );
  }));

  // Terminate a call - requires authentication
  server.post(
    '/api/calls/:callSid/terminate', 
    { 
      preHandler: server.authenticate 
    },
    asyncHandler(async (request, reply) => {
      const { callSid } = request.params;
      const { force = false, reason = 'api-request' } = request.body || {};
      
      if (!isValidCallSid(callSid)) {
        throw ApiError.badRequest(
          `Invalid call SID format: ${callSid}`,
          'INVALID_CALL_SID',
          { providedSid: callSid }
        );
      }
      
      const result = await terminateCall(callSid, { force, reason });
      
      return createSuccessResponse(
        result,
        `Call ${callSid} terminated successfully`
      );
    })
  );
  
  // Get call recordings
  server.get('/api/calls/:callSid/recordings', asyncHandler(async (request, reply) => {
    const { callSid } = request.params;
    
    if (!isValidCallSid(callSid)) {
      throw ApiError.badRequest(
        `Invalid call SID format: ${callSid}`,
        'INVALID_CALL_SID',
        { providedSid: callSid }
      );
    }
    
    // Check if we have call info locally
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      const recordings = callInfo.recordings || [];
      
      return createSuccessResponse(
        { 
          callSid, 
          recordings, 
          count: recordings.length,
          source: 'local'
        },
        recordings.length > 0 
          ? `${recordings.length} recordings found` 
          : 'No recordings found for this call'
      );
    }
    
    // Try to get recordings from Twilio
    if (twilioClient) {
      try {
        const recordings = await twilioClient.recordings.list({ callSid });
        
        const formattedRecordings = recordings.map(rec => ({
          sid: rec.sid,
          url: rec.mediaUrl || `https://api.twilio.com/2010-04-01/Accounts/${twilioClient.accountSid}/Recordings/${rec.sid}.mp3`,
          duration: rec.duration,
          channels: rec.channels,
          timestamp: rec.dateCreated,
          status: rec.status
        }));
        
        return createSuccessResponse(
          { 
            callSid, 
            recordings: formattedRecordings, 
            count: formattedRecordings.length,
            source: 'twilio'
          },
          formattedRecordings.length > 0 
            ? `${formattedRecordings.length} recordings found from Twilio` 
            : 'No recordings found for this call'
        );
      } catch (error) {
        if (error.status === 404 || error.code === 20404) {
          throw ApiError.notFound(
            `Call not found: ${callSid}`,
            'CALL_NOT_FOUND',
            { providedSid: callSid }
          );
        }
        
        throw ApiError.serviceUnavailable(
          `Twilio API error: ${error.message}`,
          'TWILIO_API_ERROR',
          { twilioErrorCode: error.code, twilioMessage: error.message }
        );
      }
    }
    
    throw ApiError.notFound(
      `No recordings found for call: ${callSid}`,
      'RECORDINGS_NOT_FOUND',
      { providedSid: callSid, twilioClientAvailable: !!twilioClient }
    );
  }));
  
  // --- ADDED: Get call transcript ---
  // Import transcript API functions (assuming they exist or will be created)
  // We'll need to ensure the repository is attached during initialization
  // import { getTranscriptRepository } from './db/index.js'; // Or wherever it's exported
  
  server.get('/api/db/calls/:callSid/transcript', asyncHandler(async (request, reply) => {
    const { callSid } = request.params;
    
    if (!isValidCallSid(callSid)) {
      throw ApiError.badRequest(`Invalid call SID format: ${callSid}`, 'INVALID_CALL_SID', { providedSid: callSid });
    }
    
    // Placeholder: Assume getTranscriptRepository exists and is attached to server instance
    // This attachment needs to happen in server-mongodb.js during initializeDatabase
    const transcriptRepository = server.transcriptRepository;
    if (!transcriptRepository) {
       throw ApiError.internalServerError('Transcript repository not available.', 'REPOSITORY_UNAVAILABLE');
    }
    
    // Fetch transcript segments from the database, ordered by timestamp
    // We might want full transcript assembly logic here or in the repository
    const transcriptEvents = await transcriptRepository.findEventsByCallSid(callSid, ['transcript_segment', 'user_transcript', 'agent_response']); // Fetch relevant events
    
    if (!transcriptEvents || transcriptEvents.length === 0) {
      // Return empty array if no segments found, rather than 404, as the call might exist but have no transcript yet
      return createSuccessResponse({ callSid, transcript: [] }, 'No transcript segments found for this call');
    }
    
    // Basic assembly for now - just return the segments ordered by time
    // TODO: Consider adding logic to assemble into a coherent transcript string if needed by frontend
    const formattedTranscript = transcriptEvents
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Ensure order
      .map(event => ({
        role: event.data?.role || (event.eventType === 'user_transcript' ? 'user' : 'agent'), // Infer role if missing
        text: event.data?.text || event.data?.message || '', // Handle different data structures
        timestamp: event.timestamp,
        eventType: event.eventType // Include event type for context
      }));
    
    return createSuccessResponse({ callSid, transcript: formattedTranscript }, 'Transcript segments retrieved successfully');
  }));
  // --- End Get call transcript ---
  
}
