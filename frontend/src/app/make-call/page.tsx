"use client"; // Add "use client" directive

import { useState } from 'react' // Import useState
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Phone, FileSpreadsheet } from 'lucide-react'
import { MakeCallForm } from '@/components/make-call-form'
import { UploadSheetForm } from '@/components/upload-sheet-form'

interface SheetPreviewData {
  headers: string[];
  rows: any[][]; // Using any for rows for now, can be refined if row structure is known
}

interface CampaignStartResponse {
  success: boolean;
  message: string;
  campaignId?: string;
}

export default function MakeCallPage() {
  const [csvCampaignName, setCsvCampaignName] = useState('');
  const [csvAgentPrompt, setCsvAgentPrompt] = useState('');
  const [csvFirstMessage, setCsvFirstMessage] = useState('');

  // State for Google Sheet campaign
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [maxCalls, setMaxCalls] = useState('10');
  const [gSheetAgentPrompt, setGSheetAgentPrompt] = useState('');
  const [gSheetFirstMessage, setGSheetFirstMessage] = useState('');
  
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetDataPreview, setSheetDataPreview] = useState<SheetPreviewData | null>(null);
  const [sheetError, setSheetError] = useState('');
  
  const [isStartingCampaign, setIsStartingCampaign] = useState(false);
  const [campaignStartResponse, setCampaignStartResponse] = useState<CampaignStartResponse | null>(null);

  const extractSheetId = (urlOrId: string) => {
    if (!urlOrId) return '';
    const match = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  const handleLoadSheetData = async () => {
    setIsLoadingSheet(true);
    setSheetError('');
    setSheetDataPreview(null);
    const id = extractSheetId(googleSheetId);

    if (!id) {
      setSheetError('Please enter a valid Google Sheet ID or URL.');
      setIsLoadingSheet(false);
      return;
    }

    try {
      const response = await fetch('/api/campaigns/google-sheet/load-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, sheetName }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSheetDataPreview({ headers: data.headers, rows: data.previewRows });
        // Optionally, you could also set a success message to be displayed
      } else {
        setSheetError(data.error || 'Failed to load sheet data.');
      }
    } catch (error) {
      console.error('Error loading sheet data:', error);
      setSheetError('An unexpected error occurred while loading sheet data.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleStartGoogleSheetCampaign = async () => {
    setIsStartingCampaign(true);
    setCampaignStartResponse(null); // Clear previous response
    setSheetError(''); // Clear sheet errors as well

    const id = extractSheetId(googleSheetId);

    if (!id || !gSheetAgentPrompt.trim() || !gSheetFirstMessage.trim()) {
      setSheetError('Sheet ID, Agent Prompt, and First Message are required to start a campaign.');
      setIsStartingCampaign(false);
      return;
    }

    try {
      const response = await fetch('/api/campaigns/google-sheet/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: id,
          sheetName,
          maxCalls: parseInt(maxCalls, 10) || undefined, // Ensure maxCalls is a number or undefined
          agentPrompt: gSheetAgentPrompt,
          firstMessage: gSheetFirstMessage,
          // campaignName: googleSheetId, // Optional: could add a campaign name field in UI
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCampaignStartResponse({ success: true, message: data.message, campaignId: data.campaignId });
        // Potentially clear form fields or redirect
      } else {
        setCampaignStartResponse({ success: false, message: data.error || 'Failed to start campaign.' });
        setSheetError(data.error || 'Failed to start campaign.'); // Also show error in sheet error section
      }
    } catch (error) {
      console.error('Error starting Google Sheet campaign:', error);
      setCampaignStartResponse({ success: false, message: 'An unexpected error occurred.' });
      setSheetError('An unexpected error occurred while starting the campaign.');
    } finally {
      setIsStartingCampaign(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader 
        title="Make Call" 
        description="Initiate outbound calls through ElevenLabs AI"
      />
      
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="single">
            <Phone className="h-4 w-4 mr-2" />
            Single Call
          </TabsTrigger>
          <TabsTrigger value="sheet">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Google Sheet
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Make a Single Call</CardTitle>
              <CardDescription>
                Initiate a call to a single phone number with ElevenLabs AI voice agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MakeCallForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sheet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Call from Google Sheet</CardTitle>
              <CardDescription>
                Make calls to contacts from a Google Sheet. Ensure your sheet has the proper format with phone numbers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Google Sheet ID</h3>
                  <div className="flex">
                    <input
                      id="googleSheetId"
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter Google Sheet ID from URL"
                      value={googleSheetId}
                      onChange={(e) => setGoogleSheetId(e.target.value)}
                    />
                    <Button className="ml-2" onClick={handleLoadSheetData} disabled={isLoadingSheet || !googleSheetId.trim()}>
                      {isLoadingSheet ? 'Loading...' : 'Load'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Sheet Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sheetName" className="text-sm font-medium">Sheet Name</label>
                      <input
                        id="sheetName"
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="maxCalls" className="text-sm font-medium">Max Calls</label>
                      <input
                        id="maxCalls"
                        type="number"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={maxCalls}
                        onChange={(e) => setMaxCalls(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Call Settings</h3>
                  <div className="grid gap-4">
                    <div>
                      <label htmlFor="gSheetAgentPrompt" className="text-sm font-medium">Agent Prompt</label>
                      <textarea
                        id="gSheetAgentPrompt"
                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Instructions for your AI agent"
                        value={gSheetAgentPrompt}
                        onChange={(e) => setGSheetAgentPrompt(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="gSheetFirstMessage" className="text-sm font-medium">First Message</label>
                      <input
                        id="gSheetFirstMessage"
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Hello, this is [Company Name]..."
                        value={gSheetFirstMessage}
                        onChange={(e) => setGSheetFirstMessage(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sheet Data Preview and Error/Success Messages */}
                {sheetError && (
                  <p className="text-sm text-red-600">{sheetError}</p>
                )}
                {sheetDataPreview && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Sheet Preview (first {sheetDataPreview.rows.length} data rows):</h4>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {sheetDataPreview.headers.map((header, index) => (
                              <th key={index} scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {sheetDataPreview.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {campaignStartResponse && (
                  <p className={`mt-4 text-sm ${campaignStartResponse.success ? 'text-green-600' : 'text-red-600'}`}>
                    {campaignStartResponse.message}
                    {campaignStartResponse.success && campaignStartResponse.campaignId && (
                      <span> Campaign ID: {campaignStartResponse.campaignId}</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartGoogleSheetCampaign} disabled={isStartingCampaign || !googleSheetId.trim() || !gSheetAgentPrompt.trim() || !gSheetFirstMessage.trim()}>
                {isStartingCampaign ? 'Starting...' : 'Start Calling Campaign'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Upload a CSV file containing phone numbers to make outbound calls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6"> {/* Added space-y-6 for consistency */}
              {/* Campaign Name Input */}
              <div className="space-y-2">
                <label htmlFor="csvCampaignName" className="text-sm font-medium">Campaign Name</label>
                <input
                  id="csvCampaignName"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter campaign name"
                  value={csvCampaignName}
                  onChange={(e) => setCsvCampaignName(e.target.value)}
                />
              </div>

              {/* Agent Prompt Textarea */}
              <div className="space-y-2">
                <label htmlFor="csvAgentPrompt" className="text-sm font-medium">Agent Prompt</label>
                <textarea
                  id="csvAgentPrompt"
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Instructions for your AI agent"
                  value={csvAgentPrompt}
                  onChange={(e) => setCsvAgentPrompt(e.target.value)}
                />
              </div>

              {/* First Message Input */}
              <div className="space-y-2">
                <label htmlFor="csvFirstMessage" className="text-sm font-medium">First Message</label>
                <input
                  id="csvFirstMessage"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Hello, this is [Company Name]..."
                  value={csvFirstMessage}
                  onChange={(e) => setCsvFirstMessage(e.target.value)}
                />
              </div>
              
              <UploadSheetForm
                campaignName={csvCampaignName}
                agentPrompt={csvAgentPrompt}
                firstMessage={csvFirstMessage}
              />
            </CardContent>
            {/* CardFooter might be needed here if UploadSheetForm doesn't have its own submit button for the whole campaign */}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
