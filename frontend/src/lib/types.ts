export interface CallInfo {
  callSid: string; // Changed from sid to match backend data
  to: string;
  from: string;
  status: CallStatus;
  duration?: number;
  startTime: string;
  endTime?: string;
  answeredBy?: string;
  // recordings?: RecordingInfo[]; // Keep commented out or remove if no longer used elsewhere
  recordingIds?: RecordingInfo[]; // ADDED: Populated recording documents
  conversationId?: string; // Renamed from conversation_id for consistency
  qualityMetrics?: any;
  transcriptId?: string; // Added link to transcript document
}

export type CallStatus =
  | 'initiated'
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'busy'
  | 'failed'
  | 'no-answer'
  | 'canceled'
  | 'held' // Added from webhook logic
  | 'voicemail'; // Added from webhook logic

export interface RecordingInfo {
  recordingSid: string; // Corrected field name
  url: string;
  mp3Url?: string;
  wavUrl?: string;
  duration?: number;
  channels?: number; // Changed from string
  status: string;
  timestamp: string;
  // Added optional fields from recordings/page.tsx
  callSid?: string;
  callDetails?: {
    from?: string;
    to?: string;
    startTime?: string;
    endTime?: string;
  };
  createdAt?: string; // Added from backend data
  updatedAt?: string; // Added from backend data
}

export interface CallMetrics {
  available: boolean;
  basic?: {
    duration: number;
    startTime: string;
    endTime: string;
    status: string;
    direction: string;
    answeredBy: string | null;
    from: string;
    to: string;
  };
  advanced?: {
    jitter?: number;
    mos?: number;
    latency?: number;
    packetLoss?: number;
    warnings?: string[];
  };
}

export interface LiveCallUpdate {
  type: 'status_update' | 'new_call' | 'call_ended' | 'recording_update' | 'transcript_update'; // Added transcript_update
  callSid: string;
  status?: CallStatus;
  timestamp: string;
  data?: any; // Can hold call info, recording info, or transcript info
}

// Recent Call type for dashboard display
export interface RecentCall {
  sid: string;
  from: string;
  to: string;
  status: string;
  duration: number;
  timestamp: string;
  hasRecording: boolean;
  hasTranscript?: boolean; // Added
  conversationId?: string; // Added
}

// --- Updated Transcript Types (Aligned with ElevenLabs API / New DB Schema) ---

export interface TranscriptItem {
  role: 'user' | 'agent';
  time_in_call_secs: number;
  message?: string; // Optional
  // Optional fields from ElevenLabs API (can add if needed for display)
  // tool_calls?: any[];
  // tool_results?: any[];
  // feedback?: any;
  // llm_override?: string;
  // conversation_turn_metrics?: any;
  // rag_retrieval_info?: any;
}

export interface EvaluationCriteriaResult {
  criteria_id: string;
  result: 'success' | 'failure' | 'unknown';
  rationale: string;
}

export interface DataCollectionResult {
  data_collection_id: string;
  rationale: string;
  value?: any;
  json_schema?: any;
}

// This interface now reflects the structure stored in MongoDB,
// which is based on the full response from the ElevenLabs Conversation API
export interface TranscriptData {
  _id?: string; // From MongoDB
  callSid: string; // Link to Twilio Call
  conversationId: string; // Link to ElevenLabs Conversation
  agent_id: string; // From ElevenLabs
  status: 'processing' | 'done' | 'failed'; // From ElevenLabs

  // Transcript content from ElevenLabs
  transcript: TranscriptItem[]; // Array of transcript items

  // Metadata from ElevenLabs
  metadata?: {
      start_time_unix_secs?: number;
      call_duration_secs?: number;
      // Add other known metadata fields if needed
      [key: string]: any; // Allow other fields
  };

  // Analysis from ElevenLabs (Optional in API)
  analysis?: {
    call_successful?: 'success' | 'failure' | 'unknown';
    transcript_summary?: string;
    // Use Record<string, T> for maps/dictionaries
    evaluation_criteria_results?: Record<string, EvaluationCriteriaResult>;
    data_collection_results?: Record<string, DataCollectionResult>;
  };

  createdAt?: string; // From Mongoose timestamps
  updatedAt?: string; // From Mongoose timestamps
}

// --- End Updated Transcript Types ---


// Analytics Types for Phase 4

export interface ConversationAnalytics {
  conversation_id: string;
  call_sid?: string;
  quality_score: number;
  duration: number;
  date: string;
  agent_id: string;
  success_rate: number;
  completion_rate: number;
  messages_count: {
    user: number;
    agent: number;
    total: number;
  };
  sentiment_analysis?: {
    overall: number;
    user: number;
    agent: number;
  };
  topics?: string[];
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  calls_count: number;
  success_rate: number;
  completion_rate: number;
  average_duration: number;
  average_quality_score: number;
  topics_covered: Array<{
    name: string;
    count: number;
  }>;
}

export interface AnalyticsTimeframe {
  start_date: string;
  end_date: string;
  resolution: 'hour' | 'day' | 'week' | 'month';
}

export interface AnalyticsFilters {
  timeframe: AnalyticsTimeframe;
  agent_ids?: string[];
  minimum_quality_score?: number;
  topics?: string[];
  call_status?: string[];
}

export interface SheetInfo {
  spreadsheetId: string;
  sheetName: string;
  phoneColumn: string;
  nameColumn?: string;
  statusColumn?: string;
  customMessageColumn?: string;
}

export interface CampaignConfig {
  id?: string;
  name: string;
  description?: string;
  sheet_id?: string;
  sheetInfo?: SheetInfo;
  contact_list?: Array<{
    name?: string;
    phone: string;
    custom_message?: string;
  }>;
  prompt_template: string;
  first_message_template: string;
  schedule?: {
    start_date: string;
    end_date?: string;
    max_concurrent_calls?: number;
    call_interval_ms?: number;
    max_retries?: number;
    retry_interval_ms?: number;
  };
  status?: 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'paused' | 'cancelled';
  created_at?: string;
  stats?: CampaignStats; // Added stats property
}

export interface CampaignStats {
  campaign_id: string;
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  in_progress_calls: number;
  average_duration: number;
  success_rate: number;
  completion_rate: number;
}

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  type: 'analytics' | 'campaign' | 'custom';
  timeframe: AnalyticsTimeframe;
  metrics: string[];
  filters?: AnalyticsFilters;
  visualization_type: 'table' | 'bar' | 'line' | 'pie';
  schedule?: {
    recurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
    recipients?: string[];
  };
  format?: 'pdf' | 'excel' | 'csv';
  created_at?: string;
}

// Contact Management Types
export interface Contact {
  id?: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  tags?: string[];
  notes?: string;
  lastContacted?: string;
  callCount?: number;
  callIds?: string[];
  campaignIds?: string[];
  status?: 'active' | 'inactive' | 'do-not-call';
  priority?: number;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactListResponse {
  contacts: Contact[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ContactFilters {
  search?: string;
  status?: string;
  tags?: string[];
  campaignId?: string;
  lastContactedAfter?: string;
  lastContactedBefore?: string;
}

// Generic API Response structure used by the wrapper
// Note: The 'data' field in fetchCallTranscript now returns TranscriptData
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError | string; // Can be a structured error or a simple message
  requestId?: string;
  timestamp?: string; // Often included in API responses
}

// Standardized API Error structure used by the wrapper
export interface ApiError {
  message: string;
  code: string; // e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR'
  details?: any; // Optional field for more specific error details (e.g., validation failures)
  statusCode: number; // HTTP status code
  requestId?: string; // Optional request ID for tracing
}
