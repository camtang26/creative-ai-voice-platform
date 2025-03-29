/**
 * MongoDB-integrated Google Sheets Calling Script
 * Imports contacts from Google Sheets into MongoDB and executes outbound calls
 */
import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Import MongoDB models and repositories
import { mongoConnect } from './db/mongodb-connection.js';
import campaignRepository from './db/repositories/campaign.repository.js';
import contactRepository from './db/repositories/contact.repository.js';

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is Investor Signals AI assistant in training. May I please speak with {name}?";
const DEFAULT_SERVER_URL = "http://localhost:8000";
const DEFAULT_DELAY = 10000; // 10 seconds delay between calls by default

// Get server URL from environment or default to localhost
const SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;

// Function to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Command line arguments
const args = process.argv.slice(2);
const spreadsheetId = args[0]; // First argument should be the Google Spreadsheet ID
const sheetName = args[1] || 'Sheet1'; // Default to Sheet1 if not specified
const maxCalls = args[2] ? parseInt(args[2]) : undefined; // Optional limit on number of calls to make
const customServerUrl = args[3]; // Optional server URL override
const campaignName = args[4] || `Campaign ${new Date().toISOString().split('T')[0]}`; // Optional campaign name

// Determine which server URL to use
let effectiveServerUrl = customServerUrl || SERVER_URL;

// Validate URL
if (!isValidUrl(effectiveServerUrl)) {
  console.error(`\nERROR: Invalid server URL: ${effectiveServerUrl}`);
  console.error(`Falling back to default URL: ${DEFAULT_SERVER_URL}\n`);
  effectiveServerUrl = DEFAULT_SERVER_URL;
}

// Display header
console.log('\n==============================================================');
console.log('  MONGODB-INTEGRATED OUTBOUND CALLING FROM GOOGLE SHEETS');
console.log('==============================================================');
console.log(`Server URL: ${effectiveServerUrl}`);
console.log(`Caller ID: ${process.env.TWILIO_PHONE_NUMBER}`);
console.log(`Campaign Name: ${campaignName}`);
console.log('==============================================================\n');

// Initialize Google Sheets API
let sheetsApi;
let currentCampaign;

/**
 * Authenticates with Google Sheets API
 */
async function setupGoogleSheets() {
  try {
    // Check if credentials file exists
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    try {
      await fs.access(credentialsPath);
    } catch (error) {
      console.error('Error: credentials.json file not found.');
      console.error('Please download your Google API credentials file and save it as credentials.json in the project root.');
      console.error('See README for instructions on setting up Google Sheets API.');
      process.exit(1);
    }

    // Read credentials file
    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    
    // Check for token file
    const tokenPath = path.join(process.cwd(), 'token.json');
    let token;
    try {
      token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
    } catch (error) {
      console.error('No token.json file found. Please authenticate first.');
      console.error('Run: node google-auth.js');
      process.exit(1);
    }

    // Set up OAuth2 client
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);

    // Initialize Sheets API
    sheetsApi = google.sheets({ version: 'v4', auth: oAuth2Client });
    console.log('Successfully authenticated with Google Sheets API');
  } catch (error) {
    console.error('Error setting up Google Sheets:', error.message);
    process.exit(1);
  }
}

/**
 * Creates or updates campaign in MongoDB
 */
async function setupCampaign() {
  try {
    console.log(`Setting up campaign in MongoDB: ${campaignName}`);
    
    // Check if campaign exists with the same Google Sheet info
    const { campaigns } = await campaignRepository.getCampaigns({
      search: campaignName
    });
    
    let campaign;
    
    if (campaigns && campaigns.length > 0) {
      // Use existing campaign if found
      campaign = campaigns[0];
      console.log(`Using existing campaign: ${campaign.name} (${campaign._id})`);
      
      // Update campaign with latest Google Sheet info
      campaign = await campaignRepository.updateCampaign(campaign._id, {
        sheetInfo: {
          spreadsheetId,
          sheetName,
          phoneColumn: 'phone', // Default column names
          nameColumn: 'name',
          statusColumn: 'status',
          customMessageColumn: 'message'
        }
      });
    } else {
      // Create new campaign
      campaign = await campaignRepository.saveCampaign({
        name: campaignName,
        description: `Campaign created from Google Sheet: ${spreadsheetId}/${sheetName}`,
        status: 'draft',
        prompt: DEFAULT_PROMPT,
        firstMessage: DEFAULT_FIRST_MESSAGE,
        callerId: process.env.TWILIO_PHONE_NUMBER,
        sheetInfo: {
          spreadsheetId,
          sheetName,
          phoneColumn: 'phone', // Default column names
          nameColumn: 'name',
          statusColumn: 'status',
          customMessageColumn: 'message'
        },
        settings: {
          callDelay: DEFAULT_DELAY,
          maxConcurrentCalls: 1, // Start with 1 concurrent call
          retryCount: 1,
          retryDelay: 3600000 // 1 hour
        }
      });
      
      console.log(`Created new campaign: ${campaign.name} (${campaign._id})`);
    }
    
    // Set the campaign status to active
    campaign = await campaignRepository.updateCampaignStatus(campaign._id, 'active');
    
    return campaign;
  } catch (error) {
    console.error('Error setting up campaign in MongoDB:', error.message);
    throw error;
  }
}

/**
 * Reads contact data from the Google Sheet and imports into MongoDB
 */
async function getContactsFromSheet() {
  if (!spreadsheetId) {
    console.error('Error: No spreadsheet ID provided.');
    console.error('Usage: node mongodb-sheet-call.js <spreadsheetId> [sheetName] [maxCalls] [serverUrl] [campaignName]');
    console.error('Examples:');
    console.error('  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    console.error('  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts');
    console.error('  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5');
    console.error('  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5 http://localhost:8000');
    console.error('  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5 http://localhost:8000 "My Campaign"');
    process.exit(1);
  }

  try {
    console.log(`Reading data from spreadsheet: ${spreadsheetId}, sheet: ${sheetName}`);
    
    // Get sheet data
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.error('No data found in the spreadsheet.');
      process.exit(1);
    }

    // Extract header row and find required column indices
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const phoneIndex = headers.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile');
    const nameIndex = headers.findIndex(h => h === 'name' || h === 'contact name' || h === 'full name');
    const statusIndex = headers.findIndex(h => h === 'status' || h === 'call status');
    const customMessageIndex = headers.findIndex(h => h === 'message' || h === 'custom message');
    const emailIndex = headers.findIndex(h => h === 'email');

    if (phoneIndex === -1) {
      console.error('Error: Could not find phone number column in the spreadsheet.');
      console.error('Please make sure your spreadsheet has a column named "Phone", "Phone Number", or "Mobile".');
      process.exit(1);
    }

    // Process data rows (skip header)
    const sheetContacts = rows.slice(1)
      .filter(row => row.length > phoneIndex && row[phoneIndex]) // Ensure phone number exists
      .map((row, index) => {
        return {
          rowIndex: index + 2, // +2 because rows are 1-indexed and we skipped header
          phone: row[phoneIndex],
          name: nameIndex !== -1 ? row[nameIndex] || '' : '',
          email: emailIndex !== -1 ? row[emailIndex] || '' : '',
          status: statusIndex !== -1 ? row[statusIndex] || 'pending' : 'pending',
          customMessage: customMessageIndex !== -1 ? row[customMessageIndex] || '' : ''
        };
      });

    // Filter to only include contacts that haven't been called yet
    const pendingContacts = sheetContacts.filter(contact => 
      contact.status.toLowerCase() === 'pending' || contact.status.toLowerCase() === '');

    console.log(`Found ${pendingContacts.length} pending contacts to call out of ${sheetContacts.length} total contacts.`);
    
    // Import contacts into MongoDB
    const contactsToImport = pendingContacts.map(contact => ({
      phoneNumber: contact.phone,
      name: contact.name,
      email: contact.email,
      status: 'active',
      customFields: {
        customMessage: contact.customMessage
      },
      sheetInfo: {
        spreadsheetId,
        sheetName,
        rowIndex: contact.rowIndex
      }
    }));
    
    console.log(`Importing ${contactsToImport.length} contacts into MongoDB...`);
    
    const importResults = await contactRepository.importContacts(contactsToImport, currentCampaign._id);
    console.log(`MongoDB Import Results: Created ${importResults.created}, Updated: ${importResults.updated}, Failed: ${importResults.failed}`);
    
    // Query MongoDB for contacts associated with this campaign
    const { contacts } = await campaignRepository.getCampaignContacts(currentCampaign._id, {
      limit: maxCalls || 1000 // Use maxCalls or a high limit
    });
    
    // Update campaign stats with total contacts
    await campaignRepository.updateCampaignStats(currentCampaign._id, {
      totalContacts: contacts.length
    });
    
    // Map MongoDB contacts back to the sheet contacts for calling
    const contactsToCall = contacts.map(mongoContact => {
      const sheetContact = pendingContacts.find(sc => 
        sc.phone === mongoContact.phoneNumber || 
        (mongoContact.sheetInfo && sc.rowIndex === mongoContact.sheetInfo.rowIndex)
      );
      
      return {
        _id: mongoContact._id,
        phone: mongoContact.phoneNumber,
        name: mongoContact.name,
        customMessage: mongoContact.customFields?.customMessage || '',
        rowIndex: mongoContact.sheetInfo?.rowIndex || sheetContact?.rowIndex,
        status: 'pending'
      };
    });
    
    // Apply max calls limit if specified
    const limitedContactsToCall = maxCalls ? contactsToCall.slice(0, maxCalls) : contactsToCall;
    
    console.log(`Prepared ${limitedContactsToCall.length} contacts for calling from MongoDB.`);
    
    // Return contacts along with column indices for updating status
    return {
      contacts: limitedContactsToCall,
      columns: {
        statusIndex,
        rowOffset: 2 // 1 for 1-indexing + 1 for header
      }
    };
  } catch (error) {
    console.error('Error processing spreadsheet data:', error.message);
    if (error.code === 404) {
      console.error('Spreadsheet not found. Please check the spreadsheet ID.');
    } else if (error.code === 403) {
      console.error('Permission denied. Make sure you have access to the spreadsheet.');
    }
    process.exit(1);
  }
}

/**
 * Makes a call to a single contact
 */
async function makeCall(contact) {
  try {
    // Personalize message with name if available
    let firstMessage = DEFAULT_FIRST_MESSAGE;
    if (contact.name) {
      // Replace {name} placeholder with actual name
      firstMessage = firstMessage.replace("{name}", contact.name);
    } else {
      // If no name is available, use a generic greeting
      firstMessage = firstMessage.replace("May I please speak with {name}?", "How are you today?");
    }
    
    // Use custom message if provided
    if (contact.customMessage) {
      firstMessage = contact.customMessage;
    }

    console.log(`\nCalling ${contact.name || 'contact'} at ${contact.phone}...`);
    console.log(`Using prompt: "${DEFAULT_PROMPT}"`);
    console.log(`First message: "${firstMessage}"`);
    console.log(`Using server: ${effectiveServerUrl}`);
    
    // Make the API call to your server
    const response = await fetch(`${effectiveServerUrl}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: contact.phone,
        prompt: DEFAULT_PROMPT,
        first_message: firstMessage,
        name: contact.name || "Unknown",
        // Add MongoDB references
        contactId: contact._id,
        campaignId: currentCampaign._id
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      
      // Update campaign stats
      await campaignRepository.updateCampaignStats(currentCampaign._id, {
        callsPlaced: currentCampaign.stats.callsPlaced + 1
      });
      
      return {
        success: true,
        callSid: data.callSid,
        conversationId: data.conversationId
      };
    } else {
      console.error('Failed to initiate call:', data.error);
      console.error('Details:', data.details || 'No additional details provided');
      return {
        success: false,
        error: data.error,
        details: data.details || ''
      };
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your server is running at ${effectiveServerUrl}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates the status of a contact in the spreadsheet and MongoDB
 */
async function updateContactStatus(contact, result, columns) {
  try {
    const status = result.success ? 'called' : 'failed';
    let notes = '';
    
    if (result.success) {
      notes = `Called on ${new Date().toISOString()}, Call SID: ${result.callSid}`;
      if (result.conversationId) {
        notes += `, Conversation ID: ${result.conversationId}`;
      }
    } else {
      notes = `Failed on ${new Date().toISOString()}: ${result.error} ${result.details || ''}`;
    }
    
    // Update status in MongoDB
    if (contact._id) {
      await contactRepository.updateContact(contact._id, {
        customFields: {
          callStatus: status,
          callNotes: notes,
          lastCallResult: result.success ? 'success' : 'failed',
          lastCallTime: new Date()
        }
      });
      
      console.log(`Updated contact status in MongoDB for ${contact.name || contact.phone} to ${status}`);
    }
    
    // Update status in Google Sheet if we have the row index
    if (columns.statusIndex !== -1 && contact.rowIndex) {
      // Update status in spreadsheet
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${String.fromCharCode(65 + columns.statusIndex)}${contact.rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[status]]
        }
      });
      
      // If there's a Notes column, update it
      const notesIndex = columns.statusIndex + 1;
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${String.fromCharCode(65 + notesIndex)}${contact.rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[notes]]
        }
      });
      
      console.log(`Updated status in Google Sheet for ${contact.name || contact.phone} to ${status}`);
    } else {
      console.log('No status column in spreadsheet or missing row index. Skipping Google Sheet update.');
    }
  } catch (error) {
    console.error('Error updating contact status:', error.message);
  }
}

/**
 * Main function to call contacts from spreadsheet
 */
async function callFromSpreadsheet() {
  try {
    console.log('Starting MongoDB-integrated automated calls from Google Spreadsheet');
    
    // Connect to MongoDB
    await mongoConnect();
    console.log('Connected to MongoDB');
    
    // Set up Google Sheets API
    await setupGoogleSheets();
    
    // Set up the campaign in MongoDB
    currentCampaign = await setupCampaign();
    
    // Get contacts from sheet and import into MongoDB
    const { contacts, columns } = await getContactsFromSheet();
    
    if (contacts.length === 0) {
      console.log('No pending contacts to call. Exiting.');
      
      // Update campaign status to completed
      await campaignRepository.updateCampaignStatus(currentCampaign._id, 'completed');
      
      // Close MongoDB connection
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Will call ${contacts.length} contacts from the campaign.`);
    
    // Call each contact
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      console.log(`\nProcessing contact ${i+1} of ${contacts.length}`);
      
      // Make the call
      const result = await makeCall(contact);
      
      // Update status in spreadsheet and MongoDB
      await updateContactStatus(contact, result, columns);
      
      // Wait between calls if not the last one
      if (i < contacts.length - 1 && result.success) {
        const delay = currentCampaign.settings?.callDelay || DEFAULT_DELAY;
        console.log(`Waiting ${delay/1000} seconds before the next call...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log('\nAll calls completed!');
    
    // Update campaign status to completed
    await campaignRepository.updateCampaignStatus(currentCampaign._id, 'completed');
    
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error in call from spreadsheet process:', error);
    
    // Try to update campaign status to failed if possible
    if (currentCampaign && currentCampaign._id) {
      try {
        await campaignRepository.updateCampaignStatus(currentCampaign._id, 'cancelled');
      } catch (updateError) {
        console.error('Error updating campaign status:', updateError.message);
      }
    }
    
    // Close MongoDB connection
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    } catch (disconnectError) {
      console.error('Error closing MongoDB connection:', disconnectError.message);
    }
    
    process.exit(1);
  }
}

// Display usage information
console.log(`
Usage: node mongodb-sheet-call.js <spreadsheetId> [sheetName] [maxCalls] [serverUrl] [campaignName]
Examples:
  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts
  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5
  node mongodb-sheet-call.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5 http://localhost:8000 "My Campaign"

Your spreadsheet should have these columns:
  - "Phone" or "Phone Number" or "Mobile" (required)
  - "Name" or "Contact Name" or "Full Name" (optional)
  - "Status" or "Call Status" (optional, will be updated)
  - "Message" or "Custom Message" (optional)
  - "Email" (optional)
`);

// Start the process
callFromSpreadsheet();