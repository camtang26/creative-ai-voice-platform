import { Badge } from '@/components/ui/badge'
import { Phone, Bot, PhoneOff, AlertCircle, XCircle, PhoneMissed } from 'lucide-react'

interface AnsweredByBadgeProps {
  answeredBy: string | null
}

export function AnsweredByBadge({ answeredBy }: AnsweredByBadgeProps) {
  if (!answeredBy) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  switch (answeredBy) {
    case 'human':
      return (
        <Badge variant="success" className="gap-1">
          <Phone className="h-3 w-3" />
          Human
        </Badge>
      )
    case 'machine_start':
    case 'machine_end_beep':
    case 'machine_end_silence':
    case 'machine_end_other':
      return (
        <Badge variant="secondary" className="gap-1">
          <Bot className="h-3 w-3" />
          Machine
        </Badge>
      )
    case 'no-answer':
      return (
        <Badge variant="outline" className="gap-1">
          <PhoneMissed className="h-3 w-3" />
          No Answer
        </Badge>
      )
    case 'busy':
      return (
        <Badge variant="warning" className="gap-1">
          <PhoneOff className="h-3 w-3" />
          Busy
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )
    case 'unknown':
      // Unknown usually means the call was disconnected before AMD could determine
      // This often happens when the line disconnects immediately (wrong number, network issue)
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Disconnected
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {answeredBy}
        </Badge>
      )
  }
}