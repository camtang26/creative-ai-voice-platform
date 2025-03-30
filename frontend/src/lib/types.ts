export interface CallInfo {
  callSid: string; // Changed from sid to match backend data
  to: string;
  from: string;
  status: CallStatus;
  duration?: number;
  startTime: string;
  endTime?: string;
  answeredBy?: string;
  recordings?: RecordingInfo[];
  conversation_id?: string;
  qualityMetrics?: any;
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
  | 'canceled';

export interface RecordingInfo {
  sid: string;
  url: string;
  mp3Url?: string;
  wavUrl?: string;
  duration?: number;
  channels?: string;
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
  type: 'status_update' | 'new_call' | 'call_ended' | 'recording_update';
  callSid: string;
  status?: CallStatus;
  timestamp: string;
  data?: any;
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
}

// Transcript Types for MongoDB Integration
export interface TranscriptData {
  callSid: string;
  transcript: Array<{
    role: 'assistant' | 'user';
    text: string;
    timestamp?: string;
  }>;
  // Removed top-level sentiment, now part of analysis
  // sentiment?: { ... };
  analysis?: { // Added analysis object
    transcript_summary?: string;
    sentiment?: string; // Assuming sentiment string ('positive', 'negative', 'neutral')
    topics?: string[];
    callSuccessful?: boolean;
    criteria?: {
      confused?: string | null;
      interested?: string | null;
      no_call_back?: string | null;
      // Add other criteria fields if defined in backend model
    };
    customFields?: any;
  };
  metadata?: {
    duration?: number;
    wordCount?: number;
    callStartTime?: string;
    callEndTime?: string;
  };
}

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
