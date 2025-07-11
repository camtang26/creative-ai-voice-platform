"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart, 
  PhoneCall, 
  Clock, 
  Play, 
  Pause, 
  StopCircle, 
  Plus, 
  Calendar, 
  ArrowUpRight,
  Activity,
  Trash2
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { CampaignConfig } from '@/lib/types'
import { startCampaign, pauseCampaign, deleteCampaign, fetchCampaigns } from '@/lib/mongodb-api'
import { cn } from '@/lib/utils'
import { ActiveCampaigns } from '@/components/active-campaigns'

// No fallback data - show real state to user

// Main campaign page component
export default function CampaignsPage() {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    scheduledCampaigns: 0,
    completedCampaigns: 0
  });
  
  // Create a consistent formatter for dates that works on both server and client
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };
  
  // Fetch campaigns from MongoDB API
  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetchCampaigns({
          limit: 20,
          page: 1,
          sortBy: 'createdAt',
          sortOrder: -1
        });
        
        console.log('MongoDB Campaign API response:', response);
        
        if (response.success && response.data && Array.isArray(response.data.campaigns)) {
          setCampaigns(response.data.campaigns);
          
          // Calculate metrics
          const campaignData = response.data.campaigns;
          setMetrics({
            totalCampaigns: campaignData.length,
            activeCampaigns: campaignData.filter((c: CampaignConfig) => c.status === 'in-progress').length,
            scheduledCampaigns: campaignData.filter((c: CampaignConfig) => c.status === 'scheduled').length,
            completedCampaigns: campaignData.filter((c: CampaignConfig) => c.status === 'completed').length
          });
        } else {
          console.error('Failed to fetch campaigns:', response.error);
          setError('Failed to load campaigns');
          setCampaigns([]);
          
          // Set metrics to zero
          setMetrics({
            totalCampaigns: 0,
            activeCampaigns: 0,
            scheduledCampaigns: 0,
            completedCampaigns: 0
          });
        }
      } catch (err) {
        console.error('Error loading campaigns:', err);
        setError('An error occurred while loading campaigns');
        setCampaigns([]);
        
        // Set metrics to zero
        setMetrics({
          totalCampaigns: 0,
          activeCampaigns: 0,
          scheduledCampaigns: 0,
          completedCampaigns: 0
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadCampaigns();
  }, []);

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'cancel' | 'delete') => {
    console.log(`[Campaign Action] Starting ${action} for campaign ${campaignId}`);
    setActionInProgress(campaignId);
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          console.log(`[Campaign Action] Calling startCampaign for ${campaignId}`);
          response = await startCampaign(campaignId);
          break;
        case 'pause':
          console.log(`[Campaign Action] Calling pauseCampaign for ${campaignId}`);
          response = await pauseCampaign(campaignId);
          console.log(`[Campaign Action] pauseCampaign response:`, response);
          break;
        case 'cancel':
          console.log(`[Campaign Action] Calling pauseCampaign (cancel) for ${campaignId}`);
          response = await pauseCampaign(campaignId); // Cancel is same as pause
          break;
        case 'delete':
          console.log(`[Campaign Action] Calling deleteCampaign for ${campaignId}`);
          response = await deleteCampaign(campaignId);
          break;
      }
      
      console.log(`[Campaign Action] Response for ${action}:`, response);
      
      if (response && response.success) {
        if (action === 'delete') {
          // Remove from list if deleted
          setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
        } else {
          // Update the local campaign status
          setCampaigns(prev => 
            prev.map(campaign => 
              campaign.id === campaignId 
                ? { 
                    ...campaign, 
                    status: action === 'start' 
                      ? 'in-progress' 
                      : action === 'pause' 
                        ? 'paused' 
                        : 'cancelled'
                  } 
                : campaign
            )
          );
        }
      } else {
        setError(`Failed to ${action} campaign: ${response?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`An error occurred while trying to ${action} the campaign`);
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Get active campaigns for the real-time monitoring alert
  const activeCampaignsCount = campaigns.filter(c => c.status === 'in-progress').length;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Campaigns"
          description="Manage and monitor your outbound calling campaigns."
        />
        <div className="flex space-x-2">
          {activeCampaignsCount > 0 && (
            <Button variant="outline" asChild className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100">
              <Link href="/campaigns/real-time-monitor?id=all">
                <Activity className="mr-2 h-4 w-4" />
                Real-Time Monitor
                <Badge variant="outline" className="ml-2 bg-amber-100">{activeCampaignsCount}</Badge>
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
            </CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduled Campaigns
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.scheduledCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Campaigns
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedCampaigns}</div>
          </CardContent>
        </Card>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {/* Active Campaigns Section */}
      {metrics.activeCampaigns > 0 && (
        <div className="mb-6">
          <ActiveCampaigns />
        </div>
      )}
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>
              View and manage your outbound calling campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              // Loading state
              <div className="flex items-center justify-center h-32 border rounded-md bg-muted/20">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                <p className="text-muted-foreground">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-32 border rounded-md bg-muted/20">
                <p className="text-muted-foreground mb-2">No campaigns found</p>
                <Link href="/campaigns/new">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/campaigns/${campaign.id}`}
                          className="flex items-center hover:underline"
                        >
                          {campaign.name}
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        {campaign.description ? (
                          <span className="line-clamp-1">{campaign.description}</span>
                        ) : (
                          <span className="text-muted-foreground">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.status || 'draft'} />
                      </TableCell>
                      <TableCell>
                        {campaign.schedule ? (
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {formatDate(campaign.schedule.start_date)}
                            </div>
                            {campaign.schedule.end_date && (
                              <div className="text-muted-foreground text-xs mt-1">
                                {`to ${formatDate(campaign.schedule.end_date)}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(campaign.created_at || new Date().toISOString())}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex space-x-2 justify-end">
                          {/* Always show monitor button for active campaigns */}
                          {campaign.status === 'in-progress' && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              asChild
                            >
                              <Link href={`/campaigns/real-time-monitor?id=${campaign.id}`}>
                                <Activity className="h-4 w-4 mr-1" />
                                Monitor
                              </Link>
                            </Button>
                          )}
                        
                          {/* Start/Resume button - always visible */}
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleCampaignAction(campaign.id || '', 'start')}
                            disabled={
                              !!actionInProgress || 
                              campaign.status === 'in-progress' || 
                              campaign.status === 'completed'
                            }
                            title={
                              campaign.status === 'paused' ? 'Resume campaign' :
                              campaign.status === 'in-progress' ? 'Campaign is running' :
                              campaign.status === 'completed' ? 'Campaign completed' :
                              'Start campaign'
                            }
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {campaign.status === 'paused' ? 'Resume' : 'Start'}
                          </Button>
                          
                          {/* Pause button - always visible */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCampaignAction(campaign.id || '', 'pause')}
                            disabled={
                              !!actionInProgress || 
                              campaign.status !== 'in-progress'
                            }
                            title={
                              campaign.status === 'in-progress' ? 'Pause campaign' :
                              'Campaign must be running to pause'
                            }
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          
                          {/* Stop button - always visible */}
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleCampaignAction(campaign.id || '', 'cancel')}
                            disabled={
                              !!actionInProgress || 
                              campaign.status === 'completed' ||
                              campaign.status === 'cancelled'
                            }
                            title={
                              campaign.status === 'completed' ? 'Campaign already completed' :
                              campaign.status === 'cancelled' ? 'Campaign already cancelled' :
                              'Stop campaign'
                            }
                          >
                            <StopCircle className="h-4 w-4 mr-1" />
                            Stop
                          </Button>
                          
                          {campaign.status !== 'in-progress' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!!actionInProgress}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete
                                    the campaign "{campaign.name}" and all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCampaignAction(campaign.id || '', 'delete')}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete Campaign
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Component to handle the campaign status badge
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
