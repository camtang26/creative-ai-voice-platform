"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CustomAlertProps {
  className?: string
  children: ReactNode
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

export function CustomAlert({ 
  className, 
  children, 
  variant = 'default' 
}: CustomAlertProps) {
  const baseClasses = (
    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground"
  )
  
  const variantClasses = {
    default: "bg-background text-foreground",
    destructive: "border-red-500/50 text-red-700 dark:border-red-500 [&>svg]:text-red-600 bg-red-50",
    success: "border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-600 bg-green-50",
    warning: "border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-600 bg-yellow-50",
  }
  
  return (
    <div 
      role="alert" 
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </div>
  )
}

interface CustomAlertTitleProps {
  className?: string
  children: ReactNode
}

export function CustomAlertTitle({ className, children }: CustomAlertTitleProps) {
  return (
    <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)}>
      {children}
    </h5>
  )
}

interface CustomAlertDescriptionProps {
  className?: string
  children: ReactNode
}

export function CustomAlertDescription({ className, children }: CustomAlertDescriptionProps) {
  return (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)}>
      {children}
    </div>
  )
}
