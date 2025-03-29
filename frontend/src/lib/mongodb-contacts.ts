/**
 * MongoDB Contact Management API
 * Functions for interacting with the MongoDB contact APIs
 */

import { Contact, ContactFilters, ContactListResponse } from './types';
import { handleApiError, formatQueryParams } from './api-utils';
import { getApiUrl } from './api'; // Import the central helper

// Remove local API Base URL constant

/**
 * Fetch contacts with optional filtering
 * @param filters Optional filters for the contacts
 * @param page Page number for pagination
 * @param limit Number of contacts per page
 * @returns List of contacts matching the criteria
 */
export async function fetchContacts(
  filters?: ContactFilters,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'createdAt',
  sortOrder: number = -1
): Promise<{ success: boolean; data?: ContactListResponse; error?: string }> {
  try {
    // Create query parameters
    const params: any = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters
    };

    // If tags is an array, convert it to a comma-separated string
    if (filters?.tags && Array.isArray(filters.tags)) {
      params.tags = filters.tags.join(',');
    }

    const queryParams = formatQueryParams(params);
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts${queryParams}`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error fetching contacts: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch contacts');
  }
}

/**
 * Fetch a single contact by ID
 * @param contactId The ID of the contact to fetch
 * @returns The contact details
 */
export async function fetchContactById(contactId: string): Promise<{ 
  success: boolean; 
  data?: Contact; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error fetching contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to fetch contact ${contactId}`);
  }
}

/**
 * Create a new contact
 * @param contact The contact data to create
 * @returns The created contact
 */
export async function createContact(contact: Contact): Promise<{ 
  success: boolean; 
  data?: Contact; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contact)
    });

    if (!response.ok) {
      throw new Error(`Error creating contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, 'Failed to create contact');
  }
}

/**
 * Update an existing contact
 * @param contactId The ID of the contact to update
 * @param contact The updated contact data
 * @returns The updated contact
 */
export async function updateContact(contactId: string, contact: Partial<Contact>): Promise<{ 
  success: boolean; 
  data?: Contact; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}`);
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contact)
    });

    if (!response.ok) {
      throw new Error(`Error updating contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to update contact ${contactId}`);
  }
}

/**
 * Delete a contact
 * @param contactId The ID of the contact to delete
 * @returns Success status
 */
export async function deleteContact(contactId: string): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}`);
    const response = await fetch(apiUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Error deleting contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to delete contact ${contactId}`);
  }
}

/**
 * Add tags to a contact
 * @param contactId The ID of the contact
 * @param tags Array of tags to add
 * @returns The updated contact
 */
export async function addTagsToContact(contactId: string, tags: string[]): Promise<{ 
  success: boolean; 
  data?: Contact; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}/tags`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags })
    });

    if (!response.ok) {
      throw new Error(`Error adding tags to contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to add tags to contact ${contactId}`);
  }
}

/**
 * Remove tags from a contact
 * @param contactId The ID of the contact
 * @param tags Array of tags to remove
 * @returns The updated contact
 */
export async function removeTagsFromContact(contactId: string, tags: string[]): Promise<{ 
  success: boolean; 
  data?: Contact; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}/tags`);
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags })
    });

    if (!response.ok) {
      throw new Error(`Error removing tags from contact: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to remove tags from contact ${contactId}`);
  }
}

/**
 * Add contacts to a campaign
 * @param campaignId The ID of the campaign
 * @param contactIds Array of contact IDs to add
 * @returns Success status
 */
export async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/campaigns/${campaignId}/contacts`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contactIds })
    });

    if (!response.ok) {
      throw new Error(`Error adding contacts to campaign: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to add contacts to campaign ${campaignId}`);
  }
}

/**
 * Import contacts from array
 * @param contacts Array of contacts to import
 * @returns Success status and imported contacts
 */
export async function importContacts(contacts: Contact[]): Promise<{ 
  success: boolean; 
  data?: { 
    imported: number;
    failed: number; 
    contacts: Contact[] 
  }; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/import`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contacts })
    });

    if (!response.ok) {
      throw new Error(`Error importing contacts: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, 'Failed to import contacts');
  }
}

/**
 * Get call history for a contact
 * @param contactId The ID of the contact
 * @returns Array of calls made to/from the contact
 */
export async function getContactCallHistory(contactId: string): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: string 
}> {
  try {
    // Use getApiUrl with the correct full path
    const apiUrl = getApiUrl(`/api/db/contacts/${contactId}/calls`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error fetching contact call history: ${response.statusText} for URL: ${apiUrl}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return handleApiError(error, `Failed to fetch call history for contact ${contactId}`);
  }
}
