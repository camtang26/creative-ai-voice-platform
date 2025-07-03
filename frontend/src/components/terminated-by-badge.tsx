import { Badge } from '@/components/ui/badge'
import { User, Bot, Wifi, AlertTriangle, Phone } from 'lucide-react'

interface TerminatedByBadgeProps {
  terminatedBy: string | null
}

export function TerminatedByBadge({ terminatedBy }: TerminatedByBadgeProps) {
  if (!terminatedBy) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  switch (terminatedBy.toLowerCase()) {
    case 'agent':
    case 'ai':
    case 'elevenlabs':
      return (
        <Badge variant="default" className="gap-1">
          <Bot className="h-3 w-3" />
          AI Agent
        </Badge>
      )
    case 'caller':
    case 'human':
    case 'user':
      return (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          Caller
        </Badge>
      )
    case 'system':
    case 'timeout':
    case 'inactivity':
      return (
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          System
        </Badge>
      )
    case 'network':
    case 'connection':
    case 'disconnected':
      return (
        <Badge variant="destructive" className="gap-1">
          <Wifi className="h-3 w-3" />
          Network
        </Badge>
      )
    case 'twilio':
    case 'carrier':
      return (
        <Badge variant="warning" className="gap-1">
          <Phone className="h-3 w-3" />
          Carrier
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {terminatedBy}
        </Badge>
      )
  }
}