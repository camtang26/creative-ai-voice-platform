interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any) => boolean
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return true
    }
    if (error.status >= 500 && error.status < 600) {
      return true
    }
    // Don't retry on 4xx client errors (except 429 rate limit)
    if (error.status === 429) {
      return true
    }
    return false
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.retryCondition!(error)) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay! * Math.pow(opts.backoffFactor!, attempt - 1),
        opts.maxDelay!
      )
      
      console.log(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Helper function for retrying API calls
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  customOptions?: RetryOptions
): Promise<T> {
  return retryWithBackoff(apiCall, {
    ...customOptions,
    retryCondition: (error) => {
      // Custom retry logic for API calls
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return true
      }
      if (error.response?.status >= 500) {
        return true
      }
      if (error.response?.status === 429) {
        return true
      }
      return false
    }
  })
}

// Network status detection
export function isOnline(): boolean {
  return navigator.onLine
}

export function onNetworkChange(callback: (online: boolean) => void) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', () => callback(true))
    window.removeEventListener('offline', () => callback(false))
  }
}