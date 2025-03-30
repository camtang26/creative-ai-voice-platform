"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCallTranscript } from '@/lib/mongodb-api';
// Import the specific types needed
import { TranscriptData, TranscriptItem, EvaluationCriteriaResult } from '@/lib/types';
import { formatTimeInSeconds } from '@/lib/utils'; // Assuming a helper for seconds exists or create one
import { MessageSquare, Search, User, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CallTranscriptProps {
  callSid: string;
}

// Define the type for messages used in state, including highlight
type DisplayMessage = TranscriptItem & { highlight?: boolean };

export function CallTranscript({ callSid }: CallTranscriptProps) {
  // State now uses the imported TranscriptData type
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // State uses the DisplayMessage type
  const [filteredMessages, setFilteredMessages] = useState<DisplayMessage[]>([]);

  useEffect(() => {
    loadTranscript();
  }, [callSid]);

  useEffect(() => {
    // Check transcriptData and its transcript array
    if (transcriptData?.transcript) {
      const messages = transcriptData.transcript;
      if (searchTerm.trim() === '') {
        // Reset highlight when search is cleared
        setFilteredMessages(messages.map(m => ({ ...m, highlight: false })));
      } else {
        const term = searchTerm.toLowerCase();
        setFilteredMessages(
          messages.map(message => ({
            ...message,
            // Highlight if message exists and includes the term
            highlight: !!message.message && message.message.toLowerCase().includes(term)
          }))
        );
      }
    } else {
      setFilteredMessages([]); // Clear messages if no transcript data
    }
  }, [searchTerm, transcriptData]);

  async function loadTranscript() {
    setIsLoading(true);
    setError(null);
    setTranscriptData(null); // Clear previous data
    setFilteredMessages([]);

    try {
      // fetchCallTranscript now returns ApiResponse<TranscriptData>
      const result = await fetchCallTranscript(callSid);
      if (result.success && result.data) {
        setTranscriptData(result.data); // Set the full TranscriptData object
        // Initialize filtered messages (no highlight initially)
        // Explicitly type 'm' as TranscriptItem
        setFilteredMessages(result.data.transcript?.map((m: TranscriptItem) => ({ ...m, highlight: false })) || []);
      } else {
        setError(typeof result.error === 'string' ? result.error : 'Failed to load transcript');
      }
    } catch (err: any) {
      console.error('Error loading transcript:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Removed getSentimentColor and getSentimentEmoji helpers

  // Updated highlightText to work with the 'message' property
  function highlightText(text: string | undefined, term: string): React.ReactNode {
    if (!text || !term.trim()) return text || ''; // Handle undefined text

    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase()
            ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">{part}</mark>
            : part
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Loading Transcript...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !transcriptData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Transcript Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 dark:text-red-400">
              {error || 'No transcript data available for this call.'}
            </p>
            {transcriptData?.status === 'processing' && (
                 <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">Status: Processing</p>
            )}
             {transcriptData?.status === 'failed' && (
                 <p className="text-sm text-red-700 dark:text-red-400 mt-2">Status: Failed</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Render Transcript ---
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Call Transcript & Analysis
        </CardTitle>
        <CardDescription>
          Conversation details from ElevenLabs (Status: {transcriptData.status || 'N/A'})
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* --- Analysis Section --- */}
        {transcriptData.analysis && (
          <div className="mb-6 space-y-4">
            {/* Display Summary */}
            {transcriptData.analysis.transcript_summary && (
              <div className="p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
                <h4 className="text-sm font-semibold mb-1 text-foreground">AI Summary</h4>
                <p className="text-sm text-muted-foreground">{transcriptData.analysis.transcript_summary}</p>
              </div>
            )}

             {/* Display Call Success Status */}
             {transcriptData.analysis.call_successful && (
               <div className="p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
                 <h4 className="text-sm font-semibold mb-1 text-foreground">Call Outcome</h4>
                 <Badge variant={
                    transcriptData.analysis.call_successful === 'success' ? 'success' :
                    transcriptData.analysis.call_successful === 'failure' ? 'destructive' :
                    'secondary'
                 }>
                   {transcriptData.analysis.call_successful.charAt(0).toUpperCase() + transcriptData.analysis.call_successful.slice(1)}
                 </Badge>
               </div>
             )}

            {/* Display Criteria Evaluation */}
            {transcriptData.analysis.evaluation_criteria_results && Object.keys(transcriptData.analysis.evaluation_criteria_results).length > 0 && (
              <div className="p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Criteria Evaluation</h4>
                {/* Use Object.values if criteria_id is not needed as the key display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(transcriptData.analysis.evaluation_criteria_results).map(([key, criteria]) => (
                    <div key={key} className="flex flex-col items-start p-2 border rounded bg-background/50">
                       {/* Display criteria_id or a formatted version */}
                      <span className="text-xs font-medium text-muted-foreground mb-1">{criteria.criteria_id.replace(/_/g, ' ')}</span>
                      <Badge
                        variant={
                          criteria.result === 'success' ? 'success' : criteria.result === 'failure' ? 'destructive' : 'secondary'
                        }
                        className="mb-1"
                      >
                        {criteria.result.charAt(0).toUpperCase() + criteria.result.slice(1)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{criteria.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

             {/* Display Data Collection Results (Optional) */}
             {transcriptData.analysis.data_collection_results && Object.keys(transcriptData.analysis.data_collection_results).length > 0 && (
              <div className="p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Data Collection</h4>
                 <div className="space-y-2">
                  {Object.entries(transcriptData.analysis.data_collection_results).map(([key, dataItem]) => (
                    <div key={key} className="text-xs border-b pb-1 last:border-b-0">
                       <span className="font-medium text-muted-foreground">{dataItem.data_collection_id.replace(/_/g, ' ')}: </span>
                       <span className="text-foreground">{String(dataItem.value ?? '-')}</span>
                       {dataItem.rationale && <span className="text-muted-foreground italic"> ({dataItem.rationale})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
        {/* --- End Analysis Section --- */}


        {/* --- Transcript Messages Section --- */}
        <div className="space-y-4 border-t pt-4">
           <h4 className="text-sm font-semibold text-foreground mb-2">Conversation</h4>
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.highlight ? 'bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md -mx-2' : '' // Adjust padding/margin for highlight
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {/* Use 'agent' role from ElevenLabs */}
                  {message.role === 'agent' ? (
                    <div title="AI Agent" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                     <div title="User" className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {/* Use 'agent' role */}
                      {message.role === 'agent' ? 'AI Agent' : 'User'}
                    </div>
                    {/* Display time_in_call_secs */}
                    <div className="text-xs text-muted-foreground">
                      ({formatTimeInSeconds(message.time_in_call_secs)})
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">
                    {/* Access message.message, handle undefined */}
                    {searchTerm.trim()
                      ? highlightText(message.message, searchTerm)
                      : message.message || <span className="italic text-muted-foreground">[No message content]</span>
                    }
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No transcript messages available in the data.
            </div>
          )}
        </div>
         {/* --- End Transcript Messages Section --- */}
      </CardContent>
    </Card>
  );
}
