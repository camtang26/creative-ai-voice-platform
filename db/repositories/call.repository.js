/**
 * Call Repository
 * Provides data access methods for the calls collection
 */
import Call from '../models/call.model.js';

/**
 * Save a new call to the database
 * @param {Object} callData - Call data to save
 * @returns {Promise<Object>} Saved call document
 * @throws {Error} If saving fails
 */
export async function saveCall(callData) {
  try {
    // Format the call data to match our schema
    const formattedCallData = {
      callSid: callData.CallSid || callData.callSid,
      conversationId: callData.conversationId || callData.conversation_id || null,
      status: callData.CallStatus || callData.status || 'initiated',
      from: callData.From || callData.from || callData.callerId || null,
      to: callData.To || callData.to || null,
      direction: callData.Direction || callData.direction || 'outbound',
      startTime: callData.startTime || new Date(),
      region: callData.region || null,
      callerId: callData.callerId || callData.From || null,
      agentId: callData.agentId || process.env.ELEVENLABS_AGENT_ID || null,
      prompt: callData.prompt || null,
      firstMessage: callData.first_message || callData.firstMessage || null,
      contactName: callData.name || callData.contactName || null,
      campaignId: callData.campaignId || null,
      tags: callData.tags || []
    };

    // If we have sheet information, add it
    if (callData.sheetInfo || (callData.spreadsheetId && callData.sheetName)) {
      formattedCallData.sheetInfo = callData.sheetInfo || {
        spreadsheetId: callData.spreadsheetId,
        sheetName: callData.sheetName,
        rowIndex: callData.rowIndex
      };
    }

    // Create a new call document
    const call = new Call(formattedCallData);
    
    // Save to database
    const savedCall = await call.save();
    console.log(`[MongoDB] Saved call with SID: ${savedCall.callSid}`);
    
    return savedCall;
  } catch (error) {
    // Handle duplicate key error (call already exists)
    if (error.code === 11000) {
      console.log(`[MongoDB] Call already exists with SID: ${callData.CallSid || callData.callSid}, updating instead`);
      return updateCallStatus(
        callData.CallSid || callData.callSid, 
        callData.CallStatus || callData.status || 'initiated',
        callData
      );
    }
    
    console.error('[MongoDB] Error saving call:', error);
    throw error;
  }
}

/**
 * Update call status and metadata
 * @param {string} callSid - Twilio Call SID
 * @param {string} status - New call status
 * @param {Object} metadata - Additional metadata to update
 * @returns {Promise<Object>} Updated call document
 * @throws {Error} If update fails
 */
export async function updateCallStatus(callSid, status, metadata = {}) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }

    // Create update object
    const updateData = status ? { status } : {};
    
    // Add any additional metadata fields
    Object.keys(metadata).forEach(key => {
      // Skip callSid as it's the identifier and shouldn't be updated
      if (key !== 'callSid' && key !== 'CallSid' && key !== '_id') {
        // Convert Twilio's camelCase to our schema's camelCase
        const schemaKey = key.replace(/^([A-Z])/, c => c.toLowerCase());
        updateData[schemaKey] = metadata[key];
      }
    });
    
    // Handle specific status transitions
    if (status === 'in-progress' && !updateData.answerTime) {
      updateData.answerTime = new Date();
    } else if (status && ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
      updateData.endTime = new Date();
      
      // Calculate duration if we have start time
      const call = await Call.findOne({ callSid });
      if (call && call.startTime && !updateData.duration) {
        const startTime = new Date(call.startTime);
        const endTime = new Date(updateData.endTime);
        updateData.duration = Math.round((endTime - startTime) / 1000); // in seconds
      }
      
      // Add default values for failed/incomplete calls
      if (status === 'failed' && !updateData.answeredBy && !call?.answeredBy) {
        updateData.answeredBy = 'failed';
      } else if (status === 'no-answer' && !updateData.answeredBy && !call?.answeredBy) {
        updateData.answeredBy = 'no-answer';
      } else if (status === 'busy' && !updateData.answeredBy && !call?.answeredBy) {
        updateData.answeredBy = 'busy';
      } else if (status === 'canceled' && !updateData.answeredBy && !call?.answeredBy) {
        updateData.answeredBy = 'unknown';
      }
      
      // Set default terminatedBy for calls that ended without explicit termination tracking
      if (!updateData.terminatedBy && !call?.terminatedBy) {
        if (status === 'failed' || status === 'canceled') {
          updateData.terminatedBy = 'system';
        } else if (status === 'no-answer') {
          updateData.terminatedBy = 'timeout';
        } else if (updateData.duration && updateData.duration < 3) {
          // Very short calls likely ended by recipient
          updateData.terminatedBy = 'user';
        }
      }
    }
    
    // Update the call document
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      { $set: updateData },
      { new: true, runValidators: true, upsert: true }
    );
    
    if (status) {
      console.log(`[MongoDB] Updated call ${callSid} status to ${status}`);
    } else {
      console.log(`[MongoDB] Updated call ${callSid} metadata`);
    }
    return updatedCall;
  } catch (error) {
    console.error(`[MongoDB] Error updating call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Add a recording ID to a call
 * @param {string} callSid - Twilio Call SID
 * @param {ObjectId} recordingId - MongoDB ObjectId of the recording
 * @returns {Promise<Object>} Updated call document
 */
export async function addRecordingToCall(callSid, recordingId) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    if (!recordingId) {
      throw new Error('Recording ID is required');
    }
    
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      { $addToSet: { recordingIds: recordingId } },
      { new: true }
    );
    
    if (!updatedCall) {
      console.log(`[MongoDB] No call found with SID: ${callSid} to add recording`);
      return null;
    }
    
    console.log(`[MongoDB] Added recording ${recordingId} to call ${callSid}`);
    return updatedCall;
  } catch (error) {
    console.error(`[MongoDB] Error adding recording to call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Set transcript ID for a call
 * @param {string} callSid - Twilio Call SID
 * @param {ObjectId} transcriptId - MongoDB ObjectId of the transcript
 * @returns {Promise<Object>} Updated call document
 */
export async function setTranscriptForCall(callSid, transcriptId) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    if (!transcriptId) {
      throw new Error('Transcript ID is required');
    }
    
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      { $set: { transcriptId: transcriptId } },
      { new: true }
    );
    
    if (!updatedCall) {
      console.log(`[MongoDB] No call found with SID: ${callSid} to add transcript`);
      return null;
    }
    
    console.log(`[MongoDB] Set transcript ${transcriptId} for call ${callSid}`);
    return updatedCall;
  } catch (error) {
    console.error(`[MongoDB] Error setting transcript for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get a call by its SID
 * @param {string} callSid - Twilio Call SID
 * @returns {Promise<Object>} Call document
 * @throws {Error} If retrieval fails
 */
export async function getCallBySid(callSid) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    const call = await Call.findOne({ callSid });
    
    if (!call) {
      console.log(`[MongoDB] No call found with SID: ${callSid}`);
      return null;
    }
    
    return call;
  } catch (error) {
    console.error(`[MongoDB] Error retrieving call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get all active calls
 * @returns {Promise<Array>} Array of active call documents
 * @throws {Error} If retrieval fails
 */
export async function getActiveCalls() {
  try {
    const activeCalls = await Call.find({
      status: { $in: ['initiated', 'queued', 'ringing', 'in-progress'] }
    }).sort({ createdAt: -1 });
    
    console.log(`[MongoDB] Retrieved ${activeCalls.length} active calls`);
    return activeCalls;
  } catch (error) {
    console.error('[MongoDB] Error retrieving active calls:', error);
    throw error;
  }
}

/**
 * Get call history with filters and pagination
 * @param {Object} filters - Query filters
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Object with calls array and pagination metadata
 * @throws {Error} If retrieval fails
 */
export async function getCallHistory(filters = {}, pagination = { page: 1, limit: 20 }) {
  try {
    // Build query from filters
    const query = {};
    
    // Apply filters if provided
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.from) {
      query.from = filters.from;
    }
    
    if (filters.to) {
      query.to = filters.to;
    }
    
    if (filters.agentId) {
      query.agentId = filters.agentId;
    }
    
    if (filters.campaignId) {
      query.campaignId = filters.campaignId;
    }
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and populate recordingIds
    const calls = await Call.find(query)
      .populate('recordingIds') // Add populate here
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    // --- DEBUG LOG: Inspect populated calls ---
    if (calls && calls.length > 0) {
      console.log(`[DEBUG getCallHistory] First call object structure after populate:`, JSON.stringify(calls[0], null, 2));
      // Check if recordingIds looks populated
      if (calls[0].recordingIds && Array.isArray(calls[0].recordingIds) && calls[0].recordingIds.length > 0) {
        console.log(`[DEBUG getCallHistory] First recording object within first call:`, JSON.stringify(calls[0].recordingIds[0], null, 2));
      } else {
        console.log(`[DEBUG getCallHistory] recordingIds field in first call is empty or not populated correctly.`);
      }
    } else {
      console.log(`[DEBUG getCallHistory] No calls found for query.`);
    }
    // --- END DEBUG LOG ---
    
    // Get total count for pagination
    const total = await Call.countDocuments(query);
    
    console.log(`[MongoDB] Retrieved ${calls.length} calls (page ${page}, total: ${total})`);
    
    // Return calls with pagination metadata
    return {
      calls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[MongoDB] Error retrieving call history:', error);
    throw error;
  }
}

/**
 * Delete a call and its associated data
 * @param {string} callSid - Call SID
 * @returns {Promise<boolean>} Whether the call was deleted
 */
export async function deleteCall(callSid) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Delete the call
    const result = await Call.deleteOne({ callSid });
    
    if (result.deletedCount === 0) {
      console.log(`[MongoDB] No call found with SID: ${callSid} to delete`);
      return false;
    }
    
    console.log(`[MongoDB] Deleted call with SID: ${callSid}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB] Error deleting call ${callSid}:`, error);
    return false;
  }
}

/**
 * Append transcript segment to call
 * @param {string} callSid - Twilio Call SID
 * @param {string} role - Role (user/agent)
 * @param {string} message - Transcript message
 * @returns {Promise<Object>} Updated call document
 */
export async function appendTranscriptSegment(callSid, role, message) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    // Get current call
    const call = await Call.findOne({ callSid });
    if (!call) {
      console.log(`[MongoDB] No call found with SID: ${callSid} to append transcript`);
      return null;
    }
    
    // Build transcript line
    const transcriptLine = `${role}: ${message}`;
    
    // Append to existing transcript or create new
    const currentTranscript = call.transcript || '';
    const newTranscript = currentTranscript ? `${currentTranscript}\n${transcriptLine}` : transcriptLine;
    
    // Update call with new transcript
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      { 
        $set: { 
          transcript: newTranscript,
          transcriptUpdateCount: (call.transcriptUpdateCount || 0) + 1
        }
      },
      { new: true }
    );
    
    console.log(`[MongoDB] Appended transcript segment to call ${callSid} (${role})`);
    return updatedCall;
  } catch (error) {
    console.error(`[MongoDB] Error appending transcript to call ${callSid}:`, error);
    throw error;
  }
}

export default {
  saveCall,
  updateCallStatus,
  addRecordingToCall,
  setTranscriptForCall,
  getCallBySid,
  getActiveCalls,
  getCallHistory,
  deleteCall,
  appendTranscriptSegment
};