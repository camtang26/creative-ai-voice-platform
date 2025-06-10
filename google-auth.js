import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import open from 'open';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Create an OAuth2 client with the given credentials
 */
async function authorize() {
  try {
    // Check if credentials file exists
    try {
      await fs.access(CREDENTIALS_PATH);
    } catch (error) {
      console.error('Error: credentials.json file not found');
      console.error('\nPlease follow these steps to get your credentials:');
      console.error('1. Go to https://console.cloud.google.com/');
      console.error('2. Create a new project or select an existing one');
      console.error('3. Enable the Google Sheets API');
      console.error('4. Create OAuth 2.0 Desktop application credentials');
      console.error('5. Download the credentials JSON file');
      console.error('6. Save it as "credentials.json" in the project root directory\n');
      process.exit(1);
    }

    // Load client secrets from file
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
    const credentials = JSON.parse(content);
    
    // Create OAuth client
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id, 
      client_secret, 
      'urn:ietf:wg:oauth:2.0:oob' // Use out-of-band mode for desktop applications
    );

    // Check if we have previously stored a token
    try {
      const token = await fs.readFile(TOKEN_PATH, 'utf8');
      oAuth2Client.setCredentials(JSON.parse(token));
      console.log('Already authenticated with Google Sheets API.');
      return oAuth2Client;
    } catch (error) {
      return getNewToken(oAuth2Client);
    }
  } catch (error) {
    console.error('Error during authorization:', error.message);
    process.exit(1);
  }
}

/**
 * Get and store new token after prompting for user authorization
 */
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  
  console.log('\n==================================================');
  console.log('Authorization required for Google Sheets access');
  console.log('==================================================');
  console.log('\n1. The browser will open to authorize this application');
  console.log('2. If the browser does not open, manually visit this URL:');
  console.log('\n' + authUrl + '\n');
  console.log('3. Sign in and allow the requested permissions');
  console.log('4. Copy the authorization code displayed in the browser');
  
  try {
    // Try to open the URL in the default browser
    await open(authUrl);
  } catch (err) {
    console.log('Could not open the browser automatically. Please open the URL manually.');
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve, reject) => {
    rl.question('\nEnter the code from the browser: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Store the token for future use
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (error) {
        console.error('Error retrieving access token:', error.message);
        reject(error);
      }
    });
  });
}

/**
 * Test the Google Sheets API connection with a simple list operation
 */
async function testSheetsApi(auth) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // List spreadsheets to test the connection
    const response = await sheets.spreadsheets.get({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Google Sheets example spreadsheet
    });
    
    console.log('\n✅ Successfully connected to Google Sheets API!');
    console.log('Test spreadsheet title:', response.data.properties.title);
    console.log('\nYou are now ready to use the Sheets API with the sheet-call.js script.');
    console.log('\nExample usage:');
    console.log('  node sheet-call.js YOUR_SPREADSHEET_ID Sheet1');
    console.log('\nMake sure your spreadsheet has the following columns:');
    console.log('- Phone or Phone Number or Mobile (required)');
    console.log('- Name or Contact Name or Full Name (optional)');
    console.log('- Status or Call Status (optional, will be updated)');
    console.log('- Message or Custom Message (optional)');
  } catch (error) {
    console.error('Error testing Sheets API:', error.message);
    if (error.code === 404) {
      console.error('The example spreadsheet was not found. This is likely a permission issue.');
    }
  }
}

// Run the authorization flow
authorize()
  .then(testSheetsApi)
  .catch(console.error); 