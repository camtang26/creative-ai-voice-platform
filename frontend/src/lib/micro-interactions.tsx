"use client"

import { motion, useAnimation, AnimationControls } from 'framer-motion'
import { ReactNode, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Haptic feedback utility (Web Vibration API)
export const hapticFeedback = {
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  },
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(25)
    }
  },
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 10, 50])
    }
  },
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 10, 30, 10, 30])
    }
  },
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100])
    }
  },
  notification: () => {
    if (navigator.vibrate) {
      navigator.vibrate([20, 50, 20])
    }
  }
}

// Micro-interaction variants
export const microAnimations = {
  // Button press effect
  buttonPress: {
    tap: { scale: 0.95 },
    hover: { scale: 1.05 }
  },

  // Gentle bounce
  bounce: {
    hover: { 
      y: -4,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: { 
      y: 0,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  },

  // Magnetic attraction
  magnetic: {
    hover: {
      scale: 1.1,
      rotateY: 5,
      transition: { type: "spring", stiffness: 300, damping: 15 }
    }
  },

  // Pulse effect
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  // Shimmer effect
  shimmer: {
    hover: {
      backgroundPosition: "200% center",
      transition: { duration: 0.8 }
    }
  },

  // Float animation
  float: {
    animate: {
      y: [-5, 5, -5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  // Tilt effect
  tilt: {
    hover: {
      rotateX: 5,
      rotateY: 5,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  },

  // Card lift
  cardLift: {
    hover: {
      y: -8,
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  },

  // Glow effect
  glow: {
    hover: {
      boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)",
      borderColor: "rgba(59, 130, 246, 0.8)",
      transition: { duration: 0.3 }
    }
  }
}

// Micro-interaction components
interface MicroInteractionProps {
  children: ReactNode
  type: keyof typeof microAnimations
  className?: string
  haptic?: keyof typeof hapticFeedback | false
  onClick?: () => void
  disabled?: boolean
}

export function MicroInteraction({ 
  children, 
  type, 
  className, 
  haptic = 'light',
  onClick,
  disabled = false
}: MicroInteractionProps) {
  const handleClick = useCallback(() => {
    if (disabled) return
    
    if (haptic) {
      hapticFeedback[haptic]()
    }
    
    onClick?.()
  }, [haptic, onClick, disabled])

  const variants = microAnimations[type]

  return (
    <motion.div
      className={cn(className, disabled && "opacity-50 pointer-events-none")}
      variants={variants}
      whileHover="hover"
      whileTap="tap"
      animate="animate"
      onClick={handleClick}
    >
      {children}
    </motion.div>
  )
}

// Specialized micro-interaction components
export function PressableButton({ 
  children, 
  className, 
  onClick, 
  haptic = 'medium',
  variant = 'default'
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  haptic?: keyof typeof hapticFeedback | false
  variant?: 'default' | 'success' | 'danger' | 'primary'
}) {
  const variantStyles = {
    default: "bg-white/10 hover:bg-white/20 border-white/20",
    success: "bg-green-500/20 hover:bg-green-500/30 border-green-400/30",
    danger: "bg-red-500/20 hover:bg-red-500/30 border-red-400/30",
    primary: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/30"
  }

  return (
    <MicroInteraction
      type="buttonPress"
      haptic={haptic}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl border backdrop-blur-sm transition-all duration-200 cursor-pointer select-none",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </MicroInteraction>
  )
}

export function FloatingCard({ 
  children, 
  className,
  enableGlow = false 
}: {
  children: ReactNode
  className?: string
  enableGlow?: boolean
}) {
  return (
    <MicroInteraction
      type={enableGlow ? "glow" : "cardLift"}
      haptic={false}
      className={cn(
        "glass-panel rounded-xl border border-white/10 transition-all duration-300",
        className
      )}
    >
      {children}
    </MicroInteraction>
  )
}

export function MagneticIcon({ 
  children, 
  className,
  onClick,
  haptic = 'light'
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  haptic?: keyof typeof hapticFeedback | false
}) {
  return (
    <MicroInteraction
      type="magnetic"
      haptic={haptic}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-300",
        className
      )}
    >
      {children}
    </MicroInteraction>
  )
}

export function PulsingIndicator({ 
  children, 
  className,
  color = 'blue'
}: {
  children?: ReactNode
  className?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}) {
  const colorStyles = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500"
  }

  return (
    <MicroInteraction
      type="pulse"
      haptic={false}
      className={cn(
        "w-3 h-3 rounded-full",
        colorStyles[color],
        className
      )}
    >
      {children}
    </MicroInteraction>
  )
}

// Advanced interaction patterns
export function useSequentialAnimation() {
  const controls = useAnimation()

  const playSequence = useCallback(async (
    sequence: Array<{ animation: any; duration?: number }>
  ) => {
    for (const step of sequence) {
      await controls.start(step.animation)
      if (step.duration) {
        await new Promise(resolve => setTimeout(resolve, step.duration))
      }
    }
  }, [controls])

  return { controls, playSequence }
}

export function useShakeAnimation() {
  const controls = useAnimation()

  const shake = useCallback(async (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    const intensityMap = {
      light: 5,
      medium: 10,
      heavy: 15
    }

    const amount = intensityMap[intensity]

    await controls.start({
      x: [-amount, amount, -amount, amount, 0],
      transition: { duration: 0.5 }
    })

    // Haptic feedback
    hapticFeedback[intensity]()
  }, [controls])

  return { controls, shake }
}

export function useWobbleAnimation() {
  const controls = useAnimation()

  const wobble = useCallback(async () => {
    await controls.start({
      rotate: [-5, 5, -5, 5, 0],
      transition: { duration: 0.6 }
    })
    
    hapticFeedback.light()
  }, [controls])

  return { controls, wobble }
}

// Gesture-based interactions
export function SwipeableCard({ 
  children,
  onSwipeLeft,
  onSwipeRight,
  className
}: {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}) {
  const dragConstraints = { left: -100, right: 100, top: 0, bottom: 0 }

  const handleDragEnd = useCallback((event: any, info: any) => {
    const threshold = 50
    
    if (info.offset.x > threshold && onSwipeRight) {
      hapticFeedback.medium()
      onSwipeRight()
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      hapticFeedback.medium()
      onSwipeLeft()
    }
  }, [onSwipeLeft, onSwipeRight])

  return (
    <motion.div
      drag="x"
      dragConstraints={dragConstraints}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05, rotateZ: 5 }}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </motion.div>
  )
}

// Success/Error feedback patterns
export function SuccessRipple({ 
  trigger,
  children,
  className
}: {
  trigger: boolean
  children: ReactNode
  className?: string
}) {
  const controls = useAnimation()

  useEffect(() => {
    if (trigger) {
      controls.start({
        scale: [1, 1.2, 1],
        boxShadow: [
          "0 0 0 0 rgba(34, 197, 94, 0.7)",
          "0 0 0 20px rgba(34, 197, 94, 0)",
          "0 0 0 0 rgba(34, 197, 94, 0)"
        ],
        transition: { duration: 0.6 }
      })
      
      hapticFeedback.success()
    }
  }, [trigger, controls])

  return (
    <motion.div
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function ErrorShake({ 
  trigger,
  children,
  className
}: {
  trigger: boolean
  children: ReactNode
  className?: string
}) {
  const { controls, shake } = useShakeAnimation()

  useEffect(() => {
    if (trigger) {
      shake('heavy')
    }
  }, [trigger, shake])

  return (
    <motion.div
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Loading micro-interactions
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-white rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("w-6 h-6 border-2 border-white/30 border-t-white rounded-full", className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )
}