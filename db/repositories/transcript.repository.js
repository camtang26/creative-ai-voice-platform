/**
 * Transcript Repository
 * Provides data access methods for the transcripts collection
 */
import Transcript from '../models/transcript.model.js';
import { setTranscriptForCall } from './call.repository.js';

/**
 * Save a new transcript to the database
 * @param {Object} transcriptData - Transcript data from ElevenLabs
 * @returns {Promise<Object>} Saved transcript document
 * @throws {Error} If saving fails
 */
export async function saveTranscript(transcriptData) {
  try {
    // Extract call SID and conversation ID
    const callSid = transcriptData.callSid || 
                    transcriptData.CallSid || 
                    (transcriptData.data?.metadata?.call_sid) || 
                    null;
    
    const conversationId = transcriptData.conversationId || 
                           transcriptData.conversation_id || 
                           (transcriptData.data?.metadata?.conversation_id) || 
                           null;
    
    if (!callSid) {
      throw new Error('Call SID is required for transcript');
    }
    
    // Extract transcript messages
    const messages = transcriptData.data?.transcript || 
                     transcriptData.transcript || 
                     [];
    
    // Extract or create summary
    const summary = transcriptData.data?.analysis?.transcript_summary || 
                    transcriptData.summary || 
                    'No summary available';
    
    // Create full text for text search
    const fullText = messages
      .map(msg => `${msg.role}: ${msg.message}`)
      .join('\n');
    
    // Extract keywords (simple implementation - can be enhanced)
    const keywords = extractKeywords(fullText);
    
    // Format the transcript data
    const formattedData = {
      callSid,
      conversationId,
      summary,
      messages: messages.map(msg => ({
        role: msg.role,
        message: msg.message,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        confidence: msg.confidence || 1.0
      })),
      analysis: {
        sentiment: determineSentiment(fullText),
        topics: extractTopics(fullText, messages),
        callSuccessful: transcriptData.data?.analysis?.call_successful === 'success' || 
                        transcriptData.callSuccessful || 
                        false,
        customFields: transcriptData.data?.analysis?.custom_fields || 
                      transcriptData.customFields || 
                      {}
      },
      fullText,
      keywords
    };
    
    // Create a new transcript document
    const transcript = new Transcript(formattedData);
    
    // Save to database
    const savedTranscript = await transcript.save();
    console.log(`[MongoDB] Saved transcript for call ${callSid}`);
    
    // Update the call with the transcript reference
    await setTranscriptForCall(callSid, savedTranscript._id);
    
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
 * @throws {Error} If retrieval fails
 */
export async function getTranscriptByCallSid(callSid) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    const transcript = await Transcript.findOne({ callSid }).sort({ createdAt: -1 });
    
    if (!transcript) {
      console.log(`[MongoDB] No transcript found for call: ${callSid}`);
      return null;
    }
    
    return transcript;
  } catch (error) {
    console.error(`[MongoDB] Error getting transcript for call ${callSid}:`, error);
    throw error;
  }
}

/**
 * Get transcript by conversation ID
 * @param {string} conversationId - ElevenLabs conversation ID
 * @returns {Promise<Object>} Transcript document
 * @throws {Error} If retrieval fails
 */
export async function getTranscriptByConversationId(conversationId) {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }
    
    const transcript = await Transcript.findOne({ conversationId }).sort({ createdAt: -1 });
    
    if (!transcript) {
      console.log(`[MongoDB] No transcript found for conversation: ${conversationId}`);
      return null;
    }
    
    return transcript;
  } catch (error) {
    console.error(`[MongoDB] Error getting transcript for conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Search transcripts by text
 * @param {string} searchText - Text to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of transcript documents
 * @throws {Error} If search fails
 */
export async function searchTranscripts(searchText, options = {}) {
  try {
    if (!searchText) {
      throw new Error('Search text is required');
    }
    
    const { limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;
    
    // Use MongoDB text search
    const transcripts = await Transcript.find(
      { $text: { $search: searchText } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Transcript.countDocuments({ $text: { $search: searchText } });
    
    console.log(`[MongoDB] Found ${transcripts.length} transcripts matching "${searchText}" (page ${page}, total: ${total})`);
    
    return {
      transcripts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      query: searchText
    };
  } catch (error) {
    console.error(`[MongoDB] Error searching transcripts for "${searchText}":`, error);
    throw error;
  }
}

/**
 * Get transcripts by sentiment
 * @param {string} sentiment - Sentiment to filter by (positive, negative, neutral)
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Object with transcripts array and pagination metadata
 * @throws {Error} If retrieval fails
 */
export async function getTranscriptsBySentiment(sentiment, options = {}) {
  try {
    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error(`Invalid sentiment: ${sentiment}`);
    }
    
    const { limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;
    
    const transcripts = await Transcript.find({ 'analysis.sentiment': sentiment })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Transcript.countDocuments({ 'analysis.sentiment': sentiment });
    
    console.log(`[MongoDB] Found ${transcripts.length} ${sentiment} transcripts (page ${page}, total: ${total})`);
    
    return {
      transcripts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      sentiment
    };
  } catch (error) {
    console.error(`[MongoDB] Error getting transcripts by sentiment ${sentiment}:`, error);
    throw error;
  }
}

/**
 * Add a single message to an existing transcript or create a new one
 * @param {string} callSid - Call SID
 * @param {Object} message - Message object { role, message, timestamp, confidence }
 * @returns {Promise<Object>} Updated or created transcript document
 * @throws {Error} If update fails
 */
export async function addMessageToTranscript(callSid, message) {
  try {
    if (!callSid) {
      throw new Error('Call SID is required to add message');
    }
    if (!message || !message.role || !message.message) {
      throw new Error('Valid message object (role, message) is required');
    }

    // Format the message
    const formattedMessage = {
      role: message.role,
      message: message.message,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      confidence: message.confidence || 1.0
    };

    // Find the transcript and push the message, or create if not found
    const updatedTranscript = await Transcript.findOneAndUpdate(
      { callSid },
      {
        $push: { messages: formattedMessage },
        $setOnInsert: { // Fields to set only if a new document is created
          callSid: callSid,
          createdAt: new Date()
        },
        $set: { // Fields to update every time
          updatedAt: new Date()
        }
      },
      {
        new: true, // Return the updated document
        upsert: true, // Create the document if it doesn't exist
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`[MongoDB] Added message to transcript for call ${callSid}`);
    
    // Ensure the call document has the transcriptId if it was just created
    if (updatedTranscript.createdAt.getTime() === updatedTranscript.updatedAt.getTime()) {
       await setTranscriptForCall(callSid, updatedTranscript._id);
    }

    return updatedTranscript;

  } catch (error) {
    console.error(`[MongoDB] Error adding message to transcript for call ${callSid}:`, error);
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
  const stopWords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'will', 
                     'about', 'which', 'their', 'there', 'would', 'could', 'should'];
  
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
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'pleased', 
                         'thank', 'thanks', 'appreciate', 'helpful', 'perfect', 'love', 'best'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointed', 'sorry', 'issue', 
                         'problem', 'difficult', 'fail', 'poor', 'wrong', 'mistake', 'error'];
  
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
 * @param {Array} messages - Transcript messages
 * @returns {Array} Array of topics
 */
function extractTopics(text, messages) {
  // Simple implementation - in a real implementation, you would use NLP libraries or services
  // This is just a placeholder that extracts potential topics based on frequency
  const words = text.toLowerCase().split(/\W+/);
  const stopWords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'will', 
                     'about', 'which', 'their', 'there', 'would', 'could', 'should',
                     'what', 'when', 'where', 'who', 'why', 'how', 'and', 'but', 'for',
                     'the', 'are', 'not', 'you', 'your', 'they', 'them', 'our', 'ours'];
  
  // Count word frequency
  const wordCounts = {};
  words.forEach(word => {
    if (word.length > 4 && !stopWords.includes(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and get top 5
  const topics = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  // If we couldn't extract topics, return a default
  return topics.length > 0 ? topics : ['conversation'];
}

export default {
  saveTranscript,
  addMessageToTranscript, // Added new function
  getTranscriptByCallSid,
  getTranscriptByConversationId,
  searchTranscripts,
  getTranscriptsBySentiment
};