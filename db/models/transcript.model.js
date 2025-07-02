/**
 * Transcript Model
 * Mongoose schema for the transcripts collection, aligned with ElevenLabs Conversation API
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Transcript Item Schema (Matches ElevenLabs 'transcript' array items)
 */
const transcriptItemSchema = new Schema({
  role: {
    type: String,
    enum: ['user', 'agent'],
    required: true
  },
  time_in_call_secs: {
    type: Number,
    required: true
  },
  message: {
    type: String // Optional in ElevenLabs API
  },
  // Optional fields from ElevenLabs API (using Mixed for flexibility)
  tool_calls: [Schema.Types.Mixed],
  tool_results: [Schema.Types.Mixed],
  feedback: Schema.Types.Mixed,
  llm_override: String,
  conversation_turn_metrics: Schema.Types.Mixed,
  rag_retrieval_info: Schema.Types.Mixed
}, { _id: false }); // Subdocument

/**
 * Evaluation Criteria Result Schema (Matches ElevenLabs 'evaluation_criteria_results' map values)
 */
const evaluationCriteriaResultSchema = new Schema({
  criteria_id: { type: String, required: true },
  result: {
    type: String,
    enum: ['success', 'failure', 'unknown'],
    required: true
  },
  rationale: { type: String, required: true }
}, { _id: false }); // Subdocument

/**
 * Data Collection Result Schema (Matches ElevenLabs 'data_collection_results' map values)
 */
const dataCollectionResultSchema = new Schema({
  data_collection_id: { type: String, required: true },
  rationale: { type: String, required: true },
  value: Schema.Types.Mixed, // Optional 'any' type
  json_schema: Schema.Types.Mixed // Optional object
}, { _id: false }); // Subdocument

/**
 * Analysis Schema (Matches ElevenLabs 'analysis' object)
 */
const analysisSchema = new Schema({
  call_successful: {
    type: String,
    enum: ['success', 'failure', 'unknown'],
    required: true
  },
  transcript_summary: {
    type: String,
    required: true
  },
  evaluation_criteria_results: {
    type: Map,
    of: evaluationCriteriaResultSchema
  },
  data_collection_results: {
    type: Map,
    of: dataCollectionResultSchema
  }
}, { _id: false }); // Subdocument

/**
 * Transcript Schema (Main Schema)
 * Stores detailed conversation transcripts fetched from ElevenLabs
 */
const transcriptSchema = new Schema({
  // Core identifiers
  callSid: { // Link to Twilio Call
    type: String,
    required: true,
    index: true
    // Removed unique constraint to allow real-time updates during call
  },
  conversationId: { // Link to ElevenLabs Conversation
    type: String,
    required: true,
    index: true
    // Removed unique constraint to allow real-time updates during call
  },
  agent_id: { // From ElevenLabs
    type: String,
    required: true,
    index: true
  },
  status: { // From ElevenLabs
    type: String,
    enum: ['processing', 'done', 'failed'],
    required: true,
    index: true
  },

  // Transcript content from ElevenLabs
  transcript: [transcriptItemSchema], // Array of transcript items

  // Metadata from ElevenLabs (using Mixed for flexibility)
  metadata: Schema.Types.Mixed,

  // Analysis from ElevenLabs (Optional in API, required here for consistency?)
  // Making it optional to match API, handle missing analysis in application logic
  analysis: {
    type: analysisSchema,
    required: false
  },

  // Timestamps managed by Mongoose
  // createdAt and updatedAt will be added automatically by { timestamps: true }

}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  collection: 'transcripts'
});

// Ensure compound indexes are still relevant or update if needed
// transcriptSchema.index({ callSid: 1, createdAt: -1 }); // Keep if useful for querying
// transcriptSchema.index({ conversationId: 1, createdAt: -1 }); // Add if useful

// Create the model
const Transcript = mongoose.models.Transcript || mongoose.model('Transcript', transcriptSchema);

export default Transcript;