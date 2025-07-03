"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  PlayCircle,
  Clock,
  Calendar,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileText,
  BarChart,
  Edit,
  Play,
  Pause,
  StopCircle,
  Trash,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RealTimeCampaignMonitor } from '@/components/real-time-campaign-monitor'
import { RealTimeCallMonitor } from '@/components/real-time-call-monitor'
import { AnsweredByBadge } from '@/components/answered-by-badge'
import { TerminatedByBadge } from '@/components/terminated-by-badge'
import { CampaignConfig } from '@/lib/types'
import { fetchCampaign, startCampaign, pauseCampaign, cancelCampaign } from '@/lib/mongodb-api'
import { getApiUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CampaignPageProps {
  params: {
    id: string
  }
}

// Extended campaign type to include backend properties
interface ExtendedCampaign extends CampaignConfig {
  contactCount?: number;
  callsCompleted?: number;
  callsSuccessful?: number;
  callsFailed?: number;
  callsInProgress?: number;
  callsQueued?: number;
  averageCallDuration?: number;
}

export default function CampaignPageEnhanced({ params }: CampaignPageProps) {
  const [campaign, setCampaign] = useState<ExtendedCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadCampaign()
  }, [params.id])

  const loadCampaign = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch campaign from MongoDB API
      const response = await fetchCampaign(params.id)
      
      if (response.success && response.campaign) {
        setCampaign(response.campaign as ExtendedCampaign)
      } else {
        setError(response.error || 'Failed to load campaign')
      }
      
      setLoading(false)
    } catch (err) {
      setError('Failed to load campaign')
      console.error(err)
      setLoading(false)
    }
  }

  const handleCampaignAction = async (action: 'start' | 'pause' | 'cancel') => {
    if (!campaign?.id) return
    
    setActionInProgress(action)
    
    try {
      let response
      
      switch (action) {
        case 'start':
          response = await startCampaign(campaign.id)
          break
        case 'pause':
          response = await pauseCampaign(campaign.id)
          break
        case 'cancel':
          response = await cancelCampaign(campaign.id)
          break
      }
      
      if (response?.success) {
        // Update the local campaign status
        setCampaign(prev => 
          prev ? { 
            ...prev, 
            status: action === 'start' 
              ? 'in-progress' 
              : action === 'pause' 
                ? 'paused' 
                : 'cancelled'
          } : null
        )
      } else {
        setError(`Failed to ${action} campaign: ${response?.error}`)
      }
    } catch (err) {
      setError(`An error occurred while trying to ${action} the campaign`)
      console.error(err)
    } finally {
      setActionInProgress(null)
    }
  }

  // Define the type for call data
  interface CallData {
    sid: string
    phone: string
    name: string
    status: string
    duration: number | null
    outcome: string | null
    date: string | null
  }
  
  // Define the type for contact data
  interface ContactData {
    _id: string
    phoneNumber: string
    name: string
    status: string
    callCount: number
    liveCallCount: number
    lastContacted: string | null
    lastCallResult: string | null
    answeredBy: string | null
    terminatedBy: string | null
    lastCallDuration: number | null
  }
  
  // State for campaign stats and call data
  const [campaignStats, setCampaignStats] = useState({
    totalContacts: 0,
    completedCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    inProgressCalls: 0,
    pendingCalls: 0,
    progress: 0, // percentage
    averageDuration: 0, // seconds
    successRate: 0, // percentage
  })
  
  const [callData, setCallData] = useState<CallData[]>([])
  const [callsLoading, setCallsLoading] = useState(false)
  
  // State for contacts data
  const [contactData, setContactData] = useState<ContactData[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all')
  
  // Load campaign stats and call data
  useEffect(() => {
    if (campaign?.id) {
      // Load all data in parallel for better performance
      Promise.all([
        loadCampaignStats(),
        loadCampaignCalls(),
        loadCampaignContacts()
      ])
    }
  }, [campaign?.id])
  
  // Load campaign statistics
  const loadCampaignStats = async () => {
    try {
      // Use the actual campaign data from MongoDB
      if (!campaign) return
      
      // Get total contacts from the campaign's stats or contactIds length
      const totalContacts = campaign.stats?.totalContacts || campaign.contactIds?.length || 0
      
      // Get call statistics from campaign stats
      const completedCalls = campaign.stats?.callsCompleted || 0
      const answeredCalls = campaign.stats?.callsAnswered || 0
      const failedCalls = campaign.stats?.callsFailed || 0
      const callsPlaced = campaign.stats?.callsPlaced || 0
      
      // Calculate derived stats
      const inProgressCalls = campaign.callsInProgress || 0
      const pendingCalls = totalContacts - callsPlaced
      const progress = totalContacts > 0 ? Math.round((callsPlaced / totalContacts) * 100) : 0
      const averageDuration = campaign.stats?.averageDuration || 0
      const successRate = answeredCalls > 0 ? Math.round((answeredCalls / callsPlaced) * 100) : 0
      
      setCampaignStats({
        totalContacts,
        completedCalls: callsPlaced,
        successfulCalls: answeredCalls,
        failedCalls,
        inProgressCalls,
        pendingCalls,
        progress,
        averageDuration,
        successRate,
      })
    } catch (error) {
      console.error("Error loading campaign stats:", error)
    }
  }
  
  // Load campaign calls
  const loadCampaignCalls = async () => {
    if (!campaign?.id) return
    
    setCallsLoading(true)
    
    try {
      // Fetch real campaign calls from MongoDB API
      const response = await fetch(getApiUrl(`/api/db/calls?campaignId=${campaign.id}&limit=50`))
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign calls: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        // Transform the call data to match our interface
        const transformedCalls = result.data.calls.map((call: any) => ({
          sid: call.callSid || call._id, // Use callSid from backend, fallback to _id
          phone: call.to,
          name: call.contactName || 'Unknown',
          status: call.status,
          duration: call.duration,
          outcome: call.callOutcome || null,
          date: call.startTime
        }))
        
        setCallData(transformedCalls)
      } else {
        console.error("Failed to load campaign calls:", result.error)
        setCallData([])
      }
    } catch (error) {
      console.error("Error loading campaign calls:", error)
      setCallData([])
    } finally {
      setCallsLoading(false)
    }
  }
  
  // Load campaign contacts
  const loadCampaignContacts = async () => {
    if (!campaign?.id) return
    
    setContactsLoading(true)
    
    try {
      // Fetch contacts for this campaign from MongoDB API
      const response = await fetch(getApiUrl(`/api/db/campaigns/${campaign.id}/contacts`))
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign contacts: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setContactData(result.data.contacts || [])
      } else {
        console.error("Failed to load campaign contacts:", result.error)
        setContactData([])
      }
    } catch (error) {
      console.error("Error loading campaign contacts:", error)
      setContactData([])
    } finally {
      setContactsLoading(false)
    }
  }
  
  // Get filtered contacts based on status
  const getFilteredContacts = () => {
    if (contactStatusFilter === 'all') {
      return contactData
    }
    return contactData.filter(contact => contact.status === contactStatusFilter)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title={loading ? 'Loading Campaign...' : campaign?.name || 'Campaign Details'}
          description={loading ? '' : campaign?.description || 'Campaign details and performance'}
        />
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="w-full h-24" />
          <Skeleton className="w-full h-96" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => loadCampaign()}
          >
            Retry
          </Button>
        </div>
      ) : campaign ? (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Campaign Status</CardTitle>
              <CardDescription>Current status and controls</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-6 lg:items-center lg:justify-between">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="font-semibold text-sm text-muted-foreground">Status:</div>
                    <CampaignStatusBadge status={campaign.status || 'draft'} />
                  </div>
                  {campaign.schedule && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(campaign.schedule.start_date).toLocaleDateString()} to {' '}
                        {campaign.schedule.end_date ? new Date(campaign.schedule.end_date).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Created on {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                    <Button 
                      onClick={() => handleCampaignAction('start')} 
                      disabled={!!actionInProgress}
                    >
                      {actionInProgress === 'start' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Start Campaign
                    </Button>
                  ) : null}
                  
                  {campaign.status === 'in-progress' ? (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => handleCampaignAction('pause')}
                        disabled={!!actionInProgress}
                      >
                        {actionInProgress === 'pause' ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Pause className="mr-2 h-4 w-4" />
                        )}
                        Pause
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleCampaignAction('cancel')}
                        disabled={!!actionInProgress}
                      >
                        {actionInProgress === 'cancel' ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <StopCircle className="mr-2 h-4 w-4" />
                        )}
                        Stop
                      </Button>
                    </>
                  ) : null}
                  
                  {campaign.status === 'paused' ? (
                    <Button 
                      onClick={() => handleCampaignAction('start')}
                      disabled={!!actionInProgress}
                    >
                      {actionInProgress === 'start' ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Resume
                    </Button>
                  ) : null}
                  
                  {campaign.status !== 'in-progress' ? (
                    <Button variant="outline" asChild>
                      <Link href={`/campaigns/${params.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  ) : null}
                  
                  {campaign.status === 'draft' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the campaign "{campaign.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            // onClick would handle delete in real implementation
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats Cards and Real-time Monitor */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="col-span-full lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 h-full">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Contacts
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaignStats.totalContacts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaignStats.completedCalls} calls completed
                    </p>
                    <Progress value={campaignStats.progress} className="h-1 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Success Rate
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaignStats.successRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaignStats.successfulCalls} successful calls
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failed Calls
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{campaignStats.failedCalls}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaignStats.totalContacts > 0 
                        ? `${Math.round(campaignStats.failedCalls / campaignStats.totalContacts * 100)}% of total contacts`
                        : 'No contacts yet'
                      }
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg. Duration
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.floor(campaignStats.averageDuration / 60)}:{(campaignStats.averageDuration % 60).toString().padStart(2, '0')}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minutes per call
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Real-time monitor for active campaign */}
            <div className="col-span-full lg:col-span-2">
              {campaign.status === 'in-progress' ? (
                <RealTimeCampaignMonitor campaignId={campaign.id || params.id} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Status</CardTitle>
                    <CardDescription>
                      This campaign is currently {campaign.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center text-center p-8">
                    {campaign.status === 'draft' && (
                      <>
                        <PlayCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Ready to Start</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Start the campaign to make calls and see real-time updates
                        </p>
                        <Button 
                          className="mt-4"
                          onClick={() => handleCampaignAction('start')}
                          disabled={!!actionInProgress}
                        >
                          {actionInProgress === 'start' ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Start Campaign
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'paused' && (
                      <>
                        <Pause className="h-16 w-16 text-amber-500 mb-4" />
                        <p className="text-lg font-medium">Campaign Paused</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Resume the campaign to continue making calls
                        </p>
                        <Button 
                          className="mt-4"
                          onClick={() => handleCampaignAction('start')}
                          disabled={!!actionInProgress}
                        >
                          {actionInProgress === 'start' ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Resume Campaign
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'scheduled' && (
                      <>
                        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Campaign Scheduled</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This campaign is scheduled to start at{' '}
                          {campaign.schedule?.start_date ? (
                            new Date(campaign.schedule.start_date).toLocaleString()
                          ) : (
                            'a scheduled time'
                          )}
                        </p>
                        <Button 
                          className="mt-4"
                          onClick={() => handleCampaignAction('start')}
                          disabled={!!actionInProgress}
                        >
                          {actionInProgress === 'start' ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Start Now
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'completed' && (
                      <>
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <p className="text-lg font-medium">Campaign Completed</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This campaign has finished making calls
                        </p>
                        <Button 
                          variant="outline"
                          className="mt-4"
                          asChild
                        >
                          <Link href="/analytics">
                            <BarChart className="mr-2 h-4 w-4" />
                            View Analytics
                          </Link>
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'cancelled' && (
                      <>
                        <StopCircle className="h-16 w-16 text-red-500 mb-4" />
                        <p className="text-lg font-medium">Campaign Cancelled</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This campaign was cancelled
                        </p>
                        <div className="flex space-x-2 mt-4">
                          <Button 
                            variant="outline"
                            asChild
                          >
                            <Link href="/analytics">
                              <BarChart className="mr-2 h-4 w-4" />
                              View Analytics
                            </Link>
                          </Button>
                          <Button onClick={() => handleCampaignAction('start')}>
                            <Play className="mr-2 h-4 w-4" />
                            Restart Campaign
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* Add Live Call Monitor */}
          {campaign.status === 'in-progress' && (
            <div className="mb-6">
              <RealTimeCallMonitor />
            </div>
          )}
          
          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="calls">Call History</TabsTrigger>
              <TabsTrigger value="details">Configuration</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Campaign Contacts</CardTitle>
                      <CardDescription>
                        All contacts in this campaign with their call status
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Contacts</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="calling">Calling</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="no-answer">No Answer</SelectItem>
                          <SelectItem value="do-not-call">Do Not Call</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadCampaignContacts}
                        disabled={contactsLoading}
                      >
                        {contactsLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {contactsLoading ? (
                    <div className="space-y-4 py-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : getFilteredContacts().length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No contacts found{contactStatusFilter !== 'all' ? ` with status '${contactStatusFilter}'` : ''}</p>
                      {contactData.length === 0 && (
                        <p className="text-sm mt-1">Add contacts to this campaign to get started</p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Total Attempts</TableHead>
                            <TableHead className="text-center">Live Calls</TableHead>
                            <TableHead>Answered By</TableHead>
                            <TableHead>Terminated By</TableHead>
                            <TableHead>Last Contact</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredContacts().map((contact) => (
                            <TableRow key={contact._id}>
                              <TableCell className="font-medium">
                                {contact.name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{contact.phoneNumber}</span>
                              </TableCell>
                              <TableCell>
                                <ContactStatusBadge status={contact.status} />
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={contact.callCount > 0 ? 'secondary' : 'outline'}>
                                  {contact.callCount}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={contact.liveCallCount > 0 ? 'default' : 'outline'}>
                                  {contact.liveCallCount || 0}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {contact.answeredBy ? (
                                  <AnsweredByBadge answeredBy={contact.answeredBy} />
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {contact.terminatedBy ? (
                                  <TerminatedByBadge terminatedBy={contact.terminatedBy} />
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {contact.lastContacted ? (
                                  <span className="text-sm">
                                    {new Date(contact.lastContacted).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Never</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to calls filtered by this contact's phone number
                                    window.location.href = `/calls?phone=${encodeURIComponent(contact.phoneNumber)}`
                                  }}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  View Calls
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {getFilteredContacts().length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Showing {getFilteredContacts().length} of {contactData.length} contacts
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="calls" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Campaign Calls</CardTitle>
                      <CardDescription>
                        All calls made as part of this campaign
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadCampaignCalls}
                        disabled={callsLoading}
                      >
                        {callsLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {callsLoading ? (
                    <div className="space-y-4 py-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : callData.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No calls have been made for this campaign yet</p>
                      <p className="text-sm mt-1">Calls will appear here once the campaign starts</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {callData.map((call, index) => (
                          <TableRow key={`${call.sid}-${index}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{call.name}</div>
                                <div className="text-sm text-muted-foreground">{call.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <CallStatusBadge status={call.status} />
                            </TableCell>
                            <TableCell>
                              {call.date ? new Date(call.date).toLocaleString() : 'Not started'}
                            </TableCell>
                            <TableCell>
                              {call.duration ?
                                `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` :
                                '-'
                              }
                            </TableCell>
                            <TableCell>
                              {call.outcome ? (
                                <CallOutcomeBadge outcome={call.outcome} />
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {call.status === 'completed' ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/call-details/${call.sid}`}>
                                    View
                                  </Link>
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Configuration</CardTitle>
                  <CardDescription>
                    Settings and configuration details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">AI Prompt Template</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="whitespace-pre-wrap text-sm">{campaign.prompt_template}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">First Message Template</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="whitespace-pre-wrap text-sm">{campaign.first_message_template}</p>
                    </div>
                  </div>
                  
                  {campaign.sheet_id && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Contact Source</h3>
                      <div className="bg-muted p-4 rounded-md">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm font-medium">Google Sheet</span>
                        </div>
                        <dl className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Sheet ID</dt>
                            <dd className="text-sm break-all">{campaign.sheet_id}</dd>
                          </div>
                          {campaign.sheetInfo && (
                            <>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Sheet Name</dt>
                                <dd className="text-sm">{campaign.sheetInfo.sheetName || 'Sheet1'}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Phone Column</dt>
                                <dd className="text-sm">{campaign.sheetInfo.phoneColumn || 'Phone'}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Name Column</dt>
                                <dd className="text-sm">{campaign.sheetInfo.nameColumn || 'Name'}</dd>
                              </div>
                            </>
                          )}
                        </dl>
                        <div className="mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`https://docs.google.com/spreadsheets/d/${campaign.sheet_id}`} target="_blank">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Sheet
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {campaign.schedule && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Schedule Settings</h3>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                          <dd className="text-sm">
                            {new Date(campaign.schedule.start_date).toLocaleString()}
                          </dd>
                        </div>
                        {campaign.schedule.end_date && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                            <dd className="text-sm">
                              {new Date(campaign.schedule.end_date).toLocaleString()}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Max Concurrent Calls</dt>
                          <dd className="text-sm">{campaign.schedule.max_concurrent_calls || 3}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Call Interval</dt>
                          <dd className="text-sm">
                            {campaign.schedule.call_interval_ms ? 
                              `${campaign.schedule.call_interval_ms / 1000} seconds` : 
                              '60 seconds'
                            }
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Analytics</CardTitle>
                  <CardDescription>
                    Performance metrics and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-20 text-muted-foreground">
                    <BarChart className="mx-auto h-10 w-10 mb-2" />
                    <p>Detailed analytics will be available when the campaign has more data</p>
                    <p className="text-sm mt-1">Check back after the campaign has made more calls</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <AlertCircle className="mx-auto h-10 w-10 mb-2" />
          <p>Campaign not found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            asChild
          >
            <Link href="/campaigns">
              Back to Campaigns
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

interface CampaignStatusBadgeProps {
  status: string
}

function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  let variant: 'destructive' | 'default' | 'secondary' | 'outline' = 'outline'
  let label = status
  
  switch (status) {
    case 'draft':
      variant = 'outline'
      break
    case 'scheduled':
      variant = 'secondary'
      break
    case 'in-progress':
      variant = 'default'
      label = 'active'
      break
    case 'paused':
      variant = 'secondary'
      break
    case 'completed':
      variant = 'outline'
      break
    case 'cancelled':
      variant = 'destructive'
      break
  }
  
  return (
    <Badge 
      variant={variant}
      className={cn(
        'capitalize',
        variant === 'outline' ? 'border border-solid' : ''
      )}
    >
      {label}
    </Badge>
  )
}

interface CallStatusBadgeProps {
  status: string
}

function CallStatusBadge({ status }: CallStatusBadgeProps) {
  let variant: 'destructive' | 'default' | 'secondary' | 'outline' = 'outline'
  
  switch (status) {
    case 'scheduled':
      variant = 'outline'
      break
    case 'in-progress':
      variant = 'default'
      break
    case 'completed':
      variant = 'secondary'
      break
    case 'failed':
      variant = 'destructive'
      break
  }
  
  return (
    <Badge 
      variant={variant}
      className="capitalize"
    >
      {status}
    </Badge>
  )
}

interface CallOutcomeBadgeProps {
  outcome: string
}

function CallOutcomeBadge({ outcome }: CallOutcomeBadgeProps) {
  const variant = outcome === 'successful' ? 'default' : 'outline'
  
  return (
    <Badge 
      variant={variant}
      className="capitalize"
    >
      {outcome}
    </Badge>
  )
}

interface ContactStatusBadgeProps {
  status: string
}

function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  let variant: 'destructive' | 'default' | 'secondary' | 'outline' = 'outline'
  let label = status
  
  switch (status) {
    case 'pending':
      variant = 'outline'
      break
    case 'calling':
      variant = 'default'
      label = 'in progress'
      break
    case 'completed':
      variant = 'secondary'
      break
    case 'failed':
      variant = 'destructive'
      break
    case 'no-answer':
      variant = 'outline'
      label = 'no answer'
      break
    case 'do-not-call':
      variant = 'destructive'
      label = 'do not call'
      break
    case 'active':
      variant = 'secondary'
      break
  }
  
  return (
    <Badge 
      variant={variant}
      className="capitalize"
    >
      {label}
    </Badge>
  )
}
