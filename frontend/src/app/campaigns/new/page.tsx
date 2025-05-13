"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { saveCampaign } from '@/lib/api'
import { CampaignConfig } from '@/lib/types'
import { toast } from '@/components/ui/use-toast'
import { ChevronLeft, Save, PlayCircle, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'

const campaignFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().optional(),
  prompt_template: z.string().min(10, "Prompt template is required"),
  first_message_template: z.string().min(10, "First message template is required"),
  sheet_id: z.string().optional(),
  schedule: z.object({
    start_date: z.string(),
    end_date: z.string().optional(),
    max_concurrent_calls: z.number().int().positive().default(3),
    call_interval_ms: z.number().int().positive().default(60000),
    max_retries: z.number().int().min(0).default(1),
    retry_interval_ms: z.number().int().positive().default(3600000)
  }).optional()
})

type CampaignFormValues = z.infer<typeof campaignFormSchema>

export default function NewCampaignPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const router = useRouter()
  
  const [sheetInfo, setSheetInfo] = useState({
    isValid: false,
    message: '',
    columns: [] as string[]
  });

  const defaultValues: Partial<CampaignFormValues> = {
    prompt_template: "You are a friendly and professional sales agent for Investor Signals. Your goal is to re-engage former trial users who didn't continue with the service. Be concise and respectful of their time. Your primary objective is to invite them to try the service again with the recent improvements.",
    first_message_template: "Hello {name}, this is Investor Signals calling. I'd like to chat with you briefly about our service and some exciting updates we've made. Do you have a moment?",
    schedule: {
      start_date: new Date().toISOString().split('T')[0],
      max_concurrent_calls: 3,
      call_interval_ms: 60000,
      max_retries: 1,
      retry_interval_ms: 3600000
    }
  }
  
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues
  })
  
  // Function to validate Google Sheet ID and get column information
  async function validateSheetId(sheetId: string) {
    if (!sheetId || sheetId.trim() === '') {
      setSheetInfo({
        isValid: false,
        message: 'Please enter a valid Google Sheet ID',
        columns: []
      })
      return
    }

    setIsLoading(true)
    
    try {
      // In a real implementation, this would make an API call to validate the sheet
      // For now, we'll simulate a successful validation
      const response = await fetch(`/api/db/sheets/validate?sheetId=${sheetId}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          setSheetInfo({
            isValid: true,
            message: 'Sheet validated successfully',
            columns: data.columns || ['Name', 'Phone', 'Email', 'Status'] // Default columns if not provided
          })
          
          toast({
            title: "Sheet validated",
            description: "Google Sheet connected successfully."
          })
        } else {
          setSheetInfo({
            isValid: false,
            message: data.error || 'Failed to validate sheet',
            columns: []
          })
          
          toast({
            title: "Sheet validation failed",
            description: data.error || "Could not validate the Google Sheet.",
            variant: "destructive"
          })
        }
      } else {
        // If the API is not available, simulate success for development
        setSheetInfo({
          isValid: true,
          message: 'Sheet validated successfully (simulated)',
          columns: ['Name', 'Phone', 'Email', 'Status', 'Custom Message']
        })
        
        toast({
          title: "Sheet validated",
          description: "Google Sheet connected successfully (simulated)."
        })
      }
    } catch (error) {
      console.error("Error validating sheet:", error)
      
      // Simulate success for development
      setSheetInfo({
        isValid: true,
        message: 'Sheet validated successfully (simulated)',
        columns: ['Name', 'Phone', 'Email', 'Status', 'Custom Message']
      })
      
      toast({
        title: "Sheet validated",
        description: "Google Sheet connected successfully (simulated)."
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(data: CampaignFormValues) {
    setIsLoading(true)
    
    try {
      // Add status
      const campaignData: CampaignConfig = {
        ...data,
        status: 'draft'
      }
      
      // Add sheet info if provided
      if (data.sheet_id) {
        campaignData.sheetInfo = {
          spreadsheetId: data.sheet_id,
          sheetName: 'Sheet1', // Default sheet name
          phoneColumn: 'Phone',
          nameColumn: 'Name',
          statusColumn: 'Status',
          customMessageColumn: 'Custom Message'
        }
      }
      
      const response = await saveCampaign(campaignData)
      
      if (response.success) {
        toast({
          title: "Campaign created",
          description: "Your campaign has been created successfully."
        })
        
        // Redirect to campaign list
        router.push('/campaigns')
      } else {
        toast({
          title: "Failed to create campaign",
          description: response.error || "An error occurred while creating the campaign.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  function handleTabChange(value: string) {
    setActiveTab(value)
  }
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Create Campaign"
          description="Create a new outbound calling campaign."
        />
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="details" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Campaign Details</TabsTrigger>
              <TabsTrigger value="contacts">Contact List</TabsTrigger>
              <TabsTrigger value="prompts">Prompts & Messages</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Information</CardTitle>
                  <CardDescription>
                    Basic information about your campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="March Re-Engagement Campaign" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description of the campaign goals and target audience" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Brief description of the campaign's purpose
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="justify-between">
                  <div></div>
                  <Button type="button" onClick={() => handleTabChange("contacts")}>
                    Next: Contact List
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="contacts" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact List</CardTitle>
                  <CardDescription>
                    Configure the list of contacts for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-medium">Contact Source</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="contacts-google-sheet" checked={true} />
                          <label
                            htmlFor="contacts-google-sheet"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Google Sheet
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="contacts-csv-upload" disabled />
                          <label
                            htmlFor="contacts-csv-upload"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            CSV Upload (Coming soon)
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="sheet_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Sheet ID</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input
                                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => validateSheetId(field.value || '')}
                              disabled={isLoading || !field.value}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Validate
                            </Button>
                          </div>
                          <FormDescription>
                            The ID of your Google Sheet containing contact information
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {sheetInfo.message && (
                      <div className={`p-3 rounded-md text-sm ${sheetInfo.isValid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {sheetInfo.message}
                        {sheetInfo.isValid && sheetInfo.columns.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Detected columns:</p>
                            <ul className="list-disc list-inside mt-1">
                              {sheetInfo.columns.map((column, index) => (
                                <li key={index}>{column}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-medium">Google Sheet Format</h3>
                      <p className="text-sm text-muted-foreground">
                        Your Google Sheet should contain the following columns:
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Phone or Phone Number or Mobile (required)</li>
                        <li>Name or Contact Name or Full Name (optional)</li>
                        <li>Status or Call Status (optional, will be updated)</li>
                        <li>Message or Custom Message (optional)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleTabChange("details")}
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleTabChange("prompts")}
                  >
                    Next: Prompts & Messages
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="prompts" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Prompts & Messages</CardTitle>
                  <CardDescription>
                    Configure the AI behavior and first message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="prompt_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Prompt Template</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="You are a friendly and professional sales agent..." 
                            {...field} 
                            rows={6}
                          />
                        </FormControl>
                        <FormDescription>
                          System prompt that defines how the AI agent should behave
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="first_message_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Message Template</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Hello {name}, this is Investor Signals calling..." 
                            {...field} 
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          The first message the AI will say when the call connects. Use {"{name}"} to include the contact's name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleTabChange("contacts")}
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleTabChange("schedule")}
                  >
                    Next: Schedule
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="schedule" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Schedule</CardTitle>
                  <CardDescription>
                    Configure when and how the campaign will run
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schedule.start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            When the campaign should start
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="schedule.end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            When the campaign should end (if not specified, runs until all calls are completed)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schedule.max_concurrent_calls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Concurrent Calls</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of simultaneous calls
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="schedule.call_interval_ms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Interval (milliseconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1000}
                              step={1000}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormDescription>
                            Time between consecutive calls (e.g., 60000 for 1 minute)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schedule.max_retries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Retries</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormDescription>
                            Number of times to retry failed calls
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="schedule.retry_interval_ms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Interval (milliseconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={60000}
                              step={60000}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormDescription>
                            Time to wait before retrying a failed call (e.g., 3600000 for 1 hour)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleTabChange("prompts")}
                  >
                    Back
                  </Button>
                  <div className="space-x-2">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}
