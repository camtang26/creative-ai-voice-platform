"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CallActivityData, fetchCallActivity } from "@/lib/dashboard-api" // Changed CallActivity to CallActivityData

const chartConfig = {
  calls: {
    label: "Call Volume",
    color: "hsl(215, 70%, 60%)",
  },
  duration: {
    label: "Call Duration (min)",
    color: "hsl(145, 60%, 50%)",
  },
} satisfies ChartConfig

export function EnhancedCallsChart() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [callActivityData, setCallActivityData] = React.useState<CallActivityData[]>([]); // Changed to CallActivityData
  const [dateRange, setDateRange] = React.useState<string>("30d")
  const [activeView, setActiveView] = React.useState<"calls" | "duration">("calls")

  // Load call activity data
  React.useEffect(() => {
    async function loadCallActivity() {
      setIsLoading(true);
      try {
        const days = dateRange === 'all' ? 90 : parseInt(dateRange.replace("d", ""));
        const data = await fetchCallActivity('day', days);
        // Map the data to the expected format
        // data from fetchCallActivity is CallActivityData[]
        if (data && data.length > 0) {
          setCallActivityData(data); // data is the array of stats
        } else {
          // Fallback to empty array if no data
          setCallActivityData([]);
        }
      } catch (error) {
        console.error("Error loading call activity data:", error);
        // Fallback to empty array on error
        setCallActivityData([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCallActivity();
  }, [dateRange]);

  const filteredData = React.useMemo(() => {
    if (dateRange === "all") return callActivityData;
    
    if (callActivityData.length === 0) return [];
    
    const now = new Date();
    const days = parseInt(dateRange.replace("d", ""));
    const startDate = new Date(now.setDate(now.getDate() - days));
    
    return callActivityData.filter(item => new Date(item.period) >= startDate); // Changed item.date to item.period
  }, [dateRange, callActivityData]);

  const totalCalls = React.useMemo(() => 
    filteredData.reduce((acc, curr) => acc + curr.callVolume, 0), // Changed curr.calls to curr.callVolume
    [filteredData]
  );

  const avgDuration = React.useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + curr.callDuration, 0); // Changed curr.duration to curr.callDuration
    return filteredData.length ? (total / filteredData.length / 60).toFixed(1) : 0;
  }, [filteredData]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Call Activity</CardTitle>
          <CardDescription>
            Call volume and duration metrics
          </CardDescription>
        </div>
        <div className="flex">
          <button
            data-active={activeView === "calls"}
            className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
            onClick={() => setActiveView("calls")}
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.calls.label}
            </span>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {totalCalls.toLocaleString()}
              </span>
            )}
          </button>
          <button
            data-active={activeView === "duration"}
            className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
            onClick={() => setActiveView("duration")}
          >
            <span className="text-xs text-muted-foreground">
              {chartConfig.duration.label}
            </span>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {avgDuration} min
              </span>
            )}
          </button>
        </div>
      </CardHeader>
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={dateRange === "all"}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous period</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={dateRange === "all"}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next period</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">Custom Range</span>
          </Button>
        </div>
        <Select
          defaultValue={dateRange}
          onValueChange={(value) => setDateRange(value)}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CardContent className="px-2 pt-6 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading chart data...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <p>No call data available for the selected period</p>
            <p className="text-sm mt-2">Try selecting a different date range</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            {activeView === "calls" ? (
              <AreaChart
                data={filteredData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-calls)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-calls)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[180px]"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="var(--color-calls)"
                  fillOpacity={1}
                  fill="url(#colorCalls)"
                  animationDuration={500}
                />
              </AreaChart>
            ) : (
              <LineChart
                data={filteredData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value} min`}
                />
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[180px]"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="var(--color-duration)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={500}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
