"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Upload } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { startCampaignFromCsv } from '@/lib/api'; // Prepare for API call

interface UploadSheetFormProps {
  campaignName?: string;
  agentPrompt?: string;
  firstMessage?: string;
}

export function UploadSheetForm({ campaignName, agentPrompt, firstMessage }: UploadSheetFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [callInterval, setCallInterval] = useState(60) // Default 60 seconds (max allowed)
  const [validatePhoneNumbers, setValidatePhoneNumbers] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    sheetId?: string;
    rowCount?: number;
    // For displaying passed campaign props in simulation
    submittedCampaignName?: string;
    submittedAgentPrompt?: string;
    submittedFirstMessage?: string;
    invalidNumbers?: number;
    invalidNumbersList?: Array<{name: string; phone: string; reason: string}>;
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

      // Append campaign details if campaignName prop is present (even if empty, parent handles state)
      // The backend will use defaults for empty agentPrompt or firstMessage.
      // CampaignName itself is validated by the button's disabled state and backend.
      if (campaignName !== undefined) {
        formData.append('campaignName', campaignName); // Will be at least an empty string if prop is passed
        formData.append('agentPrompt', agentPrompt || ''); // Send empty string if undefined/null
        formData.append('firstMessage', firstMessage || ''); // Send empty string if undefined/null
        formData.append('callInterval', (callInterval * 1000).toString()); // Convert seconds to milliseconds
        formData.append('validatePhoneNumbers', validatePhoneNumbers.toString());
      } else {
         // This block would be for a generic file upload not tied to a campaign,
         // which is not the current use case for this form in make-call/page.tsx
        console.warn('UploadSheetForm used without campaign context.');
      }
      
      // Actual API call
      const response = await startCampaignFromCsv(formData);

      if (response.success) {
        setUploadStatus({
          success: true,
          message: response.message || 'Campaign started successfully from CSV!',
          sheetId: response.data?.campaignId || 'N/A', // Use actual campaign ID if available
          rowCount: response.data?.totalContacts || 0,
          submittedCampaignName: campaignName,
          submittedAgentPrompt: agentPrompt,
          submittedFirstMessage: firstMessage,
          invalidNumbers: response.data?.invalidNumbers || 0,
          invalidNumbersList: response.data?.invalidNumbersList || []
        });
      } else {
        setUploadStatus({
          success: false,
          message: response.error || 'Failed to start campaign from CSV.',
          submittedCampaignName: campaignName, // Keep these for context on error
          submittedAgentPrompt: agentPrompt,
          submittedFirstMessage: firstMessage,
          invalidNumbers: (response as any).invalidNumbers || 0,
          invalidNumbersList: (response as any).invalidNumbersList || []
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
      
      {/* Call Configuration Options */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="call-interval">
            Call Interval (seconds between calls)
          </Label>
          <Input
            id="call-interval"
            type="number"
            min="30"
            max="60"
            value={callInterval}
            onChange={(e) => setCallInterval(parseInt(e.target.value) || 60)}
            placeholder="60"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Time between calls: 30-60 seconds. Default: 60 seconds.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="validate-phone"
            checked={validatePhoneNumbers}
            onCheckedChange={setValidatePhoneNumbers}
          />
          <Label htmlFor="validate-phone" className="cursor-pointer">
            Validate phone numbers before calling
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, invalid phone numbers will be filtered out and reported. 
          Numbers without country codes will default to Australian (+61).
        </p>
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={
          isUploading ||
          !selectedFile ||
          // If campaignName is passed (even as empty string), it means we are in "start campaign" mode.
          // In this mode, campaignName itself must be filled. AgentPrompt and FirstMessage are optional.
          (campaignName !== undefined && campaignName.trim().length === 0)
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
              <p>Campaign ID: {uploadStatus.sheetId}</p>
              <p>Valid Contacts: {uploadStatus.rowCount}</p>
              {uploadStatus.invalidNumbers && uploadStatus.invalidNumbers > 0 && (
                <p>Invalid Numbers Filtered: {uploadStatus.invalidNumbers}</p>
              )}
              {uploadStatus.submittedCampaignName && (
                <>
                  <p>Campaign Name: {uploadStatus.submittedCampaignName}</p>
                  <p>Agent Prompt: {uploadStatus.submittedAgentPrompt ? 'Provided' : 'Not Provided'}</p>
                  <p>First Message: {uploadStatus.submittedFirstMessage ? 'Provided' : 'Not Provided'}</p>
                </>
              )}
            </div>
          )}
          {uploadStatus.invalidNumbersList && uploadStatus.invalidNumbersList.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm cursor-pointer underline">
                View invalid numbers ({uploadStatus.invalidNumbersList.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {uploadStatus.invalidNumbersList.map((invalid, idx) => (
                  <div key={idx} className="text-xs py-1 border-b last:border-0">
                    <span className="font-medium">{invalid.name}</span>: {invalid.phone} - 
                    <span className="italic"> {invalid.reason}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </form>
  )
}
