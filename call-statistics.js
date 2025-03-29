/**
 * Call Statistics Module
 * Provides comprehensive statistics and reporting for calls
 */

import Twilio from 'twilio';

// In-memory cache for recent calls
let recentCallsCache = [];

// Function to fetch recent calls
export function fetchRecentCalls(count = 5) {
  // Return the most recent calls from the cache
  return recentCallsCache.slice(0, count);
}

// Function to update the recent calls cache
export function updateRecentCallsCache(call) {
  // Add the call to the cache
  recentCallsCache.unshift(call);
  
  // Limit the cache size to 100 calls
  if (recentCallsCache.length > 100) {
    recentCallsCache = recentCallsCache.slice(0, 100);
  }
}

// Function to get current active calls statistics
export async function getActiveCallsStats(activeCalls) {
  // Basic stats about calls
  const stats = {
    totalCalls: activeCalls.size,
    callsByStatus: {},
    activeCalls: [],
    completedCalls: [],
    recordingStats: {
      totalRecordings: 0,
      totalDuration: 0
    }
  };
  
  // Count calls by status
  for (const [sid, call] of activeCalls.entries()) {
    // Count by status
    if (!stats.callsByStatus[call.status]) {
      stats.callsByStatus[call.status] = 0;
    }
    stats.callsByStatus[call.status]++;
    
    // Count recordings
    if (call.recordings && Array.isArray(call.recordings)) {
      stats.recordingStats.totalRecordings += call.recordings.length;
      
      // Add up recording durations if available
      call.recordings.forEach(rec => {
        if (rec.duration) {
          stats.recordingStats.totalDuration += parseInt(rec.duration) || 0;
        }
      });
    }
    
    // Add to the right list
    const callSummary = {
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
      startTime: call.startTime,
      duration: call.duration || 'unknown',
      recordingCount: call.recordings ? call.recordings.length : 0,
      conversationId: call.conversation_id
    };
    
    if (['initiated', 'ringing', 'in-progress'].includes(call.status)) {
      stats.activeCalls.push(callSummary);
    } else {
      stats.completedCalls.push(callSummary);
    }
  }
  
  return stats;
}

// Function to get Twilio API statistics
export async function getTwilioStats(twilioClient, options = {}) {
  if (!twilioClient) {
    return null;
  }
  
  const { limit = 20, status } = options;
  
  try {
    // Base query parameters
    const queryParams = { limit };
    
    // Add status filter if provided
    if (status) {
      queryParams.status = status;
    }
    
    // Get calls from Twilio API
    const calls = await twilioClient.calls.list(queryParams);
    
    // Get recordings from Twilio API
    const recordings = await twilioClient.recordings.list({
      limit
    });
    
    // Calculate statistics
    const twilioStats = {
      recentCalls: calls.map(c => ({
        sid: c.sid,
        from: c.from,
        to: c.to,
        status: c.status,
        direction: c.direction,
        duration: c.duration,
        startTime: c.startTime,
        endTime: c.endTime,
        hasRecording: recordings.some(r => r.callSid === c.sid)
      })),
      callsByStatus: calls.reduce((acc, call) => {
        acc[call.status] = (acc[call.status] || 0) + 1;
        return acc;
      }, {}),
      recordings: {
        totalCount: recordings.length,
        totalDuration: recordings.reduce((acc, rec) => acc + (parseInt(rec.duration) || 0), 0),
        averageDuration: recordings.length > 0 
          ? (recordings.reduce((acc, rec) => acc + (parseInt(rec.duration) || 0), 0) / recordings.length).toFixed(1)
          : 0,
        recentRecordings: recordings.slice(0, 5).map(rec => ({
          sid: rec.sid,
          callSid: rec.callSid,
          duration: rec.duration,
          channels: rec.channels,
          dateCreated: rec.dateCreated,
          url: `https://api.twilio.com/2010-04-01/Accounts/${twilioClient.accountSid}/Recordings/${rec.sid}.mp3`
        }))
      }
    };
    
    return twilioStats;
  } catch (error) {
    console.error('[Stats] Error fetching Twilio stats:', error);
    return { error: error.message };
  }
}

// Function to get comprehensive call statistics
export async function getComprehensiveStats(activeCalls, twilioClient, options = {}) {
  // Get local stats
  const localStats = await getActiveCallsStats(activeCalls);
  
  // Get Twilio stats if client is available
  const twilioStats = twilioClient 
    ? await getTwilioStats(twilioClient, options)
    : null;
  
  return {
    localStats,
    twilioStats,
    timestamp: new Date().toISOString()
  };
}

// Function to fetch details of a specific call from Twilio
export async function getCallDetails(callSid, twilioClient) {
  if (!twilioClient) {
    return null;
  }
  
  try {
    // Get call details
    const call = await twilioClient.calls(callSid).fetch();
    
    // Get call recordings
    const recordings = await twilioClient.recordings.list({ callSid });
    
    // Get any stored feedback for this call
    let feedback = null;
    try {
      feedback = await twilioClient.calls(callSid).feedback().fetch();
    } catch (error) {
      // Ignore errors fetching feedback - it may not exist
    }
    
    return {
      call: {
        sid: call.sid,
        parentCallSid: call.parentCallSid,
        to: call.to,
        from: call.from,
        status: call.status,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        direction: call.direction,
        answeredBy: call.answeredBy,
        callerName: call.callerName,
        price: call.price,
        priceUnit: call.priceUnit
      },
      recordings: recordings.map(rec => ({
        sid: rec.sid,
        duration: rec.duration,
        channels: rec.channels,
        source: rec.source,
        status: rec.status,
        dateCreated: rec.dateCreated,
        url: `https://api.twilio.com/2010-04-01/Accounts/${twilioClient.accountSid}/Recordings/${rec.sid}.mp3`
      })),
      feedback: feedback ? {
        qualityScore: feedback.qualityScore,
        issue: feedback.issue
      } : null
    };
  } catch (error) {
    console.error(`[Stats] Error fetching call details for ${callSid}:`, error);
    return { error: error.message };
  }
}
