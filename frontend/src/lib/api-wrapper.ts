/**
 * API Wrapper for ElevenLabs-Twilio Integration
 * Handles standardized request/response formats and error handling
 */

import { ApiResponse, ApiError } from './types';
import { getApiUrl } from './api'; // Import the central helper

// Configuration options for API requests
interface ApiConfig {
  // baseUrl removed - getApiUrl handles this
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
}

// Default configuration
const defaultConfig: ApiConfig = {
  // baseUrl removed
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  defaultHeaders: {
    'Content-Type': 'application/json',
  }
};

/**
 * API Client class for making requests to the backend
 */
class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Set the API key for authenticated requests
   * @param apiKey API key to use for requests
   */
  setApiKey(apiKey: string) {
    this.config.apiKey = apiKey;
  }

  /**
   * Get common headers for all requests
   * @param requiresAuth Whether the request requires authentication
   * @returns Headers object
   */
  private getHeaders(requiresAuth: boolean = false): HeadersInit {
    const headers: Record<string, string> = {
      ...this.config.defaultHeaders
    };

    if (requiresAuth && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   * @param response Fetch response object
   * @returns Promise that resolves to the response JSON
   */
  private async handleResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> { // Added url for logging
    const data = await response.json();

    if (!response.ok) {
      // Format standard error response
      const error: ApiError = {
        message: data.error?.message || `API request failed for ${url}`,
        code: data.error?.code || 'UNKNOWN_ERROR',
        details: data.error?.details || null,
        statusCode: response.status,
        requestId: data.requestId || 'unknown'
      };

      // For debugging
      console.error(`API Error [${error.code}] (${url}): ${error.message}`, error);

      throw error;
    }

    return data as ApiResponse<T>;
  }

  /**
   * Make a GET request
   * @param endpoint API endpoint path (e.g., /api/calls/active)
   * @param requiresAuth Whether the request requires authentication
   * @returns Promise that resolves to the response data
   */
  async get<T>(endpoint: string, requiresAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint); // Use central helper
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(requiresAuth)
      });

      return this.handleResponse<T>(response, url);
    } catch (error) {
      if ((error as ApiError).code) {
        throw error; // Re-throw ApiError from handleResponse
      }

      // Handle network errors or other unexpected issues
      const networkError: ApiError = {
        message: (error as Error).message || `Network error occurred for ${url}`,
        code: 'NETWORK_ERROR',
        statusCode: 0, // Indicate client-side/network issue
        requestId: 'client-side-error'
      };
      console.error(`Network Error (${url}): ${networkError.message}`, error);
      throw networkError;
    }
  }

  /**
   * Make a POST request
   * @param endpoint API endpoint path (e.g., /api/calls/terminate)
   * @param data Request payload
   * @param requiresAuth Whether the request requires authentication
   * @returns Promise that resolves to the response data
   */
  async post<T>(endpoint: string, data: any, requiresAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint); // Use central helper
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(requiresAuth),
        body: JSON.stringify(data)
      });

      return this.handleResponse<T>(response, url);
    } catch (error) {
      if ((error as ApiError).code) {
        throw error; // Re-throw ApiError from handleResponse
      }

      // Handle network errors
      const networkError: ApiError = {
        message: (error as Error).message || `Network error occurred for ${url}`,
        code: 'NETWORK_ERROR',
        statusCode: 0,
        requestId: 'client-side-error'
      };
      console.error(`Network Error (${url}): ${networkError.message}`, error);
      throw networkError;
    }
  }

  /**
   * Make a PUT request
   * @param endpoint API endpoint path (e.g., /api/campaigns/{id})
   * @param data Request payload
   * @param requiresAuth Whether the request requires authentication
   * @returns Promise that resolves to the response data
   */
  async put<T>(endpoint: string, data: any, requiresAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint); // Use central helper
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(requiresAuth),
        body: JSON.stringify(data)
      });

      return this.handleResponse<T>(response, url);
    } catch (error) {
      if ((error as ApiError).code) {
        throw error; // Re-throw ApiError from handleResponse
      }

      // Handle network errors
      const networkError: ApiError = {
        message: (error as Error).message || `Network error occurred for ${url}`,
        code: 'NETWORK_ERROR',
        statusCode: 0,
        requestId: 'client-side-error'
      };
      console.error(`Network Error (${url}): ${networkError.message}`, error);
      throw networkError;
    }
  }

  /**
   * Make a DELETE request
   * @param endpoint API endpoint path (e.g., /api/campaigns/{id})
   * @param requiresAuth Whether the request requires authentication
   * @returns Promise that resolves to the response data
   */
  async delete<T>(endpoint: string, requiresAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint); // Use central helper
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(requiresAuth)
      });

      return this.handleResponse<T>(response, url);
    } catch (error) {
      if ((error as ApiError).code) {
        throw error; // Re-throw ApiError from handleResponse
      }

      // Handle network errors
      const networkError: ApiError = {
        message: (error as Error).message || `Network error occurred for ${url}`,
        code: 'NETWORK_ERROR',
        statusCode: 0,
        requestId: 'client-side-error'
      };
      console.error(`Network Error (${url}): ${networkError.message}`, error);
      throw networkError;
    }
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Call-specific API functions
export const callApi = {
  /**
   * Get list of active calls
   * @returns Promise that resolves to the active calls data
   */
  getActiveCalls: async () => {
    // Endpoint should include /api/ prefix
    return apiClient.get<{ calls: any[] }>('/api/calls/active');
  },

  /**
   * Get call information by SID
   * @param callSid Call SID to fetch
   * @returns Promise that resolves to the call data
   */
  getCall: async (callSid: string) => {
    // Endpoint should include /api/ prefix
    return apiClient.get<{ callInfo: any }>(`/api/call/${callSid}`);
  },

  /**
   * Get call recordings
   * @param callSid Call SID to fetch recordings for
   * @returns Promise that resolves to the recordings data
   */
  getCallRecordings: async (callSid: string) => {
    // Endpoint should include /api/ prefix
    return apiClient.get<{ recordings: any[] }>(`/api/calls/${callSid}/recordings`);
  },

  /**
   * Terminate a call
   * @param callSid Call SID to terminate
   * @param options Termination options
   * @returns Promise that resolves to the termination result
   */
  terminateCall: async (callSid: string, options: { force?: boolean, reason?: string } = {}) => {
    // Endpoint should include /api/ prefix
    return apiClient.post(`/api/calls/${callSid}/terminate`, options, true);
  },

  /**
   * Initiate a new outbound call
   * @param callData Call data including number, prompt, and first_message
   * @returns Promise that resolves to the new call data
   */
  makeCall: async (callData: {
    number: string;
    prompt?: string;
    first_message?: string;
    callerId?: string;
  }) => {
    // This endpoint seems different, assuming it's correct at the root
    // If it should be /api/outbound-call, change it here.
    return apiClient.post<{ callSid: string }>('/outbound-call', callData);
  },

  /**
   * Get call statistics
   * @returns Promise that resolves to the call statistics
   */
  getCallStats: async () => {
    // Endpoint should include /api/ prefix
    return apiClient.get<{ stats: any }>('/api/call-stats');
  },

  /**
   * Get call quality metrics
   * @param callSid Call SID to fetch metrics for
   * @returns Promise that resolves to the quality metrics
   */
  getCallMetrics: async (callSid: string) => {
    // Endpoint should include /api/ prefix
    return apiClient.get<{ metrics: any }>(`/api/calls/${callSid}/metrics`);
  }
};

// Email-specific API functions
export const emailApi = {
  /**
   * Send an email
   * @param emailData Email data including to_email, subject, and content
   * @returns Promise that resolves to the email send result
   */
  sendEmail: async (emailData: {
    to_email: string;
    subject: string;
    content: string;
    customer_name?: string;
  }) => {
    // Endpoint should include /api/ prefix
    return apiClient.post('/api/email/send', emailData, true);
  },

  /**
   * Check email service health
   * @returns Promise that resolves to the health status
   */
  checkHealth: async () => {
    // Endpoint should include /api/ prefix
    return apiClient.get('/api/email/health');
  }
};

// Export the default API client and specialized API functions
export default {
  client: apiClient,
  call: callApi,
  email: emailApi
};
