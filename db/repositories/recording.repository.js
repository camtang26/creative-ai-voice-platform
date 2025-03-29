/**
 * Recording Repository
 * Provides data access methods for the recordings collection
 */
import Recording from '../models/recording.model.js';
import { addRecordingToCall } from './call.repository.js';

/**
 * Save a new recording to the database
 * @param {Object} recordingData - Recording data from Twilio
 * @returns {Promise<Object>} Saved recording document
 * @throws {Error} If saving fails
 */
export async function saveRecording(recordingData) {
  try {
    // Format the recording data
    const formattedData = {
      recordingSid: recordingData.RecordingSid || recordingData.recordingSid,
      callSid: recordingData.CallSid || recordingData.callSid,
      url: recordingData.RecordingUrl || recordingData.url,
      duration: recordingData.RecordingDuration ? parseInt(recordingData.RecordingDuration) : 
                recordingData.duration ? parseInt(recordingData.duration) : null,
      channels: recordingData.RecordingChannels ? parseInt(recordingData.RecordingChannels) : 
                recordingData.channels ? parseInt(recordingData.channels) : 1,
      format: recordingData.format || 
              (recordingData.RecordingUrl ? recordingData.RecordingUrl.split('.').pop() : 'mp3'),
      status: recordingData.RecordingStatus || recordingData.status || 'completed',
      source: recordingData.RecordingSource || recordingData.source || 'both'
    };
    
    // Create alternate format URLs if base URL is available
    if (formattedData.url) {
      const baseUrl = formattedData.url.split('.')[0]; // Remove extension
      formattedData.mp3Url = `${baseUrl}.mp3`;
      formattedData.wavUrl = `${baseUrl}.wav`;
    }
    
    // Create a new recording document
    const recording = new Recording(formattedData);
    
    // Save to database
    const savedRecording = await recording.save();
    console.log(`[MongoDB] Saved recording with SID: ${savedRecording.recordingSid}`);
    
    // Update the call with the recording reference
    if (formattedData.callSid) {
      await addRecordingToCall(formattedData.callSid, savedRecording._id);
    }
    
    return savedRecording;
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      console.log(`[MongoDB] Recording already exists with SID: ${recordingData.RecordingSid || recordingData.recordingSid}, updating instead`);
      return updateRecording(
        recordingData.RecordingSid || recordingData.recordingSid, 
        recordingData
      );
    }
    
    console.error('[MongoDB] Error saving recording:', error);
    throw error;
  }
}

/**
 * Update an existing recording
 * @param {string} recordingSid - Recording SID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated recording document
 * @throws {Error} If update fails
 */
export async function updateRecording(recordingSid, updateData) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    // Format update data
    const formattedData = {};
    
    // Map Twilio field names to our schema field names
    if (updateData.RecordingStatus) formattedData.status = updateData.RecordingStatus;
    if (updateData.RecordingDuration) formattedData.duration = parseInt(updateData.RecordingDuration);
    if (updateData.RecordingChannels) formattedData.channels = parseInt(updateData.RecordingChannels);
    if (updateData.RecordingUrl) {
      formattedData.url = updateData.RecordingUrl;
      const baseUrl = updateData.RecordingUrl.split('.')[0];
      formattedData.mp3Url = `${baseUrl}.mp3`;
      formattedData.wavUrl = `${baseUrl}.wav`;
    }
    
    // Add any other fields that don't need special handling
    Object.keys(updateData).forEach(key => {
      if (!key.startsWith('Recording') && key !== 'recordingSid' && key !== '_id') {
        formattedData[key] = updateData[key];
      }
    });
    
    // Find and update the recording
    const updatedRecording = await Recording.findOneAndUpdate(
      { recordingSid },
      { $set: formattedData },
      { new: true, runValidators: true }
    );
    
    if (!updatedRecording) {
      throw new Error(`Recording not found with SID: ${recordingSid}`);
    }
    
    console.log(`[MongoDB] Updated recording ${recordingSid}`);
    return updatedRecording;
  } catch (error) {
    console.error(`[MongoDB] Error updating recording ${recordingSid}:`, error);
    throw error;
  }
}

/**
 * Get recordings for a call
 * @param {string} callSid - Call SID
 * @returns {Promise<Array>} Array of recording documents
 * @throws {Error} If retrieval fails
 */
export async function getRecordingsByCallSid(callSid) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    const recordings = await Recording.find({ callSid }).sort({ createdAt: -1 });
    
    console.log(`[MongoDB] Retrieved ${recordings.length} recordings for call ${callSid}`);
    return recordings;
  } catch (error) {
    console.error(`[MongoDB] Error getting recordings for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get a recording by SID
 * @param {string} recordingSid - Recording SID
 * @returns {Promise<Object>} Recording document
 * @throws {Error} If retrieval fails
 */
export async function getRecordingBySid(recordingSid) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    const recording = await Recording.findOne({ recordingSid });
    
    if (!recording) {
      console.log(`[MongoDB] No recording found with SID: ${recordingSid}`);
      return null;
    }
    
    return recording;
  } catch (error) {
    console.error(`[MongoDB] Error retrieving recording ${recordingSid}:`, error);
    throw error;
  }
}

/**
 * Update recording processing status
 * @param {string} recordingSid - Recording SID
 * @param {string} status - Processing status
 * @returns {Promise<Object>} Updated recording document
 */
export async function updateProcessingStatus(recordingSid, status) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      throw new Error(`Invalid processing status: ${status}`);
    }
    
    const updatedRecording = await Recording.findOneAndUpdate(
      { recordingSid },
      { $set: { processingStatus: status } },
      { new: true }
    );
    
    if (!updatedRecording) {
      console.log(`[MongoDB] No recording found with SID: ${recordingSid}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated processing status for recording ${recordingSid} to ${status}`);
    return updatedRecording;
  } catch (error) {
    console.error(`[MongoDB] Error updating processing status for recording ${recordingSid}:`, error);
    throw error;
  }
}

/**
 * Update recording transcription status
 * @param {string} recordingSid - Recording SID
 * @param {string} status - Transcription status
 * @returns {Promise<Object>} Updated recording document
 */
export async function updateTranscriptionStatus(recordingSid, status) {
  try {
    if (!recordingSid) {
      throw new Error('Recording SID is required');
    }
    
    if (!['pending', 'in-progress', 'completed', 'failed', 'not-requested'].includes(status)) {
      throw new Error(`Invalid transcription status: ${status}`);
    }
    
    const updatedRecording = await Recording.findOneAndUpdate(
      { recordingSid },
      { $set: { transcriptionStatus: status } },
      { new: true }
    );
    
    if (!updatedRecording) {
      console.log(`[MongoDB] No recording found with SID: ${recordingSid}`);
      return null;
    }
    
    console.log(`[MongoDB] Updated transcription status for recording ${recordingSid} to ${status}`);
    return updatedRecording;
  } catch (error) {
    console.error(`[MongoDB] Error updating transcription status for recording ${recordingSid}:`, error);
    throw error;
  }
}

export default {
  saveRecording,
  updateRecording,
  getRecordingsByCallSid,
  getRecordingBySid,
  updateProcessingStatus,
  updateTranscriptionStatus
};