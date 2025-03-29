"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {}
    
    Object.entries(config).forEach(([key, value]) => {
      vars[`--color-${key}`] = value.color
    })
    
    return vars
  }, [config])

  return (
    <div
      className={cn("h-80", className)}
      style={cssVars}
      {...props}
    >
      {children}
    </div>
  )
}

export function ChartTooltip({ content, ...props }: any) {
  return <Tooltip content={content} {...props} />
}

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  payload?: any[]
  label?: string
  labelFormatter?: (label: string) => string
  valueFormatter?: (value: number) => string
  labelClassName?: string
  className?: string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter = (value) => value,
  valueFormatter = (value) => value.toString(),
  labelClassName,
  className,
  ...props
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-2 shadow-md",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "mb-1 text-sm font-medium",
          labelClassName
        )}
      >
        {label ? labelFormatter(label) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        {payload.map((item: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.name}:</span>
            <span>{valueFormatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartLegend({ content, ...props }: any) {
  return <Legend content={content} {...props} />
}

interface ChartLegendContentProps extends React.HTMLAttributes<HTMLDivElement> {
  payload?: any[]
}

export function ChartLegendContent({
  payload,
  className,
  ...props
}: ChartLegendContentProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-4", className)}
      {...props}
    >
      {payload?.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// Recharts components
function Tooltip({ content, ...props }: any) {
  return <recharts.Tooltip content={content} {...props} />
}

function Legend({ content, ...props }: any) {
  return <recharts.Legend content={content} {...props} />
}

// Import recharts components dynamically to avoid SSR issues
const recharts = {
  Tooltip: (props: any) => {
    const Component = React.useMemo(() => {
      if (typeof window === "undefined") return () => null
      // @ts-ignore - recharts is loaded in the browser
      return require("recharts").Tooltip
    }, [])
    return <Component {...props} />
  },
  Legend: (props: any) => {
    const Component = React.useMemo(() => {
      if (typeof window === "undefined") return () => null
      // @ts-ignore - recharts is loaded in the browser
      return require("recharts").Legend
    }, [])
    return <Component {...props} />
  },
}