import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Default values
const DEFAULT_PROMPT = "You are a helpful assistant making a phone call. Be friendly and professional.";
const DEFAULT_FIRST_MESSAGE = "Hello, this is Investor Signals AI assistant in training. May I please speak with {name}?";
const DEFAULT_SERVER_URL = "http://localhost:8000";
const DEFAULT_DELAY = 10000; // 10 seconds delay between calls by default
const CALLER_ID = "+61291570351"; // Australian caller ID
const RAILWAY_URL = "https://twilioel-production.up.railway.app"; // Railway URL for backup

// Command line arguments
const args = process.argv.slice(2);
const spreadsheetId = args[0]; // First argument should be the Google Spreadsheet ID
const sheetName = args[1] || 'Sheet1'; // Default to Sheet1 if not specified
const maxCalls = args[2] ? parseInt(args[2]) : undefined; // Optional limit on number of calls to make
const useRailway = args.includes('--railway'); // Flag to use Railway instead of local

// Determine which server to use
let SERVER_URL;
if (useRailway) {
  SERVER_URL = RAILWAY_URL;
  console.log('Using Railway server (remote)');
} else {
  // First try to read ngrok URL from file if it exists
  try {
    if (fs.existsSync('ngrok_url.txt')) {
      SERVER_URL = fs.readFileSync('ngrok_url.txt', 'utf8').trim();
    }
  } catch (e) {
    // Ignore errors and fall back to env
  }
  
  // If no ngrok URL found, use env or default
  if (!SERVER_URL) {
    SERVER_URL = process.env.SERVER_URL || DEFAULT_SERVER_URL;
  }
  
  console.log('Using local server');
}

// Initialize Google Sheets API
let sheetsApi;

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
 * Reads contact data from the Google Sheet
 */
async function getContactsFromSheet() {
  if (!spreadsheetId) {
    console.error('Error: No spreadsheet ID provided.');
    console.error('Usage: node call-sheet.js <spreadsheetId> [sheetName] [maxCalls] [--railway]');
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

    if (phoneIndex === -1) {
      console.error('Error: Could not find phone number column in the spreadsheet.');
      console.error('Please make sure your spreadsheet has a column named "Phone", "Phone Number", or "Mobile".');
      process.exit(1);
    }

    // Process data rows (skip header)
    const contacts = rows.slice(1)
      .filter(row => row.length > phoneIndex && row[phoneIndex]) // Ensure phone number exists
      .map((row, index) => {
        const contact = {
          rowIndex: index + 2, // +2 because rows are 1-indexed and we skipped header
          phone: row[phoneIndex],
          name: nameIndex !== -1 ? row[nameIndex] || '' : '',
          status: statusIndex !== -1 ? row[statusIndex] || 'pending' : 'pending',
          customMessage: customMessageIndex !== -1 ? row[customMessageIndex] || '' : ''
        };
        return contact;
      });

    // Filter to only include contacts that haven't been called yet
    const pendingContacts = contacts.filter(contact => 
      contact.status.toLowerCase() === 'pending' || contact.status.toLowerCase() === '');

    console.log(`Found ${pendingContacts.length} pending contacts to call out of ${contacts.length} total contacts.`);
    
    // Apply max calls limit if specified
    const contactsToCall = maxCalls ? pendingContacts.slice(0, maxCalls) : pendingContacts;
    
    // Return contacts along with column indices for updating status
    return {
      contacts: contactsToCall,
      columns: {
        statusIndex,
        rowOffset: 2 // 1 for 1-indexing + 1 for header
      }
    };
  } catch (error) {
    console.error('Error reading from spreadsheet:', error.message);
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
    console.log(`Using server: ${SERVER_URL}`);
    console.log(`Using caller ID: ${CALLER_ID} (Australia)`);
    
    // Make the API call to your server
    const response = await fetch(`${SERVER_URL}/outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: contact.phone,
        prompt: DEFAULT_PROMPT,
        first_message: firstMessage,
        name: contact.name || "Unknown",
        callerId: CALLER_ID,
        region: 'au1' // Always use Australia region for lower latency
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Call initiated successfully!');
      console.log(`Call SID: ${data.callSid}`);
      return {
        success: true,
        callSid: data.callSid,
        conversationId: data.conversationId
      };
    } else {
      console.error('Failed to initiate call:', data.error);
      return {
        success: false,
        error: data.error,
        details: data.details || ''
      };
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    console.error(`Make sure your server is running at ${SERVER_URL}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates the status of a contact in the spreadsheet
 */
async function updateContactStatus(contact, result, columns) {
  if (!columns.statusIndex || columns.statusIndex === -1) {
    console.log('No status column found in spreadsheet. Skipping status update.');
    return;
  }

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
    
    console.log(`Updated status for ${contact.name || contact.phone} to ${status}`);
  } catch (error) {
    console.error('Error updating contact status:', error.message);
  }
}

/**
 * Main function to call contacts from spreadsheet
 */
async function callFromSpreadsheet() {
  console.log('==============================================================');
  console.log('  INVESTOR SIGNALS OUTBOUND CALLING');
  console.log('==============================================================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Using Australia region (au1) for lower latency`);
  console.log(`Caller ID: ${CALLER_ID}`);
  console.log('==============================================================');
  
  // Set up Google Sheets API
  await setupGoogleSheets();
  
  // Get contacts from sheet
  const { contacts, columns } = await getContactsFromSheet();
  
  if (contacts.length === 0) {
    console.log('No pending contacts to call. Exiting.');
    return;
  }
  
  console.log(`Will call ${contacts.length} contacts from the spreadsheet.`);
  
  // Call each contact
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    console.log(`\nProcessing contact ${i+1} of ${contacts.length}`);
    
    // Make the call
    const result = await makeCall(contact);
    
    // Update status in spreadsheet
    await updateContactStatus(contact, result, columns);
    
    // Wait between calls if not the last one
    if (i < contacts.length - 1 && result.success) {
      const delay = process.env.CALL_DELAY ? parseInt(process.env.CALL_DELAY) : DEFAULT_DELAY;
      console.log(`Waiting ${delay/1000} seconds before the next call...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('\nAll calls completed!');
}

// Show usage information
console.log(`
Usage: node call-sheet.js <spreadsheetId> [sheetName] [maxCalls] [--railway]
Examples:
  node call-sheet.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  node call-sheet.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts
  node call-sheet.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Contacts 5
  node call-sheet.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms --railway

Your spreadsheet should have these columns:
  - "Phone" or "Phone Number" or "Mobile" (required)
  - "Name" or "Contact Name" or "Full Name" (optional)
  - "Status" or "Call Status" (optional, will be updated)
  - "Message" or "Custom Message" (optional)

Options:
  --railway  Use the Railway server instead of local
`);

// Start the process
callFromSpreadsheet();