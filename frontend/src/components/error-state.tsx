import React from 'react'
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export type ErrorType = 'network' | 'server' | 'validation' | 'permission' | 'generic'

interface ErrorStateProps {
  error: string | Error
  type?: ErrorType
  onRetry?: () => void
  showDetails?: boolean
}

const errorConfig = {
  network: {
    icon: WifiOff,
    title: 'Connection Problem',
    description: 'Please check your internet connection and try again.',
    color: 'text-orange-600'
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    description: 'Our servers are having issues. Please try again in a few moments.',
    color: 'text-red-600'
  },
  validation: {
    icon: AlertCircle,
    title: 'Validation Error',
    description: 'Please check your input and try again.',
    color: 'text-yellow-600'
  },
  permission: {
    icon: ShieldAlert,
    title: 'Permission Denied',
    description: 'You don\'t have permission to perform this action.',
    color: 'text-purple-600'
  },
  generic: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'text-red-600'
  }
}

export function ErrorState({ error, type = 'generic', onRetry, showDetails = false }: ErrorStateProps) {
  const config = errorConfig[type]
  const Icon = config.icon
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <Alert className="border-2">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{config.description}</p>
          {showDetails && errorMessage && (
            <div className="text-xs bg-muted p-2 rounded mt-2">
              <code>{errorMessage}</code>
            </div>
          )}
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Helper function to determine error type from error message/code
export function getErrorType(error: any): ErrorType {
  if (!error) return 'generic'
  
  const errorStr = error.toString().toLowerCase()
  
  if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('offline')) {
    return 'network'
  }
  if (errorStr.includes('500') || errorStr.includes('server')) {
    return 'server'
  }
  if (errorStr.includes('validation') || errorStr.includes('invalid')) {
    return 'validation'
  }
  if (errorStr.includes('403') || errorStr.includes('unauthorized') || errorStr.includes('permission')) {
    return 'permission'
  }
  
  return 'generic'
}