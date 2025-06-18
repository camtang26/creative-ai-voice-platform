# MongoDB Integration Phase 2 Plan: Call Recordings and Transcripts

This document outlines the implementation plan for Phase 2 of our MongoDB integration, focusing on call recordings and transcripts.

## 1. Recordings Collection Schema

We'll create a dedicated collection for storing recording metadata:

```javascript
// src/db/models/recording.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const recordingSchema = new Schema({
  // Core identifiers
  recordingSid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  callSid: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Recording metadata
  url: { 
    type: String 
  },
  duration: { 
    type: Number 
  },
  channels: { 
    type: Number, 
    default: 1 
  },
  format: { 
    type: String, 
    enum: ['mp3', 'wav', 'audio/x-wav'], 
    default: 'mp3' 
  },
  status: { 
    type: String, 
    enum: ['in-progress', 'completed', 'failed', 'absent'], 
    default: 'completed' 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Additional URLs for different formats
  mp3Url: { 
    type: String 
  },
  wavUrl: { 
    type: String 
  },
  
  // Recording type
  source: { 
    type: String, 
    enum: ['customer', 'agent', 'both'], 
    default: 'both' 
  },
  type: { 
    type: String, 
    default: 'call' 
  },
  
  // Additional metadata
  size: { 
    type: Number 
  },
  processingStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  transcriptionStatus: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'failed', 'not-requested'], 
    default: 'not-requested' 
  }
}, {
  timestamps: true,
  collection: 'recordings'
});

// Create indexes
recordingSchema.index({ callSid: 1, createdAt: -1 });

const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;
```

## 2. Transcripts Collection Schema

We'll create a dedicated collection for storing conversation transcripts:

```javascript
// src/db/models/transcript.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Message schema for transcript messages
const messageSchema = new Schema({
  role: { 
    type: String, 
    enum: ['agent', 'user'], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  confidence: { 
    type: Number, 
    min: 0, 
    max: 1 
  }
});

// Analysis schema for transcript analysis
const analysisSchema = new Schema({
  sentiment: { 
    type: String, 
    enum: ['positive', 'negative', 'neutral'] 
  },
  topics: [String],
  callSuccessful: Boolean,
  customFields: Schema.Types.Mixed
});

// Transcript schema
const transcriptSchema = new Schema({
  // Core identifiers
  callSid: { 
    type: String, 
    required: true, 
    index: true 
  },
  conversationId: { 
    type: String, 
    index: true 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  // Transcript content
  summary: String,
  messages: [messageSchema],
  analysis: analysisSchema,
  
  // Text search fields
  fullText: { 
    type: String, 
    index: 'text' 
  },
  keywords: [{ 
    type: String, 
    index: true 
  }]
}, {
  timestamps: true,
  collection: 'transcripts'
});

// Create compound indexes
transcriptSchema.index({ callSid: 1, createdAt: -1 });

const Transcript = mongoose.model('Transcript', transcriptSchema);

export default Transcript;
```

## 3. Repository Functions

### 3.1 Recording Repository

```javascript
// src/db/repositories/recording.repository.js
import Recording from '../models/recording.model.js';
import { getCallBySid, updateCallStatus } from './call.repository.js';

/**
 * Save a new recording to the database
 * @param {Object} recordingData - Recording data from Twilio
 * @returns {Promise<Object>} Saved recording document
 */
export async function saveRecording(recordingData) {
  try {
    // Format the recording data
    const formattedData = {
      recordingSid: recordingData.RecordingSid,
      callSid: recordingData.CallSid,
      url: recordingData.RecordingUrl,
      duration: recordingData.RecordingDuration ? parseInt(recordingData.RecordingDuration) : null,
      channels: recordingData.RecordingChannels ? parseInt(recordingData.RecordingChannels) : 1,
      format: recordingData.RecordingUrl ? recordingData.RecordingUrl.split('.').pop() : 'mp3',
      status: recordingData.RecordingStatus || 'completed',
      source: recordingData.RecordingSource || 'both'
    };
    
    // Create alternate format URLs if base URL is available
    if (recordingData.RecordingUrl) {
      const baseUrl = recordingData.RecordingUrl.split('.')[0]; // Remove extension
      formattedData.mp3Url = `${baseUrl}.mp3`;
      formattedData.wavUrl = `${baseUrl}.wav`;
    }
    
    // Create a new recording document
    const recording = new Recording(formattedData);
    
    // Save to database
    const savedRecording = await recording.save();
    
    // Update the call with the recording reference
    await updateCallStatus(recordingData.CallSid, null, {
      $addToSet: { recordingIds: savedRecording._id }
    });
    
    return savedRecording;
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      console.log(`[MongoDB] Recording already exists with SID: ${recordingData.RecordingSid}, updating instead`);
      return updateRecording(recordingData.RecordingSid, recordingData);
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
 */
export async function updateRecording(recordingSid, updateData) {
  try {
    // Find and update the recording
    const updatedRecording = await Recording.findOneAndUpdate(
      { recordingSid },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedRecording) {
      throw new Error(`Recording not found with SID: ${recordingSid}`);
    }
    
    return updatedRecording;
  } catch (error) {
    console.error('[MongoDB] Error updating recording:', error);
    throw error;
  }
}

/**
 * Get recordings for a call
 * @param {string} callSid - Call SID
 * @returns {Promise<Array>} Array of recording documents
 */
export async function getRecordingsByCallSid(callSid) {
  try {
    return await Recording.find({ callSid }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('[MongoDB] Error getting recordings:', error);
    throw error;
  }
}

/**
 * Get a recording by SID
 * @param {string} recordingSid - Recording SID
 * @returns {Promise<Object>} Recording document
 */
export async function getRecordingBySid(recordingSid) {
  try {
    return await Recording.findOne({ recordingSid });
  } catch (error) {
    console.error('[MongoDB] Error getting recording:', error);
    throw error;
  }
}

export default {
  saveRecording,
  updateRecording,
  getRecordingsByCallSid,
  getRecordingBySid
};
```

### 3.2 Transcript Repository

```javascript
// src/db/repositories/transcript.repository.js
import Transcript from '../models/transcript.model.js';
import { updateCallStatus } from './call.repository.js';

/**
 * Save a new transcript to the database
 * @param {Object} transcriptData - Transcript data from ElevenLabs
 * @returns {Promise<Object>} Saved transcript document
 */
export async function saveTranscript(transcriptData) {
  try {
    // Extract transcript messages
    const messages = transcriptData.transcript || [];
    
    // Extract or create summary
    const summary = transcriptData.analysis?.transcript_summary || 'No summary available';
    
    // Create full text for text search
    const fullText = messages
      .map(msg => `${msg.role}: ${msg.message}`)
      .join('\n');
    
    // Extract keywords (simple implementation - can be enhanced)
    const keywords = extractKeywords(fullText);
    
    // Format the transcript data
    const formattedData = {
      callSid: transcriptData.callSid,
      conversationId: transcriptData.conversationId,
      summary,
      messages: messages.map(msg => ({
        role: msg.role,
        message: msg.message,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        confidence: msg.confidence || 1.0
      })),
      analysis: {
        sentiment: determineSentiment(fullText),
        topics: extractTopics(fullText),
        callSuccessful: transcriptData.analysis?.call_successful === 'success',
        customFields: transcriptData.analysis?.custom_fields || {}
      },
      fullText,
      keywords
    };
    
    // Create a new transcript document
    const transcript = new Transcript(formattedData);
    
    // Save to database
    const savedTranscript = await transcript.save();
    
    // Update the call with the transcript reference
    await updateCallStatus(transcriptData.callSid, null, {
      transcriptId: savedTranscript._id
    });
    
    return savedTranscript;
  } catch (error) {
    console.error('[MongoDB] Error saving transcript:', error);
    throw error;
  }
}

/**
 * Get transcript for a call
 * @param {string} callSid - Call SID
 * @returns {Promise<Object>} Transcript document
 */
export async function getTranscriptByCallSid(callSid) {
  try {
    return await Transcript.findOne({ callSid }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('[MongoDB] Error getting transcript:', error);
    throw error;
  }
}

/**
 * Search transcripts by text
 * @param {string} searchText - Text to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of transcript documents
 */
export async function searchTranscripts(searchText, options = {}) {
  try {
    const { limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;
    
    return await Transcript.find(
      { $text: { $search: searchText } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    console.error('[MongoDB] Error searching transcripts:', error);
    throw error;
  }
}

/**
 * Helper function to extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @returns {Array} Array of keywords
 */
function extractKeywords(text) {
  // Simple implementation - extract words longer than 4 characters
  // In a real implementation, you would use NLP libraries or services
  const words = text.toLowerCase().split(/\W+/);
  const stopWords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'will'];
  
  return [...new Set(words)]
    .filter(word => word.length > 4 && !stopWords.includes(word))
    .slice(0, 20); // Limit to 20 keywords
}

/**
 * Helper function to determine sentiment from text
 * @param {string} text - Text to analyze
 * @returns {string} Sentiment (positive, negative, neutral)
 */
function determineSentiment(text) {
  // Simple implementation - in a real implementation, you would use NLP libraries or services
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'pleased', 'thank'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointed', 'sorry', 'issue', 'problem'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
  return 'neutral';
}

/**
 * Helper function to extract topics from text
 * @param {string} text - Text to analyze
 * @returns {Array} Array of topics
 */
function extractTopics(text) {
  // Simple implementation - in a real implementation, you would use NLP libraries or services
  // This is just a placeholder
  return ['conversation'];
}

export default {
  saveTranscript,
  getTranscriptByCallSid,
  searchTranscripts
};
```

## 4. Webhook Handler Updates

We'll need to update the webhook handler to store recording and transcript data:

1. Modify `webhook-handler-db.js` to process transcript data from ElevenLabs webhooks
2. Update the recording status callback handler to store recording data
3. Implement proper error handling and logging

## 5. API Endpoints

We'll need to create API endpoints for retrieving recordings and transcripts:

```javascript
// src/db/api/recording-api.js
import { getRecordingsByCallSid, getRecordingBySid } from '../repositories/recording.repository.js';

export async function registerRecordingApiRoutes(fastify, options = {}) {
  // Get recordings for a call
  fastify.get('/api/db/calls/:callSid/recordings', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const recordings = await getRecordingsByCallSid(callSid);
      
      return {
        success: true,
        data: {
          recordings,
          count: recordings.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving recordings:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving recordings',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get a recording by SID
  fastify.get('/api/db/recordings/:recordingSid', async (request, reply) => {
    try {
      const { recordingSid } = request.params;
      
      if (!recordingSid) {
        return reply.code(400).send({
          success: false,
          error: 'Recording SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const recording = await getRecordingBySid(recordingSid);
      
      if (!recording) {
        return reply.code(404).send({
          success: false,
          error: `Recording not found with SID: ${recordingSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: recording,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving recording:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving recording',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}

// src/db/api/transcript-api.js
import { getTranscriptByCallSid, searchTranscripts } from '../repositories/transcript.repository.js';

export async function registerTranscriptApiRoutes(fastify, options = {}) {
  // Get transcript for a call
  fastify.get('/api/db/calls/:callSid/transcript', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const transcript = await getTranscriptByCallSid(callSid);
      
      if (!transcript) {
        return reply.code(404).send({
          success: false,
          error: `Transcript not found for call: ${callSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: transcript,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving transcript:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving transcript',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Search transcripts
  fastify.get('/api/db/transcripts/search', async (request, reply) => {
    try {
      const { q, limit, page } = request.query;
      
      if (!q) {
        return reply.code(400).send({
          success: false,
          error: 'Search query is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const options = {
        limit: limit ? parseInt(limit) : 20,
        page: page ? parseInt(page) : 1
      };
      
      const transcripts = await searchTranscripts(q, options);
      
      return {
        success: true,
        data: {
          transcripts,
          count: transcripts.length,
          query: q
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error searching transcripts:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error searching transcripts',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}
```

## 6. Implementation Steps

1. Create the recording and transcript models
2. Implement the repository functions
3. Update the webhook handler to store recording and transcript data
4. Create API endpoints for retrieving recordings and transcripts
5. Update the server-mongodb.js file to include the new endpoints
6. Test the implementation with real calls

## 7. Testing

We'll need to create test scripts to verify:

1. Recording storage and retrieval
2. Transcript storage and retrieval
3. Search functionality
4. API endpoints

## 8. Documentation

We'll need to update the documentation to include:

1. Recording and transcript schema details
2. API endpoint documentation
3. Usage examples
4. Testing procedures

## Next Steps After Phase 2

After completing Phase 2, we'll be ready to move on to Phase 3:

1. Call Events and Analytics
2. Comprehensive event tracking
3. Analytics queries and aggregations
4. Dashboard data endpoints