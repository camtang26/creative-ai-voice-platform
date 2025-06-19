"use client"

import { useState, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  StopCircle, 
  PhoneCall,
  Users,
  Activity,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  fetchActiveCampaigns,
  pauseCampaign as pauseCampaignApi,
  resumeCampaign as resumeCampaignApi,
  stopCampaign as stopCampaignApi
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { useSocket } from '@/hooks/useSocket'

interface ActiveCampaign {
  id: string
  name: string
  status: string
  totalContacts: number
  validatedContacts: number
  contactsRemaining: number
  progress: {
    callsPlaced: number
    callsCompleted: number
    callsAnswered: number
    callsFailed: number
    percentComplete: number
  }
  activeCalls: number
  paused: boolean
  settings: {
    callDelay: number
    maxConcurrentCalls: number
  }
  createdAt: string
  lastExecuted?: string
}

export function ActiveCampaigns() {
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Use socket for real-time updates
  const { socket } = useSocket()

  // Fetch active campaigns
  const loadActiveCampaigns = async () => {
    try {
      const response = await fetchActiveCampaigns()
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || [])
      }
    } catch (err) {
      console.error('Error fetching active campaigns:', err)
      setError('Failed to load active campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and periodic refresh
  useEffect(() => {
    loadActiveCampaigns()
    
    // Refresh every 5 seconds
    const interval = setInterval(loadActiveCampaigns, 5000)
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleCampaignUpdate = (data: any) => {
      loadActiveCampaigns() // Refresh when campaign status changes
    }

    const handleCampaignProgress = (data: any) => {
      // Update specific campaign progress
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === data.campaignId 
          ? { ...campaign, ...data.updates }
          : campaign
      ))
    }

    socket.on('campaign_update', handleCampaignUpdate)
    socket.on('campaign_progress', handleCampaignProgress)

    return () => {
      socket.off('campaign_update', handleCampaignUpdate)
      socket.off('campaign_progress', handleCampaignProgress)
    }
  }, [socket])

  const handlePause = async (campaignId: string) => {
    setActionInProgress(campaignId)
    try {
      await pauseCampaignApi(campaignId)
      await loadActiveCampaigns()
    } catch (err) {
      console.error('Error pausing campaign:', err)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleResume = async (campaignId: string) => {
    setActionInProgress(campaignId)
    try {
      await resumeCampaignApi(campaignId)
      await loadActiveCampaigns()
    } catch (err) {
      console.error('Error resuming campaign:', err)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleStop = async (campaignId: string) => {
    setActionInProgress(campaignId)
    try {
      await stopCampaignApi(campaignId)
      await loadActiveCampaigns()
    } catch (err) {
      console.error('Error stopping campaign:', err)
    } finally {
      setActionInProgress(null)
      setConfirmStop(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>Loading active campaigns...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>No active campaigns running</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Active Campaigns</h2>
        
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {campaign.validatedContacts} contacts
                    </span>
                    <span className="flex items-center gap-1">
                      <PhoneCall className="w-4 h-4" />
                      {campaign.activeCalls} active calls
                    </span>
                    <Badge 
                      variant={campaign.paused ? "secondary" : "default"}
                      className={cn(
                        "ml-2",
                        campaign.paused 
                          ? "bg-yellow-900/20 text-yellow-400 border-yellow-900/50" 
                          : "bg-green-900/20 text-green-400 border-green-900/50"
                      )}
                    >
                      {campaign.paused ? 'Paused' : 'Running'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {campaign.paused ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResume(campaign.id)}
                      disabled={actionInProgress === campaign.id}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePause(campaign.id)}
                      disabled={actionInProgress === campaign.id}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmStop(campaign.id)}
                    disabled={actionInProgress === campaign.id}
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white">
                    {campaign.progress.callsPlaced} / {campaign.validatedContacts} calls ({campaign.progress.percentComplete}%)
                  </span>
                </div>
                <Progress 
                  value={campaign.progress.percentComplete} 
                  className="h-2 bg-gray-800"
                />
              </div>
              
              {/* Call Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Placed</p>
                  <p className="text-2xl font-bold text-white">{campaign.progress.callsPlaced}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Answered</p>
                  <p className="text-2xl font-bold text-green-400">{campaign.progress.callsAnswered}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-blue-400">{campaign.progress.callsCompleted}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{campaign.progress.callsFailed}</p>
                </div>
              </div>
              
              {/* Remaining Contacts */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="w-4 h-4" />
                  <span>Contacts remaining: {campaign.contactsRemaining}</span>
                </div>
                <div className="text-sm text-gray-400">
                  Call delay: {campaign.settings.callDelay / 1000}s
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={!!confirmStop} onOpenChange={() => setConfirmStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Stop Campaign?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop this campaign? This action cannot be undone.
              The campaign will be marked as completed and cannot be resumed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmStop && handleStop(confirmStop)}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialog>
    </>
  )
}