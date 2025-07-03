'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, RefreshCw, Sparkles } from 'lucide-react';
import { fetchCalls } from '@/lib/mongodb-api';
import { analyzeSelectedCalls } from '@/lib/mongodb-api';

interface AIInsightsCardProps {
  timeRange?: {
    start: string;
    end: string;
  };
}

export function AIInsightsCard({ timeRange }: AIInsightsCardProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-load insights when component mounts or time range changes
    generateInsights();
  }, [timeRange?.start, timeRange?.end]);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch recent calls based on time range
      const callsResponse = await fetchCalls({
        limit: 50,
        startDate: timeRange?.start,
        endDate: timeRange?.end
      });
      
      if (!callsResponse.success || !callsResponse.data?.calls?.length) {
        setError('No calls found for the selected time range');
        setLoading(false);
        return;
      }
      
      // Get call SIDs for analysis
      const callSids = callsResponse.data.calls.map((call: any) => call.callSid);
      
      // Analyze the calls
      const analysisResponse = await analyzeSelectedCalls(callSids.slice(0, 20), 'summary');
      
      if (analysisResponse.success && analysisResponse.data) {
        setMetrics(analysisResponse.data.metrics);
        setInsights(analysisResponse.data.aiAnalysis);
      } else {
        setError('Failed to generate insights');
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setError('Error generating AI insights');
    } finally {
      setLoading(false);
    }
  };

  const formatInsights = (text: string | null) => {
    if (!text) return null;
    
    // Split by numbered points or bullet points
    const lines = text.split('\n');
    const formattedLines: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Check if it's a header (contains ":")
      if (trimmedLine.includes(':') && !trimmedLine.startsWith('•') && !trimmedLine.match(/^\d+\./)) {
        formattedLines.push(
          <h4 key={index} className="font-semibold text-sm mt-3 mb-1">{trimmedLine}</h4>
        );
      }
      // Check if it's a numbered point
      else if (trimmedLine.match(/^\d+\./)) {
        formattedLines.push(
          <li key={index} className="ml-4 text-sm mb-1">{trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim()}</li>
        );
      }
      // Check if it's a bullet point
      else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        formattedLines.push(
          <li key={index} className="ml-4 text-sm mb-1 list-disc">{trimmedLine.substring(1).trim()}</li>
        );
      }
      // Regular text
      else {
        formattedLines.push(
          <p key={index} className="text-sm mb-2">{trimmedLine}</p>
        );
      }
    });
    
    return <div className="space-y-1">{formattedLines}</div>;
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI-Powered Insights
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={generateInsights}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing call patterns...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={generateInsights}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            {metrics && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.rates?.humanAnswerRate?.toFixed(1) || '0'}%
                  </p>
                  <p className="text-xs text-gray-600">Human Answer Rate</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.rates?.completionRate?.toFixed(1) || '0'}%
                  </p>
                  <p className="text-xs text-gray-600">Completion Rate</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(metrics.duration?.averageHumanCall || 0)}s
                  </p>
                  <p className="text-xs text-gray-600">Avg Call Duration</p>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <h4 className="font-semibold text-sm">Key Insights</h4>
              </div>
              <div className="text-sm text-gray-700">
                {formatInsights(insights)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Click refresh to generate AI insights for your recent calls
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}