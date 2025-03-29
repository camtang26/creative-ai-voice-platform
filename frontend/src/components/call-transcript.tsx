"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCallTranscript } from '@/lib/mongodb-api';
import { TranscriptData } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Search, User, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Added Badge import

interface CallTranscriptProps {
  callSid: string;
}

export function CallTranscript({ callSid }: CallTranscriptProps) {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Array<{
    role: string;
    text: string;
    timestamp?: string;
    highlight?: boolean;
  }>>([]);

  useEffect(() => {
    loadTranscript();
  }, [callSid]);

  useEffect(() => {
    if (transcript && transcript.transcript) {
      if (searchTerm.trim() === '') {
        setFilteredMessages(transcript.transcript);
      } else {
        const term = searchTerm.toLowerCase();
        setFilteredMessages(
          transcript.transcript.map(message => ({
            ...message,
            highlight: message.text.toLowerCase().includes(term)
          }))
        );
      }
    }
  }, [searchTerm, transcript]);

  async function loadTranscript() {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchCallTranscript(callSid);
      if (result.success) {
        setTranscript(result.data);
        setFilteredMessages(result.data?.transcript || []);
      } else {
        setError(result.error || 'Failed to load transcript');
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  function getSentimentColor(score: number): string {
    if (score >= 0.7) return 'text-green-500';
    if (score >= 0.4) return 'text-blue-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  }

  function getSentimentEmoji(score: number): string {
    if (score >= 0.7) return '😀';
    if (score >= 0.4) return '🙂';
    if (score >= 0) return '😐';
    return '😟';
  }

  function highlightText(text: string, term: string): React.ReactNode {
    if (!term.trim()) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() 
            ? <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> 
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

  if (error || !transcript) {
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Call Transcript
        </CardTitle>
        <CardDescription>
          Conversation transcript with sentiment analysis
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
        {/* Display Summary */}
        {transcript.analysis?.transcript_summary && (
          <div className="mb-4 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
            <h4 className="text-sm font-semibold mb-1 text-foreground">AI Summary</h4>
            <p className="text-sm text-muted-foreground">{transcript.analysis.transcript_summary}</p>
          </div>
        )}

        {/* Display Criteria Evaluation */}
        {transcript.analysis?.criteria && (
          <div className="mb-4 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
            <h4 className="text-sm font-semibold mb-2 text-foreground">Criteria Evaluation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(transcript.analysis.criteria).map(([key, value]) => value && (
                <div key={key} className="flex flex-col items-start">
                  <span className="text-xs capitalize text-muted-foreground mb-0.5">{key.replace(/_/g, ' ')}</span>
                  <Badge
                    variant={
                      value === 'Success' ? 'success' : value === 'Failure' ? 'destructive' : 'secondary'
                    }
                  >
                    {value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Sentiment Analysis - Adjust if needed based on new analysis structure */}
        {transcript.analysis?.sentiment && (
          <div className="mb-4 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border">
            <h4 className="text-sm font-semibold mb-2 text-foreground">Sentiment Analysis</h4>
            {/* Assuming sentiment is now a string like 'positive', 'negative', 'neutral' */}
            <Badge variant={
              transcript.analysis.sentiment === 'positive' ? 'success' :
              transcript.analysis.sentiment === 'negative' ? 'destructive' :
              'secondary'
            }>
              {transcript.analysis.sentiment.charAt(0).toUpperCase() + transcript.analysis.sentiment.slice(1)}
            </Badge>
            {/*
              The old sentiment display logic below is commented out because
              sentiment is now expected as a string ('positive', 'negative', 'neutral')
              within transcript.analysis.sentiment, not an object with 'overall' and 'segments'.
            */}
            {/* Old sentiment display logic removed */}
          </div>
        )}

        <div className="space-y-4">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message, index) => (
              <div 
                key={index} 
                className={`flex gap-3 ${
                  message.highlight ? 'bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-md' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {message.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {message.role === 'assistant' ? 'AI Assistant' : 'Customer'}
                    </div>
                    {message.timestamp && (
                      <div className="text-xs text-muted-foreground">
                        {formatDate(message.timestamp)}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-sm">
                    {searchTerm.trim() 
                      ? highlightText(message.text, searchTerm) 
                      : message.text
                    }
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No transcript messages available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
