"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Phone, 
  Mail, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  Clock, 
  UserPlus,
  BarChart,
  RefreshCw, 
  Loader2,
  MessageCircle,
  Plus,
  X
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { 
  fetchContactById, 
  updateContact, 
  deleteContact, 
  addTagsToContact,
  removeTagsFromContact // Corrected to plural 'Tags'
} from '@/lib/mongodb-contacts'
import { fetchCallHistory } from '@/lib/mongodb-analytics'
import { Contact } from '@/lib/types'

interface ContactPageProps {
  params: {
    id: string
  }
}

export default function ContactPage({ params }: ContactPageProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCalls, setLoadingCalls] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedContact, setEditedContact] = useState<Contact | null>(null)
  const [calls, setCalls] = useState<any[]>([])
  const [newTag, setNewTag] = useState('')
  const [isAddTagOpen, setIsAddTagOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Load contact details on mount
  useEffect(() => {
    loadContact()
  }, [params.id])
  
  // Load call history when contact is loaded
  useEffect(() => {
    if (contact?.id) {
      loadCallHistory()
    }
  }, [contact?.id])
  
  const loadContact = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetchContactById(params.id)
      
      if (response.success && response.data) {
        setContact(response.data)
        setEditedContact(response.data)
      } else {
        setError(response.error || 'Failed to load contact information')
        // Generate sample data for development
        const sampleContact = generateSampleContact(params.id)
        setContact(sampleContact)
        setEditedContact(sampleContact)
      }
    } catch (err) {
      console.error('Error loading contact:', err)
      setError('An unexpected error occurred')
      
      // Generate sample data for development
      const sampleContact = generateSampleContact(params.id)
      setContact(sampleContact)
      setEditedContact(sampleContact)
    } finally {
      setLoading(false)
    }
  }
  
  const loadCallHistory = async () => {
    setLoadingCalls(true)
    
    try {
      // Get call history for this contact
      const callResponse = await fetchCallHistory(params.id, { limit: 10, entityType: 'contact' })
      
      if (callResponse.success && callResponse.data) {
        setCalls(callResponse.data)
      } else {
        // Generate sample calls for development
        setCalls(generateSampleCalls())
      }
    } catch (err) {
      console.error('Error loading call history:', err)
      // Generate sample calls for development
      setCalls(generateSampleCalls())
    } finally {
      setLoadingCalls(false)
    }
  }
  
  const generateSampleContact = (id: string): Contact => {
    return {
      id,
      phoneNumber: `+614${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
      name: `Contact ${id}`,
      email: `contact${id}@example.com`,
      tags: ['lead', 'prospect'],
      notes: 'Sample contact generated for development purposes. This contact is interested in our premium plan.',
      lastContacted: new Date().toISOString(),
      callCount: 3,
      callIds: ['CA123456', 'CA234567', 'CA345678'],
      campaignIds: ['camp1'],
      status: 'active',
      priority: 2,
      customFields: {
        company: 'Acme Inc.',
        position: 'Manager',
        source: 'Website Inquiry'
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
  
  const generateSampleCalls = () => {
    return Array.from({ length: 3 }, (_, i) => ({
      sid: `CA${Math.random().toString(36).substr(2, 9)}`,
      status: i === 0 ? 'completed' : i === 1 ? 'no-answer' : 'completed',
      direction: 'outbound-api',
      startTime: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
      duration: 180,
      from: '+61499999999',
      to: contact?.phoneNumber || '+614XXXXXXXX',
      agentId: 'agent-1',
      campaignId: i === 0 ? 'camp1' : null,
      recordingsCount: i % 2 === 0 ? 1 : 0,
      conversationId: i % 2 === 0 ? `conv-${i}` : null
    }))
  }
  
  const handleSaveChanges = async () => {
    if (!editedContact) return
    
    setIsSaving(true)
    
    try {
      const response = await updateContact(editedContact.id!, editedContact)
      
      if (response.success) {
        setContact(editedContact)
        setIsEditMode(false)
        
        toast({
          title: "Contact updated",
          description: "The contact has been successfully updated."
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update contact",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error updating contact:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleAddTag = async () => {
    if (!newTag.trim() || !contact?.id) return
    
    setActionInProgress('tag')
    
    try {
      const response = await addTagsToContact(contact.id, [newTag.trim()])
      
      if (response.success) {
        // Update local state
        setContact(prev => {
          if (!prev) return prev
          return {
            ...prev,
            tags: [...(prev.tags || []), newTag.trim()]
          }
        })
        
        setNewTag('')
        setIsAddTagOpen(false)
        
        toast({
          title: "Tag added",
          description: `Tag "${newTag.trim()}" has been added to the contact.`
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to add tag",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error adding tag:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setActionInProgress(null)
    }
  }
  
  const handleRemoveTag = async (tag: string) => {
    if (!contact?.id) return
    
    setActionInProgress(tag)
    
    try {
      const response = await removeTagsFromContact(contact.id, [tag]) // Pass tag as an array
      
      if (response.success) {
        // Update local state
        setContact(prev => {
          if (!prev) return prev
          return {
            ...prev,
            tags: (prev.tags || []).filter(t => t !== tag)
          }
        })
        
        toast({
          title: "Tag removed",
          description: `Tag "${tag}" has been removed from the contact.`
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to remove tag",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error removing tag:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setActionInProgress(null)
    }
  }
  
  const handleDeleteContact = async () => {
    if (!contact?.id) return
    
    setActionInProgress('delete')
    
    try {
      const response = await deleteContact(contact.id)
      
      if (response.success) {
        toast({
          title: "Contact deleted",
          description: "The contact has been successfully deleted."
        })
        
        // Navigate back to contacts page
        router.push('/contacts')
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete contact",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error deleting contact:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setActionInProgress(null)
    }
  }
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          title={loading ? 'Loading Contact...' : contact?.name || 'Contact Details'}
          description={loading ? '' : contact?.phoneNumber || ''}
        />
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button 
              onClick={loadContact} 
              className="mt-4"
              disabled={actionInProgress === 'reload'}
            >
              {actionInProgress === 'reload' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{contact?.name || 'Unnamed Contact'}</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    {isEditMode ? 'Cancel' : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </>
                    )}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this contact and remove all of their associated data.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteContact}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={actionInProgress === 'delete'}
                        >
                          {actionInProgress === 'delete' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input 
                        value={editedContact?.name || ''} 
                        onChange={(e) => setEditedContact(prev => ({...prev!, name: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number</label>
                      <Input 
                        value={editedContact?.phoneNumber || ''} 
                        onChange={(e) => setEditedContact(prev => ({...prev!, phoneNumber: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input 
                        value={editedContact?.email || ''} 
                        onChange={(e) => setEditedContact(prev => ({...prev!, email: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select 
                        className="w-full p-2 border rounded"
                        value={editedContact?.status || 'active'}
                        onChange={(e) => setEditedContact(prev => ({...prev!, status: e.target.value as 'active' | 'inactive' | 'do-not-call'}))}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="do-not-call">Do Not Call</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea 
                      value={editedContact?.notes || ''} 
                      onChange={(e) => setEditedContact(prev => ({...prev!, notes: e.target.value}))}
                      rows={4}
                    />
                  </div>
                  
                  <div className="pt-4 flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditMode(false)
                        setEditedContact(contact)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Contact Info</div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{contact?.phoneNumber}</span>
                        </div>
                        {contact?.email && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                        <StatusBadge status={contact?.status || 'active'} />
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Tags
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 w-6 p-0"
                            onClick={() => setIsAddTagOpen(true)}
                          >
                            <Plus className="h-3 w-3" />
                            <span className="sr-only">Add tag</span>
                          </Button>
                          
                          <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Add Tag</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Tag Name</label>
                                  <Input 
                                    placeholder="Enter tag name" 
                                    value={newTag} 
                                    onChange={(e) => setNewTag(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={handleAddTag}
                                  disabled={!newTag.trim() || actionInProgress === 'tag'}
                                >
                                  {actionInProgress === 'tag' ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    'Add Tag'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {contact?.tags && contact.tags.length > 0 ? (
                            contact.tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                {tag}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => handleRemoveTag(tag)}
                                  disabled={actionInProgress === tag}
                                >
                                  {actionInProgress === tag ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                  <span className="sr-only">Remove tag</span>
                                </Button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No tags</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Contact History</div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Created: {formatDate(contact?.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Last Contacted: {formatDate(contact?.lastContacted)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span>Call Count: {contact?.callCount || 0}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                        <div className="p-3 bg-muted rounded-md">
                          {contact?.notes || <span className="text-sm text-muted-foreground">No notes</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Custom Fields</h3>
                    </div>
                    {contact?.customFields && Object.keys(contact.customFields).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(contact.customFields).map(([key, value]) => (
                          <div key={key} className="border rounded-md p-3">
                            <div className="text-sm font-medium">{key}</div>
                            <div className="text-sm">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom fields</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Tabs defaultValue="calls">
            <TabsList>
              <TabsTrigger value="calls">Call History</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="calls" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Call History</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadCallHistory}
                      disabled={loadingCalls}
                    >
                      {loadingCalls ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="sr-only">Refresh</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCalls ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : calls.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">No call history found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Recording</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calls.map((call) => (
                          <TableRow key={call.sid}>
                            <TableCell>{formatDate(call.startTime)}</TableCell>
                            <TableCell>
                              <CallStatusBadge status={call.status} />
                            </TableCell>
                            <TableCell>{formatDuration(call.duration)}</TableCell>
                            <TableCell>
                              {call.campaignId ? (
                                <Badge variant="outline">
                                  {call.campaignId}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {call.recordingsCount > 0 ? (
                                <Badge>Available</Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/call-details/${call.sid}`}>
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="campaigns" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  {contact?.campaignIds && contact.campaignIds.length > 0 ? (
                    <div className="space-y-4">
                      {contact.campaignIds.map((campaignId) => (
                        <Card key={campaignId} className="border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Campaign {campaignId}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <Link 
                              href={`/campaigns/${campaignId}`}
                              className="text-sm text-blue-500 hover:underline"
                            >
                              View Campaign
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">Not associated with any campaigns</p>
                      <Button asChild className="mt-4">
                        <Link href="/campaigns/new">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add to New Campaign
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-10">
                    <BarChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Analytics will be shown here soon</p>
                    <p className="text-sm text-muted-foreground">
                      Detailed analytics are being implemented in the next phase
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>
    case 'do-not-call':
      return <Badge variant="destructive">Do Not Call</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Call status badge component
function CallStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Completed</Badge>
    case 'in-progress':
      return <Badge variant="secondary">In Progress</Badge>
    case 'no-answer':
      return <Badge variant="outline">No Answer</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
