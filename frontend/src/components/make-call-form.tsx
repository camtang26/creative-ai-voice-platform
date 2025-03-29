"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { makeCall } from '@/lib/api'

export function MakeCallForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [callStatus, setCallStatus] = useState<{
    success?: boolean;
    message?: string;
    callSid?: string;
  } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setCallStatus(null)
    
    const formData = new FormData(event.currentTarget)
    const data = {
      number: formData.get('phoneNumber') as string,
      prompt: formData.get('prompt') as string,
      first_message: formData.get('firstMessage') as string,
      callerId: formData.get('callerId') as string || undefined,
      name: formData.get('contactName') as string || undefined // Add contact name
    }
    
    try {
      // Format number to E.164 format if needed
      let formattedNumber = data.number.trim()
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = `+${formattedNumber}`
      }
      
      const result = await makeCall({
        ...data,
        number: formattedNumber
      })
      
      setCallStatus({
        success: result.success,
        message: result.success ? 'Call initiated successfully' : result.error,
        callSid: result.callSid
      })
    } catch (error) {
      setCallStatus({
        success: false,
        message: 'Failed to initiate call. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="phoneNumber" className="text-sm font-medium">
          Phone Number
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          placeholder="+61412345678"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Enter phone number in E.164 format (e.g., +61412345678)
        </p>
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
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use default number
        </p>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="contactName" className="text-sm font-medium">
          Contact Name (Optional)
        </label>
        <input
          id="contactName"
          name="contactName"
          type="text"
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
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Optionally override the default System Prompt configured in ElevenLabs for this specific call. Leave empty to use the default.
        </p>
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
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          First message the agent will say when call connects
        </p>
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Initiating Call...' : 'Make Call'}
      </Button>
      
      {callStatus && (
        <div className={`p-4 rounded-md border ${
          callStatus.success ? 'bg-green-50 border-green-200 text-green-700' : 
          'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{callStatus.message}</p>
          {callStatus.callSid && (
            <p className="text-sm mt-1">Call SID: {callStatus.callSid}</p>
          )}
        </div>
      )}
    </form>
  )
}
