"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CallMetrics } from '@/lib/types';
import { ArrowDown, ArrowUp, AlertTriangle, CheckCircle, BarChart3, Wifi, Clock, Package } from 'lucide-react';
import { fetchCallMetrics } from '@/lib/mongodb-api';

interface CallQualityMetricsProps {
  callSid: string;
  metrics?: CallMetrics | null;
}

export function CallQualityMetrics({ callSid, metrics: initialMetrics }: CallQualityMetricsProps) {
  const [metrics, setMetrics] = useState<CallMetrics | null>(initialMetrics || null);
  const [isLoading, setIsLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If metrics are already provided as props, don't fetch them again
    if (initialMetrics) return;

    async function loadMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchCallMetrics(callSid);
        if (result.success && result.data) {
          setMetrics(result.data);
        } else {
          setError(result.error || 'Failed to load call metrics');
        }
      } catch (err) {
        console.error('Error loading call metrics:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [callSid, initialMetrics]);

  // MOS score to quality label mapping
  const getMosQuality = (mos?: number) => {
    if (!mos) return { label: 'Unknown', color: 'text-gray-500' };
    if (mos >= 4.3) return { label: 'Excellent', color: 'text-green-600' };
    if (mos >= 4.0) return { label: 'Good', color: 'text-green-500' };
    if (mos >= 3.6) return { label: 'Fair', color: 'text-yellow-500' };
    if (mos >= 3.1) return { label: 'Poor', color: 'text-orange-500' };
    return { label: 'Bad', color: 'text-red-500' };
  };

  // Latency quality mapping
  const getLatencyQuality = (latency?: number) => {
    if (latency === undefined) return { label: 'Unknown', color: 'text-gray-500' };
    if (latency < 100) return { label: 'Excellent', color: 'text-green-600' };
    if (latency < 150) return { label: 'Good', color: 'text-green-500' };
    if (latency < 250) return { label: 'Fair', color: 'text-yellow-500' };
    if (latency < 400) return { label: 'Poor', color: 'text-orange-500' };
    return { label: 'Bad', color: 'text-red-500' };
  };

  // Packet loss quality mapping
  const getPacketLossQuality = (packetLoss?: number) => {
    if (packetLoss === undefined) return { label: 'Unknown', color: 'text-gray-500' };
    if (packetLoss < 0.5) return { label: 'Excellent', color: 'text-green-600' };
    if (packetLoss < 1.5) return { label: 'Good', color: 'text-green-500' };
    if (packetLoss < 3) return { label: 'Fair', color: 'text-yellow-500' };
    if (packetLoss < 5) return { label: 'Poor', color: 'text-orange-500' };
    return { label: 'Bad', color: 'text-red-500' };
  };

  // Jitter quality mapping
  const getJitterQuality = (jitter?: number) => {
    if (jitter === undefined) return { label: 'Unknown', color: 'text-gray-500' };
    if (jitter < 10) return { label: 'Excellent', color: 'text-green-600' };
    if (jitter < 20) return { label: 'Good', color: 'text-green-500' };
    if (jitter < 30) return { label: 'Fair', color: 'text-yellow-500' };
    if (jitter < 50) return { label: 'Poor', color: 'text-orange-500' };
    return { label: 'Bad', color: 'text-red-500' };
  };

  // Calculate overall call quality score (0-100)
  const calculateOverallScore = (metrics: CallMetrics | null) => {
    if (!metrics || !metrics.available || !metrics.advanced) return 0;
    
    const { mos, jitter, latency, packetLoss } = metrics.advanced;
    
    let score = 0;
    let factors = 0;
    
    // MOS score contribution (weight: 40%)
    if (mos !== undefined) {
      score += (mos / 5) * 40;
      factors++;
    }
    
    // Latency contribution (weight: 20%)
    if (latency !== undefined) {
      // Convert latency to a 0-1 scale (lower is better)
      const latencyScore = Math.max(0, Math.min(1, 1 - (latency / 500)));
      score += latencyScore * 20;
      factors++;
    }
    
    // Packet loss contribution (weight: 20%)
    if (packetLoss !== undefined) {
      // Convert packet loss to a 0-1 scale (lower is better)
      const packetLossScore = Math.max(0, Math.min(1, 1 - (packetLoss / 10)));
      score += packetLossScore * 20;
      factors++;
    }
    
    // Jitter contribution (weight: 20%)
    if (jitter !== undefined) {
      // Convert jitter to a 0-1 scale (lower is better)
      const jitterScore = Math.max(0, Math.min(1, 1 - (jitter / 50)));
      score += jitterScore * 20;
      factors++;
    }
    
    // Normalize score based on available factors
    return factors > 0 ? Math.round(score / factors * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex">
          <div>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics || !metrics.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call Quality Metrics</CardTitle>
          <CardDescription>No quality metrics available for this call</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            Quality metrics could not be collected for this call. This might be due to:
          </p>
          <ul className="list-disc text-sm text-muted-foreground mt-2 space-y-1 pl-6">
            <li>The call was too short</li>
            <li>The call did not establish a media connection</li>
            <li>The call occurred before quality monitoring was enabled</li>
            <li>Technical issues during the call</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  // Calculate the overall quality score (0-100)
  const overallScore = calculateOverallScore(metrics);
  
  // Get quality assessment for each metric
  const mosQuality = getMosQuality(metrics.advanced?.mos);
  const latencyQuality = getLatencyQuality(metrics.advanced?.latency);
  const packetLossQuality = getPacketLossQuality(metrics.advanced?.packetLoss);
  const jitterQuality = getJitterQuality(metrics.advanced?.jitter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Quality Score</CardTitle>
          <CardDescription>Overall assessment of the call quality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-32 w-32 mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{overallScore}</span>
              </div>
              <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle
                  className="stroke-slate-200"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="8"
                />
                <circle
                  className={`
                    ${overallScore >= 80 ? 'stroke-green-500' : 
                      overallScore >= 60 ? 'stroke-yellow-500' : 
                      overallScore >= 40 ? 'stroke-orange-500' : 'stroke-red-500'}
                  `}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40 * overallScore / 100} ${2 * Math.PI * 40 * (100 - overallScore) / 100}`}
                  strokeDashoffset={2 * Math.PI * 40 * 0.25}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className={`text-xl font-semibold 
              ${overallScore >= 80 ? 'text-green-500' : 
                overallScore >= 60 ? 'text-yellow-500' : 
                overallScore >= 40 ? 'text-orange-500' : 'text-red-500'}`
            }>
              {overallScore >= 80 ? 'Excellent' : 
                overallScore >= 60 ? 'Good' : 
                overallScore >= 40 ? 'Fair' : 'Poor'} Quality
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Voice Quality (MOS)</CardTitle>
              <Wifi className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score:</span>
                <span className={`font-semibold ${mosQuality.color}`}>
                  {metrics.advanced?.mos ? metrics.advanced.mos.toFixed(1) : 'N/A'} / 5.0
                </span>
              </div>
              <Progress
                value={metrics.advanced?.mos ? (metrics.advanced.mos / 5) * 100 : 0}
                className={`h-2 ${
                  mosQuality.color === 'text-green-600' || mosQuality.color === 'text-green-500'
                    ? 'bg-green-100'
                    : mosQuality.color === 'text-yellow-500'
                    ? 'bg-yellow-100'
                    : mosQuality.color === 'text-orange-500'
                    ? 'bg-orange-100'
                    : mosQuality.color === 'text-red-500'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Poor</span>
                <span className="text-xs text-muted-foreground">Excellent</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Quality:</span>{' '}
                <span className={`font-medium ${mosQuality.color}`}>{mosQuality.label}</span>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">
                MOS (Mean Opinion Score) measures the perceived audio quality
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Latency</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delay:</span>
                <span className={`font-semibold ${latencyQuality.color}`}>
                  {metrics.advanced?.latency !== undefined ? `${metrics.advanced.latency} ms` : 'N/A'}
                </span>
              </div>
              <Progress
                value={metrics.advanced?.latency 
                  ? Math.max(0, 100 - (metrics.advanced.latency / 5)) 
                  : 0
                }
                className={`h-2 ${
                  latencyQuality.color === 'text-green-600' || latencyQuality.color === 'text-green-500'
                    ? 'bg-green-100'
                    : latencyQuality.color === 'text-yellow-500'
                    ? 'bg-yellow-100'
                    : latencyQuality.color === 'text-orange-500'
                    ? 'bg-orange-100'
                    : latencyQuality.color === 'text-red-500'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">High</span>
                <span className="text-xs text-muted-foreground">Low</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Quality:</span>{' '}
                <span className={`font-medium ${latencyQuality.color}`}>{latencyQuality.label}</span>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">
                Latency is the delay between when audio is spoken and heard
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Packet Loss</CardTitle>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Loss Rate:</span>
                <span className={`font-semibold ${packetLossQuality.color}`}>
                  {metrics.advanced?.packetLoss !== undefined ? `${metrics.advanced.packetLoss}%` : 'N/A'}
                </span>
              </div>
              <Progress
                value={metrics.advanced?.packetLoss 
                  ? Math.max(0, 100 - (metrics.advanced.packetLoss * 20)) 
                  : 0
                }
                className={`h-2 ${
                  packetLossQuality.color === 'text-green-600' || packetLossQuality.color === 'text-green-500'
                    ? 'bg-green-100'
                    : packetLossQuality.color === 'text-yellow-500'
                    ? 'bg-yellow-100'
                    : packetLossQuality.color === 'text-orange-500'
                    ? 'bg-orange-100'
                    : packetLossQuality.color === 'text-red-500'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">High</span>
                <span className="text-xs text-muted-foreground">Low</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Quality:</span>{' '}
                <span className={`font-medium ${packetLossQuality.color}`}>{packetLossQuality.label}</span>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">
                Packet loss causes audio dropouts and choppy conversation
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Jitter</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Variation:</span>
                <span className={`font-semibold ${jitterQuality.color}`}>
                  {metrics.advanced?.jitter !== undefined ? `${metrics.advanced.jitter} ms` : 'N/A'}
                </span>
              </div>
              <Progress
                value={metrics.advanced?.jitter 
                  ? Math.max(0, 100 - (metrics.advanced.jitter * 2)) 
                  : 0
                }
                className={`h-2 ${
                  jitterQuality.color === 'text-green-600' || jitterQuality.color === 'text-green-500'
                    ? 'bg-green-100'
                    : jitterQuality.color === 'text-yellow-500'
                    ? 'bg-yellow-100'
                    : jitterQuality.color === 'text-orange-500'
                    ? 'bg-orange-100'
                    : jitterQuality.color === 'text-red-500'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">High</span>
                <span className="text-xs text-muted-foreground">Low</span>
              </div>
              <div className="pt-2">
                <span className="text-sm text-muted-foreground">Quality:</span>{' '}
                <span className={`font-medium ${jitterQuality.color}`}>{jitterQuality.label}</span>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">
                Jitter is the variation in delay, causing uneven audio delivery
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {metrics.advanced?.warnings && metrics.advanced.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Call Quality Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.advanced.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
