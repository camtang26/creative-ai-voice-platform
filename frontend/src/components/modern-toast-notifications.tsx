"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, XCircle, Info, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'system'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  toasts: Toast[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ModernToastContainer />
    </ToastContext.Provider>
  )
}

function ModernToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ModernToast 
            key={toast.id} 
            toast={toast} 
            onRemove={() => removeToast(toast.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ModernToastProps {
  toast: Toast
  onRemove: () => void
}

function ModernToast({ toast, onRemove }: ModernToastProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    system: Zap
  }

  const colors = {
    success: {
      bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      icon: 'text-green-400',
      glow: 'shadow-green-500/20'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20',
      border: 'border-red-400/30',
      icon: 'text-red-400',
      glow: 'shadow-red-500/20'
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400/30',
      icon: 'text-yellow-400',
      glow: 'shadow-yellow-500/20'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      icon: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    },
    system: {
      bg: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20',
      border: 'border-purple-400/30',
      icon: 'text-purple-400',
      glow: 'shadow-purple-500/20'
    }
  }

  const Icon = icons[toast.type]
  const colorScheme = colors[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", damping: 25, stiffness: 500 }}
      className={cn(
        "glass-panel p-4 rounded-xl border backdrop-blur-xl shadow-lg",
        colorScheme.bg,
        colorScheme.border,
        colorScheme.glow
      )}
    >
      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 15 }}
        >
          <Icon className={cn("h-5 w-5 mt-0.5", colorScheme.icon)} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <motion.h4 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="font-medium text-white text-sm"
          >
            {toast.title}
          </motion.h4>
          
          {toast.message && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/70 text-xs mt-1"
            >
              {toast.message}
            </motion.p>
          )}
          
          {toast.action && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={toast.action.onClick}
              className="text-xs font-medium text-white underline mt-2 hover:no-underline transition-all"
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>
        
        <motion.button
          onClick={onRemove}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

// Hook for common toast patterns
export function useModernToast() {
  const { addToast } = useToast()

  return {
    success: (title: string, message?: string) => 
      addToast({ type: 'success', title, message }),
    
    error: (title: string, message?: string) => 
      addToast({ type: 'error', title, message, duration: 7000 }),
    
    warning: (title: string, message?: string) => 
      addToast({ type: 'warning', title, message, duration: 6000 }),
    
    info: (title: string, message?: string) => 
      addToast({ type: 'info', title, message }),
    
    system: (title: string, message?: string) => 
      addToast({ type: 'system', title, message, duration: 4000 }),
    
    custom: (toast: Omit<Toast, 'id'>) => 
      addToast(toast)
  }
}

// Demo component for testing
export function ToastDemo() {
  const toast = useModernToast()

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => toast.success('Call Connected', 'Successfully connected to +1 (555) 123-4567')}
        className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm border border-green-400/30"
      >
        Success Toast
      </button>
      
      <button
        onClick={() => toast.error('Call Failed', 'Unable to connect - please try again')}
        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-400/30"
      >
        Error Toast
      </button>
      
      <button
        onClick={() => toast.warning('High Volume', 'Call queue is experiencing high volume')}
        className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm border border-yellow-400/30"
      >
        Warning Toast
      </button>
      
      <button
        onClick={() => toast.system('System Update', 'Real-time monitoring is now active')}
        className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm border border-purple-400/30"
      >
        System Toast
      </button>
    </div>
  )
}