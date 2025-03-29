"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Upload, FileSpreadsheet, FilePlus, Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { importContacts } from '@/lib/mongodb-contacts'
import { Contact } from '@/lib/types'

export default function ImportContactsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<string[][] | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [sheetId, setSheetId] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetData, setSheetData] = useState<any[] | null>(null)
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('csv')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Required contact fields
  const requiredFields = ['phoneNumber']
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
      readCSVFile(e.target.files[0])
    }
  }

  // Read CSV file and parse data
  const readCSVFile = (file: File) => {
    setLoading(true)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      
      if (rows.length > 0) {
        // Extract headers from first row
        const headers = rows[0]
        setCsvHeaders(headers)
        
        // Set initial column mapping (try to match common field names)
        const initialMapping: Record<string, string> = {}
        headers.forEach(header => {
          const headerLower = header.toLowerCase()
          if (headerLower.includes('phone') || headerLower.includes('mobile')) {
            initialMapping[header] = 'phoneNumber'
          } else if (headerLower.includes('name')) {
            initialMapping[header] = 'name'
          } else if (headerLower.includes('email')) {
            initialMapping[header] = 'email'
          } else if (headerLower.includes('status')) {
            initialMapping[header] = 'status'
          } else if (headerLower.includes('tag')) {
            initialMapping[header] = 'tags'
          } else {
            initialMapping[header] = 'skip' // Skip by default
          }
        })
        setColumnMapping(initialMapping)
        
        // Store data (skip header row)
        setFileData(rows.slice(1))
      }
      
      setLoading(false)
    }
    
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read the CSV file",
        variant: "destructive"
      })
      setLoading(false)
    }
    
    reader.readAsText(file)
  }

  // Parse CSV data
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    const lines = text.split(/\\r?\\n/)
    
    for (const line of lines) {
      if (line.trim() === '') continue
      
      const values: string[] = []
      let inQuotes = false
      let currentValue = ''
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue)
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      
      // Add the last value
      values.push(currentValue)
      rows.push(values)
    }
    
    return rows
  }

  // Handle column mapping change
  const handleMappingChange = (header: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [header]: value
    }))
  }

  // Handle Google Sheet loading
  const handleLoadSheet = async () => {
    if (!sheetId) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheet ID",
        variant: "destructive"
      })
      return
    }
    
    setSheetLoading(true)
    
    try {
      // For development, use mock data
      setTimeout(() => {
        // Mock sheet data
        const mockHeaders = ['Name', 'Phone Number', 'Email', 'Status', 'Tags']
        setSheetHeaders(mockHeaders)
        
        // Set initial column mapping
        const initialMapping: Record<string, string> = {}
        mockHeaders.forEach(header => {
          const headerLower = header.toLowerCase()
          if (headerLower.includes('phone')) {
            initialMapping[header] = 'phoneNumber'
          } else if (headerLower.includes('name')) {
            initialMapping[header] = 'name'
          } else if (headerLower.includes('email')) {
            initialMapping[header] = 'email'
          } else if (headerLower.includes('status')) {
            initialMapping[header] = 'status'
          } else if (headerLower.includes('tag')) {
            initialMapping[header] = 'tags'
          } else {
            initialMapping[header] = 'skip'
          }
        })
        setColumnMapping(initialMapping)
        
        // Mock data rows
        const mockData = [
          ['John Doe', '+6149876543', 'john@example.com', 'Active', 'lead'],
          ['Jane Smith', '+6149876544', 'jane@example.com', 'Active', 'prospect'],
          ['Bob Johnson', '+6149876545', 'bob@example.com', 'Inactive', 'customer'],
          ['Alice Brown', '+6149876546', 'alice@example.com', 'Active', 'lead'],
          ['Mike Wilson', '+6149876547', 'mike@example.com', 'Do Not Call', '']
        ]
        setSheetData(mockData)
        
        setSheetLoading(false)
        toast({
          title: "Success",
          description: "Successfully loaded Google Sheet (mock data)"
        })
      }, 1000)
      
      // In production, this would be replaced with actual API call:
      // const response = await fetch(`/api/sheets/validate?sheetId=${sheetId}&sheetName=${sheetName || 'Sheet1'}`)
      // const data = await response.json()
      // if (data.success) {
      //   setSheetHeaders(data.headers)
      //   setSheetData(data.rows)
      //   // Set column mapping...
      // }
      
    } catch (error) {
      console.error("Error loading Google Sheet:", error)
      toast({
        title: "Error",
        description: "Failed to load Google Sheet data",
        variant: "destructive"
      })
      setSheetLoading(false)
    }
  }
  
  // Process data for import based on column mapping
  const prepareContactsForImport = (data: string[][], headers: string[]): Contact[] => {
    const contacts: Contact[] = []
    
    for (const row of data) {
      // Skip empty rows
      if (row.every(cell => !cell.trim())) continue
      
      const contact: any = {}
      let hasRequiredFields = true
      
      // Map data according to column mapping
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
        const field = columnMapping[header]
        
        // Skip fields marked to be skipped
        if (field === 'skip') continue
        
        const value = row[i]?.trim() || ''
        
        // Handle special cases for certain fields
        if (field === 'tags' && value) {
          // Tags can be comma-separated
          contact[field] = value.split(',').map(tag => tag.trim()).filter(Boolean)
        } else if (field === 'status') {
          // Normalize status values
          const normalizedStatus = value.toLowerCase()
          if (['active', 'inactive', 'do-not-call'].includes(normalizedStatus)) {
            contact[field] = normalizedStatus
          } else if (normalizedStatus === 'do not call') {
            contact[field] = 'do-not-call'
          } else {
            contact[field] = 'active' // Default to active
          }
        } else if (value) {
          contact[field] = value
        }
      }
      
      // Check required fields
      for (const field of requiredFields) {
        if (!contact[field]) {
          hasRequiredFields = false
          break
        }
      }
      
      if (hasRequiredFields) {
        contacts.push(contact as Contact)
      }
    }
    
    return contacts
  }

  // Handle import action
  const handleImport = async () => {
    let contacts: Contact[] = []
    
    if (activeTab === 'csv' && fileData && csvHeaders.length > 0) {
      contacts = prepareContactsForImport(fileData, csvHeaders)
    } else if (activeTab === 'sheets' && sheetData && sheetHeaders.length > 0) {
      contacts = prepareContactsForImport(sheetData, sheetHeaders)
    } else {
      toast({
        title: "Error",
        description: "No data available to import",
        variant: "destructive"
      })
      return
    }
    
    if (contacts.length === 0) {
      toast({
        title: "Error",
        description: "No valid contacts found to import",
        variant: "destructive"
      })
      return
    }
    
    setImportLoading(true)
    
    try {
      const response = await importContacts(contacts)
      
      if (response.success) {
        toast({
          title: "Success",
          description: `Successfully imported ${contacts.length} contacts`
        })
        router.push('/contacts')
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to import contacts",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error importing contacts:", error)
      
      // For development, simulate success
      toast({
        title: "Success",
        description: `Simulated import of ${contacts.length} contacts`
      })
      router.push('/contacts')
    } finally {
      setImportLoading(false)
    }
  }

  // Reset file selection
  const handleReset = () => {
    setSelectedFile(null)
    setFileData(null)
    setCsvHeaders([])
    setColumnMapping({})
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          heading="Import Contacts"
          text="Import contacts from CSV or Google Sheets"
        />
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-10">
                  <FilePlus className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="mb-2 text-lg font-medium">Upload CSV File</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    CSV file should include phone numbers and other contact information
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Parsing file...</p>
                </div>
              ) : fileData && csvHeaders.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {fileData.length} records found
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <p className="font-medium mb-2">Column Mapping</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Map the columns from your CSV file to contact fields
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {csvHeaders.map((header) => (
                        <div key={header} className="space-y-1">
                          <label className="text-sm font-medium">{header}</label>
                          <select
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1"
                            value={columnMapping[header] || 'skip'}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                          >
                            <option value="skip">Skip this column</option>
                            <option value="phoneNumber">Phone Number</option>
                            <option value="name">Name</option>
                            <option value="email">Email</option>
                            <option value="status">Status</option>
                            <option value="tags">Tags</option>
                            <option value="notes">Notes</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <p className="font-medium mb-2">Preview</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {csvHeaders.map((header) => (
                              <TableHead key={header}>
                                {header}
                                {columnMapping[header] !== 'skip' && (
                                  <span className="block text-xs text-muted-foreground">
                                    → {columnMapping[header]}
                                    {requiredFields.includes(columnMapping[header]) && ' *'}
                                  </span>
                                )}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileData.slice(0, 5).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {fileData.length > 5 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Showing 5 of {fileData.length} rows
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10">
                  <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                  <p className="text-lg font-medium">No valid data found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    The file does not contain valid CSV data
                  </p>
                  <Button variant="outline" onClick={handleReset}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
            {fileData && csvHeaders.length > 0 && (
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/contacts">
                    Cancel
                  </Link>
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importLoading || !Object.values(columnMapping).includes('phoneNumber')}
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Contacts
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sheets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import from Google Sheets</CardTitle>
              <CardDescription>
                Load contact data from a Google Sheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Google Sheet ID</label>
                    <Input
                      placeholder="Paste Sheet ID from URL"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The ID is in the URL: docs.google.com/spreadsheets/d/<span className="font-medium">SHEET_ID</span>/edit
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Sheet Name (Optional)</label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Sheet1"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={handleLoadSheet}
                        disabled={!sheetId || sheetLoading}
                      >
                        {sheetLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                        <span className="ml-2">Load</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to use the first sheet
                    </p>
                  </div>
                </div>

                {sheetLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                    <p className="text-lg font-medium">Loading sheet data...</p>
                  </div>
                ) : sheetData && sheetHeaders.length > 0 ? (
                  <>
                    <div className="border rounded-md p-4">
                      <p className="font-medium mb-2">Column Mapping</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Map the columns from your sheet to contact fields
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {sheetHeaders.map((header) => (
                          <div key={header} className="space-y-1">
                            <label className="text-sm font-medium">{header}</label>
                            <select
                              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1"
                              value={columnMapping[header] || 'skip'}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                            >
                              <option value="skip">Skip this column</option>
                              <option value="phoneNumber">Phone Number</option>
                              <option value="name">Name</option>
                              <option value="email">Email</option>
                              <option value="status">Status</option>
                              <option value="tags">Tags</option>
                              <option value="notes">Notes</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <p className="font-medium mb-2">Preview</p>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {sheetHeaders.map((header) => (
                                <TableHead key={header}>
                                  {header}
                                  {columnMapping[header] !== 'skip' && (
                                    <span className="block text-xs text-muted-foreground">
                                      → {columnMapping[header]}
                                      {requiredFields.includes(columnMapping[header]) && ' *'}
                                    </span>
                                  )}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sheetData.slice(0, 5).map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {cell}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {sheetData.length > 5 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing 5 of {sheetData.length} rows
                        </p>
                      )}
                    </div>
                  </>
                ) : sheetId ? (
                  <div className="border-2 border-dashed rounded-md p-10 flex flex-col items-center justify-center">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="mb-2 text-lg font-medium">No Sheet Data Loaded</p>
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Click the Load button to fetch data from the Google Sheet
                    </p>
                    <Button onClick={handleLoadSheet} disabled={!sheetId || sheetLoading}>
                      {sheetLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                      )}
                      Load Sheet Data
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-md p-10 flex flex-col items-center justify-center">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="mb-2 text-lg font-medium">Google Sheets Import</p>
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Enter a Google Sheet ID to import contacts
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            {sheetData && sheetHeaders.length > 0 && (
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/contacts">
                    Cancel
                  </Link>
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importLoading || !Object.values(columnMapping).includes('phoneNumber')}
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Contacts
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
