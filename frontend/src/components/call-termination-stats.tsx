'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, User, Bot, AlertCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AnalyticsFilters } from '@/lib/types';
import { format } from 'date-fns';

interface TerminationData {
  summary: {
    total: number;
    byTerminator: Record<string, number>;
    breakdown: Array<{
      terminator: string;
      count: number;
      percentage: string;
    }>;
  };
  recentTerminations: Array<{
    callSid: string;
    phoneNumber: string;
    terminatedBy: string;
    duration: number;
    timestamp: string;
    status: string;
  }>;
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

const COLORS = {
  user: '#ef4444',
  agent: '#3b82f6',
  system: '#f59e0b',
  system_timeout: '#f97316',
  amd_machine: '#8b5cf6',
  api_request: '#06b6d4',
  normal_completion: '#10b981',
  user_busy: '#e11d48',
  user_no_answer: '#f87171',
  system_error: '#dc2626',
  unknown: '#6b7280'
};

const getTerminatorLabel = (terminator: string): string => {
  const labels: Record<string, string> = {
    user: 'User Hung Up',
    agent: 'Agent Completed',
    system: 'System',
    system_timeout: 'Timeout',
    amd_machine: 'Answering Machine',
    api_request: 'API Request',
    normal_completion: 'Normal Completion',
    user_busy: 'User Busy',
    user_no_answer: 'No Answer',
    system_error: 'System Error',
    unknown: 'Unknown'
  };
  return labels[terminator] || terminator;
};

const getTerminatorIcon = (terminator: string) => {
  switch (terminator) {
    case 'user':
    case 'user_busy':
    case 'user_no_answer':
      return <User className="h-4 w-4" />;
    case 'agent':
    case 'normal_completion':
      return <Bot className="h-4 w-4" />;
    case 'system':
    case 'system_timeout':
    case 'system_error':
      return <AlertCircle className="h-4 w-4" />;
    case 'amd_machine':
      return <Phone className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export function CallTerminationStats({ filters }: { filters: AnalyticsFilters }) {
  const [data, setData] = useState<TerminationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerminationData();
  }, [filters.timeframe.start_date, filters.timeframe.end_date]);

  const fetchTerminationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/db/analytics/termination-stats?` +
        `startDate=${filters.timeframe.start_date}&` +
        `endDate=${filters.timeframe.end_date}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load termination data');
      }
    } catch (err) {
      setError('Error fetching termination statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare data for pie chart
  const pieData = data.summary.breakdown.map(item => ({
    name: getTerminatorLabel(item.terminator),
    value: item.count,
    terminator: item.terminator
  }));

  // Prepare data for bar chart
  const barData = data.summary.breakdown.map(item => ({
    name: getTerminatorLabel(item.terminator),
    count: item.count,
    percentage: parseFloat(item.percentage)
  }));

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Hang-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.summary.byTerminator.user || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.total > 0 
                ? `${((data.summary.byTerminator.user || 0) / data.summary.total * 100).toFixed(1)}%`
                : '0%'
              } of calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(data.summary.byTerminator.agent || 0) + (data.summary.byTerminator.normal_completion || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.total > 0 
                ? `${(((data.summary.byTerminator.agent || 0) + (data.summary.byTerminator.normal_completion || 0)) / data.summary.total * 100).toFixed(1)}%`
                : '0%'
              } of calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System/Timeout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(data.summary.byTerminator.system || 0) + (data.summary.byTerminator.system_timeout || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.total > 0 
                ? `${(((data.summary.byTerminator.system || 0) + (data.summary.byTerminator.system_timeout || 0)) / data.summary.total * 100).toFixed(1)}%`
                : '0%'
              } of calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Termination Distribution</CardTitle>
            <CardDescription>
              Visual breakdown of who ends calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.terminator] || COLORS.unknown} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Termination Counts</CardTitle>
            <CardDescription>
              Number of calls by termination type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Terminations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Terminations</CardTitle>
          <CardDescription>
            Last 10 call terminations with details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentTerminations.map((call) => (
              <div
                key={call.callSid}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                    {getTerminatorIcon(call.terminatedBy)}
                  </div>
                  <div>
                    <p className="font-medium">{call.phoneNumber}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(call.timestamp), 'MMM d, h:mm a')} • {formatDuration(call.duration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                    {call.status}
                  </Badge>
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: COLORS[call.terminatedBy] || COLORS.unknown,
                      color: COLORS[call.terminatedBy] || COLORS.unknown
                    }}
                  >
                    {getTerminatorLabel(call.terminatedBy)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}