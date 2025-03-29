/**
 * API client for the ElevenLabs Twilio integration
 * Enhanced with standardized error handling and response types
 */

// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

export interface ApiErrorDetails {
  [key: string]: any;
  recommendation?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details: ApiErrorDetails | null;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// API Error class for frontend error handling
export class ApiRequestError extends Error {
  code: string;
  details: ApiErrorDetails | null;
  requestId: string;
  timestamp: string;
  status: number;

  constructor(error: ApiError, requestId: string, timestamp: string, status: number = 500) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.details = error.details;
    this.requestId = requestId;
    this.timestamp = timestamp;
    this.status = status;
  }

  static fromApiResponse(response: ApiErrorResponse, status: number): ApiRequestError {
    return new ApiRequestError(
      response.error,
      response.requestId,
      response.timestamp,
      status
    );
  }

  get recommendation(): string | undefined {
    return this.details?.recommendation;
  }

  toString(): string {
    return `[${this.code}] ${this.message} (Request ID: ${this.requestId})`;
  }
}

// API Client Configuration
interface ApiClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

// Default configuration
const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: '',  // Empty string for relative URLs
  apiKey: undefined // No API key by default
};

/**
 * Centralized API request function with standardized error handling
 * @param url API endpoint URL
 * @param options Fetch options
 * @param config API client configuration
 * @returns Promise resolving to the typed response data
 * @throws ApiRequestError for API errors
 */
async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  config: ApiClientConfig = {}
): Promise<T> {
  // Merge config with defaults
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Prepare the full URL (relative or absolute)
  const fullUrl = url.startsWith('http') ? url : `${resolvedConfig.baseUrl}${url}`;
  
  // Prepare headers
  const headers = new Headers(options.headers);
  
  // Add Content-Type if not present and we have a body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add Authorization header if apiKey is provided
  if (resolvedConfig.apiKey) {
    headers.set('Authorization', `Bearer ${resolvedConfig.apiKey}`);
  }
  
  // Execute request
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    
    // Convert response to JSON
    let responseData: ApiResponse<T>;
    try {
      responseData = await response.json();
    } catch (error) {
      // Handle JSON parsing error
      throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Check for API error response
    if (!response.ok || !responseData.success) {
      // If we have a proper API error response format
      if ('error' in responseData && responseData.error) {
        throw ApiRequestError.fromApiResponse(responseData as ApiErrorResponse, response.status);
      }
      
      // For non-standard error responses
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }
    
    // Return the data property for success responses
    return (responseData as ApiSuccessResponse<T>).data;
  } catch (error) {
    // Re-throw ApiRequestError instances
    if (error instanceof ApiRequestError) {
      throw error;
    }
    
    // Convert other errors to standard format
    throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create configured API client
export function createApiClient(config: ApiClientConfig = {}) {
  return {
    // GET request helper
    async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
      return apiRequest<T>(url, { ...options, method: 'GET' }, config);
    },
    
    // POST request helper
    async post<T = any>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
      return apiRequest<T>(
        url,
        {
          ...options,
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        },
        config
      );
    },
    
    // PUT request helper
    async put<T = any>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
      return apiRequest<T>(
        url,
        {
          ...options,
          method: 'PUT',
          body: data ? JSON.stringify(data) : undefined,
        },
        config
      );
    },
    
    // DELETE request helper
    async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
      return apiRequest<T>(url, { ...options, method: 'DELETE' }, config);
    },
  };
}

// Create default API client instance
export const api = createApiClient();

// API functions for call management
interface CallInfo {
  sid: string;
  status: string;
  to: string;
  from: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  recordings?: RecordingInfo[];
  answeredBy?: string;
  machineBehavior?: string;
}

interface RecordingInfo {
  sid: string;
  url: string;
  duration?: number;
  channels?: number;
  timestamp?: string;
  status?: string;
}

interface CallMetrics {
  callSid: string;
  metrics: any;
  fromCache: boolean;
  fromTwilio: boolean;
}

interface CallStats {
  totalCalls: number;
  callsByStatus: Record<string, number>;
  activeCalls: CallSummary[];
  completedCalls: CallSummary[];
}

interface CallSummary {
  sid: string;
  status: string;
  to: string;
  from: string;
  startTime: string;
  duration: number | string;
  recordingCount: number;
  answeredBy: string;
}

interface CallTerminationOptions {
  force?: boolean;
  reason?: string;
}

interface CallTerminationResult {
  callSid: string;
  timestamp: string;
  wasActive: boolean;
  terminationMethod: string;
  reason: string;
}

// Call management functions
export async function getCallInfo(callSid: string): Promise<CallInfo> {
  return api.get<CallInfo>(`/api/call/${callSid}`);
}

export async function getCallRecordings(callSid: string): Promise<RecordingInfo[]> {
  const result = await api.get<{
    recordings: RecordingInfo[];
    callSid: string;
    recordingCount: number;
  }>(`/api/calls/${callSid}/recordings`);
  
  return result.recordings;
}

export async function getCallMetrics(callSid: string): Promise<CallMetrics> {
  return api.get<CallMetrics>(`/api/calls/${callSid}/metrics`);
}

export async function getCallStats(): Promise<CallStats> {
  return api.get<CallStats>('/api/call-stats');
}

export async function getActiveCalls(): Promise<CallSummary[]> {
  const result = await api.get<{
    calls: CallSummary[];
    count: number;
  }>('/api/calls/active');
  
  return result.calls;
}

export async function terminateCall(
  callSid: string,
  options: CallTerminationOptions = {}
): Promise<CallTerminationResult> {
  return api.post<CallTerminationResult>(
    `/api/calls/${callSid}/terminate`,
    options
  );
}

// Authenticated API client (for sensitive operations)
let apiKeyCache: string | null = null;

export function getApiKey(): string | null {
  // Return cached key if available
  if (apiKeyCache) return apiKeyCache;
  
  // Try to load from localStorage if in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedKey = localStorage.getItem('apiKey');
    if (storedKey) {
      apiKeyCache = storedKey;
      return storedKey;
    }
  }
  
  return null;
}

export function setApiKey(key: string): void {
  apiKeyCache = key;
  
  // Save to localStorage if in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('apiKey', key);
  }
}

export function clearApiKey(): void {
  apiKeyCache = null;
  
  // Remove from localStorage if in browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('apiKey');
  }
}

// Create an authenticated API client using the stored key
export const authApi = createApiClient({
  apiKey: getApiKey() || undefined
});

// Function to make outbound calls
interface MakeCallParams {
  number: string;
  prompt?: string;
  first_message?: string;
  callerId?: string;
  name?: string;
}

interface MakeCallResult {
  success: boolean;
  callSid?: string;
  message: string;
  error?: string;
}

export async function makeCall(params: MakeCallParams): Promise<MakeCallResult> {
  try {
    return await api.post<MakeCallResult>('/outbound-call', params);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        success: false,
        message: error.message,
        error: error.code
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      error: 'UNKNOWN_ERROR'
    };
  }
}

// Error handling helpers
export function formatApiError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    let message = `${error.message} (${error.code})`;
    
    if (error.recommendation) {
      message += `\nRecommendation: ${error.recommendation}`;
    }
    
    return message;
  }
  
  return error instanceof Error ? error.message : String(error);
}

// Utility function to display user-friendly error messages
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    // Map error codes to user-friendly messages
    switch (error.code) {
      case 'INVALID_CALL_SID':
        return 'The call ID format is invalid. Please check the ID and try again.';
      
      case 'CALL_NOT_FOUND':
        return 'This call could not be found. It may have already ended.';
      
      case 'CALL_TERMINATION_CONFLICT':
        return 'This call cannot be terminated because it is already in a completed state.';
      
      case 'TWILIO_API_ERROR':
        return 'There was an issue with the phone system. Please try again later.';
      
      case 'UNAUTHORIZED':
        return 'You do not have permission to perform this action. Please log in again.';
      
      case 'CALL_TERMINATION_ERROR':
        return 'Unable to end the call. The call may have already ended.';
        
      default:
        return error.message;
    }
  }
  
  return error instanceof Error ? error.message : String(error);
}
