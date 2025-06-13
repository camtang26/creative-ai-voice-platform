/**
 * API Utilities for call management and standardized API responses
 */

/**
 * Async function wrapper for simplified error handling
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
export const asyncHandler = (fn) => (request, reply) => {
  return Promise.resolve(fn(request, reply)).catch((err) => {
    // If err is an ApiError, let Fastify's error handler manage it
    if (err instanceof ApiError) {
      throw err;
    }
    // For other errors, send a generic error response
    reply.code(500).send({
      success: false,
      error: {
        message: err.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Create a standardized success response
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @returns {Object} Standardized response object
 */
export const createSuccessResponse = (data, message = null) => {
  return {
    success: true,
    data,
    message: message || 'Operation completed successfully',
    timestamp: new Date().toISOString()
  };
};

/**
 * API Error class for standardized error responses
 */
export class ApiError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  // Factory methods for common error types
  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details = null) {
    return new ApiError(message, 401, code, details);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details = null) {
    return new ApiError(message, 403, code, details);
  }

  static notFound(message, code = 'NOT_FOUND', details = null) {
    return new ApiError(message, 404, code, details);
  }

  static conflict(message, code = 'CONFLICT', details = null) {
    return new ApiError(message, 409, code, details);
  }

  static internalServer(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR', details = null) {
    return new ApiError(message, 500, code, details);
  }

  static serviceUnavailable(message = 'Service Unavailable', code = 'SERVICE_UNAVAILABLE', details = null) {
    return new ApiError(message, 503, code, details);
  }
}

/**
 * Authentication middleware
 * @param {Object} request - Fastify request
 * @param {Object} reply - Fastify reply
 * @param {Function} done - Fastify done callback
 */
export const authenticate = (request, reply, done) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn('[Auth] API_KEY not configured in environment variables');
    done(ApiError.internalServer('API authentication not configured', 'AUTH_NOT_CONFIGURED'));
    return;
  }

  // Check for API key in Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (providedKey === apiKey) {
      done();
      return;
    }
  }

  // Check for API key in query parameter
  const queryKey = request.query.api_key;
  if (queryKey && queryKey === apiKey) {
    done();
    return;
  }

  // No valid API key found
  done(ApiError.unauthorized('Invalid or missing API key', 'INVALID_API_KEY'));
};

/**
 * Validate if a string is a valid Twilio Call SID
 * @param {String} callSid - Call SID to validate
 * @returns {Boolean} True if valid Call SID format
 */
export const isValidCallSid = (callSid) => {
  // Twilio Call SIDs typically start with CA and have a specific format
  return typeof callSid === 'string' && /^CA[a-f0-9]{32}$/.test(callSid);
};

/**
 * Validate if a call is active and exists
 * @param {String} callSid - Call SID to validate
 * @param {Map} activeCalls - Map of active calls
 * @returns {Object} The call info if valid
 * @throws {ApiError} If call is not found or not active
 */
export const validateActiveCall = (callSid, activeCalls) => {
  if (!activeCalls || !activeCalls.has(callSid)) {
    throw ApiError.notFound(
      `Call not found: ${callSid}`,
      'CALL_NOT_FOUND',
      { providedSid: callSid }
    );
  }

  const callInfo = activeCalls.get(callSid);
  if (!['initiated', 'ringing', 'in-progress'].includes(callInfo.status)) {
    throw ApiError.badRequest(
      `Call ${callSid} is not active (status: ${callInfo.status})`,
      'CALL_NOT_ACTIVE',
      { callSid, status: callInfo.status }
    );
  }

  return callInfo;
};

/**
 * Format call data for API responses
 * @param {Object} call - Call data
 * @returns {Object} Formatted call data
 */
export const formatCallData = (call) => {
  return {
    sid: call.sid,
    status: call.status,
    from: call.from || 'unknown',
    to: call.to || 'unknown',
    startTime: call.startTime,
    endTime: call.endTime || null,
    duration: call.duration || 0,
    answeredBy: call.answeredBy || null,
    recordings: (call.recordings || []).map(rec => ({
      sid: rec.sid,
      url: rec.url,
      duration: rec.duration || 0,
      channels: rec.channels || 1,
      timestamp: rec.timestamp
    }))
  };
};

export default {
  asyncHandler,
  createSuccessResponse,
  ApiError,
  authenticate,
  isValidCallSid,
  validateActiveCall,
  formatCallData
};
