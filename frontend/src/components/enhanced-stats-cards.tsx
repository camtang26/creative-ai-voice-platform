"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  PhoneOutgoing, 
  PhoneCall, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { DashboardSummary, fetchDashboardOverview, fetchRealtimeDashboard } from "@/lib/dashboard-api";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  className?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  className,
  isLoading = false,
}) => {
  const trendColor = 
    change.trend === "up" 
      ? "text-emerald-500" 
      : change.trend === "down" 
        ? "text-rose-500" 
        : "text-muted-foreground";

  const TrendIcon = change.trend === "up" 
    ? ArrowUpRight 
    : change.trend === "down" 
      ? ArrowDownRight 
      : null;

  return (
    <div className={`relative overflow-hidden rounded-lg border bg-background p-6 ${className}`}>
      <div className="absolute inset-0 opacity-10 blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-20" />
      </div>
      
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-6">
          <span className="text-muted-foreground text-sm font-medium">{title}</span>
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        
        <div>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              <h3 className="text-3xl font-semibold tracking-tight mb-2">{value}</h3>
              <div className="flex items-center gap-1.5">
                {TrendIcon && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
                <span className={`text-sm font-medium ${trendColor}`}>{change.value}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export function EnhancedStatsCards() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<{
    totalCalls: {
      value: number;
      change: string;
      trend: "up" | "down" | "neutral";
    };
    activeCalls: {
      value: number;
      change: string;
      trend: "neutral";
    };
    totalDuration: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
    };
    averageLength: {
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
    }
  }>({
    totalCalls: {
      value: 0,
      change: "0%",
      trend: "neutral"
    },
    activeCalls: {
      value: 0,
      change: "Live now",
      trend: "neutral"
    },
    totalDuration: {
      value: "0h 0m",
      change: "0%",
      trend: "neutral"
    },
    averageLength: {
      value: "0m 0s",
      change: "0%",
      trend: "neutral"
    }
  });

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // Fetch both dashboard overview and realtime data
        const [overviewData, realtimeData] = await Promise.all([
          fetchDashboardOverview(7),
          fetchRealtimeDashboard()
        ]);
        
        // Check if summary data exists, otherwise provide defaults
        if (!overviewData || !overviewData.summary) {
          console.warn('Dashboard summary data not available, using defaults');
          setDashboardStats({
            totalCalls: { value: 0, change: "0%", trend: "neutral" },
            activeCalls: { value: realtimeData?.activeCallCount || 0, change: "Live now", trend: "neutral" },
            totalDuration: { value: "0h 0m", change: "0%", trend: "neutral" },
            averageLength: { value: "0m 0s", change: "0%", trend: "neutral" }
          });
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
        
        // Update stats
        setDashboardStats({
          totalCalls: {
            value: overviewData.summary.totalCalls,
            change: `${overviewData.summary.trend.calls >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.calls).toFixed(1)}%`,
            trend: callTrend
          },
          activeCalls: {
            value: realtimeData.activeCallCount,
            change: "Live now",
            trend: "neutral"
          },
          totalDuration: {
            value: `${totalHours}h ${totalMinutes}m`,
            change: `${overviewData.summary.trend.duration >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.duration).toFixed(1)}%`,
            trend: durationTrend
          },
          averageLength: {
            value: `${avgMinutes}m ${avgSeconds}s`,
            change: `${overviewData.summary.trend.success >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.success).toFixed(1)}%`,
            trend: overviewData.summary.trend.success >= 0 ? "up" : "down"
          }
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Fallback to placeholder data in case of error
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
    
    // Set up an interval to refresh the active calls count every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        const realtimeData = await fetchRealtimeDashboard();
        setDashboardStats(prev => ({
          ...prev,
          activeCalls: {
            value: realtimeData.activeCallCount,
            change: "Live now",
            trend: "neutral"
          }
        }));
      } catch (error) {
        console.error("Error refreshing active calls:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Total Calls"
        value={dashboardStats.totalCalls.value}
        icon={<PhoneCall size={18} />}
        change={{
          value: dashboardStats.totalCalls.change,
          trend: dashboardStats.totalCalls.trend
        }}
        isLoading={isLoading}
      />
      <StatCard 
        title="Active Calls"
        value={dashboardStats.activeCalls.value}
        icon={<PhoneOutgoing size={18} />}
        change={{
          value: dashboardStats.activeCalls.change,
          trend: "neutral"
        }}
        isLoading={isLoading}
      />
      <StatCard 
        title="Total Duration"
        value={dashboardStats.totalDuration.value}
        icon={<Clock size={18} />}
        change={{
          value: dashboardStats.totalDuration.change,
          trend: dashboardStats.totalDuration.trend
        }}
        isLoading={isLoading}
      />
      <StatCard 
        title="Average Call Length"
        value={dashboardStats.averageLength.value}
        icon={<BarChart3 size={18} />}
        change={{
          value: dashboardStats.averageLength.change,
          trend: dashboardStats.averageLength.trend
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
