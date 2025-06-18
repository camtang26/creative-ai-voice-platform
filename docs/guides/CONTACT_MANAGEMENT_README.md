# Contact Management System for ElevenLabs/Twilio Integration

This document provides an overview of the Contact Management System implemented as part of the ElevenLabs/Twilio integration project.

## Features

The Contact Management System includes the following features:

1. **Contact Database**
   - Comprehensive contact data storage
   - Support for custom fields
   - Contact status tracking (active, inactive, do-not-call)
   - Tagging system for organization and filtering

2. **CRUD Operations**
   - Create new contacts individually
   - View detailed contact information
   - Update contact information
   - Delete contacts with confirmation

3. **Bulk Operations**
   - Bulk selection of contacts
   - Add multiple contacts to campaigns
   - Tag multiple contacts
   - Schedule calls for multiple contacts

4. **Import/Export**
   - Import contacts from CSV files
   - Import contacts from Google Sheets
   - Export contacts to CSV with field selection
   - Filtering options for exports

5. **Contact History**
   - View call history for each contact
   - Track contact engagement metrics
   - Monitor success rates and outcomes

## Pages and Components

### 1. Contact List Page (`/contacts`)
- View and filter all contacts
- Search by name, phone, tags, etc.
- Bulk selection and actions
- Quick navigation to details, call, or edit

### 2. Contact Detail Page (`/contacts/[id]`)
- Comprehensive view of contact information
- View call history and metrics
- Tag management
- Edit contact details
- View campaign associations

### 3. New Contact Page (`/contacts/new`)
- Create new contacts with comprehensive fields
- Add custom fields
- Set initial tags and status

### 4. Contact Import Page (`/contacts/import`)
- Import contacts from CSV files
- Import from Google Sheets
- Column mapping
- Preview and validation

### 5. Contact Export Page (`/contacts/export`)
- Export contacts to CSV or Excel
- Filter which contacts to export
- Select which fields to include
- Format options

### 6. Bulk Campaign Add Page (`/campaigns/bulk-add`)
- Add multiple contacts to a campaign
- Filter and select contacts
- Choose campaign to add to
- Process in bulk

## Data Model

### Contact
```typescript
interface Contact {
  id?: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  tags?: string[];
  notes?: string;
  lastContacted?: string;
  callCount?: number;
  callIds?: string[];
  campaignIds?: string[];
  status?: 'active' | 'inactive' | 'do-not-call';
  priority?: number;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
```

## API Endpoints

The system uses the following API endpoints:

### Contact Management
- `GET /api/db/contacts` - Get contact list with pagination and filtering
- `GET /api/db/contacts/:id` - Get contact details
- `POST /api/db/contacts` - Create a new contact
- `PUT /api/db/contacts/:id` - Update contact details
- `DELETE /api/db/contacts/:id` - Delete a contact
- `POST /api/db/contacts/:id/tags` - Add tags to a contact
- `DELETE /api/db/contacts/:id/tags` - Remove tags from a contact

### Import/Export
- `POST /api/db/contacts/import` - Import contacts from array
- `GET /api/db/contacts/:id/calls` - Get call history for a contact
- `POST /api/db/campaigns/:id/contacts` - Add contacts to a campaign

## Usage

### Viewing Contacts
1. Navigate to `/contacts` in the sidebar
2. Use filters and search to find specific contacts
3. Click on a contact name to view details

### Creating Contacts
1. Click "New Contact" in the contacts submenu
2. Fill in the required information
3. Add custom fields as needed
4. Save the contact

### Importing Contacts
1. Click "Import Contacts" in the contacts submenu
2. Choose CSV or Google Sheets
3. Map columns to contact fields
4. Review and import

### Exporting Contacts
1. Click "Export Contacts" in the contacts submenu
2. Set filters to select which contacts to export
3. Choose which fields to include
4. Select format and download

### Adding Contacts to Campaigns
1. Select contacts from the contacts list
2. Click "Add to Campaign"
3. Choose the campaign
4. Confirm the action

## Implementation Details

The Contact Management System is built using:
- Next.js for frontend
- MongoDB for database
- API endpoints for data access
- React Hook Form for form handling
- Google Sheets API for spreadsheet integration

## Future Enhancements

Planned future enhancements include:
1. Contact merge functionality
2. Advanced filtering and segmentation
3. Contact activity timeline
4. Contact scoring system
5. Automated contact cleanup
6. Custom field templates
7. Bulk contact updates
