"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ModernLoadingSkeletonProps {
  className?: string
  variant?: 'card' | 'stat' | 'list' | 'chart' | 'text'
  count?: number
  animate?: boolean
}

export function ModernLoadingSkeleton({ 
  className, 
  variant = 'card', 
  count = 1,
  animate = true 
}: ModernLoadingSkeletonProps) {
  const baseClasses = "rounded-xl overflow-hidden relative"
  
  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: { 
      x: '100%',
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  }

  const Shimmer = () => (
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      variants={shimmerVariants}
      initial="initial"
      animate={animate ? "animate" : "initial"}
    />
  )

  const CardSkeleton = () => (
    <div className={cn("glass-panel p-6 border border-white/10", baseClasses, className)}>
      <Shimmer />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-20 h-6 bg-white/10 rounded-lg" />
          <div className="w-8 h-8 bg-white/10 rounded-full" />
        </div>
        <div className="w-32 h-8 bg-white/10 rounded-lg" />
        <div className="space-y-2">
          <div className="w-full h-4 bg-white/10 rounded" />
          <div className="w-3/4 h-4 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  )

  const StatSkeleton = () => (
    <div className={cn("glass-panel p-6 border border-white/10", baseClasses, className)}>
      <Shimmer />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-24 h-5 bg-white/10 rounded" />
          <div className="w-6 h-6 bg-white/10 rounded-full" />
        </div>
        <div className="w-20 h-10 bg-white/10 rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/10 rounded" />
          <div className="w-16 h-4 bg-white/10 rounded" />
        </div>
        <div className="w-full h-16 bg-white/10 rounded-lg" />
      </div>
    </div>
  )

  const ListSkeleton = () => (
    <div className={cn("glass-panel p-4 border border-white/10", baseClasses, className)}>
      <Shimmer />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-3 h-3 bg-white/10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-2/3 h-4 bg-white/10 rounded" />
              <div className="w-1/2 h-3 bg-white/10 rounded" />
            </div>
            <div className="w-16 h-6 bg-white/10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )

  const ChartSkeleton = () => (
    <div className={cn("glass-panel p-6 border border-white/10", baseClasses, className)}>
      <Shimmer />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-32 h-6 bg-white/10 rounded" />
          <div className="w-20 h-8 bg-white/10 rounded-full" />
        </div>
        <div className="h-48 bg-white/10 rounded-lg relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                className="bg-white/20 rounded-t"
                style={{ 
                  width: '12%',
                  height: `${Math.random() * 80 + 20}%`
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 2
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const TextSkeleton = () => (
    <div className={cn("space-y-2", className)}>
      <Shimmer />
      <div className="w-full h-4 bg-white/10 rounded" />
      <div className="w-5/6 h-4 bg-white/10 rounded" />
      <div className="w-4/6 h-4 bg-white/10 rounded" />
    </div>
  )

  const renderSkeleton = () => {
    switch (variant) {
      case 'stat':
        return <StatSkeleton />
      case 'list':
        return <ListSkeleton />
      case 'chart':
        return <ChartSkeleton />
      case 'text':
        return <TextSkeleton />
      default:
        return <CardSkeleton />
    }
  }

  if (count === 1) {
    return renderSkeleton()
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          {renderSkeleton()}
        </motion.div>
      ))}
    </div>
  )
}

// Individual skeleton components for specific use cases
export const ModernStatCardSkeleton = () => (
  <ModernLoadingSkeleton variant="stat" className="h-48" />
)

export const ModernChartSkeleton = () => (
  <ModernLoadingSkeleton variant="chart" className="h-80" />
)

export const ModernListSkeleton = ({ count = 5 }: { count?: number }) => (
  <ModernLoadingSkeleton variant="list" count={count} />
)

export const ModernCardSkeleton = () => (
  <ModernLoadingSkeleton variant="card" className="h-32" />
)

// Loading states for entire sections
export const ModernDashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="glass-panel p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="w-48 h-8 bg-white/10 rounded-lg" />
          <div className="w-64 h-5 bg-white/10 rounded" />
        </div>
        <div className="w-24 h-8 bg-white/10 rounded-full" />
      </div>
    </div>

    {/* Stats grid skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ModernStatCardSkeleton />
      <ModernStatCardSkeleton />
      <ModernStatCardSkeleton />
      <ModernStatCardSkeleton />
      <ModernStatCardSkeleton />
      <ModernStatCardSkeleton />
    </div>

    {/* Real-time section skeleton */}
    <ModernLoadingSkeleton variant="list" className="h-64" />

    {/* Charts section skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <div className="col-span-4">
        <ModernChartSkeleton />
      </div>
      <div className="col-span-3">
        <ModernListSkeleton count={3} />
      </div>
    </div>
  </div>
)