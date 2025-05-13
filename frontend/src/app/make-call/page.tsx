"use client"; // Add "use client" directive

import { useState } from 'react' // Import useState
import { DashboardHeader } from '@/components/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Phone, FileSpreadsheet } from 'lucide-react'
import { MakeCallForm } from '@/components/make-call-form'
import { UploadSheetForm } from '@/components/upload-sheet-form'

export default function MakeCallPage() {
  const [csvCampaignName, setCsvCampaignName] = useState('');
  const [csvAgentPrompt, setCsvAgentPrompt] = useState('');
  const [csvFirstMessage, setCsvFirstMessage] = useState('');

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
                      type="text" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter Google Sheet ID from URL" 
                    />
                    <Button className="ml-2">
                      Load
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
                      <label className="text-sm font-medium">Sheet Name</label>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="Sheet1" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Calls</label>
                      <input 
                        type="number" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="10" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Call Settings</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Agent Prompt</label>
                      <textarea 
                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Instructions for your AI agent" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">First Message</label>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Hello, this is [Company Name]..." 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Start Calling Campaign</Button>
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
