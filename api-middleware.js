/**
 * API Middleware for standardized error handling and authentication
 * Provides consistent API responses and security for sensitive operations
 */
import { createHash } from 'crypto';

// Standard error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED'
};

// Verify API key from request
export function verifyApiKey(request) {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn('[API] API_KEY not configured in environment variables');
    return false;
  }
  
  // Check for API key in Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    return providedKey === apiKey;
  }
  
  // Check for API key in query parameter
  const queryKey = request.query.api_key;
  if (queryKey) {
    return queryKey === apiKey;
  }
  
  return false;
}

// Create a standardized API response
export function createApiResponse(success, data = null, error = null) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success && data) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = {
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      details: error.details || null
    };
  }
  
  return response;
}

// Authentication middleware for protected routes
export function authMiddleware(request, reply) {
  if (!verifyApiKey(request)) {
    return reply.code(401).send(
      createApiResponse(false, null, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
        details: 'Valid API key required in Authorization header or as api_key query parameter'
      })
    );
  }
}

// Error handler wrapper for route handlers
export function withErrorHandler(handler) {
  return async (request, reply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      console.error(`[API Error] ${error.message}`, error.stack);
      
      // Determine appropriate status code
      let statusCode = 500;
      let errorCode = ERROR_CODES.INTERNAL_ERROR;
      
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = ERROR_CODES.VALIDATION_ERROR;
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorCode = ERROR_CODES.NOT_FOUND;
      } else if (error.name === 'ConflictError') {
        statusCode = 409;
        errorCode = ERROR_CODES.CONFLICT;
      } else if (error.name === 'RateLimitError') {
        statusCode = 429;
        errorCode = ERROR_CODES.RATE_LIMITED;
      }
      
      return reply.code(statusCode).send(
        createApiResponse(false, null, {
          code: errorCode,
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : null
        })
      );
    }
  };
}

// Rate limiting (simple in-memory implementation)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

export function rateLimitMiddleware(request, reply, next) {
  // Create a key for the rate limit
  // For example, use IP address or API key
  const clientIp = request.ip;
  const key = `${clientIp}:${request.routeOptions.url}`;
  
  // Get current timestamp
  const now = Date.now();
  
  // Initialize or clean up existing record
  if (!requestCounts.has(key)) {
    requestCounts.set(key, {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
  } else {
    const record = requestCounts.get(key);
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    }
  }
  
  // Increment count and check if over limit
  const record = requestCounts.get(key);
  record.count += 1;
  
  // Set rate limit headers
  reply.header('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  reply.header('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count));
  reply.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
  
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return reply.code(429).send(
      createApiResponse(false, null, {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Rate limit exceeded',
        details: `Maximum of ${RATE_LIMIT_MAX_REQUESTS} requests allowed per minute`
      })
    );
  }
  
  next();
}

// Create custom error classes
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Utility function to validate request parameters
export function validateParams(params, schema) {
  const errors = {};
  
  for (const [key, config] of Object.entries(schema)) {
    const value = params[key];
    
    // Check required fields
    if (config.required && (value === undefined || value === null || value === '')) {
      errors[key] = `${key} is required`;
      continue;
    }
    
    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }
    
    // Type validation
    if (config.type && typeof value !== config.type) {
      errors[key] = `${key} must be a ${config.type}`;
    }
    
    // Pattern validation
    if (config.pattern && !config.pattern.test(value)) {
      errors[key] = config.message || `${key} has invalid format`;
    }
    
    // Enum validation
    if (config.enum && !config.enum.includes(value)) {
      errors[key] = `${key} must be one of: ${config.enum.join(', ')}`;
    }
    
    // Min/max validation for strings and arrays
    if ((typeof value === 'string' || Array.isArray(value)) && config.min !== undefined && value.length < config.min) {
      errors[key] = `${key} must be at least ${config.min} characters long`;
    }
    if ((typeof value === 'string' || Array.isArray(value)) && config.max !== undefined && value.length > config.max) {
      errors[key] = `${key} must be at most ${config.max} characters long`;
    }
    
    // Min/max validation for numbers
    if (typeof value === 'number') {
      if (config.min !== undefined && value < config.min) {
        errors[key] = `${key} must be at least ${config.min}`;
      }
      if (config.max !== undefined && value > config.max) {
        errors[key] = `${key} must be at most ${config.max}`;
      }
    }
  }
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
  
  return params;
}

// Headers for CORS
export function setupCorsHeaders(reply) {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Register these middlewares with Fastify
export function registerApiMiddleware(server) {
  // Add CORS headers to all responses
  server.addHook('onSend', (request, reply, payload, done) => {
    setupCorsHeaders(reply);
    done(null, payload);
  });
  
  // REMOVED explicit OPTIONS * handler to prevent duplication error.
  // Assuming CORS preflight is handled elsewhere (e.g., by @fastify/cors or implicitly).
  
  // Apply rate limiting to all API routes
  server.addHook('onRequest', (request, reply, done) => {
    if (request.routeOptions && request.routeOptions.url && request.routeOptions.url.startsWith('/api/')) {
      rateLimitMiddleware(request, reply, done);
    } else {
      done();
    }
  });
  
  console.log('[API] Middleware registered: CORS, rate limiting');
}

export default {
  verifyApiKey,
  createApiResponse,
  authMiddleware,
  withErrorHandler,
  ERROR_CODES,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  validateParams,
  registerApiMiddleware
};
