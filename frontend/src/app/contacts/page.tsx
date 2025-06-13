"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { fetchContacts, deleteContact, addTagsToContact, bulkDeleteContacts } from '@/lib/mongodb-contacts'
import { Contact, ContactFilters } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Tag,
  Trash2,
  RefreshCw,
  UserPlus,
  Calendar,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlarmClock
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [isNewTagDialogOpen, setIsNewTagDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)
  const { toast } = useToast()
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Load contacts when filters change
  useEffect(() => {
    loadContacts()
  }, [debouncedSearchQuery, statusFilter, currentPage])
  
  const loadContacts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Prepare filters
      const filters: ContactFilters = {}
      
      if (debouncedSearchQuery) {
        filters.search = debouncedSearchQuery
      }
      
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter
      }
      
      // Fetch contacts with pagination (increased from 10 to 20 for better UX)
      const response = await fetchContacts(filters, currentPage, 20)
      
      if (response.success && response.data) {
        setContacts(response.data.contacts)
        setTotalPages(response.data.pagination.pages)
        setTotalContacts(response.data.pagination.total)
      } else {
        setError(response.error || 'Failed to load contacts')
        setContacts([])
        setTotalPages(0)
        setTotalContacts(0)
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
      setError('An unexpected error occurred')
      setContacts([])
      setTotalPages(0)
      setTotalContacts(0)
    } finally {
      setLoading(false)
    }
  }
  // Handle contact selection
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }, [])
  
  // Handle "select all" checkbox
  const toggleSelectAll = useCallback(() => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(contact => contact.id!))
    }
  }, [selectedContacts.length, contacts])
  
  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Clear selection when changing pages to avoid confusion
      setSelectedContacts([])
    }
  }, [totalPages])
  
  // Handle contact deletion
  const handleDeleteContact = async (contactId: string) => {
    setActionInProgress(true)
    
    try {
      const response = await deleteContact(contactId)
      
      if (response.success) {
        // Remove the contact from the list
        setContacts(prev => prev.filter(c => c.id !== contactId))
        
        toast({
          title: "Contact deleted",
          description: "The contact has been successfully deleted."
        })
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
      setActionInProgress(false)
    }
  }
  
  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return
    
    setActionInProgress(true)
    
    try {
      // Use the bulk delete API endpoint
      const response = await bulkDeleteContacts(selectedContacts)
      
      if (response.success && response.data) {
        const { success: successCount, failed: failedCount } = response.data
        
        if (successCount > 0) {
          // Remove deleted contacts from the list
          setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id!)))
          
          // Clear selected contacts
          setSelectedContacts([])
          
          // Reload the current page to get updated pagination
          await loadContacts()
          
          if (failedCount === 0) {
            toast({
              title: "Contacts deleted",
              description: `Successfully deleted ${successCount} contacts.`
            })
          } else {
            toast({
              title: "Partial success",
              description: `Deleted ${successCount} contacts. ${failedCount} failed.`,
              variant: "default"
            })
          }
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to delete the selected contacts",
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete the selected contacts",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error deleting contacts:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setActionInProgress(false)
    }
  }
  
  // Handle adding a tag to selected contacts
  const handleAddTag = async () => {
    if (selectedContacts.length === 0 || !newTag.trim()) return
    
    setActionInProgress(true)
    
    try {
      // In a real implementation, use a bulk update API endpoint
      // For now, update contacts one by one
      const promises = selectedContacts.map(id => addTagsToContact(id, [newTag]))
      const results = await Promise.all(promises)
      
      const successCount = results.filter(r => r.success).length
      
      if (successCount > 0) {
        // Update contacts with new tag
        setContacts(prev => prev.map(contact => {
          if (selectedContacts.includes(contact.id!)) {
            const tags = [...(contact.tags || []), newTag]
            // Remove duplicates
            return { ...contact, tags: Array.from(new Set(tags)) }
          }
          return contact
        }))
        
        toast({
          title: "Tag added",
          description: `Added tag "${newTag}" to ${successCount} contacts.`
        })
        
        // Close dialog and reset tag
        setIsNewTagDialogOpen(false)
        setNewTag('')
      } else {
        toast({
          title: "Error",
          description: "Failed to add tag to the selected contacts",
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
      setActionInProgress(false)
    }
  }
  
  // Format date string
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    
    // If date is today, show time
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    // If date is this year, show month and day
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  }
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Contacts"
          description={`Manage your contact database (${totalContacts} contacts)`}
        />
        <Button asChild>
          <Link href="/contacts/new">
            <UserPlus className="mr-2 h-4 w-4" />
            New Contact
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="do-not-call">Do Not Call</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadContacts} disabled={loading}>
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span>{selectedContacts.length} contacts selected</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Add to Campaign */}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/campaigns/bulk-add?contacts=${selectedContacts.join(',')}`}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Add to Campaign
                </Link>
              </Button>
              
              {/* Add Tag */}
              <Dialog open={isNewTagDialogOpen} onOpenChange={setIsNewTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Tag className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Tag to Selected Contacts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tag Name</label>
                      <Input 
                        placeholder="Enter tag name" 
                        value={newTag} 
                        onChange={(e) => setNewTag(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleAddTag} 
                      disabled={!newTag.trim() || actionInProgress} 
                      className="w-full"
                    >
                      {actionInProgress ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Tag className="h-4 w-4 mr-2" />
                      )}
                      Add Tag
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Schedule Call */}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/make-call?contacts=${selectedContacts.join(',')}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Call
                </Link>
              </Button>
              
              {/* Delete Selected */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the {selectedContacts.length} selected contacts and remove them from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      {actionInProgress ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Contacts Table */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle>Contact List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-60">
              <XCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-lg font-medium text-center">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4" 
                onClick={loadContacts}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60">
              <p className="text-lg font-medium text-center">No contacts found</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Try adjusting your search or filters
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4" 
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setCurrentPage(1)
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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
                        checked={selectedContacts.length === contacts.length && contacts.length > 0} 
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all contacts"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedContacts.includes(contact.id!)} 
                          onCheckedChange={() => toggleContactSelection(contact.id!)}
                          aria-label={`Select ${contact.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/contacts/${contact.id}`} 
                          className="hover:underline"
                        >
                          {contact.name || 'Unnamed Contact'}
                        </Link>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground">
                            {contact.email}
                          </div>
                        )}
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
                      <TableCell>
                        {contact.lastContacted ? (
                          <div className="flex items-center">
                            <AlarmClock className="h-3 w-3 mr-1 text-muted-foreground" />
                            {formatDate(contact.lastContacted)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.callCount || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/contacts/${contact.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">View details</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && !error && contacts.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Import/Export Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle>Import Contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center py-4">
            <p className="text-sm text-muted-foreground">
              Import contacts from CSV file or Google Sheets
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/contacts/import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle>Export Contacts</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center py-4">
            <p className="text-sm text-muted-foreground">
              Export your contacts to CSV or Excel format
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/contacts/export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Link>
            </Button>
          </CardContent>
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
