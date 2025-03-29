/**
 * Call Quality Metrics Handler
 * Collects and analyzes voice insights and call quality metrics from Twilio
 */

// Reference to the active calls map
let activeCalls = null;
let twilioClient = null;

/**
 * Set active calls reference
 * @param {Map} callsMap - The active calls map
 */
export function setActiveCallsReference(callsMap) {
  activeCalls = callsMap;
}

/**
 * Set Twilio client reference
 * @param {Twilio.Twilio} client - The Twilio client
 */
export function setTwilioClientReference(client) {
  twilioClient = client;
}

/**
 * Fetch call quality metrics from Twilio
 * @param {string} callSid - The Call SID
 * @returns {Promise<Object>} - Call quality metrics
 */
export async function fetchCallQualityMetrics(callSid) {
  if (!twilioClient) {
    return {
      available: false,
      error: 'No Twilio client available'
    };
  }

  try {
    // Get basic call details
    const call = await twilioClient.calls(callSid).fetch();
    
    // Get advanced call quality metrics if available through the Insights API
    // Note: This requires Voice Insights to be enabled on your Twilio account
    let qualityData = null;
    
    try {
      // This requires the Insights API (only available on some Twilio plans)
      // If this throws an error, we'll continue with basic metrics
      qualityData = await twilioClient.insights.calls(callSid).fetch();
    } catch (insightsError) {
      console.log(`[Metrics] Insights API not available: ${insightsError.message}`);
    }
    
    // Collect all available metrics
    const metrics = {
      available: true,
      basic: {
        duration: Number(call.duration) || 0,
        startTime: call.startTime,
        endTime: call.endTime,
        status: call.status,
        direction: call.direction,
        answeredBy: call.answeredBy || null,
        from: call.from,
        to: call.to,
        forwardedFrom: call.forwardedFrom || null,
        price: call.price || null,
        priceUnit: call.priceUnit || null,
        queueTime: call.queueTime || null
      }
    };
    
    // Add advanced metrics if available
    if (qualityData) {
      metrics.advanced = {
        jitter: qualityData.jitter || null,
        mos: qualityData.mos || null, // Mean Opinion Score - voice quality rating
        latency: qualityData.latency || null,
        packetLoss: qualityData.packetLoss || null,
        warnings: qualityData.warnings || []
      };
    }
    
    // Store metrics in the active calls map
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      callInfo.qualityMetrics = metrics;
      activeCalls.set(callSid, callInfo);
    }
    
    return metrics;
  } catch (error) {
    console.error(`[Metrics] Error fetching call quality metrics: ${error.message}`);
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Process the call quality webhook data from Twilio
 * @param {Object} data - Call quality webhook data
 * @returns {Object} - Processing result
 */
export function processQualityData(data) {
  const { CallSid, ...metrics } = data;
  
  if (!CallSid) {
    return {
      success: false,
      error: 'Missing Call SID'
    };
  }
  
  try {
    // Store metrics in the active calls map
    if (activeCalls && activeCalls.has(CallSid)) {
      const callInfo = activeCalls.get(CallSid);
      callInfo.qualityMetrics = {
        ...callInfo.qualityMetrics || {},
        webhook: metrics,
        timestamp: new Date().toISOString()
      };
      activeCalls.set(CallSid, callInfo);
      
      console.log(`[Metrics] Stored quality metrics for call ${CallSid}`);
    } else {
      console.log(`[Metrics] Call ${CallSid} not found in active calls map`);
    }
    
    return {
      success: true,
      callSid: CallSid
    };
  } catch (error) {
    console.error(`[Metrics] Error processing quality data: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get call quality metrics
 * @param {string} callSid - The Call SID
 * @returns {Promise<Object>} - Call quality metrics
 */
export async function getCallQualityMetrics(callSid) {
  try {
    // First check if we have metrics in the active calls map
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      if (callInfo.qualityMetrics) {
        return {
          success: true,
          metrics: callInfo.qualityMetrics,
          fromCache: true
        };
      }
    }
    
    // If not in cache, fetch from Twilio
    const metrics = await fetchCallQualityMetrics(callSid);
    
    if (metrics.available) {
      return {
        success: true,
        metrics,
        fromTwilio: true
      };
    } else {
      return {
        success: false,
        error: metrics.error || 'No metrics available',
        callSid
      };
    }
  } catch (error) {
    console.error(`[Metrics] Error getting call quality metrics: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  setActiveCallsReference,
  setTwilioClientReference,
  fetchCallQualityMetrics,
  processQualityData,
  getCallQualityMetrics
};
