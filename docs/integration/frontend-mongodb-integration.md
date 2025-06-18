# Frontend MongoDB Integration Guide

This guide explains how to integrate the frontend dashboard with the MongoDB database. The frontend is already designed, but it's currently using mock data instead of real data from MongoDB.

## Key Files to Update

1. **API Client Files**:
   - `/src/lib/api.ts` - Main API client
   - `/src/lib/mongodb-api.ts` - MongoDB-specific API client
   - `/src/lib/api-enhanced.ts` - Enhanced API client with additional functionality

2. **Socket.IO Context**:
   - `/src/lib/socket-context.tsx` - Socket.IO context for real-time updates

3. **Data Types**:
   - `/src/lib/types.ts` - TypeScript interfaces for data models

## Implementation Steps

### 1. MongoDB API Integration

The `mongodb-api.ts` file should be updated to use the MongoDB API endpoints. The current file appears to be in a binary format, so it needs to be recreated with the following implementation:

```typescript
// Update /src/lib/mongodb-api.ts
import { Call, Campaign, Contact, Recording, Transcript } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Call-related API endpoints
 */
export const callsApi = {
  getCalls: async (params?: any): Promise<{ calls: Call[], pagination: any }> => {
    const urlParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/calls?${urlParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch calls');
    }
    
    return response.json();
  },
  
  getCall: async (callSid: string): Promise<Call> => {
    const response = await fetch(`${API_BASE_URL}/api/calls/${callSid}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch call');
    }
    
    return response.json();
  },
  
  makeCall: async (data: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to make call');
    }
    
    return response.json();
  },
  
  terminateCall: async (callSid: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/terminate-call/${callSid}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to terminate call');
    }
    
    return response.json();
  }
};

/**
 * Recording-related API endpoints
 */
export const recordingsApi = {
  getRecordings: async (params?: any): Promise<{ recordings: Recording[], pagination: any }> => {
    const urlParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/recordings?${urlParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recordings');
    }
    
    return response.json();
  },
  
  getRecording: async (recordingSid: string): Promise<Recording> => {
    const response = await fetch(`${API_BASE_URL}/api/recordings/${recordingSid}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recording');
    }
    
    return response.json();
  },
  
  getCallRecordings: async (callSid: string): Promise<Recording[]> => {
    const response = await fetch(`${API_BASE_URL}/api/calls/${callSid}/recordings`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch call recordings');
    }
    
    return response.json();
  }
};

/**
 * Transcript-related API endpoints
 */
export const transcriptsApi = {
  getTranscript: async (callSid: string): Promise<Transcript> => {
    const response = await fetch(`${API_BASE_URL}/api/calls/${callSid}/transcript`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch transcript');
    }
    
    return response.json();
  }
};

/**
 * Campaign-related API endpoints
 */
export const campaignsApi = {
  getCampaigns: async (params?: any): Promise<{ campaigns: Campaign[], pagination: any }> => {
    const urlParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/campaigns?${urlParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch campaigns');
    }
    
    return response.json();
  },
  
  getCampaign: async (campaignId: string): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch campaign');
    }
    
    return response.json();
  },
  
  createCampaign: async (data: any): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create campaign');
    }
    
    return response.json();
  },
  
  updateCampaign: async (campaignId: string, data: any): Promise<Campaign> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update campaign');
    }
    
    return response.json();
  },
  
  deleteCampaign: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete campaign');
    }
    
    return response.json();
  },
  
  startCampaign: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/start`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to start campaign');
    }
    
    return response.json();
  },
  
  pauseCampaign: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/pause`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to pause campaign');
    }
    
    return response.json();
  },
  
  resumeCampaign: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/resume`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to resume campaign');
    }
    
    return response.json();
  },
  
  stopCampaign: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/stop`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to stop campaign');
    }
    
    return response.json();
  }
};

/**
 * Contact-related API endpoints
 */
export const contactsApi = {
  getContacts: async (params?: any): Promise<{ contacts: Contact[], pagination: any }> => {
    const urlParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/contacts?${urlParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }
    
    return response.json();
  },
  
  getContact: async (contactId: string): Promise<Contact> => {
    const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch contact');
    }
    
    return response.json();
  },
  
  createContact: async (data: any): Promise<Contact> => {
    const response = await fetch(`${API_BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create contact');
    }
    
    return response.json();
  },
  
  updateContact: async (contactId: string, data: any): Promise<Contact> => {
    const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update contact');
    }
    
    return response.json();
  },
  
  deleteContact: async (contactId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/contacts/${contactId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete contact');
    }
    
    return response.json();
  },
  
  importContacts: async (file: File, campaignId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (campaignId) {
      formData.append('campaignId', campaignId);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/import`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to import contacts');
    }
    
    return response.json();
  },
  
  importContactsFromSheet: async (sheetId: string, sheetName: string, campaignId?: string): Promise<any> => {
    const data = {
      sheetId,
      sheetName,
      campaignId
    };
    
    const response = await fetch(`${API_BASE_URL}/api/contacts/import-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to import contacts from sheet');
    }
    
    return response.json();
  }
};

/**
 * Analytics-related API endpoints
 */
export const analyticsApi = {
  getDashboardStats: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    
    return response.json();
  },
  
  getCallStats: async (params?: any): Promise<any> => {
    const urlParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/analytics/calls?${urlParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch call stats');
    }
    
    return response.json();
  },
  
  getCampaignStats: async (campaignId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/analytics/campaigns/${campaignId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch campaign stats');
    }
    
    return response.json();
  }
};

// Export all API endpoints
export default {
  calls: callsApi,
  recordings: recordingsApi,
  transcripts: transcriptsApi,
  campaigns: campaignsApi,
  contacts: contactsApi,
  analytics: analyticsApi
};
```

### 2. Google Sheets Integration in the Upload Form

Update the `upload-sheet-form.tsx` component to use the actual MongoDB API:

```tsx
// Update /src/components/upload-sheet-form.tsx
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Upload } from 'lucide-react'
import { contactsApi } from '@/lib/mongodb-api'

export function UploadSheetForm({ campaignId, onSuccess }) {
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
      // Use the MongoDB API to import contacts
      const result = await contactsApi.importContacts(selectedFile, campaignId);
      
      // Handle success
      setUploadStatus({
        success: true,
        message: `File uploaded successfully: ${result.created} created, ${result.updated} updated`,
        rowCount: result.total
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result);
      }
    } catch (error) {
      setUploadStatus({
        success: false,
        message: error.message || 'Failed to upload file. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Alternative for Google Sheets ID direct input
  const [sheetId, setSheetId] = useState('')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [isProcessingSheet, setIsProcessingSheet] = useState(false)
  
  // Handle Google Sheet submission
  async function handleSheetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (!sheetId) {
      setUploadStatus({
        success: false,
        message: 'Please enter a Google Sheet ID'
      })
      return
    }
    
    setIsProcessingSheet(true)
    
    try {
      // Use the MongoDB API to import contacts from Google Sheet
      const result = await contactsApi.importContactsFromSheet(sheetId, sheetName, campaignId);
      
      // Handle success
      setUploadStatus({
        success: true,
        message: `Sheet imported successfully: ${result.created} created, ${result.updated} updated`,
        sheetId: sheetId,
        rowCount: result.total
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result);
      }
    } catch (error) {
      setUploadStatus({
        success: false,
        message: error.message || 'Failed to process Google Sheet. Please try again.'
      })
    } finally {
      setIsProcessingSheet(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* File upload form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium">Upload contact file</h3>
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
          {isUploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </form>
      
      {/* Google Sheet ID form */}
      <div className="border-t pt-6">
        <form onSubmit={handleSheetSubmit} className="space-y-4">
          <h3 className="text-lg font-medium">Import from Google Sheet</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="sheetId" className="block text-sm font-medium mb-1">
                Google Sheet ID
              </label>
              <input
                id="sheetId"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter Google Sheet ID"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
              </p>
            </div>
            
            <div>
              <label htmlFor="sheetName" className="block text-sm font-medium mb-1">
                Sheet Name
              </label>
              <input
                id="sheetName"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Sheet1"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default is "Sheet1"
              </p>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isProcessingSheet || !sheetId}
            variant="outline"
          >
            {isProcessingSheet ? 'Processing...' : 'Import from Google Sheet'}
          </Button>
        </form>
      </div>
      
      {/* Status message */}
      {uploadStatus && (
        <div className={`p-4 rounded-md border ${
          uploadStatus.success ? 'bg-green-50 border-green-200 text-green-700' : 
          'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p>{uploadStatus.message}</p>
          {uploadStatus.success && (
            <div className="mt-2 text-sm">
              {uploadStatus.sheetId && <p>Sheet ID: {uploadStatus.sheetId}</p>}
              {uploadStatus.rowCount && <p>Row Count: {uploadStatus.rowCount}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### 3. Socket.IO Integration with MongoDB Events

The existing Socket.IO context implementation already has a good structure, but it needs to be updated to handle MongoDB-specific events:

```tsx
// Update the handleCallStatusChange function in socket-context.tsx
const handleCallStatusChange = (callSid: string, newStatus: string, callInfo: any) => {
  // Update the calls map with the new status
  const updatedCalls = new Map(calls);
  const existingCall = updatedCalls.get(callSid);
  
  if (existingCall) {
    updatedCalls.set(callSid, { ...existingCall, status: newStatus, ...callInfo });
  } else {
    updatedCalls.set(callSid, { sid: callSid, status: newStatus, ...callInfo });
  }
  
  setCalls(updatedCalls);
  
  // Update the activeCalls count and recent calls list
  const activeSids = Array.from(updatedCalls.values())
    .filter(call => ['initiated', 'ringing', 'in-progress'].includes(call.status))
    .map(call => call.sid);
  
  setActiveCalls(activeSids);
  
  // Update the recent calls list (include completed and failed calls)
  const recentCallsList = Array.from(updatedCalls.values())
    .filter(call => call.status)
    .sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return bTime - aTime; // Most recent first
    })
    .slice(0, 10); // Keep only most recent 10 calls
  
  setRecentCalls(recentCallsList);
  
  // Emit event for any components listening for specific calls
  emitEvent(`call:${callSid}:status`, { status: newStatus, callInfo });
};
```

### 4. Create an API Endpoint Route for Google Sheets Integration

Finally, we need to add an API endpoint to handle the Google Sheets integration on the server side:

```javascript
// Add this to api-routes.js
// API endpoint for importing contacts from Google Sheets
server.post('/api/contacts/import-sheet', async (request, reply) => {
  try {
    const { sheetId, sheetName = 'Sheet1', campaignId } = request.body;
    
    if (!sheetId) {
      return reply.code(400).send({ error: 'Sheet ID is required' });
    }
    
    // Execute the sheet-call.js functionality but return the results instead of making calls
    const { google } = require('googleapis');
    const fs = require('fs/promises');
    const path = require('path');
    
    // Set up Google Sheets API
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    const tokenPath = path.join(process.cwd(), 'token.json');
    
    try {
      await fs.access(credentialsPath);
      await fs.access(tokenPath);
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Google Sheets authentication failed',
        details: 'credentials.json or token.json file not found'
      });
    }
    
    // Read credentials and token files
    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    const token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
    
    // Set up OAuth2 client
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    
    // Initialize Sheets API
    const sheetsApi = google.sheets({ version: 'v4', auth: oAuth2Client });
    
    // Get sheet data
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return reply.code(400).send({ error: 'No data found in the spreadsheet' });
    }
    
    // Extract header row and find required column indices
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const phoneIndex = headers.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile');
    const nameIndex = headers.findIndex(h => h === 'name' || h === 'contact name' || h === 'full name');
    const emailIndex = headers.findIndex(h => h === 'email');
    
    if (phoneIndex === -1) {
      return reply.code(400).send({ 
        error: 'Phone number column not found',
        details: 'Please make sure your spreadsheet has a column named "Phone", "Phone Number", or "Mobile"'
      });
    }
    
    // Process data rows (skip header)
    const contacts = rows.slice(1)
      .filter(row => row.length > phoneIndex && row[phoneIndex]) // Ensure phone number exists
      .map((row, index) => ({
        phoneNumber: row[phoneIndex],
        name: nameIndex !== -1 ? row[nameIndex] || '' : '',
        email: emailIndex !== -1 ? row[emailIndex] || '' : '',
        status: 'active',
        sheetInfo: {
          spreadsheetId: sheetId,
          sheetName,
          rowIndex: index + 2 // +2 because rows are 1-indexed and we skipped header
        }
      }));
    
    // Import contacts into MongoDB
    const contactRepository = getContactRepository();
    const importResults = await contactRepository.importContacts(contacts, campaignId);
    
    // If campaignId is provided, update campaign with these contacts
    if (campaignId) {
      const campaignRepository = getCampaignRepository();
      const contactIds = importResults.created + importResults.updated;
      
      // Update campaign stats
      await campaignRepository.updateCampaignStats(campaignId, {
        totalContacts: contactIds
      });
    }
    
    return reply.send(importResults);
  } catch (error) {
    console.error('[API] Error importing contacts from Google Sheet:', error);
    return reply.code(500).send({ 
      error: 'Failed to import contacts from Google Sheet',
      details: error.message
    });
  }
});
```

## Testing the Integration

After implementing these changes, you should test the integration by:

1. Starting the MongoDB-integrated server using `node server-mongodb.js`
2. Starting the frontend using `cd frontend && npm run dev`
3. Accessing the dashboard at http://localhost:3000

The dashboard should now display real data from MongoDB instead of mock data. Specifically, test:

1. The campaigns page to ensure campaigns are loaded from MongoDB
2. The Google Sheets upload functionality
3. The real-time updates via Socket.IO for active calls
4. The call details and recording playback functionality

## Troubleshooting

If you encounter issues with the integration, here are some common troubleshooting steps:

1. Check browser console for API or Socket.IO errors
2. Verify MongoDB server is running and accessible
3. Ensure API endpoints are correctly implemented on the server
4. Confirm frontend components are using the MongoDB API client
5. Verify Socket.IO connection and event handling
6. Check file permissions and API access for Google Sheets integration

## Next Steps

After completing the MongoDB integration, consider the following enhancements:

1. Implement user authentication and authorization
2. Add more analytics features using MongoDB aggregation
3. Improve error handling and loading states
4. Optimize performance for large datasets
5. Implement file caching for recordings and other assets
6. Add export functionality for reports and data
