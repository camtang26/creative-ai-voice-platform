/**
 * Advanced Answering Machine Detection Configuration
 * Optimized for better accuracy in distinguishing humans from machines
 */

/**
 * AMD Configuration for Twilio
 * These settings have been tuned based on best practices and testing
 */
export const AMD_CONFIG = {
  // Enable AMD with async mode for better performance
  machineDetection: 'Enable',
  asyncAmd: 'true',
  
  // DETECTION TIMEOUTS
  // How long to wait before giving up on detection (in seconds)
  machineDetectionTimeout: 20, // Increased from 15s for better accuracy with slow answerers
  
  // SPEECH THRESHOLDS
  // Minimum length of speech to consider it a greeting (in milliseconds)
  // Human greetings are typically 1-3 seconds ("Hello?" or "Hello, this is John")
  // Machine greetings are typically 3+ seconds (voicemail messages)
  machineDetectionSpeechThreshold: 3000, // Increased from 2500ms - helps reduce false positives
  
  // SILENCE DETECTION
  // How long to wait for initial speech before returning "unknown" (in milliseconds)
  machineDetectionSilenceTimeout: 6000, // Increased from 5000ms - some humans take time to speak
  
  // END OF SPEECH DETECTION
  // Minimum silence duration to consider speech has ended (in milliseconds)
  // This helps detect pauses in voicemail greetings
  machineDetectionSpeechEndThreshold: 1800, // Increased from 1500ms for better gap detection
  
  // ADDITIONAL SETTINGS FOR BETTER ACCURACY
  // Words that typically indicate a machine/voicemail
  machineKeywords: [
    'voicemail', 'message', 'beep', 'tone', 'unavailable',
    'cannot take your call', 'leave a message', 'press',
    'mailbox', 'recording', 'automated', 'please hold'
  ],
  
  // Typical human greeting patterns (short and simple)
  humanPatterns: [
    /^hello\??$/i,
    /^hi\??$/i,
    /^yes\??$/i,
    /^yeah\??$/i,
    /^hey\??$/i,
    /^yo\??$/i,
    /^speak(ing)?\??$/i,
    /^this is \w+$/i,
    /^\w+ speaking$/i,
    /^good (morning|afternoon|evening)$/i
  ]
};

/**
 * Enhanced detection logic to reduce false positives
 * @param {Object} amdResult - The AMD result from Twilio
 * @returns {Object} Enhanced detection result
 */
export function enhanceAMDDetection(amdResult) {
  const { AnsweredBy, MachineBehavior, TranscribedText } = amdResult;
  
  // Start with Twilio's detection
  let enhancedResult = {
    originalDetection: AnsweredBy,
    enhancedDetection: AnsweredBy,
    confidence: 'medium',
    reason: []
  };
  
  // If Twilio is highly confident it's human, trust it
  if (AnsweredBy === 'human' && !MachineBehavior) {
    enhancedResult.confidence = 'high';
    enhancedResult.reason.push('Clear human detection by Twilio');
    return enhancedResult;
  }
  
  // If we have transcribed text, analyze it
  if (TranscribedText) {
    const text = TranscribedText.toLowerCase().trim();
    
    // Check for machine keywords
    const hasMachineKeywords = AMD_CONFIG.machineKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    if (hasMachineKeywords) {
      enhancedResult.enhancedDetection = 'machine_enhanced';
      enhancedResult.confidence = 'high';
      enhancedResult.reason.push('Contains machine/voicemail keywords');
      return enhancedResult;
    }
    
    // Check for human patterns
    const matchesHumanPattern = AMD_CONFIG.humanPatterns.some(pattern => 
      pattern.test(text)
    );
    
    if (matchesHumanPattern && AnsweredBy.startsWith('machine_')) {
      // Possible false positive - machine detected but greeting is human-like
      enhancedResult.enhancedDetection = 'human_verified';
      enhancedResult.confidence = 'high';
      enhancedResult.reason.push('Human-like greeting pattern detected');
      
      // Log this for analysis
      console.log(`[AMD Enhancement] Possible false positive corrected: ${AnsweredBy} -> human_verified`);
      console.log(`[AMD Enhancement] Greeting text: "${text}"`);
    }
  }
  
  // Handle edge cases
  if (AnsweredBy === 'unknown') {
    // Unknown could be a slow human answerer
    enhancedResult.confidence = 'low';
    enhancedResult.reason.push('Unable to determine - treating as potential human');
    
    // We might want to treat unknown as human to avoid false negatives
    if (process.env.AMD_TREAT_UNKNOWN_AS_HUMAN === 'true') {
      enhancedResult.enhancedDetection = 'human_assumed';
      enhancedResult.reason.push('Policy: treating unknown as human');
    }
  }
  
  return enhancedResult;
}

/**
 * Get AMD statistics and recommendations
 * @param {Object} stats - AMD statistics from amd-metrics.js
 * @returns {Object} Analysis and recommendations
 */
export function analyzeAMDPerformance(stats) {
  const analysis = {
    accuracy: parseFloat(stats.accuracy),
    recommendations: [],
    configChanges: {}
  };
  
  // Check false positive rate
  const falsePositiveRate = stats.total > 0 
    ? (stats.falsePositives / stats.total) * 100 
    : 0;
    
  if (falsePositiveRate > 5) {
    analysis.recommendations.push(
      'High false positive rate detected. Consider increasing machineDetectionSpeechThreshold.'
    );
    analysis.configChanges.machineDetectionSpeechThreshold = 3500;
  }
  
  // Check false negative rate
  const falseNegativeRate = stats.total > 0 
    ? (stats.falseNegatives / stats.total) * 100 
    : 0;
    
  if (falseNegativeRate > 5) {
    analysis.recommendations.push(
      'High false negative rate detected. Consider decreasing machineDetectionSpeechThreshold.'
    );
    analysis.configChanges.machineDetectionSpeechThreshold = 2000;
  }
  
  // Check unknown rate
  const unknownRate = parseFloat(stats.unknownRate);
  if (unknownRate > 10) {
    analysis.recommendations.push(
      'High unknown detection rate. Consider increasing machineDetectionTimeout and machineDetectionSilenceTimeout.'
    );
    analysis.configChanges.machineDetectionTimeout = 25;
    analysis.configChanges.machineDetectionSilenceTimeout = 7000;
  }
  
  // Check average detection time
  if (stats.averageDetectionTime > 10000) {
    analysis.recommendations.push(
      'Slow detection times. Consider optimizing timeout values.'
    );
  }
  
  return analysis;
}

export default {
  AMD_CONFIG,
  enhanceAMDDetection,
  analyzeAMDPerformance
};