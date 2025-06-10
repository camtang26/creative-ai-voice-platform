"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  PhoneOutgoing, 
  PhoneCall, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Percent, // Added Percent icon
  TrendingUp, // Added TrendingUp icon
  TrendingDown // Added TrendingDown icon
} from "lucide-react";
import { DashboardSummary, fetchDashboardOverview, fetchRealtimeDashboard } from "@/lib/dashboard-api";
import { colors, typography, shadows } from "@/lib/design-system"; // Removed formatDuration as it's in utils
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDuration, formatPercentage } from "@/lib/utils"; // Import formatDuration and formatPercentage

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  className?: string;
  isLoading?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  className,
  isLoading = false,
  tooltip,
  onClick
}) => {
  const trendColor = 
    change?.trend === "up" 
      ? "text-emerald-500" 
      : change?.trend === "down" 
        ? "text-rose-500" 
        : "text-muted-foreground";

  // Use TrendingUp/TrendingDown for success rate trend
  const TrendIcon = title === "Success Rate" 
    ? (change?.trend === "up" ? TrendingUp : change?.trend === "down" ? TrendingDown : null)
    : (change?.trend === "up" ? ArrowUpRight : change?.trend === "down" ? ArrowDownRight : null);

  const card = (
    <div 
      className={cn(
        "relative overflow-hidden rounded-lg border bg-background p-6 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      {/* Gradient background effect */}
      <div className="absolute inset-0 opacity-5 blur-2xl">
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
              {change && (
                <div className="flex items-center gap-1.5">
                  {TrendIcon && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
                  <span className={`text-sm font-medium ${trendColor}`}>{change.value}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {card}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
};

export function EnhancedStatsCardsV2() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Updated state structure to include successRate
  const [dashboardStats, setDashboardStats] = useState<{
    totalCalls: {
      value: number;
      change: string;
      trend: "up" | "down" | "neutral";
    };
    successRate: { // Changed from activeCalls
      value: string; // Now a percentage string
      change: string;
      trend: "up" | "down" | "neutral";
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
    successRate: { // Default for successRate
      value: "0%",
      change: "0%",
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

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard overview data
      const overviewData = await fetchDashboardOverview(7);
      
      // Check if summary data exists, otherwise provide defaults
      if (!overviewData || !overviewData.summary) {
        console.warn('Dashboard summary data not available, using defaults');
        
        setDashboardStats({
          totalCalls: { value: 0, change: "0%", trend: "neutral" },
          successRate: { value: "0%", change: "0%", trend: "neutral" }, // Default successRate
          totalDuration: { value: "0h 0m", change: "0%", trend: "neutral" },
          averageLength: { value: "0m 0s", change: "0%", trend: "neutral" }
        });
        setLastUpdated(new Date());
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
      const successTrend = overviewData.summary.trend.success >= 0 ? "up" : "down"; // Trend for success rate
      
      // Update stats
      setDashboardStats({
        totalCalls: {
          value: overviewData.summary.totalCalls,
          change: `${overviewData.summary.trend.calls >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.calls).toFixed(1)}%`,
          trend: callTrend
        },
        successRate: { // Update successRate state
          value: formatPercentage(overviewData.summary.successRate, 1), // Format the success rate
          change: `${overviewData.summary.trend.success >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.success).toFixed(1)}%`,
          trend: successTrend
        },
        totalDuration: {
          value: `${totalHours}h ${totalMinutes}m`,
          change: `${overviewData.summary.trend.duration >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.duration).toFixed(1)}%`,
          trend: durationTrend
        },
        averageLength: {
          value: `${avgMinutes}m ${avgSeconds}s`,
          // Note: The backend trend.success was used here previously, which might be confusing.
          // Let's keep it for now, but consider if a trend for average length is needed separately.
          change: `${overviewData.summary.trend.success >= 0 ? '+' : ''}${Math.abs(overviewData.summary.trend.success).toFixed(1)}%`, 
          trend: successTrend 
        }
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up an interval to refresh the dashboard data periodically
    const intervalId = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
      
      {lastUpdated && !isLoading && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      )}
      
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
          tooltip="Total number of calls in the last 7 days"
        />
        {/* Replaced Active Calls with Success Rate */}
        <StatCard 
          title="Success Rate" 
          value={dashboardStats.successRate.value}
          icon={<Percent size={18} />} // Use Percent icon
          change={{
            value: dashboardStats.successRate.change,
            trend: dashboardStats.successRate.trend
          }}
          isLoading={isLoading}
          tooltip="Percentage of completed calls in the last 7 days"
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
          tooltip="Total duration of all calls in the last 7 days"
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
          tooltip="Average duration of calls in the last 7 days"
        />
      </div>
    </div>
  );
}
