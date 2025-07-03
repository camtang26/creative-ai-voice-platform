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
import { fixTerminatedByValues } from './db/api/admin.api.js';
import { fixTerminatedByWithVoiceInsights } from './db/api/admin-voice-insights.api.js';

/**
 * Register enhanced API routes with standardized response formats and error handling
 * @param {Object} server - Fastify server instance
 * @param {Object} twilioClient - Twilio client
 * @param {Map} activeCalls - Map of active calls
 */
export function registerApiRoutes(server, twilioClient, activeCalls) {
  // Register the authentication decorator
  server.decorate('authenticate', authenticate);

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
  
  // Validate phone number endpoint
  server.post('/api/validate-phone', asyncHandler(async (request, reply) => {
    console.log('[Phone Validation] Received request:', request.body);
    const { phoneNumber } = request.body;
    
    if (!phoneNumber) {
      console.log('[Phone Validation] Missing phone number in request');
      throw ApiError.badRequest(
        'Phone number is required',
        'MISSING_PHONE_NUMBER'
      );
    }
    
    // Basic phone validation
    // Remove all non-digit characters except + at the beginning
    const cleaned = phoneNumber.toString().replace(/[^\d+]/g, '');
    
    // Check if it's a valid format
    // E.164 format: + followed by 1-15 digits
    // or US format: 10 or 11 digits
    const isE164 = /^\+[1-9]\d{1,14}$/.test(cleaned);
    const isUS10 = /^[2-9]\d{9}$/.test(cleaned);
    const isUS11 = /^1[2-9]\d{9}$/.test(cleaned);
    const isUSWithPlus = /^\+1[2-9]\d{9}$/.test(cleaned);
    
    const isValid = isE164 || isUS10 || isUS11 || isUSWithPlus;
    
    if (!isValid) {
      const invalidResponse = createSuccessResponse({
        isValid: false,
        error: 'Invalid phone number format',
        originalNumber: phoneNumber,
        cleanedNumber: cleaned
      }, 'Phone validation completed');
      
      console.log('[Phone Validation] Sending invalid response:', invalidResponse);
      return invalidResponse;
    }
    
    // Format the number to E.164 if it's valid
    let formatted = cleaned;
    if (isUS10) {
      formatted = '+1' + cleaned;
    } else if (isUS11 && !cleaned.startsWith('+')) {
      formatted = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      formatted = '+' + cleaned;
    }
    
    const response = createSuccessResponse({
      isValid: true,
      originalNumber: phoneNumber,
      formattedNumber: formatted,
      cleanedNumber: cleaned
    }, 'Phone number is valid');
    
    console.log('[Phone Validation] Sending response:', response);
    return response;
  }));
  
  // Transcript route is likely registered within db/api/transcript-api.js via initializeMongoDB
  
  // Admin endpoint to fix historical terminatedBy values
  server.post('/api/admin/fix-terminated-by', asyncHandler(async (request, reply) => {
    return await fixTerminatedByValues(request, reply);
  }));
  
  // Admin endpoint to fix terminatedBy using Voice Insights
  server.post('/api/admin/fix-terminated-by-voice-insights', asyncHandler(async (request, reply) => {
    return await fixTerminatedByWithVoiceInsights(request, reply);
  }));
  
  // Admin endpoint to fix terminatedBy using enhanced detection
  server.post('/api/admin/fix-terminated-by-enhanced', asyncHandler(async (request, reply) => {
    const { enhancedTerminationDetection } = await import('./db/api/admin.api.js');
    return await enhancedTerminationDetection(request, reply);
  }));
}
