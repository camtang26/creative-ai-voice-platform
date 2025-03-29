"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createContact } from '@/lib/mongodb-contacts'
import { Contact } from '@/lib/types'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// Create a schema for contact form validation
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone number is required")
    .regex(/^\+?[0-9\s\-()]+$/, "Invalid phone number format"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'do-not-call']).default('active'),
  notes: z.string().optional(),
  tags: z.string().optional(),
  customFields: z.record(z.string()).optional()
})

type ContactFormValues = z.infer<typeof contactFormSchema>

export default function NewContactPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [customFieldKey, setCustomFieldKey] = useState('')
  const [customFieldValue, setCustomFieldValue] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  // Set default form values
  const defaultValues: Partial<ContactFormValues> = {
    status: 'active',
    tags: '',
    notes: ''
  }

  // Initialize form with validation
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues
  })

  // Submit handler
  async function onSubmit(data: ContactFormValues) {
    setIsSaving(true)

    try {
      // Process tags from comma-separated string to array
      const processedTags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
        : []

      // Prepare contact data
      const contactData: Contact = {
        ...data,
        tags: processedTags,
        customFields: customFields
      }

      // Save contact to backend
      const response = await createContact(contactData)

      if (response.success) {
        toast({
          title: "Contact created",
          description: "The contact has been successfully created."
        })

        // Navigate back to contacts list
        router.push('/contacts')
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create contact",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating contact:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add custom field handler
  function handleAddCustomField() {
    if (!customFieldKey.trim()) return

    setCustomFields(prev => ({
      ...prev,
      [customFieldKey.trim()]: customFieldValue.trim()
    }))

    // Reset inputs
    setCustomFieldKey('')
    setCustomFieldValue('')
  }

  // Remove custom field handler
  function handleRemoveCustomField(key: string) {
    setCustomFields(prev => {
      const newFields = { ...prev }
      delete newFields[key]
      return newFields
    })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          heading="Create New Contact"
          text="Add a new contact to your database"
        />
        <Button variant="outline" asChild>
          <Link href="/contacts">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Enter the basic information for this contact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+61412345678" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter phone number in international format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="do-not-call">Do Not Call</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="lead, prospect, interested" {...field} />
                    </FormControl>
                    <FormDescription>
                      Separate tags with commas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes about this contact" 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
              <CardDescription>
                Add any additional information specific to this contact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Field Name</label>
                      <Input 
                        placeholder="e.g., Company, Position, Source" 
                        value={customFieldKey}
                        onChange={(e) => setCustomFieldKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Field Value</label>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="e.g., Acme Inc, Manager, Website" 
                          value={customFieldValue}
                          onChange={(e) => setCustomFieldValue(e.target.value)}
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddCustomField}
                          disabled={!customFieldKey.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {Object.keys(customFields).length > 0 && (
                  <div className="border rounded-md p-4 mt-4">
                    <div className="text-sm font-medium mb-2">Added Custom Fields</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(customFields).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center border rounded p-2">
                          <div>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveCustomField(key)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/contacts">
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Contact
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
