/**
 * Transcript Repository
 * Provides data access methods for the transcripts collection, aligned with ElevenLabs API structure.
 */
import Transcript from '../models/transcript.model.js';
import { emitTranscriptMessage, emitTranscriptTypewriter } from '../../socket-server.js';
import { setTranscriptForCall } from './call.repository.js'; // Assuming this function still exists and works
import mongoose from 'mongoose';

/**
 * Creates or updates a transcript document using data fetched from the ElevenLabs Conversation API.
 * Uses callSid as the primary key for upserting.
 *
 * @param {string} callSid - The Twilio Call SID to associate the transcript with.
 * @param {object} elevenLabsData - The full JSON response object from the ElevenLabs GET /v1/convai/conversations/:id endpoint.
 * @returns {Promise<Object>} The saved or updated transcript document.
 * @throws {Error} If saving/updating fails or required data is missing.
 */
export async function createOrUpdateTranscriptFromElevenLabs(callSid, elevenLabsData) {
  if (!callSid) {
    throw new Error('Call SID is required to create or update transcript.');
  }
  if (!elevenLabsData || typeof elevenLabsData !== 'object') {
    throw new Error('Valid ElevenLabs data object is required.');
  }
  if (!elevenLabsData.conversation_id) {
    throw new Error('ElevenLabs data must include a conversation_id.');
  }
  if (!elevenLabsData.agent_id) {
    throw new Error('ElevenLabs data must include an agent_id.');
  }
   if (!elevenLabsData.status) {
    throw new Error('ElevenLabs data must include a status.');
  }
   if (!Array.isArray(elevenLabsData.transcript)) {
    // Allow empty transcript array, but it must be an array
    throw new Error('ElevenLabs data must include a transcript array.');
  }

  // Map ElevenLabs data directly to our schema fields
  const transcriptDocData = {
    callSid: callSid,
    conversationId: elevenLabsData.conversation_id,
    agent_id: elevenLabsData.agent_id,
    status: elevenLabsData.status,
    transcript: elevenLabsData.transcript, // Assuming structure matches transcriptItemSchema
    metadata: elevenLabsData.metadata || {}, // Use provided metadata or default to empty object
    analysis: elevenLabsData.analysis // Use provided analysis object (can be null/undefined if optional)
    // createdAt and updatedAt will be handled by mongoose timestamps
  };

  try {
    console.log(`[MongoDB] Upserting transcript for callSid: ${callSid}, conversationId: ${transcriptDocData.conversationId}`);

    const options = {
      upsert: true, // Create if document doesn't exist
      new: true, // Return the modified document rather than the original
      setDefaultsOnInsert: true, // Apply schema defaults if inserting
      runValidators: true // Ensure the data matches the schema
    };

    // Find by callSid and update, or insert if not found
    const savedTranscript = await Transcript.findOneAndUpdate(
      { callSid: callSid },
      transcriptDocData,
      options
    );

    console.log(`[MongoDB] Successfully upserted transcript for call ${callSid} (ID: ${savedTranscript._id})`);

    // Update the corresponding Call document with the transcript reference ID
    // Ensure this doesn't throw an error if the call document doesn't exist yet
    try {
        await setTranscriptForCall(callSid, savedTranscript._id);
        console.log(`[MongoDB] Linked transcript ${savedTranscript._id} to call ${callSid}`);
    } catch (callLinkError) {
        console.error(`[MongoDB] Warning: Failed to link transcript ${savedTranscript._id} to call ${callSid}. Call document might not exist yet or another error occurred:`, callLinkError.message);
        // Decide if this should be a fatal error or just a warning
    }


    return savedTranscript;
  } catch (error) {
    console.error(`[MongoDB] Error upserting transcript for call ${callSid}:`, error);
    // Add more context to the error if possible
    if (error instanceof mongoose.Error.ValidationError) {
       throw new Error(`Transcript schema validation failed: ${error.message}`);
    }
    throw error; // Re-throw original error for higher-level handling
  }
}

/**
 * Get transcript for a call by Call SID
 * @param {string} callSid - Call SID
 * @returns {Promise<Object|null>} Transcript document or null if not found
 * @throws {Error} If retrieval fails
 */
export async function getTranscriptByCallSid(callSid) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }

    // Fetch the transcript. The returned document will have the new schema structure.
    const transcript = await Transcript.findOne({ callSid }).sort({ createdAt: -1 });

    if (!transcript) {
      console.log(`[MongoDB] No transcript found for call: ${callSid}`);
      return null;
    }

    console.log(`[MongoDB] Retrieved transcript for call ${callSid}`);
    return transcript;
  } catch (error) {
    console.error(`[MongoDB] Error getting transcript for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get transcript by ElevenLabs Conversation ID
 * @param {string} conversationId - ElevenLabs conversation ID
 * @returns {Promise<Object|null>} Transcript document or null if not found
 * @throws {Error} If retrieval fails
 */
export async function getTranscriptByConversationId(conversationId) {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    // Fetch the transcript. The returned document will have the new schema structure.
    const transcript = await Transcript.findOne({ conversationId }).sort({ createdAt: -1 });

    if (!transcript) {
      console.log(`[MongoDB] No transcript found for conversation: ${conversationId}`);
      return null;
    }

    console.log(`[MongoDB] Retrieved transcript for conversation ${conversationId}`);
    return transcript;
  } catch (error) {
    console.error(`[MongoDB] Error getting transcript for conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Append a real-time transcript message
 * @param {string} callSid - Call SID
 * @param {string} conversationId - ElevenLabs conversation ID (optional)
 * @param {string} role - Message role (user/agent)
 * @param {string} message - Message text
 * @param {number} timeInCall - Time in call (seconds)
 * @returns {Promise<Object>} Updated transcript document
 */
export async function appendRealtimeTranscriptMessage(callSid, conversationId, role, message, timeInCall = 0) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }

    console.log(`[Transcript] Appending real-time message for call ${callSid}, role: ${role}, message length: ${message?.length || 0}`);
    
    // Find or create transcript document
    let transcript = await Transcript.findOne({ callSid });
    
    if (!transcript) {
      console.log(`[Transcript] No existing transcript found for call ${callSid}, creating new one`);
      // Create new transcript if it doesn't exist
      transcript = new Transcript({
        callSid,
        conversationId: conversationId || 'pending',
        agent_id: 'unknown', // Will be updated when full data is available
        status: 'processing',
        transcript: [],
        metadata: {}
      });
      
      try {
        await transcript.save();
        console.log(`[Transcript] Created new transcript document for call ${callSid}`);
      } catch (saveError) {
        console.error(`[Transcript] Error creating new transcript document:`, saveError);
        // If it's a duplicate key error, try to find the existing document
        if (saveError.code === 11000) {
          console.log(`[Transcript] Duplicate key error, attempting to find existing document`);
          transcript = await Transcript.findOne({ callSid });
          if (!transcript) {
            throw new Error(`Could not create or find transcript for call ${callSid}`);
          }
        } else {
          throw saveError;
        }
      }
    } else {
      console.log(`[Transcript] Found existing transcript for call ${callSid}, current message count: ${transcript.transcript?.length || 0}`);
    }

    // Add the new message to the transcript array
    const transcriptItem = {
      role,
      message,
      time_in_call_secs: timeInCall
    };
    
    transcript.transcript.push(transcriptItem);
    console.log(`[Transcript] Added message to transcript array, new count: ${transcript.transcript.length}`);
    
    // Save the updated transcript
    try {
      await transcript.save();
      console.log(`[Transcript] Successfully saved transcript with ${transcript.transcript.length} messages for call ${callSid}`);
    } catch (updateError) {
      console.error(`[Transcript] Error saving updated transcript:`, updateError);
      throw updateError;
    }
    
    // Emit the transcript message via Socket.IO for real-time updates
    try {
      // Use typewriter effect for better UX
      emitTranscriptTypewriter(callSid, {
        role,
        message,
        timestamp: new Date().toISOString()
      }, 4); // 4 words per second
      
      console.log(`[Transcript] Emitted real-time transcript message for call ${callSid}`);
    } catch (emitError) {
      console.error(`[Transcript] Error emitting transcript message:`, emitError);
      // Don't throw - saving to DB is more important than real-time emit
    }
    
    return transcript;
  } catch (error) {
    console.error(`[Transcript] Error appending real-time message for call ${callSid}:`, error);
    throw error;
  }
}

// Export the relevant functions
export default {
  createOrUpdateTranscriptFromElevenLabs,
  getTranscriptByCallSid,
  getTranscriptByConversationId,
  appendRealtimeTranscriptMessage
};