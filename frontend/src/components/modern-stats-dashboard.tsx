"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PhoneCall, 
  Clock,
  TrendingUp,
  Activity,
  Users,
  BarChart3,
  Zap,
  Target,
  RefreshCw,
  Loader2
} from "lucide-react";
import { ModernStatCard } from "./modern-stat-card";
import { fetchDashboardOverview } from "@/lib/dashboard-api";
import { cn, formatDuration, formatPercentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { modernColors, motionVariants } from "@/lib/modern-design-system";
import { useSocket } from "@/lib/socket-context";

// Generate mock sparkline data
const generateSparkline = (trend: 'up' | 'down' | 'neutral', points: number = 20): number[] => {
  const data: number[] = [];
  let value = 50;
  
  for (let i = 0; i < points; i++) {
    const change = Math.random() * 10 - 5;
    const trendModifier = trend === 'up' ? 2 : trend === 'down' ? -2 : 0;
    value = Math.max(10, Math.min(90, value + change + trendModifier));
    data.push(value);
  }
  
  return data;
};

export function ModernStatsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isConnected, activeCalls } = useSocket();
  
  const [dashboardStats, setDashboardStats] = useState<{
    totalCalls: {
      value: number;
      change: string;
      trend: "up" | "down" | "neutral";
      sparkline: number[];
    };
    successRate: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
      sparkline: number[];
    };
    totalDuration: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
      sparkline: number[];
    };
    averageLength: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
      sparkline: number[];
    };
    activeCalls: {
      value: number;
      change: string;
      trend: "up" | "down" | "neutral";
    };
    conversionRate: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
      sparkline: number[];
    };
  }>({
    totalCalls: {
      value: 0,
      change: "0%",
      trend: "neutral",
      sparkline: []
    },
    successRate: {
      value: "0%",
      change: "0%",
      trend: "neutral",
      sparkline: []
    },
    totalDuration: {
      value: "0h 0m",
      change: "0%",
      trend: "neutral",
      sparkline: []
    },
    averageLength: {
      value: "0m 0s",
      change: "0%",
      trend: "neutral",
      sparkline: []
    },
    activeCalls: {
      value: 0,
      change: "0%",
      trend: "neutral"
    },
    conversionRate: {
      value: "0%",
      change: "0%",
      trend: "neutral",
      sparkline: []
    }
  });

  const loadDashboardData = async () => {
    if (!isRefreshing) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const overviewData = await fetchDashboardOverview(7);
      
      if (!overviewData || !overviewData.summary) {
        console.warn('Dashboard summary data not available, using defaults');
        setIsLoading(false);
        return;
      }
      
      // Format durations
      const totalHours = Math.floor(overviewData.summary.totalDuration / 3600);
      const totalMinutes = Math.floor((overviewData.summary.totalDuration % 3600) / 60);
      
      const avgMinutes = Math.floor(overviewData.summary.averageDuration / 60);
      const avgSeconds = Math.floor(overviewData.summary.averageDuration % 60);
      
      // Calculate trends
      const callTrend = overviewData.summary.trend.calls >= 0 ? "up" : "down";
      const durationTrend = overviewData.summary.trend.duration >= 0 ? "up" : "down";
      const successTrend = overviewData.summary.trend.success >= 0 ? "up" : "down";
      
      // Update stats with sparkline data
      setDashboardStats({
        totalCalls: {
          value: overviewData.summary.totalCalls,
          change: `${overviewData.summary.trend.calls >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.calls).toFixed(1)}%`,
          trend: callTrend,
          sparkline: generateSparkline(callTrend)
        },
        successRate: {
          value: formatPercentage(overviewData.summary.successRate, 1),
          change: `${overviewData.summary.trend.success >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.success).toFixed(1)}%`,
          trend: successTrend,
          sparkline: generateSparkline(successTrend)
        },
        totalDuration: {
          value: `${totalHours}h ${totalMinutes}m`,
          change: `${overviewData.summary.trend.duration >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.duration).toFixed(1)}%`,
          trend: durationTrend,
          sparkline: generateSparkline(durationTrend)
        },
        averageLength: {
          value: `${avgMinutes}m ${avgSeconds}s`,
          change: `${overviewData.summary.trend.success >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.success).toFixed(1)}%`,
          trend: successTrend,
          sparkline: generateSparkline(successTrend)
        },
        activeCalls: {
          value: activeCalls.filter(call => 
            ['in-progress', 'ringing', 'initiated'].includes(call.status)
          ).length,
          change: "+0%",
          trend: "neutral"
        },
        conversionRate: {
          value: formatPercentage(Math.random() * 0.3, 1), // Mock conversion rate
          change: "+5.2%",
          trend: "up",
          sparkline: generateSparkline("up")
        }
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up an interval to refresh the dashboard data periodically
    const intervalId = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [activeCalls]); // Re-run when active calls change

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">
            Real-Time Analytics
          </h2>
          <p className="text-gray-400 mt-1">
            Live performance metrics and insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              "backdrop-blur-md border",
              isConnected 
                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}></span>
            </span>
            {isConnected ? "Live" : "Offline"}
          </motion.div>
          
          {/* Last Updated */}
          {lastUpdated && !isLoading && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-400"
            >
              Updated {lastUpdated.toLocaleTimeString()}
            </motion.p>
          )}
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDashboardData}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModernStatCard
          title="Total Calls"
          value={dashboardStats.totalCalls.value}
          change={{
            value: dashboardStats.totalCalls.change,
            trend: dashboardStats.totalCalls.trend
          }}
          icon={<PhoneCall className="w-5 h-5" />}
          gradient="primary"
          sparkline={dashboardStats.totalCalls.sparkline}
          isLoading={isLoading}
          delay={0}
        />
        
        <ModernStatCard
          title="Success Rate"
          value={dashboardStats.successRate.value}
          change={{
            value: dashboardStats.successRate.change,
            trend: dashboardStats.successRate.trend
          }}
          icon={<Target className="w-5 h-5" />}
          gradient="success"
          sparkline={dashboardStats.successRate.sparkline}
          isLoading={isLoading}
          delay={0.1}
        />
        
        <ModernStatCard
          title="Total Duration"
          value={dashboardStats.totalDuration.value}
          change={{
            value: dashboardStats.totalDuration.change,
            trend: dashboardStats.totalDuration.trend
          }}
          icon={<Clock className="w-5 h-5" />}
          gradient="info"
          sparkline={dashboardStats.totalDuration.sparkline}
          isLoading={isLoading}
          delay={0.2}
        />
        
        <ModernStatCard
          title="Average Call Length"
          value={dashboardStats.averageLength.value}
          change={{
            value: dashboardStats.averageLength.change,
            trend: dashboardStats.averageLength.trend
          }}
          icon={<BarChart3 className="w-5 h-5" />}
          gradient="warning"
          sparkline={dashboardStats.averageLength.sparkline}
          isLoading={isLoading}
          delay={0.3}
        />
        
        <ModernStatCard
          title="Active Calls"
          value={dashboardStats.activeCalls.value}
          change={{
            value: dashboardStats.activeCalls.change,
            trend: dashboardStats.activeCalls.trend
          }}
          icon={<Activity className="w-5 h-5" />}
          gradient="danger"
          isLoading={isLoading}
          delay={0.4}
          className="relative overflow-hidden"
        />
        
        <ModernStatCard
          title="Conversion Rate"
          value={dashboardStats.conversionRate.value}
          change={{
            value: dashboardStats.conversionRate.change,
            trend: dashboardStats.conversionRate.trend
          }}
          icon={<Zap className="w-5 h-5" />}
          gradient="secondary"
          sparkline={dashboardStats.conversionRate.sparkline}
          isLoading={isLoading}
          delay={0.5}
        />
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20"
          style={{
            background: modernColors.gradients.primary,
            filter: 'blur(128px)',
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20"
          style={{
            background: modernColors.gradients.info,
            filter: 'blur(128px)',
          }}
        />
      </div>
    </div>
  );
}