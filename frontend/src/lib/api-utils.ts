/**
 * Utility functions for API operations
 */

/**
 * Handle API errors and return a standardized error response
 * @param {Error} error - The error that occurred
 * @param {string} errorMessage - A user-friendly error message
 * @returns {Object} Standardized error response object
 */
export function handleApiError(error: any, errorMessage: string) {
  console.error(errorMessage, error);
  
  return {
    success: false,
    error: error instanceof Error ? error.message : errorMessage,
    data: null
  };
}

/**
 * Format query parameters for API requests
 * @param {Object} params - Query parameters as key-value pairs
 * @returns {string} Formatted query string (including the '?' prefix if params exist)
 */
export function formatQueryParams(params: Record<string, any>) {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        queryParams.append(key, value.join(','));
      }
    } else {
      queryParams.append(key, String(value));
    }
  }
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}
