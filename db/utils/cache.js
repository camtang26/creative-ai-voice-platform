/**
 * Cache Utility
 * Provides a simple in-memory caching mechanism with TTL
 */

// Cache storage
const cache = new Map();

/**
 * Set a value in the cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlMs - Time to live in milliseconds
 */
export function setCacheValue(key, value, ttlMs = 60000) {
  // Store the value and expiration time
  const expiration = Date.now() + ttlMs;
  
  // Remove any existing entry
  if (cache.has(key)) {
    const { timeoutId } = cache.get(key);
    clearTimeout(timeoutId);
  }
  
  // Set timeout to automatically remove the entry after TTL
  const timeoutId = setTimeout(() => {
    cache.delete(key);
    console.log(`[Cache] Key expired: ${key}`);
  }, ttlMs);
  
  // Store the value, expiration time, and timeout ID
  cache.set(key, {
    value,
    expiration,
    timeoutId
  });
  
  console.log(`[Cache] Set key: ${key}, TTL: ${ttlMs}ms`);
}

/**
 * Get a value from the cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found or expired
 */
export function getCacheValue(key) {
  // Check if the key exists
  if (!cache.has(key)) {
    console.log(`[Cache] Miss: ${key} (not found)`);
    return null;
  }
  
  // Get the cached entry
  const { value, expiration } = cache.get(key);
  
  // Check if the entry has expired
  if (Date.now() > expiration) {
    // Remove the expired entry
    const { timeoutId } = cache.get(key);
    clearTimeout(timeoutId);
    cache.delete(key);
    
    console.log(`[Cache] Miss: ${key} (expired)`);
    return null;
  }
  
  console.log(`[Cache] Hit: ${key}`);
  return value;
}

/**
 * Delete a value from the cache
 * @param {string} key - Cache key
 */
export function deleteCacheValue(key) {
  if (cache.has(key)) {
    const { timeoutId } = cache.get(key);
    clearTimeout(timeoutId);
    cache.delete(key);
    console.log(`[Cache] Deleted key: ${key}`);
  }
}

/**
 * Clear all values from the cache
 */
export function clearCache() {
  // Clear all timeouts
  for (const { timeoutId } of cache.values()) {
    clearTimeout(timeoutId);
  }
  
  // Clear the cache
  cache.clear();
  console.log('[Cache] Cleared all keys');
}

/**
 * Invalidate cache entries by pattern
 * @param {string} pattern - Pattern to match cache keys
 */
export function invalidateCacheByPattern(pattern) {
  const regex = new RegExp(pattern);
  const invalidatedKeys = [];
  
  // Find keys matching the pattern
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      const { timeoutId } = cache.get(key);
      clearTimeout(timeoutId);
      cache.delete(key);
      invalidatedKeys.push(key);
    }
  }
  
  if (invalidatedKeys.length > 0) {
    console.log(`[Cache] Invalidated ${invalidatedKeys.length} keys matching pattern: ${pattern}`);
    console.log(`[Cache] Invalidated keys: ${invalidatedKeys.join(', ')}`);
  }
  
  return invalidatedKeys;
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

export default {
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
  clearCache,
  invalidateCacheByPattern,
  getCacheStats
};