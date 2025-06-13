"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { makeCall } from '@/lib/api'
import { validatePhoneNumber, validateFirstMessage, validateAgentPrompt } from '@/lib/validation'
import { retryApiCall } from '@/lib/retry-utils'
import { ErrorState, getErrorType } from '@/components/error-state'
import { AlertCircle } from 'lucide-react'

export function MakeCallForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [callStatus, setCallStatus] = useState<{
    success?: boolean;
    message?: string;
    callSid?: string;
  } | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    phoneNumber?: string;
    callerId?: string;
    firstMessage?: string;
    prompt?: string;
  }>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCallStatus(null)
    setValidationErrors({})
    
    const formData = new FormData(event.currentTarget)
    const data = {
      number: formData.get('phoneNumber') as string,
      prompt: formData.get('prompt') as string,
      first_message: formData.get('firstMessage') as string,
      callerId: formData.get('callerId') as string || undefined,
      name: formData.get('contactName') as string
    }
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(data.number)
    if (!phoneValidation.isValid) {
      setValidationErrors(prev => ({ ...prev, phoneNumber: phoneValidation.error }))
      return
    }
    
    // Validate caller ID if provided
    if (data.callerId) {
      const callerIdValidation = validatePhoneNumber(data.callerId)
      if (!callerIdValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, callerId: callerIdValidation.error }))
        return
      }
    }
    
    // Validate first message if provided
    if (data.first_message) {
      const firstMessageValidation = validateFirstMessage(data.first_message)
      if (!firstMessageValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, firstMessage: firstMessageValidation.error }))
        return
      }
    }
    
    // Validate prompt if provided
    if (data.prompt) {
      const promptValidation = validateAgentPrompt(data.prompt)
      if (!promptValidation.isValid) {
        setValidationErrors(prev => ({ ...prev, prompt: promptValidation.error }))
        return
      }
    }
    
    setIsLoading(true)
    
    try {
      // Use the validated and formatted phone number
      const formattedData = {
        ...data,
        number: phoneValidation.formatted!,
        callerId: data.callerId ? validatePhoneNumber(data.callerId).formatted : undefined
      }
      
      // Use retry logic for the API call
      const result = await retryApiCall(() => makeCall(formattedData))
      
      setCallStatus({
        success: result.success,
        message: result.success ? 'Call initiated successfully' : result.error,
        callSid: result.callSid
      })
      
      // Clear form on success
      if (result.success) {
        event.currentTarget.reset()
      }
    } catch (error: any) {
      console.error('Call initiation error:', error)
      
      // Determine error type and show appropriate message
      const errorType = getErrorType(error)
      const message = error.message || 'Failed to initiate call. Please try again.'
      
      setCallStatus({
        success: false,
        message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="phoneNumber" className="text-sm font-medium">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          placeholder="+61412345678"
          className={`flex h-10 w-full rounded-md border ${
            validationErrors.phoneNumber ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
        />
        {validationErrors.phoneNumber ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationErrors.phoneNumber}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter phone number (e.g., +61412345678 or 61412345678)
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="callerId" className="text-sm font-medium">
          Caller ID (Optional)
        </label>
        <input
          id="callerId"
          name="callerId"
          type="tel"
          placeholder="+61412345678"
          className={`flex h-10 w-full rounded-md border ${
            validationErrors.callerId ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
        />
        {validationErrors.callerId ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationErrors.callerId}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Leave empty to use default number
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="contactName" className="text-sm font-medium">
          Contact Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contactName"
          name="contactName"
          type="text"
          required
          placeholder="John Doe"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Used for personalization (e.g., in prompts/messages) and tracking.
        </p>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="prompt" className="text-sm font-medium">
          System Prompt Override (Optional)
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          placeholder="You are a sales agent calling about..."
          className={`flex w-full rounded-md border ${
            validationErrors.prompt ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
        />
        {validationErrors.prompt ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationErrors.prompt}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Optionally override the default System Prompt configured in ElevenLabs for this specific call. Leave empty to use the default.
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="firstMessage" className="text-sm font-medium">
          First Message
        </label>
        <input
          id="firstMessage"
          name="firstMessage"
          type="text"
          placeholder="Hello, this is [Company Name]..."
          className={`flex h-10 w-full rounded-md border ${
            validationErrors.firstMessage ? 'border-red-500' : 'border-input'
          } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
        />
        {validationErrors.firstMessage ? (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationErrors.firstMessage}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            First message the agent will say when call connects (optional, uses ElevenLabs default if empty)
          </p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Initiating Call...' : 'Make Call'}
      </Button>
      
      {callStatus && !callStatus.success && (
        <ErrorState 
          error={callStatus.message || 'Failed to initiate call'} 
          type={getErrorType(new Error(callStatus.message || ''))}
          showDetails
        />
      )}
      
      {callStatus && callStatus.success && (
        <div className="p-4 rounded-md border bg-green-50 border-green-200 text-green-700">
          <p className="font-medium">{callStatus.message}</p>
          {callStatus.callSid && (
            <p className="text-sm mt-1">Call SID: {callStatus.callSid}</p>
          )}
        </div>
      )}
    </form>
  )
}
