"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Download, FileDown, Loader2, RefreshCw } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { fetchContacts } from '@/lib/mongodb-contacts'
import { Contact, ContactFilters } from '@/lib/types'

export default function ExportContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [fields, setFields] = useState({
    phoneNumber: true,
    name: true,
    email: true,
    status: true,
    tags: true,
    notes: false,
    lastContacted: false,
    callCount: false
  })
  const [exportFormat, setExportFormat] = useState<string>('csv')
  const { toast } = useToast()

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setLoading(true)
    try {
      const filters: ContactFilters = {}
      
      if (searchQuery) {
        filters.search = searchQuery
      }
      
      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter
      }
      
      if (tagFilter) {
        filters.tags = [tagFilter]
      }
      
      const response = await fetchContacts(filters)
      
      if (response.success && response.data) {
        setContacts(response.data.contacts)
        
        // Extract unique tags from contacts
        const tags = new Set<string>()
        response.data.contacts.forEach(contact => {
          if (contact.tags) {
            contact.tags.forEach(tag => tags.add(tag))
          }
        })
        setAvailableTags(Array.from(tags))
      } else {
        // Use mock data for development
        const mockContacts = Array.from({ length: 50 }, (_, i) => ({
          id: `contact-${i + 1}`,
          name: `Contact ${i + 1}`,
          phoneNumber: `+614${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
          email: i % 3 === 0 ? `contact${i + 1}@example.com` : undefined,
          status: i % 5 === 0 ? 'inactive' : i % 7 === 0 ? 'do-not-call' : 'active',
          tags: i % 2 === 0 ? ['lead'] : i % 3 === 0 ? ['customer', 'premium'] : ['prospect'],
          notes: i % 4 === 0 ? 'Some notes about this contact' : undefined,
          lastContacted: i % 3 === 0 ? new Date().toISOString() : undefined,
          callCount: Math.floor(Math.random() * 5)
        }))
        setContacts(mockContacts)
        
        // Extract unique tags from mock contacts
        const tags = new Set<string>(['lead', 'customer', 'premium', 'prospect'])
        setAvailableTags(Array.from(tags))
      }
    } catch (error) {
      console.error("Error loading contacts:", error)
      toast({
        title: "Error",
        description: "Failed to load contacts. Using sample data.",
        variant: "destructive"
      })
      
      // Use mock data on error
      const mockContacts = Array.from({ length: 50 }, (_, i) => ({
        id: `contact-${i + 1}`,
        name: `Contact ${i + 1}`,
        phoneNumber: `+614${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
        email: i % 3 === 0 ? `contact${i + 1}@example.com` : undefined,
        status: i % 5 === 0 ? 'inactive' : i % 7 === 0 ? 'do-not-call' : 'active',
        tags: i % 2 === 0 ? ['lead'] : i % 3 === 0 ? ['customer', 'premium'] : ['prospect'],
        notes: i % 4 === 0 ? 'Some notes about this contact' : undefined,
        lastContacted: i % 3 === 0 ? new Date().toISOString() : undefined,
        callCount: Math.floor(Math.random() * 5)
      }))
      setContacts(mockContacts)
      
      // Extract unique tags from mock contacts
      const tags = new Set<string>(['lead', 'customer', 'premium', 'prospect'])
      setAvailableTags(Array.from(tags))
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    loadContacts()
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTagFilter('')
    loadContacts()
  }

  const toggleField = (field: keyof typeof fields) => {
    setFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleExport = () => {
    setExportLoading(true)
    
    try {
      // Create CSV or Excel content
      const enabledFields = Object.entries(fields)
        .filter(([_, enabled]) => enabled)
        .map(([field]) => field)
      
      if (enabledFields.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one field to export",
          variant: "destructive"
        })
        setExportLoading(false)
        return
      }
      
      // Build header row
      const headers = enabledFields.map(field => {
        switch (field) {
          case 'phoneNumber':
            return 'Phone Number'
          case 'lastContacted':
            return 'Last Contacted'
          case 'callCount':
            return 'Call Count'
          default:
            return field.charAt(0).toUpperCase() + field.slice(1)
        }
      })
      
      // Build data rows
      const rows = contacts.map(contact => {
        return enabledFields.map(field => {
          const value = contact[field as keyof Contact]
          
          if (field === 'tags' && Array.isArray(value)) {
            return value.join(', ')
          } else if (field === 'lastContacted' && typeof value === 'string') {
            return new Date(value).toLocaleDateString()
          } else {
            return value !== undefined ? String(value) : ''
          }
        })
      })
      
      // Convert to CSV string
      const csvRows = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ]
      const csvContent = csvRows.join('\n')
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export complete",
        description: `Successfully exported ${contacts.length} contacts`
      })
    } catch (error) {
      console.error("Error exporting contacts:", error)
      toast({
        title: "Error",
        description: "Failed to export contacts",
        variant: "destructive"
      })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          heading="Export Contacts"
          text="Export your contacts to CSV or Excel"
        />
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Filter Contacts</CardTitle>
            <CardDescription>
              Select which contacts to include in the export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="flex space-x-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="do-not-call">Do Not Call</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={tagFilter}
                  onValueChange={setTagFilter}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Tags</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
              <Button onClick={applyFilters} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Apply Filters'
                )}
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <p className="font-medium mb-2">Export Summary</p>
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                ) : (
                  `${contacts.length} contacts will be exported`
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Configure the export format and fields
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={setExportFormat}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV File</SelectItem>
                  <SelectItem value="excel">Excel File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fields to Export</Label>
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="phoneNumber" 
                    checked={fields.phoneNumber} 
                    onCheckedChange={() => toggleField('phoneNumber')}
                  />
                  <Label htmlFor="phoneNumber" className="cursor-pointer">Phone Number</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="name" 
                    checked={fields.name} 
                    onCheckedChange={() => toggleField('name')}
                  />
                  <Label htmlFor="name" className="cursor-pointer">Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email" 
                    checked={fields.email} 
                    onCheckedChange={() => toggleField('email')}
                  />
                  <Label htmlFor="email" className="cursor-pointer">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status" 
                    checked={fields.status} 
                    onCheckedChange={() => toggleField('status')}
                  />
                  <Label htmlFor="status" className="cursor-pointer">Status</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tags" 
                    checked={fields.tags} 
                    onCheckedChange={() => toggleField('tags')}
                  />
                  <Label htmlFor="tags" className="cursor-pointer">Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notes" 
                    checked={fields.notes} 
                    onCheckedChange={() => toggleField('notes')}
                  />
                  <Label htmlFor="notes" className="cursor-pointer">Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="lastContacted" 
                    checked={fields.lastContacted} 
                    onCheckedChange={() => toggleField('lastContacted')}
                  />
                  <Label htmlFor="lastContacted" className="cursor-pointer">Last Contacted</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="callCount" 
                    checked={fields.callCount} 
                    onCheckedChange={() => toggleField('callCount')}
                  />
                  <Label htmlFor="callCount" className="cursor-pointer">Call Count</Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={handleExport}
              disabled={loading || exportLoading}
            >
              {exportLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Contacts
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
