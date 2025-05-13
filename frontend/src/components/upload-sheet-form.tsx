"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Upload } from 'lucide-react'
import { startCampaignFromCsv } from '@/lib/api'; // Prepare for API call

interface UploadSheetFormProps {
  campaignName?: string;
  agentPrompt?: string;
  firstMessage?: string;
}

export function UploadSheetForm({ campaignName, agentPrompt, firstMessage }: UploadSheetFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    sheetId?: string;
    rowCount?: number;
    // For displaying passed campaign props in simulation
    submittedCampaignName?: string;
    submittedAgentPrompt?: string;
    submittedFirstMessage?: string;
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
    
    // TODO: Add validation for campaignName, agentPrompt, firstMessage if they are required
    // For now, we assume they are passed from the parent if this form is used for campaign creation.

    try {
      const formData = new FormData();
      formData.append('file', selectedFile); // The backend expects 'file' as fieldname

      if (campaignName && agentPrompt && firstMessage) {
        formData.append('campaignName', campaignName);
        formData.append('agentPrompt', agentPrompt);
        formData.append('firstMessage', firstMessage);
      } else {
        // This case should ideally not be hit if button is disabled correctly,
        // but as a fallback if it's just a file upload without campaign context.
        // For now, our primary use case is starting a campaign.
        console.warn('Campaign details not provided for CSV upload.');
        // If we want to support generic file upload later, this path would be different.
      }
      
      // Actual API call
      const response = await startCampaignFromCsv(formData);

      if (response.success) {
        setUploadStatus({
          success: true,
          message: response.message || 'Campaign started successfully from CSV!',
          sheetId: response.data?.campaign?._id || 'N/A', // Use actual campaign ID if available
          rowCount: response.data?.contactsProcessed || 0,
          submittedCampaignName: campaignName,
          submittedAgentPrompt: agentPrompt,
          submittedFirstMessage: firstMessage,
        });
      } else {
        setUploadStatus({
          success: false,
          message: response.error || 'Failed to start campaign from CSV.',
          submittedCampaignName: campaignName, // Keep these for context on error
          submittedAgentPrompt: agentPrompt,
          submittedFirstMessage: firstMessage,
        });
      }

    } catch (error: any) {
      console.error("Error in handleSubmit for CSV campaign:", error);
      setUploadStatus({
        success: false,
        message: error.message || 'An unexpected error occurred. Please try again.'
      });
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
        disabled={
          isUploading ||
          !selectedFile ||
          (!!campaignName && // Check if campaignName is provided (truthy)
            (campaignName.trim().length === 0 || // then check if it's empty
             (agentPrompt?.trim().length || 0) === 0 || // or if agentPrompt is empty
             (firstMessage?.trim().length || 0) === 0) // or if firstMessage is empty
          )
        }
      >
        {isUploading ? (campaignName ? 'Starting Campaign...' : 'Uploading...') : (campaignName ? 'Start Campaign from Sheet' : 'Upload Sheet')}
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
              {uploadStatus.submittedCampaignName && (
                <>
                  <p>Campaign Name: {uploadStatus.submittedCampaignName}</p>
                  <p>Agent Prompt: {uploadStatus.submittedAgentPrompt ? 'Provided' : 'Not Provided'}</p>
                  <p>First Message: {uploadStatus.submittedFirstMessage ? 'Provided' : 'Not Provided'}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
