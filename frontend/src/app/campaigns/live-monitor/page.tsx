"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RealTimeCampaignMonitor } from '@/components/real-time-campaign-monitor'
import { RealTimeCallMonitor } from '@/components/real-time-call-monitor'
import { useSocket } from '@/lib/socket-context'
import { fetchActiveCampaigns } from '@/lib/mongodb-api'
import { ChevronLeft, AlertCircle, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CampaignConfig } from '@/lib/types' // Added CampaignConfig import

// Define a new type for display purposes that includes runtime stats
interface LiveCampaignDisplayDetails extends CampaignConfig {
  progress?: number;
  stats?: any; // Or a more specific type if known for liveData.stats
}

// LiveSocketCampaignData is removed as activeCampaigns from useSocket is likely CampaignConfig[]
// or a similar array type that includes the necessary fields.
// If socket data has a different structure for status/progress/stats,
// we'll handle that during the merge.

export default function LiveMonitorPage() {
  // Let activeCampaigns be typed by useSocket()
  // We assume useSocket() provides activeCampaigns as CampaignConfig[] or compatible
  // If it's truly different, SocketContextType needs adjustment or mapping here.
  const { isConnected, activeCampaigns } = useSocket();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<LiveCampaignDisplayDetails[]>([]) // Use the new type
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch campaign details on mount
  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetchActiveCampaigns()
        
        if (response.success && response.data) {
          setCampaignDetails(response.data.campaigns)
          
          // Select the first active campaign by default
          const activeCampaign = response.data.campaigns.find(c => c.status === 'in-progress')
          if (activeCampaign) {
            setSelectedCampaign(activeCampaign.id || null) // Fallback to null if id is undefined
          } else if (response.data?.campaigns?.length > 0 && response.data.campaigns[0]) { // Added null checks
            setSelectedCampaign(response.data.campaigns[0].id || null) // Fallback to null
          }
        } else {
          setError(response.error || 'Failed to load active campaigns')
        }
      } catch (err) {
        console.error('Error loading campaigns:', err)
        setError('An error occurred while loading campaigns')
      } finally {
        setLoading(false)
      }
    }
    
    loadCampaigns()
  }, [])
  
  // Update campaign details when socket data changes
  useEffect(() => {
    // Assuming activeCampaigns from useSocket is an array of objects that include
    // id, status, progress, and stats.
    if (activeCampaigns && activeCampaigns.length > 0 && campaignDetails.length > 0) {
      const updatedDetails = campaignDetails.map(campaignInState => {
        const liveData = activeCampaigns.find(socketCampaign => socketCampaign.id === campaignInState.id);
        
        if (liveData) {
          // Ensure status from liveData is compatible with CampaignConfig['status']
          const validStatus = liveData.status as CampaignConfig['status'];

          return {
            ...campaignInState, // campaignInState is LiveCampaignDisplayDetails
            status: validStatus,
            progress: liveData.progress, // Assuming liveData has progress
            stats: liveData.stats,       // Assuming liveData has stats
          } as LiveCampaignDisplayDetails;
        }
        return campaignInState;
      });
      setCampaignDetails(updatedDetails);
    }
  }, [activeCampaigns, campaignDetails]);
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Live Campaign Monitor"
          description="Real-time monitoring of active campaigns and calls"
        />
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
      
      {!isConnected && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
            <div>
              <p className="text-amber-800 dark:text-amber-200">
                Socket connection is not established. Real-time updates are currently unavailable.
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                Please refresh the page or check your connection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Data
            </h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4 border-red-200 hover:bg-red-100 text-red-800"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      ) : campaignDetails.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No Active Campaigns</h3>
            <p className="text-muted-foreground mb-4">
              There are no campaigns currently active or scheduled.
            </p>
            <Button asChild>
              <Link href="/campaigns/new">
                Create New Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Campaign selector */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Select Campaign to Monitor</CardTitle>
              <CardDescription>
                Choose a campaign to view real-time metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaignDetails.map(campaign => (
                  <Button
                    key={campaign.id}
                    variant={selectedCampaign === campaign.id ? "default" : "outline"}
                    className="flex items-center"
                    onClick={() => setSelectedCampaign(campaign.id || null)}
                  >
                    {campaign.status === 'in-progress' && (
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    )}
                    {campaign.name}
                    {campaign.status === 'in-progress' ? ' (Active)' : ''}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Main monitoring area */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column - Campaign Monitor */}
            <div className="space-y-6">
              {selectedCampaign && (
                <RealTimeCampaignMonitor campaignId={selectedCampaign} />
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                  <CardDescription>
                    Configuration and settings for the selected campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedCampaign ? (
                    <div className="space-y-4">
                      {/* Campaign details - basic info */}
                      {campaignDetails.find(c => c.id === selectedCampaign) && (
                        <div>
                          <h3 className="text-lg font-medium mb-3">
                            {campaignDetails.find(c => c.id === selectedCampaign)?.name}
                          </h3>
                          <dl className="grid grid-cols-2 gap-3">
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                              <dd className="text-sm capitalize">
                                {campaignDetails.find(c => c.id === selectedCampaign)?.status}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Total Contacts</dt>
                              <dd className="text-sm">
                                {campaignDetails.find(c => c.id === selectedCampaign)?.stats?.totalContacts || 0}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Schedule</dt>
                              <dd className="text-sm">
                                {campaignDetails.find(c => c.id === selectedCampaign)?.schedule ? (
                                  `${campaignDetails.find(c => c.id === selectedCampaign)?.schedule?.start_date ? new Date(campaignDetails.find(c => c.id === selectedCampaign)!.schedule!.start_date!).toLocaleDateString() : 'N/A'}`
                                ) : (
                                  'No schedule'
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                              <dd className="text-sm">
                                {campaignDetails.find(c => c.id === selectedCampaign)?.created_at ? (
                                  campaignDetails.find(c => c.id === selectedCampaign)?.created_at ? new Date(campaignDetails.find(c => c.id === selectedCampaign)!.created_at!).toLocaleDateString() : 'N/A'
                                ) : (
                                  'Unknown'
                                )}
                              </dd>
                            </div>
                          </dl>
                          
                          <div className="mt-4">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/campaigns/${selectedCampaign}`}>
                                View Full Campaign Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Please select a campaign to view details
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right column - Call Monitor */}
            <div>
              <RealTimeCallMonitor />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
