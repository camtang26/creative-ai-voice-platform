/**
 * Latency monitoring and tracking utilities
 */

// Store latency measurements
const latencyStats = {
  apiCallLatency: [], // API call response times
  audioRoundTrip: [], // Audio processing round trip times
  serverLocation: process.env.SERVER_LOCATION || (process.env.NODE_ENV === 'development' ? 'Local' : 'Railway'),
  debugEnabled: process.env.DEBUG_LATENCY === 'true',
  startTime: Date.now(),
  callsProcessed: 0
};

/**
 * Record an API call latency measurement
 * @param {string} endpoint - API endpoint called
 * @param {number} duration - Duration in ms
 */
export function recordApiLatency(endpoint, duration) {
  if (!latencyStats.debugEnabled) return;
  
  latencyStats.apiCallLatency.push({
    timestamp: Date.now(),
    endpoint,
    duration,
    relativeTime: Date.now() - latencyStats.startTime
  });
  
  console.log(`[LATENCY] API call to ${endpoint}: ${duration}ms`);
}

/**
 * Record audio round trip latency
 * @param {number} duration - Duration in ms
 */
export function recordAudioLatency(duration) {
  if (!latencyStats.debugEnabled) return;
  
  latencyStats.audioRoundTrip.push({
    timestamp: Date.now(),
    duration,
    relativeTime: Date.now() - latencyStats.startTime
  });
}

/**
 * Track the start of a call
 */
export function trackCallStart() {
  if (!latencyStats.debugEnabled) return;
  latencyStats.callsProcessed++;
}

/**
 * Get summary of latency statistics
 */
export function getLatencyStats() {
  // Calculate API latency stats
  const apiLatencies = latencyStats.apiCallLatency.map(item => item.duration);
  const avgApiLatency = apiLatencies.length > 0 
    ? apiLatencies.reduce((sum, val) => sum + val, 0) / apiLatencies.length 
    : 0;
  
  // Calculate audio round trip stats
  const audioLatencies = latencyStats.audioRoundTrip.map(item => item.duration);
  const avgAudioLatency = audioLatencies.length > 0 
    ? audioLatencies.reduce((sum, val) => sum + val, 0) / audioLatencies.length 
    : 0;
  
  // Find min/max values
  const minApiLatency = apiLatencies.length > 0 ? Math.min(...apiLatencies) : 0;
  const maxApiLatency = apiLatencies.length > 0 ? Math.max(...apiLatencies) : 0;
  const minAudioLatency = audioLatencies.length > 0 ? Math.min(...audioLatencies) : 0;
  const maxAudioLatency = audioLatencies.length > 0 ? Math.max(...audioLatencies) : 0;
  
  return {
    serverLocation: latencyStats.serverLocation,
    uptime: Math.floor((Date.now() - latencyStats.startTime) / 1000), // in seconds
    callsProcessed: latencyStats.callsProcessed,
    apiLatency: {
      average: Math.round(avgApiLatency),
      min: minApiLatency,
      max: maxApiLatency,
      samples: apiLatencies.length
    },
    audioLatency: {
      average: Math.round(avgAudioLatency),
      min: minAudioLatency,
      max: maxAudioLatency,
      samples: audioLatencies.length
    },
    debugEnabled: latencyStats.debugEnabled
  };
}

// Create a timer for measuring function execution time
export function createTimer(label) {
  if (!latencyStats.debugEnabled) {
    // Return no-op functions if debugging is disabled
    const noOpTimer = {
      start: function() { return this; }, // Return the no-op object itself
      stop: () => {},
      elapsed: () => 0
    };
    return noOpTimer;
  }
  
  const timer = {
    label,
    startTime: 0,
    endTime: 0,
    elapsed: function() {
      if (this.endTime === 0) {
        return Date.now() - this.startTime;
      }
      return this.endTime - this.startTime;
    },
    start: function() {
      this.startTime = Date.now();
      return this;
    },
    stop: function() {
      this.endTime = Date.now();
      console.log(`[TIMER] ${this.label}: ${this.elapsed()}ms`);
      recordApiLatency(this.label, this.elapsed());
      return this.elapsed();
    }
  };
  
  return timer;
}
