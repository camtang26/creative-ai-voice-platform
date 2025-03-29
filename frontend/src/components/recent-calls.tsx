"use client";

import { formatDate, formatPhoneNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PhoneOff, Headphones, PhoneCall } from 'lucide-react'

// Placeholder data - will be fetched from API
const recentCallsData = [
  {
    id: 'CA123456789',
    from: '+12065551234',
    to: '+61455123456',
    status: 'completed',
    duration: 432,
    timestamp: '2024-03-24T14:23:45Z',
    hasRecording: true
  },
  {
    id: 'CA123456790',
    from: '+12065551234',
    to: '+61455123457',
    status: 'in-progress',
    duration: 145,
    timestamp: '2024-03-24T14:30:12Z',
    hasRecording: false
  },
  {
    id: 'CA123456791',
    from: '+12065551234',
    to: '+61455123458',
    status: 'failed',
    duration: 12,
    timestamp: '2024-03-24T13:45:23Z',
    hasRecording: false
  },
  {
    id: 'CA123456792',
    from: '+12065551234',
    to: '+61455123459',
    status: 'completed',
    duration: 278,
    timestamp: '2024-03-24T12:15:18Z',
    hasRecording: true
  }
]

export function RecentCalls() {
  return (
    <div className="space-y-4">
      {recentCallsData.map((call) => (
        <div key={call.id} className="flex items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="font-medium mr-2">{formatPhoneNumber(call.to)}</span>
              <span className={`call-status-badge ${call.status}`}>
                {call.status}
              </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>{formatDate(call.timestamp)}</span>
              <span className="mx-2">•</span>
              <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {call.hasRecording && (
              <Button size="sm" variant="outline">
                <Headphones className="h-4 w-4" />
              </Button>
            )}
            {call.status === 'in-progress' ? (
              <Button size="sm" variant="destructive">
                <PhoneOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" variant="outline">
                <PhoneCall className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full mt-4">View All Calls</Button>
    </div>
  )
}
