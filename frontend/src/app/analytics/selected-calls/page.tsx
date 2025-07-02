'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, BarChart3, Clock, Phone, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fetchCalls, fetchCall } from '@/lib/mongodb-api';

interface Call {
  _id: string;
  callSid: string;
  to: string;
  from: string;
  status: string;
  duration: number;
  startTime: string;
  answeredBy: string;
  contactName: string;
  selected?: boolean;
}

interface AnalyticsMetrics {
  summary: {
    totalCalls: number;
    answeredCalls: number;
    humanAnsweredCalls: number;
    completedConversations: number;
  };
  rates: {
    answerRate: number;
    humanAnswerRate: number;
    machineDetectionRate: number;
    completionRate: number;
  };
  duration: {
    average: number;
    averageHumanCall: number;
    median: number;
    shortest: number;
    longest: number;
  };
  conversation: {
    callsWithTranscripts: number;
    averageTurns: number;
    transcriptCoverage: number;
  };
}

export default function SelectedCallsAnalytics() {
  const searchParams = useSearchParams();
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set());
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Check if we have pre-selected SIDs from URL params
    const sidsParam = searchParams.get('sids');
    if (sidsParam) {
      const sids = sidsParam.split(',').filter(sid => sid);
      setSelectedCalls(new Set(sids));
      // Automatically analyze when coming from call logs
      if (sids.length > 0) {
        fetchSelectedCallsAndAnalyze(sids);
      }
    } else {
      fetchRecentCalls();
    }
  }, [searchParams]);

  const fetchRecentCalls = async () => {
    setLoading(true);
    try {
      const response = await fetchCalls({ limit: 100 });
      if (response.success && response.data) {
        setCalls(response.data.calls);
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedCallsAndAnalyze = async (sids: string[]) => {
    setLoading(true);
    setAnalyzing(true);
    try {
      // First, fetch the call details for display
      const callPromises = sids.map(async (sid) => {
        try {
          const response = await fetchCall(sid);
          if (response.success && response.data) {
            return response.data;
          }
          return null;
        } catch (err) {
          console.error(`Error fetching call ${sid}:`, err);
          return null;
        }
      });
      const callResults = await Promise.all(callPromises);
      const validCalls = callResults.filter(call => call !== null);
      setCalls(validCalls);

      // Then analyze them
      const response = await fetch('/api/db/analytics/analyze-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSids: sids,
          reportType: 'detailed'
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data.metrics);
        setAiAnalysis(data.data.aiAnalysis);
      }
    } catch (error) {
      console.error('Error analyzing calls:', error);
      alert('Failed to analyze calls');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const toggleCallSelection = (callSid: string) => {
    const newSelected = new Set(selectedCalls);
    if (newSelected.has(callSid)) {
      newSelected.delete(callSid);
    } else {
      newSelected.add(callSid);
    }
    setSelectedCalls(newSelected);
  };

  const selectAll = () => {
    setSelectedCalls(new Set(calls.map(call => call.callSid)));
  };

  const deselectAll = () => {
    setSelectedCalls(new Set());
  };

  const analyzeSelectedCalls = async () => {
    if (selectedCalls.size === 0) {
      alert('Please select at least one call to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/db/analytics/analyze-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSids: Array.from(selectedCalls),
          reportType: 'detailed'
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data.metrics);
        setAiAnalysis(data.data.aiAnalysis);
      }
    } catch (error) {
      console.error('Error analyzing calls:', error);
      alert('Failed to analyze calls');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateReport = async (format: 'json' | 'html') => {
    if (selectedCalls.size === 0) {
      alert('Please select calls first');
      return;
    }

    try {
      const response = await fetch('/api/db/analytics/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSids: Array.from(selectedCalls),
          format,
          includeTranscripts: false
        })
      });

      if (format === 'html') {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-report-${new Date().toISOString()}.html`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-report-${new Date().toISOString()}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Call Analytics</h1>

      {/* Call Selection */}
      {!searchParams.get('sids') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Select Calls to Analyze</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <p>Loading calls...</p>
            ) : (
              calls.map((call) => (
                <div
                  key={call.callSid}
                  className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedCalls.has(call.callSid)}
                    onCheckedChange={() => toggleCallSelection(call.callSid)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{call.contactName || 'Unknown'}</span>
                      <span className="text-sm text-gray-500">{call.to}</span>
                      <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                        {call.status}
                      </Badge>
                      {call.answeredBy && (
                        <Badge variant={call.answeredBy === 'human' ? 'success' : 'secondary'}>
                          {call.answeredBy}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(call.startTime), 'MMM d, h:mm a')} • {formatDuration(call.duration)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedCalls.size} of {calls.length} calls selected
            </span>
            <Button onClick={analyzeSelectedCalls} disabled={analyzing || selectedCalls.size === 0}>
              {analyzing ? 'Analyzing...' : 'Analyze Selected Calls'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Selected Calls Summary when coming from call logs */}
      {searchParams.get('sids') && calls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Analyzing {calls.length} Selected Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calls.map((call) => (
                <div key={call.callSid} className="p-3 border rounded bg-gray-50">
                  <div className="font-medium">{call.contactName || 'Unknown'}</div>
                  <div className="text-sm text-gray-600">{call.to}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={call.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {call.status}
                    </Badge>
                    {call.answeredBy && (
                      <Badge variant={call.answeredBy === 'human' ? 'success' : 'secondary'} className="text-xs">
                        {call.answeredBy}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Results */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">{analytics.rates.humanAnswerRate}%</p>
                    <p className="text-sm text-gray-600">Human Answer Rate</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{analytics.rates.completionRate}%</p>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">{formatDuration(analytics.duration.averageHumanCall)}</p>
                    <p className="text-sm text-gray-600">Avg Human Call</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{formatDuration(analytics.duration.median)}</p>
                    <p className="text-sm text-gray-600">Median Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Conversation Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">{analytics.conversation.averageTurns}</p>
                    <p className="text-sm text-gray-600">Avg Conversation Turns</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{analytics.conversation.transcriptCoverage}%</p>
                    <p className="text-sm text-gray-600">Transcript Coverage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Call Outcome Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded">
                  <p className="text-2xl font-bold text-green-600">{analytics.summary.humanAnsweredCalls}</p>
                  <p className="text-sm">Human Answered</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.summary.answeredCalls - analytics.summary.humanAnsweredCalls}
                  </p>
                  <p className="text-sm">Machine Detected</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded">
                  <p className="text-2xl font-bold text-yellow-600">
                    {analytics.summary.totalCalls - analytics.summary.answeredCalls}
                  </p>
                  <p className="text-sm">No Answer</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <p className="text-2xl font-bold text-purple-600">{analytics.summary.completedConversations}</p>
                  <p className="text-sm">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {aiAnalysis && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  AI Analysis & Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{aiAnalysis}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => generateReport('html')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download HTML Report
              </Button>
              <Button onClick={() => generateReport('json')} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Download JSON Data
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}