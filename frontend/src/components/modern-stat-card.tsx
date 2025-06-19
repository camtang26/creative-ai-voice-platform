"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Sparkles
} from 'lucide-react';
import { modernColors, motionVariants, glassStyles } from '@/lib/modern-design-system';

interface ModernStatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: React.ReactNode;
  gradient?: keyof typeof modernColors.gradients;
  isLoading?: boolean;
  sparkline?: number[];
  onClick?: () => void;
  className?: string;
  delay?: number;
}

// Animated number component
const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string }> = ({ 
  value, 
  format = (n) => n.toString() 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{format(displayValue)}</span>;
};

// Mini sparkline component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        fill={`url(#gradient-${color})`}
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
};

export const ModernStatCard: React.FC<ModernStatCardProps> = ({
  title,
  value,
  change,
  icon,
  gradient = 'primary',
  isLoading = false,
  sparkline,
  onClick,
  className,
  delay = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const gradientBg = modernColors.gradients[gradient];
  
  // Prevent hydration mismatch by only rendering gradient after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const TrendIcon = change?.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = change?.trend === 'up' ? '#10b981' : '#ef4444';
  
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        delay,
        duration: 0.5,
        ease: [0.645, 0.045, 0.355, 1],
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };
  
  const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.1, 
      rotate: [0, -10, 10, -10, 0],
      transition: {
        rotate: {
          duration: 0.5,
          ease: "easeInOut"
        }
      }
    }
  };
  
  const pulseVariants = {
    initial: { scale: 1, opacity: 0.5 },
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gray-900/50 dark:bg-black/50",
        "backdrop-blur-xl",
        "border border-gray-700/50 dark:border-gray-800/50",
        "shadow-xl",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        boxShadow: isMounted 
          ? (isHovered 
            ? `0 20px 40px rgba(0, 0, 0, 0.1), 0 0 40px ${modernColors.neon.blue}20`
            : "0 10px 30px rgba(0, 0, 0, 0.1)")
          : "0 10px 30px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Gradient background overlay */}
      {isMounted && (
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: gradientBg,
            filter: 'blur(40px)',
          }}
        />
      )}
      
      {/* Animated background particles */}
      <AnimatePresence>
        {isHovered && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-32 h-32 rounded-full"
                  style={{
                    background: isMounted ? gradientBg : 'transparent',
                    filter: 'blur(60px)',
                    left: `${30 * i}%`,
                    top: `${20 + i * 20}%`,
                  }}
                  animate={{
                    x: [0, 30, 0],
                    y: [0, -20, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-2">
            <h3 className="text-base font-semibold text-gray-300 dark:text-gray-400">
              {title}
            </h3>
          </div>
          
          {/* Icon with animation */}
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate={isHovered ? "hover" : "initial"}
            className="relative"
          >
            <div 
              className="p-3 rounded-xl"
              style={isMounted ? {
                background: `linear-gradient(135deg, ${modernColors.neon.blue}20, ${modernColors.neon.pink}20)`,
              } : undefined}
            >
              <div className="text-white">
                {icon}
              </div>
            </div>
            
            {/* Pulse effect for icon */}
            {isHovered && (
              <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 rounded-xl"
                style={isMounted ? {
                  background: gradientBg,
                  filter: 'blur(20px)',
                } : { filter: 'blur(20px)' }}
              />
            )}
          </motion.div>
        </div>
        
        {/* Value */}
        <div className="mb-2">
          {isLoading ? (
            <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
          ) : (
            <div className="text-4xl font-bold text-white">
              {typeof value === 'number' ? (
                <AnimatedNumber value={value} format={(n) => n.toLocaleString()} />
              ) : (
                value
              )}
            </div>
          )}
        </div>
        
        {/* Change indicator */}
        {change && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.3 }}
            className="flex items-center gap-1"
          >
            <TrendIcon 
              className="w-4 h-4" 
              style={isMounted ? { color: trendColor } : undefined}
            />
            <span 
              className="text-sm font-medium"
              style={isMounted ? { color: trendColor } : undefined}
            >
              {change.value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              vs last period
            </span>
          </motion.div>
        )}
        
        {/* Sparkline */}
        {sparkline && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
            className="mt-4"
          >
            <Sparkline 
              data={sparkline} 
              color={isMounted ? (change?.trend === 'up' ? modernColors.neon.green : modernColors.neon.pink) : '#888888'}
            />
          </motion.div>
        )}
      </div>
      
      {/* Corner decoration */}
      <motion.div
        className="absolute -bottom-2 -right-2"
        animate={{
          rotate: isHovered ? 360 : 0,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Sparkles 
          className="w-16 h-16 text-white/5"
        />
      </motion.div>
      

    </motion.div>
  );
};