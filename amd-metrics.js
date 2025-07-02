/**
 * AMD (Answering Machine Detection) Metrics Module
 * Tracks performance and accuracy of AMD system
 */

// Store AMD results for analysis
const amdResults = new Map();

// Track detection accuracy
const amdStats = {
  total: 0,
  human: 0,
  machine: 0,
  fax: 0,
  unknown: 0,
  falsePositives: 0, // Human detected as machine
  falseNegatives: 0, // Machine detected as human
  detectionTimes: [],
  averageDetectionTime: 0
};

/**
 * Record AMD detection result
 * @param {string} callSid - Call SID
 * @param {Object} amdData - AMD detection data
 */
export function recordAMDResult(callSid, amdData) {
  const { AnsweredBy, MachineBehavior, Timestamp } = amdData;
  
  // Calculate detection time if we have call start time
  let detectionTime = null;
  const callInfo = amdResults.get(callSid);
  if (callInfo && callInfo.callStartTime) {
    detectionTime = Date.now() - callInfo.callStartTime;
    amdStats.detectionTimes.push(detectionTime);
    
    // Update average detection time
    const sum = amdStats.detectionTimes.reduce((a, b) => a + b, 0);
    amdStats.averageDetectionTime = Math.round(sum / amdStats.detectionTimes.length);
  }
  
  // Store result
  amdResults.set(callSid, {
    ...callInfo,
    answeredBy: AnsweredBy,
    machineBehavior: MachineBehavior,
    detectionTime,
    timestamp: Timestamp || new Date().toISOString()
  });
  
  // Update statistics
  amdStats.total++;
  
  if (AnsweredBy === 'human') {
    amdStats.human++;
  } else if (AnsweredBy && AnsweredBy.startsWith('machine_')) {
    amdStats.machine++;
  } else if (AnsweredBy === 'fax') {
    amdStats.fax++;
  } else {
    amdStats.unknown++;
  }
  
  // Log performance metrics
  console.log(`[AMD Metrics] Detection for ${callSid}: ${AnsweredBy} (${detectionTime ? detectionTime + 'ms' : 'N/A'})`);
  
  if (amdStats.total % 10 === 0) {
    logAMDPerformance();
  }
}

/**
 * Record call start for AMD timing
 * @param {string} callSid - Call SID
 */
export function recordCallStart(callSid) {
  amdResults.set(callSid, {
    callStartTime: Date.now(),
    callSid
  });
}

/**
 * Mark a detection as false positive or negative
 * @param {string} callSid - Call SID
 * @param {string} actualResult - What the actual result should have been
 */
export function markAMDError(callSid, actualResult) {
  const result = amdResults.get(callSid);
  if (!result) return;
  
  const detected = result.answeredBy;
  
  // False positive: Detected as machine but was human
  if (detected && detected.startsWith('machine_') && actualResult === 'human') {
    amdStats.falsePositives++;
    console.log(`[AMD Metrics] False positive detected for ${callSid}: Detected ${detected}, was human`);
  }
  
  // False negative: Detected as human but was machine
  if (detected === 'human' && actualResult === 'machine') {
    amdStats.falseNegatives++;
    console.log(`[AMD Metrics] False negative detected for ${callSid}: Detected human, was machine`);
  }
  
  // Update the result
  result.actualResult = actualResult;
  result.wasError = true;
  amdResults.set(callSid, result);
}

/**
 * Get AMD statistics
 * @returns {Object} AMD performance statistics
 */
export function getAMDStats() {
  const accuracy = amdStats.total > 0 
    ? ((amdStats.total - amdStats.falsePositives - amdStats.falseNegatives) / amdStats.total * 100).toFixed(2)
    : 0;
    
  return {
    ...amdStats,
    accuracy: `${accuracy}%`,
    humanDetectionRate: amdStats.total > 0 ? `${(amdStats.human / amdStats.total * 100).toFixed(2)}%` : '0%',
    machineDetectionRate: amdStats.total > 0 ? `${(amdStats.machine / amdStats.total * 100).toFixed(2)}%` : '0%',
    unknownRate: amdStats.total > 0 ? `${(amdStats.unknown / amdStats.total * 100).toFixed(2)}%` : '0%'
  };
}

/**
 * Log AMD performance metrics
 */
export function logAMDPerformance() {
  const stats = getAMDStats();
  
  console.log('[AMD Metrics] ===== Performance Report =====');
  console.log(`[AMD Metrics] Total calls: ${stats.total}`);
  console.log(`[AMD Metrics] Accuracy: ${stats.accuracy}`);
  console.log(`[AMD Metrics] Human detection rate: ${stats.humanDetectionRate}`);
  console.log(`[AMD Metrics] Machine detection rate: ${stats.machineDetectionRate}`);
  console.log(`[AMD Metrics] Unknown rate: ${stats.unknownRate}`);
  console.log(`[AMD Metrics] False positives: ${stats.falsePositives}`);
  console.log(`[AMD Metrics] False negatives: ${stats.falseNegatives}`);
  console.log(`[AMD Metrics] Average detection time: ${stats.averageDetectionTime}ms`);
  console.log('[AMD Metrics] =============================');
}

/**
 * Get detailed AMD result for a specific call
 * @param {string} callSid - Call SID
 * @returns {Object|null} AMD result details
 */
export function getCallAMDResult(callSid) {
  return amdResults.get(callSid) || null;
}

/**
 * Clean up old AMD results (older than 24 hours)
 */
export function cleanupOldResults() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [callSid, result] of amdResults.entries()) {
    if (result.callStartTime && result.callStartTime < oneDayAgo) {
      amdResults.delete(callSid);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[AMD Metrics] Cleaned ${cleaned} old AMD results`);
  }
}

// Clean up old results every hour
setInterval(cleanupOldResults, 60 * 60 * 1000);

// Log performance every 100 calls
setInterval(() => {
  if (amdStats.total > 0 && amdStats.total % 100 === 0) {
    logAMDPerformance();
  }
}, 60 * 1000);

export default {
  recordAMDResult,
  recordCallStart,
  markAMDError,
  getAMDStats,
  getCallAMDResult,
  logAMDPerformance
};