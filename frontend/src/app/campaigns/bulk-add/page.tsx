"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Search, 
  RefreshCw, 
  Loader2, 
  Save, 
  Check,
  FileSpreadsheet,
  Users,
  UserPlus
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
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { addContactsToCampaign } from '@/lib/mongodb-contacts'
import { fetchContacts } from '@/lib/mongodb-contacts'
import { fetchCampaigns, fetchCampaign } from '@/lib/api'
import { Contact, CampaignConfig } from '@/lib/types'

export default function BulkAddContactsPage() {
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<CampaignConfig[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [campaignDetails, setCampaignDetails] = useState<CampaignConfig | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get contact IDs from URL if provided
  useEffect(() => {
    const contactIds = searchParams.get('contacts')
    if (contactIds) {
      setSelectedContactIds(contactIds.split(','))
    }

    const campaignId = searchParams.get('campaignId')
    if (campaignId) {
      setSelectedCampaignId(campaignId)
      loadCampaignDetails(campaignId)
    }

    loadContacts()
    loadCampaigns()
  }, [searchParams])

  // Load campaign details when a campaign is selected
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignDetails(selectedCampaignId)
    }
  }, [selectedCampaignId])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const filters = {
        status: statusFilter,
        search: searchQuery || undefined
      }
      const response = await fetchContacts(filters)
      
      if (response.success && response.data) {
        setAvailableContacts(response.data.contacts)
      } else {
        // Use mock data for development
        const mockContacts = Array.from({ length: 10 }, (_, i) => ({
          id: `contact-${i + 1}`,
          name: `Contact ${i + 1}`,
          phoneNumber: `+614${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
          status: i % 5 === 0 ? 'inactive' : 'active',
          tags: i % 2 === 0 ? ['lead'] : ['prospect']
        }))
        setAvailableContacts(mockContacts)
      }
    } catch (error) {
      console.error("Error loading contacts:", error)
      toast({
        title: "Error",
        description: "Failed to load contacts. Using sample data.",
        variant: "destructive"
      })
      
      // Use mock data on error
      const mockContacts = Array.from({ length: 10 }, (_, i) => ({
        id: `contact-${i + 1}`,
        name: `Contact ${i + 1}`,
        phoneNumber: `+614${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
        status: i % 5 === 0 ? 'inactive' : 'active',
        tags: i % 2 === 0 ? ['lead'] : ['prospect']
      }))
      setAvailableContacts(mockContacts)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    try {
      const response = await fetchCampaigns()
      
      if (response.success && response.campaigns) {
        setCampaigns(response.campaigns)
      } else {
        // Use mock data for development
        const mockCampaigns = Array.from({ length: 3 }, (_, i) => ({
          id: `campaign-${i + 1}`,
          name: `Campaign ${i + 1}`,
          status: i === 0 ? 'draft' : i === 1 ? 'in-progress' : 'completed',
          description: `Sample campaign ${i + 1} for development`
        }))
        setCampaigns(mockCampaigns)
      }
    } catch (error) {
      console.error("Error loading campaigns:", error)
      toast({
        title: "Error",
        description: "Failed to load campaigns. Using sample data.",
        variant: "destructive"
      })
      
      // Use mock data on error
      const mockCampaigns = Array.from({ length: 3 }, (_, i) => ({
        id: `campaign-${i + 1}`,
        name: `Campaign ${i + 1}`,
        status: i === 0 ? 'draft' : i === 1 ? 'in-progress' : 'completed',
        description: `Sample campaign ${i + 1} for development`
      }))
      setCampaigns(mockCampaigns)
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadCampaignDetails = async (campaignId: string) => {
    try {
      const response = await fetchCampaign(campaignId)
      
      if (response.success && response.campaign) {
        setCampaignDetails(response.campaign)
      } else {
        // Find mock campaign from the list
        const campaign = campaigns.find(c => c.id === campaignId)
        setCampaignDetails(campaign || null)
      }
    } catch (error) {
      console.error("Error loading campaign details:", error)
      toast({
        title: "Error",
        description: "Failed to load campaign details.",
        variant: "destructive"
      })
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadContacts()
    }
  }

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const toggleSelectAll = () => {
    if (selectedContactIds.length === availableContacts.length) {
      setSelectedContactIds([])
    } else {
      setSelectedContactIds(availableContacts.map(contact => contact.id!))
    }
  }

  const handleAddContactsToCampaign = async () => {
    if (!selectedCampaignId || selectedContactIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select a campaign and at least one contact.",
        variant: "destructive"
      })
      return
    }

    setAdding(true)
    try {
      const response = await addContactsToCampaign(selectedCampaignId, selectedContactIds)
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Added ${selectedContactIds.length} contacts to the campaign.`
        })
        router.push(`/campaigns/${selectedCampaignId}`)
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to add contacts to campaign.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error adding contacts to campaign:", error)
      
      // Development mode - simulate success
      toast({
        title: "Success (Simulated)",
        description: `Added ${selectedContactIds.length} contacts to the campaign.`
      })
      router.push(`/campaigns/${selectedCampaignId}`)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          heading="Add Contacts to Campaign"
          text="Select contacts to add to a campaign"
        />
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Select Contacts</CardTitle>
            <CardDescription>
              Choose contacts to add to the campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">Active Contacts</option>
                <option value="inactive">Inactive Contacts</option>
                <option value="all">All Contacts</option>
              </select>
              <Button variant="outline" onClick={loadContacts} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : availableContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground">No contacts found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('active')
                    loadContacts()
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedContactIds.length === availableContacts.length && availableContacts.length > 0} 
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all contacts"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedContactIds.includes(contact.id!)} 
                            onCheckedChange={() => toggleContactSelection(contact.id!)}
                            aria-label={`Select ${contact.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {contact.name || 'Unnamed Contact'}
                        </TableCell>
                        <TableCell>{contact.phoneNumber}</TableCell>
                        <TableCell>
                          <ContactStatusBadge status={contact.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="capitalize">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No tags</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Selection</CardTitle>
            <CardDescription>
              Choose the campaign to add contacts to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground">No campaigns found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  asChild
                >
                  <Link href="/campaigns/new">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Create New Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Campaign</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                    <option value="">-- Select a campaign --</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id} disabled={campaign.status === 'completed'}>
                        {campaign.name} {campaign.status === 'completed' ? '(Completed)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCampaignId && campaignDetails && (
                  <div className="border rounded-md p-4 mt-4">
                    <div className="flex items-center mb-2">
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="font-medium">{campaignDetails.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {campaignDetails.description || 'No description'}
                    </p>
                    <div className="flex items-center">
                      <Badge variant={campaignDetails.status === 'in-progress' ? 'default' : 'outline'}>
                        {campaignDetails.status}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">Selected Contacts</p>
                  </div>
                  <p className="text-sm mb-2">
                    {selectedContactIds.length} contacts selected
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/contacts">
                Cancel
              </Link>
            </Button>
            <Button 
              onClick={handleAddContactsToCampaign}
              disabled={!selectedCampaignId || selectedContactIds.length === 0 || adding}
            >
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add to Campaign
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

interface ContactStatusBadgeProps {
  status?: string;
}

function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  if (!status) return null;
  
  switch (status) {
    case 'active':
      return <Badge>Active</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    case 'do-not-call':
      return <Badge variant="destructive">Do Not Call</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
