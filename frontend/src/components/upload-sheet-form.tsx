"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Upload } from 'lucide-react'

export function UploadSheetForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    sheetId?: string;
    rowCount?: number;
  } | null>(null)

  // Handle file selection
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      // Reset status when a new file is selected
      setUploadStatus(null)
    }
  }

  // Handle form submission
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (!selectedFile) {
      setUploadStatus({
        success: false,
        message: 'Please select a file to upload'
      })
      return
    }
    
    // Check file type
    const fileType = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileType || '')) {
      setUploadStatus({
        success: false,
        message: 'Invalid file type. Please upload a CSV, XLSX, or XLS file.'
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // Here you would actually upload the file
      // For now, simulate a successful upload after a delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simulate a successful response
      setUploadStatus({
        success: true,
        message: 'File uploaded successfully',
        sheetId: 'sheet_' + Date.now(),
        rowCount: Math.floor(Math.random() * 50) + 10 // Random between 10-60 rows
      })
    } catch (error) {
      setUploadStatus({
        success: false,
        message: 'Failed to upload file. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
        <div className="flex flex-col items-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop a spreadsheet file, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Supports CSV, XLSX, and XLS files
          </p>
          
          <input
            id="file-upload"
            name="file"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
          />
          
          <label
            htmlFor="file-upload"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Select File
          </label>
        </div>
      </div>
      
      {selectedFile && (
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm font-medium">Selected File:</p>
          <p className="text-sm">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            Size: {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full"
        disabled={isUploading || !selectedFile}
      >
        {isUploading ? 'Uploading...' : 'Upload Sheet'}
      </Button>
      
      {uploadStatus && (
        <div className={`p-4 rounded-md border ${
          uploadStatus.success ? 'bg-green-50 border-green-200 text-green-700' : 
          'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{uploadStatus.message}</p>
          {uploadStatus.success && (
            <div className="mt-2 text-sm">
              <p>Sheet ID: {uploadStatus.sheetId}</p>
              <p>Row Count: {uploadStatus.rowCount}</p>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
