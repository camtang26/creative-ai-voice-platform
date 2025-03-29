/**
 * Recording Handler for Twilio
 * Handles recording callbacks, metadata, and management
 */
import Twilio from 'twilio';

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
 * Process a recording status callback
 * @param {Object} data - Recording callback data from Twilio
 * @returns {Object} Processing result
 */
export function processRecordingCallback(data) {
  const { 
    CallSid, RecordingSid, RecordingUrl, RecordingStatus,
    RecordingDuration, RecordingChannels, RecordingSource,
    RecordingStartTime, RecordingTrack
  } = data;
  
  if (!CallSid || !RecordingSid) {
    console.error('[Recording] Missing required parameters in recording callback');
    return { 
      success: false, 
      error: 'Missing required parameters' 
    };
  }
  
  try {
    // Get the call info from our active calls map
    let callInfo = activeCalls && activeCalls.has(CallSid) 
      ? activeCalls.get(CallSid) 
      : { sid: CallSid, recordings: [] };
    
    // Initialize recordings array if it doesn't exist
    callInfo.recordings = callInfo.recordings || [];
    
    // Process based on recording status
    if (RecordingStatus === 'completed' && RecordingUrl) {
      // Check if we already have this recording
      const existingIndex = callInfo.recordings.findIndex(r => r.sid === RecordingSid);
      
      // Create recording object with all available metadata
      const recordingInfo = {
        sid: RecordingSid,
        url: RecordingUrl,
        duration: RecordingDuration,
        channels: RecordingChannels,
        source: RecordingSource,
        track: RecordingTrack,
        startTime: RecordingStartTime,
        status: RecordingStatus,
        timestamp: new Date().toISOString()
      };
      
      // Create alternate format URLs
      const baseUrl = RecordingUrl.split('.').slice(0, -1).join('.'); // Remove extension
      recordingInfo.mp3Url = `${baseUrl}.mp3`;
      recordingInfo.wavUrl = `${baseUrl}.wav`;
      
      // Update or add the recording
      if (existingIndex >= 0) {
        callInfo.recordings[existingIndex] = {
          ...callInfo.recordings[existingIndex],
          ...recordingInfo
        };
      } else {
        callInfo.recordings.push(recordingInfo);
      }
      
      console.log(`[Recording] Completed recording for call ${CallSid}: ${RecordingSid} (${RecordingDuration}s)`);
    } 
    else if (RecordingStatus === 'in-progress') {
      // Track in-progress recording
      const inProgressRecording = {
        sid: RecordingSid,
        status: 'in-progress',
        startTime: RecordingStartTime || new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
      
      // Check if we already have this recording
      const existingIndex = callInfo.recordings.findIndex(r => r.sid === RecordingSid);
      
      if (existingIndex >= 0) {
        callInfo.recordings[existingIndex] = {
          ...callInfo.recordings[existingIndex],
          ...inProgressRecording
        };
      } else {
        callInfo.recordings.push(inProgressRecording);
      }
      
      console.log(`[Recording] Recording in progress for call ${CallSid}: ${RecordingSid}`);
    } 
    else if (RecordingStatus === 'failed') {
      console.error(`[Recording] Recording failed for call ${CallSid}: ${RecordingSid}`);
      
      // Mark the recording as failed
      const failedRecording = {
        sid: RecordingSid,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: data.ErrorMessage || 'Unknown error'
      };
      
      // Check if we already have this recording
      const existingIndex = callInfo.recordings.findIndex(r => r.sid === RecordingSid);
      
      if (existingIndex >= 0) {
        callInfo.recordings[existingIndex] = {
          ...callInfo.recordings[existingIndex],
          ...failedRecording
        };
      } else {
        callInfo.recordings.push(failedRecording);
      }
    }
    
    // Store recording metadata at the call level
    callInfo.recordingMetadata = callInfo.recordingMetadata || {};
    callInfo.recordingMetadata = {
      ...callInfo.recordingMetadata,
      lastStatus: RecordingStatus,
      lastUpdateTime: new Date().toISOString(),
      recordingCount: callInfo.recordings.length,
      channels: RecordingChannels,
      track: RecordingTrack,
      source: RecordingSource
    };
    
    // Update call info in our map
    if (activeCalls) {
      activeCalls.set(CallSid, callInfo);
    }
    
    return {
      success: true,
      callSid: CallSid,
      recordingSid: RecordingSid,
      status: RecordingStatus,
      recordingCount: callInfo.recordings.length
    };
  } catch (error) {
    console.error('[Recording] Error processing recording callback:', error);
    return {
      success: false,
      error: error.message,
      callSid: CallSid,
      recordingSid: RecordingSid
    };
  }
}

/**
 * Get all recordings for a call
 * @param {string} callSid - The Call SID
 * @returns {Array} Array of recording objects
 */
export async function getCallRecordings(callSid) {
  try {
    // First try to get from our local cache
    if (activeCalls && activeCalls.has(callSid)) {
      const callInfo = activeCalls.get(callSid);
      if (callInfo.recordings && callInfo.recordings.length > 0) {
        return {
          success: true,
          recordings: callInfo.recordings,
          fromCache: true
        };
      }
    }
    
    // If not found in cache or no recordings, try Twilio API
    if (twilioClient) {
      const recordings = await twilioClient.recordings.list({ callSid });
      
      // Format recording data
      const formattedRecordings = recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        channels: recording.channels,
        source: recording.source,
        status: recording.status,
        dateCreated: recording.dateCreated,
        url: recording.uri.replace('.json', '.mp3'), // Convert to direct MP3 URL
        mp3Url: `https://api.twilio.com/2010-04-01/Accounts/${twilioClient.accountSid}/Recordings/${recording.sid}.mp3`,
        wavUrl: `https://api.twilio.com/2010-04-01/Accounts/${twilioClient.accountSid}/Recordings/${recording.sid}.wav`
      }));
      
      // Update our cache if we found recordings
      if (activeCalls && formattedRecordings.length > 0) {
        let callInfo = activeCalls.has(callSid) 
          ? activeCalls.get(callSid) 
          : { sid: callSid, recordings: [] };
        
        // Merge with existing recordings to avoid duplicates
        const existingRecordingSids = new Set(callInfo.recordings.map(r => r.sid));
        for (const recording of formattedRecordings) {
          if (!existingRecordingSids.has(recording.sid)) {
            callInfo.recordings.push(recording);
          }
        }
        
        activeCalls.set(callSid, callInfo);
      }
      
      return {
        success: true,
        recordings: formattedRecordings,
        fromTwilio: true
      };
    }
    
    // If we couldn't find any recordings
    return {
      success: false,
      error: 'No recordings found and Twilio client not available',
      recordings: []
    };
  } catch (error) {
    console.error(`[Recording] Error getting recordings for call ${callSid}:`, error);
    return {
      success: false,
      error: error.message,
      recordings: []
    };
  }
}

export default {
  setActiveCallsReference,
  setTwilioClientReference,
  processRecordingCallback,
  getCallRecordings
};
