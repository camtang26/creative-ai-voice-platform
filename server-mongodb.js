/**
 * Enhanced Server with MongoDB Integration (Main App Service)
 * 
 * Key Improvements:
 * 1. Enhanced Twilio data collection
 * 2. Robust call recording
 * 3. Automatic call termination
 * 4. Improved architecture
 * 5. Socket.IO real-time updates
 * 6. Standardized API responses and error handling
 * 7. API authentication for sensitive operations
 * 8. MongoDB database integration for persistent storage
 */
import 'dotenv/config';
import fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io'; // Import the socket.io plugin
import fastifyWebsocket from '@fastify/websocket'; // Added back for WebSocket proxy
import { WebSocketServer, WebSocket } from 'ws'; // CORRECTED: Import WebSocketServer and WebSocket client
import fastifyFormBody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart'; // Import multipart plugin
import fastifyCors from '@fastify/cors'; // Added for CORS
import fastifyHelmet from '@fastify/helmet'; // Added for security headers
// Removed node-fetch import - using native fetch
import crypto from 'crypto';
import getRawBody from 'raw-body'; // Import raw-body library
import Twilio from 'twilio';
import mongoose from 'mongoose';
import { recordAMDResult, recordCallStart, getAMDStats } from './amd-metrics.js';
import {
  registerOutboundRoutes,
  activeCalls,
  getSignedUrl, // ADDED BACK: Needed by merged WS handler
  isConversationComplete, // ADDED BACK: Needed by merged WS handler
  terminateCall, // Keep if needed by webhooks/API directly
  // setDynamicVariables // Keep commented unless needed directly by main server logic
} from './outbound.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';
import { handleTwilioCallCompletion } from './src/integrations/twilio-crm-webhook.js';
import enhancedCallHandler from './enhanced-call-handler.js';
import { trackTermination, getTerminationInfo } from './call-termination-tracker.js';
import recordingHandler from './recording-handler.js';
import callQualityMetrics from './call-quality-metrics.js';
import { registerApiRoutes } from './api-routes.js';
import { getTerminationFromVoiceInsights } from './twilio-voice-insights.js';
import { registerRecordingApiRoutes } from './db/api/recording-api.js'; // ADDED Import
// Removed import for registerElevenLabsApiRoutes
import { registerApiMiddleware } from './api-middleware.js';
import {
  initializeSocketServer,
  emitCallUpdate,
  emitActiveCallsList,
  handleCallStatusChange,
  setActiveCallsReference,
  emitTranscriptMessage,
  emitTranscriptTypewriter 
} from './socket-server.js';

// Import MongoDB integration
import {
  initializeMongoDB,
  getEnhancedWebhookHandler,
  getCallRepository,
  getRecordingRepository,
  getTranscriptRepository, // Ensure this is exported from db/index.js
  getCallEventRepository,
  getAnalyticsRepository,
  getCampaignRepository, // Added for Google Sheet campaign
  getContactRepository   // Added for Google Sheet campaign
  // getRecordingRepository // Removed dangling identifier causing SyntaxError
} from './db/index.js';
// Import specific repository function needed for the temporary route
import { getRecordingBySid } from './db/repositories/recording.repository.js';
import { verifyWebhookSignature } from './db/webhook-handler-db.js';
import { 
  initializeCampaignEngine, 
  handleCallStatusUpdate as handleCampaignCallStatus,
  startCampaign as startCampaignEngine
} from './db/campaign-engine.js';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { registerWebSocketProxy } from './media-proxy-handler.js';

// Get Twilio credentials from environment
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

// Create Twilio client
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
    region: 'au1' 
  });
  console.log("[Twilio] Server initialized Twilio client with Australia region (au1)");
}

// Initialize Fastify
const server = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[REDACTED]'
    }
    // Consider adding transport for pretty-printing locally if needed (ensure pino-pretty is a dev dependency):
    // transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
  trustProxy: true, // Trust proxy headers like X-Forwarded-Proto
  http: {
    connectionTimeout: 30000,       
    keepAliveTimeout: 30000,        
    maxRequestsPerSocket: 0,        
    headersTimeout: 30000,          
    requestTimeout: 30000,          
    tcpKeepAlive: true,             
    tcpNoDelay: true                
  },
  genReqId: req => {
    return `req-${crypto.randomBytes(8).toString('hex')}`;
  }
});

// Removed alternative download route

// Removed early download route definition

// Register plugins
// IMPORTANT: Register fastify-socket.io FIRST
server.register(fastifySocketIO, {
  allowEIO3: true, // Add for broader compatibility
  cors: {
    origin: '*', // Allow all origins for simplicity, restrict in production
    methods: ['GET', 'POST']
  },
  // Allow both polling and websocket transports
  transports: ['polling', 'websocket'], 
  path: '/socket.io/', // Original path for frontend connection
  pingInterval: 10000,
  pingTimeout: 5000,
  connectTimeout: 5000,
  perMessageDeflate: false
});

// Register WebSocket plugin for media proxy
server.register(fastifyWebsocket);
console.log('[Server] Registered @fastify/websocket plugin');

server.register(fastifyFormBody);
server.register(fastifyMultipart, {
  // attachFieldsToBody: true, // Let's remove this to see if request.parts() works as expected
  // limits: { // Optional: configure limits
  //   fieldNameSize: 100, // Max field name size in bytes
  //   fieldSize: 1000000, // Max field value size in bytes
  //   fields: 10,         // Max number of non-file fields
  //   fileSize: 10000000, // For multipart forms, the max file size in bytes
  //   files: 1,           // Max number of file fields
  //   headerPairs: 2000   // Max number of header key=>value pairs
  // }
});
console.log('[Server] Registered @fastify/multipart plugin');

// Register @fastify/cors
server.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests from localhost:3000 and localhost:3001 for local development
    // In production, allow Render.com frontend deployments and custom frontend URLs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002'
    ];
    
    // Add frontend URL from environment variable
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    // In production, allow common deployment platforms
    if (process.env.NODE_ENV === 'production') {
      // Allow any Vercel deployment
      if (origin && origin.includes('.vercel.app')) {
        allowedOrigins.push(origin);
      }
      // Allow any Netlify deployment
      if (origin && origin.includes('.netlify.app')) {
        allowedOrigins.push(origin);
      }
      // Allow any Render deployment
      if (origin && origin.includes('.onrender.com')) {
        allowedOrigins.push(origin);
      }
      // Allow any GitHub Pages deployment
      if (origin && origin.includes('.github.io')) {
        allowedOrigins.push(origin);
      }
      // Allow any custom domain that might be using our API
      if (origin && (origin.includes('investorsignals') || origin.includes('conversational-agent'))) {
        allowedOrigins.push(origin);
      }
    }
    
    // Allow requests without origin (server-to-server, health checks, etc.)
    if (!origin) {
      cb(null, true);
      return;
    }
    
    console.log(`[CORS] Checking origin: ${origin}, allowed: ${allowedOrigins.includes(origin)}`);
    console.log(`[CORS] Allowed origins list:`, allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    
    // For debugging, log the rejected origin
    console.error(`[CORS] Rejected origin: ${origin}`);
    cb(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Ensure OPTIONS is included
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-elevenlabs-signature', 'xi-api-key'], // Add any custom headers your frontend might send
  credentials: true, // If you need to handle cookies or authorization headers
  preflightContinue: false, // Let @fastify/cors handle the preflight response directly
  optionsSuccessStatus: 204 // Use 204 No Content for OPTIONS success
});
console.log('[Server] Registered @fastify/cors plugin');

// Register Helmet for security headers
server.register(fastifyHelmet);
console.log('[Server] Registered @fastify/helmet plugin');

// --- Add Content Type Parser to capture raw body buffer ---
server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    // Attach the raw buffer to the request object
    req.rawBuffer = body;
    // Log for debugging
    req.log.info('[ContentTypeParser] Attached raw buffer to request.rawBuffer');
    // Parse the JSON using the default parser (or handle potential errors)
    const json = JSON.parse(body.toString());
    done(null, json); // Pass the parsed JSON to the handler (request.body)
  } catch (err) {
    req.log.error({ err }, '[ContentTypeParser] Error parsing JSON body after capturing buffer');
    err.statusCode = 400;
    done(err, undefined); // Signal error to Fastify
  }
});
console.log('[Server] Added application/json content type parser to capture raw buffer.');
// --- End Content Type Parser ---

// Register API middleware
registerApiMiddleware(server);

// Explicit OPTIONS handler for /api/outbound-call to ensure CORS preflight works on Render
server.options('/api/outbound-call', async (request, reply) => {
  // Minimal headers, @fastify/cors should have already set broader ones if it ran.
  // This ensures a 204 response if @fastify/cors didn't catch it.
  reply.header('Access-Control-Allow-Origin', request.headers.origin || '*'); // Reflect origin or allow all
  reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-elevenlabs-signature, xi-api-key');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.code(204).send();
});
console.log('[Server] Registered explicit OPTIONS handler for /api/outbound-call');
// Register outbound calling routes (will need MEDIA_PROXY_SERVICE_URL env var)
registerOutboundRoutes(server, { skipCallStatusCallback: true });

// Register WebSocket proxy handler for Twilio-ElevenLabs bridge
if (twilioClient) {
  registerWebSocketProxy(server, { twilioClient });
  console.log('[Server] Registered WebSocket proxy handler for transcript streaming');
} else {
  console.warn('[Server] Skipping WebSocket proxy registration - Twilio client not available');
}

// Register additional API routes
registerApiRoutes(server, twilioClient, activeCalls); // This now includes the ElevenLabs route
// registerRecordingApiRoutes(server); // REMOVED: This is called within initializeMongoDB

// Removed temporary download route definition
// Removed call to registerElevenLabsApiRoutes(server);

// Add a simple health check endpoint for Railway
server.get('/healthz', async (request, reply) => {
  // Optionally add checks for database connection, etc.
  return { status: 'ok', timestamp: new Date().toISOString() };
});
console.log('[Server] Registered /healthz endpoint');

// Removed duplicate test endpoint code

// Removed test route - CSV endpoint working properly

// Removed simple test route

// Share the active calls map with handlers
setActiveCallsReference(activeCalls);
enhancedCallHandler.setActiveCallsReference(activeCalls);
enhancedCallHandler.setTwilioClientReference(twilioClient);
recordingHandler.setActiveCallsReference(activeCalls);
recordingHandler.setTwilioClientReference(twilioClient);
callQualityMetrics.setActiveCallsReference(activeCalls);
callQualityMetrics.setTwilioClientReference(twilioClient);

// Start the call monitoring heartbeat
enhancedCallHandler.startCallMonitoringHeartbeat(5000); 

// Helper function to verify webhook signature (kept for ElevenLabs webhook)
function verifySignature(payload, signature, secret) {
  if (!secret || !signature) {
    console.log('[Webhook] No secret or signature provided, skipping validation');
    return true;
  }
  try {
    const [timestampPart, hashPart] = signature.split(',');
    const timestamp = timestampPart.replace('t=', '');
    const receivedHash = hashPart.replace('v0=', '');
    const fullPayloadToSign = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = 'v0=' + hmac.digest('hex');
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

// --- Google Sheets API Helper ---
let sheetsApiInstance; // To cache the initialized sheets API

async function getGoogleSheetsApi() {
  if (sheetsApiInstance) {
    return sheetsApiInstance;
  }
  try {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    try {
      await fs.access(credentialsPath);
    } catch (error) {
      console.error('[Google Sheets] Error: credentials.json file not found.');
      console.error('[Google Sheets] Please download your Google API credentials file and save it as credentials.json in the project root.');
      throw new Error('credentials.json not found');
    }

    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    
    const tokenPath = path.join(process.cwd(), 'token.json');
    let token;
    try {
      token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
    } catch (error) {
      console.error('[Google Sheets] No token.json file found. Please authenticate first by running: node google-auth.js');
      throw new Error('token.json not found, please run google-auth.js');
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    if (!client_secret || !client_id || !redirect_uris || !redirect_uris.length) {
      console.error('[Google Sheets] Invalid credentials.json structure. Missing client_secret, client_id, or redirect_uris.');
      throw new Error('Invalid credentials.json structure');
    }
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);

    // Check if token is expired and refresh if necessary
    if (oAuth2Client.isTokenExpiring()) {
      console.log('[Google Sheets] Token is expiring or expired, attempting to refresh...');
      try {
        const { credentials: newCredentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newCredentials);
        await fs.writeFile(tokenPath, JSON.stringify(newCredentials));
        console.log('[Google Sheets] Token refreshed and saved successfully.');
      } catch (refreshError) {
        console.error('[Google Sheets] Error refreshing token:', refreshError.message);
        console.error('[Google Sheets] Please re-authenticate by running: node google-auth.js');
        throw new Error('Failed to refresh Google API token. Please re-authenticate.');
      }
    }

    sheetsApiInstance = google.sheets({ version: 'v4', auth: oAuth2Client });
    console.log('[Google Sheets] Successfully authenticated and initialized Google Sheets API client.');
    return sheetsApiInstance;
  } catch (error) {
    console.error('[Google Sheets] Error setting up Google Sheets API client:', error.message);
    // Ensure sheetsApiInstance is not set if setup fails
    sheetsApiInstance = null; 
    throw error; // Re-throw the error to be caught by the route handler
  }
}
// --- End Google Sheets API Helper ---
// --- Google Sheet Campaign API Endpoints ---

// Endpoint to load and preview Google Sheet data
server.post('/api/campaigns/google-sheet/load-data', async (request, reply) => {
  const { spreadsheetId, sheetName = 'Sheet1' } = request.body; // Default to 'Sheet1'

  if (!spreadsheetId) {
    return reply.code(400).send({ success: false, error: 'Spreadsheet ID is required.' });
  }

  try {
    const sheets = await getGoogleSheetsApi();
    server.log.info(`[GS Load] Attempting to load data for Spreadsheet ID: ${spreadsheetId}, Sheet: ${sheetName}`);

    // Fetch a limited range for preview, e.g., A1:Z10 (headers + 9 data rows)
    // Adjust range as needed, e.g., more columns if necessary
    const range = `${sheetName}!A1:Z10`; 
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      server.log.warn(`[GS Load] No data found in sheet: ${sheetName} for ID: ${spreadsheetId}`);
      return reply.code(404).send({ success: false, error: 'No data found in the specified sheet.' });
    }

    const headers = rows[0];
    const previewRows = rows.slice(1);

    server.log.info(`[GS Load] Successfully loaded ${previewRows.length} preview rows from ${sheetName}`);
    return reply.code(200).send({ 
      success: true, 
      message: 'Sheet data loaded successfully for preview.',
      spreadsheetId,
      sheetName,
      headers,
      previewRows,
      totalRowsInPreviewRange: rows.length -1 // Total data rows in the fetched range
    });

  } catch (error) {
    server.log.error({ err: error, spreadsheetId, sheetName }, '[GS Load] Error loading Google Sheet data');
    if (error.message === 'credentials.json not found' || error.message === 'token.json not found, please run google-auth.js' || error.message === 'Invalid credentials.json structure' || error.message === 'Failed to refresh Google API token. Please re-authenticate.') {
        return reply.code(500).send({ success: false, error: `Google Sheets authentication error: ${error.message}. Please check server configuration and run google-auth.js if needed.` });
    }
    // Check for specific Google API errors by code
    if (error.code === 404) {
        return reply.code(404).send({ success: false, error: 'Spreadsheet not found. Please check the Spreadsheet ID.' });
    }
    if (error.code === 403) {
        return reply.code(403).send({ success: false, error: 'Permission denied to access the Spreadsheet. Check sharing settings and API permissions.' });
    }
    if (error.message && error.message.includes('Requested entity was not found')) { // Another way Google API might report not found for sheets within a spreadsheet
        return reply.code(404).send({ success: false, error: `Sheet "${sheetName}" not found in spreadsheet. Please check the sheet name.` });
    }
    return reply.code(500).send({ success: false, error: 'Failed to load Google Sheet data.', details: error.message });
  }
// Endpoint to start a campaign from Google Sheet
server.post('/api/campaigns/google-sheet/start', async (request, reply) => {
  const { 
    spreadsheetId, 
    sheetName = 'Sheet1', 
    maxCalls: maxCallsStr, // Will be string from JSON
    agentPrompt, 
    firstMessage,
    campaignName: customCampaignName 
  } = request.body;

  const maxCalls = maxCallsStr ? parseInt(maxCallsStr) : undefined;

  if (!spreadsheetId) {
    return reply.code(400).send({ success: false, error: 'Spreadsheet ID is required.' });
  }
  if (!agentPrompt) {
    return reply.code(400).send({ success: false, error: 'Agent prompt is required.' });
  }
  if (!firstMessage) {
    return reply.code(400).send({ success: false, error: 'First message is required.' });
  }

  server.log.info(`[GS Start] Received request to start campaign from Spreadsheet ID: ${spreadsheetId}, Sheet: ${sheetName}`);

  try {
    const sheets = await getGoogleSheetsApi();
    const campaignRepository = getCampaignRepository();
    const contactRepository = getContactRepository();
    
    // 1. Setup Campaign in MongoDB
    const campaignTitle = customCampaignName || `Google Sheet Campaign ${spreadsheetId.substring(0,6)} - ${new Date().toISOString().split('T')[0]}`;
    let currentCampaign;

    const existingCampaigns = await campaignRepository.getCampaigns({
      name: campaignTitle, // More specific search if possible
      "sheetInfo.spreadsheetId": spreadsheetId,
      "sheetInfo.sheetName": sheetName
    });

    if (existingCampaigns && existingCampaigns.campaigns && existingCampaigns.campaigns.length > 0) {
      currentCampaign = existingCampaigns.campaigns[0];
      // Update existing campaign with potentially new prompt/message
      currentCampaign = await campaignRepository.updateCampaign(currentCampaign._id, {
        prompt: agentPrompt,
        firstMessage: firstMessage,
        // Potentially update other settings if they are part of the UI form
        sheetInfo: { // Ensure sheetInfo is preserved/updated
          spreadsheetId,
          sheetName,
          phoneColumn: 'phone', // Keep defaults or make configurable
          nameColumn: 'name',
          statusColumn: 'status',
          customMessageColumn: 'message'
        }
      });
      server.log.info(`[GS Start] Using and updated existing campaign: ${currentCampaign.name} (${currentCampaign._id})`);
    } else {
      currentCampaign = await campaignRepository.saveCampaign({
        name: campaignTitle,
        description: `Campaign created from Google Sheet: ${spreadsheetId}/${sheetName}`,
        status: 'draft', // Start as draft, will be activated after contact import
        prompt: agentPrompt,
        firstMessage: firstMessage,
        callerId: process.env.TWILIO_PHONE_NUMBER,
        sheetInfo: {
          spreadsheetId,
          sheetName,
          phoneColumn: 'phone',
          nameColumn: 'name',
          statusColumn: 'status',
          customMessageColumn: 'message'
        },
        settings: { // Default settings, consider making these configurable
          callDelay: 10000, // 10 seconds
          maxConcurrentCalls: 1,
          retryCount: 1,
          retryDelay: 3600000 // 1 hour
        },
        // stats will be initialized by default in the model
      });
      server.log.info(`[GS Start] Created new campaign: ${currentCampaign.name} (${currentCampaign._id})`);
    }
    
    // 2. Get Contacts from Sheet (adapted from mongodb-sheet-call.js)
    server.log.info(`[GS Start] Reading data from spreadsheet: ${spreadsheetId}, sheet: ${sheetName}`);
    const range = `${sheetName}!A:Z`; // Read all columns
    const sheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = sheetResponse.data.values;

    if (!rows || rows.length === 0) {
      server.log.warn(`[GS Start] No data found in sheet: ${sheetName} for ID: ${spreadsheetId}`);
      // await campaignRepository.updateCampaignStatus(currentCampaign._id, 'failed', { reason: 'No data in sheet' });
      return reply.code(404).send({ success: false, error: 'No data found in the specified sheet.' });
    }

    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    const phoneIndex = headers.findIndex(h => ['phone', 'phone number', 'mobile'].includes(h));
    const nameIndex = headers.findIndex(h => ['name', 'contact name', 'full name'].includes(h));
    const statusIndex = headers.findIndex(h => ['status', 'call status'].includes(h)); // For updating sheet
    const customMessageIndex = headers.findIndex(h => ['message', 'custom message'].includes(h));

    if (phoneIndex === -1) {
      server.log.error('[GS Start] Phone column not found in sheet.');
      return reply.code(400).send({ success: false, error: 'A "phone" column (e.g., "phone", "phone number", "mobile") is required in the sheet.' });
    }
    if (nameIndex === -1) { // Added check for name column
      server.log.error('[GS Start] Name column not found in sheet.');
      return reply.code(400).send({ success: false, error: 'A "name" column (e.g., "name", "contact name", "full name") is required in the sheet for personalized first messages.' });
    }

    const sheetContactsData = rows.slice(1)
      .map((row, index) => ({
        rowIndex: index + 2, // 1-indexed + header
        phone: String(row[phoneIndex] || '').trim(),
        name: nameIndex !== -1 ? String(row[nameIndex] || '').trim() : '', // Name is now guaranteed to be found due to check above, but keep defensive access
        currentSheetStatus: statusIndex !== -1 ? String(row[statusIndex] || '').toLowerCase().trim() : '',
        customMessage: customMessageIndex !== -1 ? String(row[customMessageIndex] || '').trim() : ''
      }))
      .filter(c => c.phone && c.name && (c.currentSheetStatus === 'pending' || c.currentSheetStatus === '')); // Added c.name to filter

    if (sheetContactsData.length === 0) {
        server.log.info('[GS Start] No pending contacts found in the sheet.');
        // await campaignRepository.updateCampaignStatus(currentCampaign._id, 'completed');
        return reply.code(200).send({ success: true, message: 'No pending contacts to call.', campaignId: currentCampaign._id });
    }
    
    const contactsToCall = maxCalls ? sheetContactsData.slice(0, maxCalls) : sheetContactsData;
    server.log.info(`[GS Start] Prepared ${contactsToCall.length} contacts for calling for campaign ${currentCampaign.name}.`);

    // Import/Update contacts in MongoDB
    const contactsToImport = sheetContactsData.map(contact => ({
      phoneNumber: contact.phone,
      name: contact.name,
      email: '', // Assuming email is not a primary field from sheet for now
      status: 'active', // Default status for new/updated contacts in DB
      campaigns: [currentCampaign._id], // Associate with current campaign
      customFields: {
        customMessage: contact.customMessage,
        // sheet_status: contact.currentSheetStatus // Optionally store original sheet status
      },
      sheetInfo: { // Store sheet origin info
        spreadsheetId,
        sheetName,
        rowIndex: contact.rowIndex
      }
    }));

    if (contactsToImport.length > 0) {
      server.log.info(`[GS Start] Importing/updating ${contactsToImport.length} contacts into MongoDB for campaign ${currentCampaign.name}...`);
      const importResults = await contactRepository.importContacts(contactsToImport, currentCampaign._id); // Pass campaignId for association
      server.log.info(`[GS Start] MongoDB Import Results: Created ${importResults.created}, Updated: ${importResults.updated}, Failed: ${importResults.failed}`);
    }
    
    // Fetch all contacts newly associated or already part of this campaign that are pending a call
    // This requires a method in contactRepository to fetch by campaign and status
    // For now, we'll use the sheetContactsData and assume they are the ones to call if pending
    // A more robust way: query contactRepository for contacts linked to campaignId with a 'pending_call' status.
    
    // Update campaign with total contacts (consider only new ones or all for this run)
    await campaignRepository.updateCampaignStats(currentCampaign._id, {
      totalContacts: contactsToCall.length // Based on filtered contacts from sheet for this run
    });
    
    // Activate campaign now that contacts are processed
    currentCampaign = await campaignRepository.updateCampaignStatus(currentCampaign._id, 'active');
    server.log.info(`[GS Start] Campaign ${currentCampaign.name} activated.`);

    // 3. Initiate Calls (Loop and call /outbound-call)
    // IMPORTANT: This is a simplified loop. For production, use a job queue.
    let callsInitiatedCount = 0;
    for (const contact of contactsToCall) {
      try {
        const effectiveFirstMessage = contact.customMessage || firstMessage.replace("{name}", contact.name || "there");
        
        server.log.info(`[GS Start] Initiating call to ${contact.name || contact.phone} for campaign ${currentCampaign.name}`);
        const callApiResponse = await fetch(`${request.protocol}://${request.hostname}/api/outbound-call`, { // Use relative URL
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: contact.phone,
            prompt: agentPrompt,
            first_message: effectiveFirstMessage,
            name: contact.name || "Unknown",
            campaignId: currentCampaign._id,
            contactId: contact.db_id || null // Pass MongoDB contact ID if available after import
          }),
        });

        const callApiData = await callApiResponse.json();
        if (callApiResponse.ok && callApiData.success) {
          callsInitiatedCount++;
          server.log.info(`[GS Start] Call to ${contact.phone} initiated. SID: ${callApiData.callSid}`);
          // Update sheet status (simplified)
          if (statusIndex !== -1) {
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!${String.fromCharCode(65 + statusIndex)}${contact.rowIndex}`,
              valueInputOption: 'USER_ENTERED', // Or 'RAW'
              resource: { values: [['Calling...']] }, // Or 'Dialing'
            });
          }
        } else {
          server.log.error(`[GS Start] Failed to initiate call to ${contact.phone}: ${callApiData.error || 'Unknown error'}`);
           if (statusIndex !== -1) {
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!${String.fromCharCode(65 + statusIndex)}${contact.rowIndex}`,
              valueInputOption: 'USER_ENTERED',
              resource: { values: [['Failed to initiate']] },
            });
          }
        }
      } catch (callError) {
        server.log.error({ err: callError, contactPhone: contact.phone }, `[GS Start] Error during call initiation loop for ${contact.phone}`);
      }
      // Optional: Add a delay between calls if needed
      const callDelay = currentCampaign.settings?.callDelay || 60000; // Use campaign setting or default to 60s
      server.log.info(`[GS Start] Waiting for ${callDelay / 1000} seconds before next call.`);
      await new Promise(resolve => setTimeout(resolve, callDelay));
    }
    
    await campaignRepository.updateCampaignStats(currentCampaign._id, {
      callsPlaced: (currentCampaign.stats.callsPlaced || 0) + callsInitiatedCount
      // Potentially update other stats like 'inProgress' or 'completed' based on loop outcome
    });

    // If all contacts intended for this run were processed, consider updating campaign status
    // This logic might be more complex depending on whether this is a partial run or full campaign execution
    if (callsInitiatedCount > 0 && callsInitiatedCount === contactsToCall.length) {
       server.log.info(`[GS Start] All ${callsInitiatedCount} contacts for this run processed for campaign ${currentCampaign.name}.`);
       // Optionally set to 'in-progress' or 'completed' if this run finishes the campaign batch
       // For now, leave as 'active' as calls are asynchronous.
    } else if (callsInitiatedCount === 0 && contactsToCall.length > 0) {
        server.log.warn(`[GS Start] No calls were successfully initiated for campaign ${currentCampaign.name} despite having contacts.`);
    }


    server.log.info(`[GS Start] Finished processing ${contactsToCall.length} contacts for campaign ${currentCampaign.name}. Successfully initiated ${callsInitiatedCount} calls.`);
    return reply.code(200).send({ 
      success: true, 
      message: `Campaign started. Attempted to initiate ${callsInitiatedCount} of ${contactsToCall.length} calls.`,
      campaignId: currentCampaign._id,
      campaignName: currentCampaign.name,
      contactsProcessed: contactsToCall.length,
      callsInitiated: callsInitiatedCount
    });

  } catch (error) {
    server.log.error({ err: error, spreadsheetId, sheetName }, '[GS Start] Error starting Google Sheet campaign');
     if (error.message === 'credentials.json not found' || error.message === 'token.json not found, please run google-auth.js' || error.message === 'Invalid credentials.json structure' || error.message === 'Failed to refresh Google API token. Please re-authenticate.') {
        return reply.code(500).send({ success: false, error: `Google Sheets authentication error: ${error.message}. Please check server configuration and run google-auth.js if needed.` });
    }
    if (error.code === 404) {
        return reply.code(404).send({ success: false, error: 'Spreadsheet not found. Please check the Spreadsheet ID.' });
    }
    if (error.code === 403) {
        return reply.code(403).send({ success: false, error: 'Permission denied to access the Spreadsheet. Check sharing settings and API permissions.' });
    }
     if (error.message && error.message.includes('Requested entity was not found')) { 
        return reply.code(404).send({ success: false, error: `Sheet "${sheetName}" not found in spreadsheet. Please check the sheet name.` });
    }
    return reply.code(500).send({ success: false, error: 'Failed to start Google Sheet campaign.', details: error.message });
  }
});
});
// --- End Google Sheet Campaign API Endpoints ---

// --- CSV Upload Campaign API Endpoint ---
server.post('/api/db/campaigns/start-from-csv', async (request, reply) => {
  server.log.info('[CSV Upload] Received request to start campaign from CSV upload');
  
  try {
    // Parse multipart form data - process all parts
    const parts = request.parts();
    let fileData = null;
    const fields = {};
    
    for await (const part of parts) {
      if (part.type === 'file') {
        // This is the CSV file
        fileData = part;
        server.log.info(`[CSV Upload] Received file: ${part.filename}`);
      } else if (part.type === 'field') {
        // This is a form field
        fields[part.fieldname] = part.value;
        server.log.info(`[CSV Upload] Received field ${part.fieldname}: ${part.value}`);
      }
    }
    
    if (!fileData) {
      return reply.code(400).send({ success: false, error: 'No file uploaded.' });
    }

    const { 
      agentPrompt, 
      firstMessage, 
      campaignName: customCampaignName,
      callInterval: callIntervalStr,
      validatePhoneNumbers 
    } = fields;
    
    server.log.info('[CSV Upload] Form fields:', { 
      campaignName: customCampaignName, 
      hasAgentPrompt: !!agentPrompt, 
      hasFirstMessage: !!firstMessage,
      callInterval: callIntervalStr,
      validatePhoneNumbers 
    });

    // Parse call interval (default to 90 seconds - middle of 1-2 minute range)
    const callInterval = callIntervalStr ? parseInt(callIntervalStr) : 90000;

    // Agent prompt is optional - if blank, ElevenLabs will use default system prompt
    // Only validate if it's provided but contains only whitespace
    if (agentPrompt && agentPrompt.trim() === '') {
      return reply.code(400).send({ success: false, error: 'Agent prompt cannot be just whitespace. Leave blank to use default.' });
    }
    
    // First message is optional - if not provided, ElevenLabs will use the platform's default
    const actualFirstMessage = firstMessage && firstMessage.trim() !== '' ? firstMessage : null;
    
    if (actualFirstMessage) {
      server.log.info('[CSV Upload] Using custom first message:', actualFirstMessage.substring(0, 50) + '...');
    } else {
      server.log.info('[CSV Upload] Using ElevenLabs platform default first message');
    }
    if (!customCampaignName || customCampaignName.trim() === '') {
      return reply.code(400).send({ success: false, error: 'Campaign name is required.' });
    }

    // Read and parse CSV file
    const csvContent = await fileData.toBuffer();
    const csvText = csvContent.toString('utf-8');
    
    server.log.info('[CSV Upload] Parsing CSV file...');
    
    // Parse CSV with header row
    const records = await new Promise((resolve, reject) => {
      parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    if (!records || records.length === 0) {
      return reply.code(400).send({ success: false, error: 'CSV file is empty or invalid.' });
    }

    server.log.info(`[CSV Upload] Found ${records.length} records in CSV`);

    // Process and validate contacts
    const validContacts = [];
    const invalidNumbers = [];
    const seenPhoneNumbers = new Map(); // Track phone numbers and their first occurrence
    
    for (const record of records) {
      // Helper function to clean quotes from values
      const cleanValue = (value) => {
        if (!value) return '';
        // Remove leading and trailing quotes (both single and double)
        return String(value).replace(/^["']|["']$/g, '').trim();
      };
      
      // Try to find phone number in various possible column names and clean quotes
      const phoneNumber = cleanValue(
        record.Phone || record.phone || record['Phone Number'] || record['phone number'] || 
        record.Mobile || record.mobile || record.Cell || record.cell
      );
      
      // Clean quotes from name fields
      const firstName = cleanValue(
        record.FirstName || record.firstname || record['First Name'] || record['first name'] || 
        record.First || record.first || ''
      );
      const lastName = cleanValue(
        record.LastName || record.lastname || record['Last Name'] || record['last name'] || 
        record.Last || record.last || ''
      );
      
      // Also try full name field if first/last not available
      let fullName = '';
      if (firstName || lastName) {
        fullName = `${firstName} ${lastName}`.trim();
      } else {
        // Try to get from Name or Full Name column
        const nameField = cleanValue(
          record.Name || record.name || record['Full Name'] || record['full name'] || 
          record.FullName || record.fullname || record['Contact Name'] || record['contact name']
        );
        fullName = nameField || 'Unknown';
      }
      
      const email = cleanValue(
        record.Email || record.email || record['Email Address'] || record['email address'] || 
        record.EmailAddress || record.emailaddress || ''
      );
      
      if (!phoneNumber) {
        server.log.warn('[CSV Upload] Skipping record - no phone number found:', record);
        continue;
      }
      
      // Validate phone number if requested
      let isValid = true;
      let formattedPhone = phoneNumber;
      
      if (validatePhoneNumbers === 'true') {
        try {
          // First check if the number already has a country code (starts with +)
          if (phoneNumber.startsWith('+')) {
            // Try to parse as-is (already has country code)
            const phoneObj = parsePhoneNumber(phoneNumber);
            if (phoneObj && phoneObj.isValid()) {
              // Check if it's an Australian number
              if (phoneObj.country !== 'AU') {
                invalidNumbers.push({ name: fullName, phone: phoneNumber, reason: 'Only Australian numbers are supported' });
                continue;
              }
              formattedPhone = phoneObj.format('E.164');
              isValid = true;
            } else {
              invalidNumbers.push({ name: fullName, phone: phoneNumber, reason: 'Invalid phone number format' });
              continue;
            }
          } else {
            // No country code, default to Australian (+61)
            const phoneObj = parsePhoneNumber(phoneNumber, 'AU');
            if (phoneObj && phoneObj.isValid()) {
              formattedPhone = phoneObj.format('E.164');
              isValid = true;
            } else {
              // Try validation with AU country code
              isValid = isValidPhoneNumber(phoneNumber, 'AU');
              if (!isValid) {
                invalidNumbers.push({ name: fullName, phone: phoneNumber, reason: 'Invalid phone number format' });
                continue;
              } else {
                // If valid but couldn't parse, prepend +61 manually
                // Remove leading 0 if present (common in Australian numbers)
                let cleanedNumber = phoneNumber.trim();
                if (cleanedNumber.startsWith('0')) {
                  cleanedNumber = cleanedNumber.substring(1);
                }
                formattedPhone = `+61${cleanedNumber}`;
              }
            }
          }
        } catch (error) {
          server.log.warn(`[CSV Upload] Phone validation error for ${phoneNumber}:`, error.message);
          invalidNumbers.push({ name: fullName, phone: phoneNumber, reason: error.message });
          continue;
        }
      }
      
      // Check for duplicate phone numbers
      if (seenPhoneNumbers.has(formattedPhone)) {
        const firstOccurrence = seenPhoneNumbers.get(formattedPhone);
        invalidNumbers.push({ 
          name: fullName, 
          phone: phoneNumber, 
          reason: `Duplicate phone number (first seen with ${firstOccurrence})` 
        });
        continue;
      }
      
      // Track this phone number
      seenPhoneNumbers.set(formattedPhone, fullName);

      validContacts.push({
        phoneNumber: formattedPhone,
        name: fullName,
        email: email,
        firstName: firstName,
        lastName: lastName
      });
    }

    server.log.info(`[CSV Upload] Valid contacts: ${validContacts.length}, Invalid: ${invalidNumbers.length}`);

    if (validContacts.length === 0) {
      return reply.code(400).send({ 
        success: false, 
        error: 'No valid contacts found in CSV.', 
        invalidNumbers: invalidNumbers 
      });
    }

    // Get repositories
    const campaignRepository = getCampaignRepository();
    const contactRepository = getContactRepository();

    // Create campaign
    const campaignTitle = customCampaignName || `CSV Campaign - ${new Date().toISOString().split('T')[0]}`;
    
    const campaign = await campaignRepository.saveCampaign({
      name: campaignTitle,
      description: `Campaign created from CSV upload with ${validContacts.length} contacts`,
      status: 'draft',
      agentPrompt: agentPrompt || null, // Allow null for default ElevenLabs prompt
      firstMessage: actualFirstMessage,
      callerId: process.env.TWILIO_PHONE_NUMBER,
      csvInfo: {
        originalFileName: fileData.filename,
        totalRecords: records.length,
        validContacts: validContacts.length,
        invalidContacts: invalidNumbers.length
      },
      settings: {
        callDelay: callInterval, // Use the configured interval
        maxConcurrentCalls: 1,
        retryCount: 1,
        retryDelay: 3600000 // 1 hour
      }
    });

    server.log.info(`[CSV Upload] Created campaign: ${campaign.name} (${campaign._id})`);

    // Import contacts
    const contactsToImport = validContacts.map(contact => ({
      phoneNumber: contact.phoneNumber,
      name: contact.name,
      email: contact.email,
      status: 'pending',  // Set to pending so they're ready to be called
      campaignIds: [campaign._id],
      customFields: {
        firstName: contact.firstName,
        lastName: contact.lastName
      }
    }));

    const importResults = await contactRepository.importContacts(contactsToImport, campaign._id);
    server.log.info(`[CSV Upload] Import results: Created ${importResults.created}, Updated: ${importResults.updated}, Failed: ${importResults.failed}`);
    
    if (importResults.errors && importResults.errors.length > 0) {
      server.log.warn('[CSV Upload] Import errors:', importResults.errors);
    }
    
    // Consider both created and updated as "valid contacts" for the campaign
    const totalValidContacts = importResults.created + importResults.updated;
    if (totalValidContacts === 0) {
      server.log.error('[CSV Upload] No contacts were imported or updated!');
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to import any contacts from CSV.' 
      });
    }

    // Update campaign stats with actual imported contacts
    await campaignRepository.updateCampaignStats(campaign._id, {
      totalContacts: totalValidContacts
    });

    // Initialize campaign engine if not already initialized
    await initializeCampaignEngine();
    
    // Start campaign using the campaign engine
    server.log.info(`[CSV Upload] Starting campaign using campaign engine with ${validContacts.length} contacts`);
    
    try {
      const engineStarted = await startCampaignEngine(campaign._id.toString());
      
      if (engineStarted) {
        server.log.info(`[CSV Upload] Campaign started successfully in campaign engine`);
      } else {
        throw new Error('Failed to start campaign in engine');
      }
    } catch (error) {
      server.log.error(`[CSV Upload] Error starting campaign in engine:`, error);
      // Fallback to set campaign as active
      await campaignRepository.updateCampaignStatus(campaign._id, 'active');
    }

    // Return immediate response
    return reply.code(200).send({
      success: true,
      message: `Campaign created successfully. Starting to call ${validContacts.length} contacts.`,
      data: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        totalContacts: validContacts.length,
        invalidNumbers: invalidNumbers.length,
        callInterval: callInterval / 1000, // Return in seconds
        invalidNumbersList: invalidNumbers // Include details about invalid numbers
      }
    });

  } catch (error) {
    server.log.error({ err: error }, '[CSV Upload] Error processing CSV campaign');
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to process CSV file.', 
      details: error.message 
    });
  }
});

// Removed test route - CSV endpoint working properly

// --- End CSV Upload Campaign API Endpoint ---

// --- WebSocket Proxy Handler Removed (Moved to media-proxy-server.js) ---

// Simple debug webhook
server.post('/webhooks/elevenlabs-debug', (request, reply) => {
  console.log('[Webhook Debug] Received webhook with headers:', JSON.stringify(request.headers, null, 2));
  const bodyStr = JSON.stringify(request.body, null, 2);
  console.log('[Webhook Debug] Request body (truncated):', bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr);
  return reply.code(200).send({ status: 'success', message: 'Webhook received and logged' });
});

// MongoDB-enhanced webhook handler
let enhancedWebhookHandler;

// Define CRM Endpoint from environment variable
const crmEndpoint = process.env.CRM_WEBHOOK_URL;
if (!crmEndpoint) {
  console.warn('[Server Config] CRM_WEBHOOK_URL environment variable is not set. CRM forwarding will be disabled.');
}


// Main webhook handler
server.post('/webhooks/elevenlabs',
  // Removed config object and preHandler hook
  async (request, reply) => {
  try {
    // Removed check for reply.sent as preHandler is gone
    if (reply.sent) {
      return; // Stop processing if reply already sent by hook
    }
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    // Removed signature reading and verification logic from here.
    // It's now handled entirely within handleElevenLabsWebhook.
    console.log('[Webhook] Received ElevenLabs webhook. Forwarding to handler...');

    if (!enhancedWebhookHandler) {
        enhancedWebhookHandler = getEnhancedWebhookHandler(); // Ensure handler is initialized
        if (!enhancedWebhookHandler || typeof enhancedWebhookHandler.handleElevenLabsWebhook !== 'function') {
           console.error('[Webhook] CRITICAL: Enhanced webhook handler or handleElevenLabsWebhook function not available.');
           return reply.code(500).send({ success: false, error: 'Webhook handler configuration error' });
        }
    }
    
    // Call the handler from db/webhook-handler-db.js, passing the reply object
    // The handler is now responsible for reading raw body, verifying, parsing, and replying.
    await enhancedWebhookHandler.handleElevenLabsWebhook(request, reply, webhookSecret, crmEndpoint, twilioClient);
    // No need to send reply here, the handler does it.
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return reply.code(200).send({ status: 'error', message: error.message });
  }
});

// Test endpoint for CRM webhook
server.post('/api/test-crm-webhook', async (request, reply) => {
  try {
    const { callSid } = request.body;
    if (!callSid) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Missing callSid in request body' 
      });
    }
    
    console.log(`[API] Testing CRM webhook for call ${callSid}`);
    const result = await handleTwilioCallCompletion({ 
      CallSid: callSid, 
      CallStatus: 'completed' 
    });
    
    return reply.send({
      success: result.success,
      message: result.success ? 'CRM webhook sent successfully' : 'CRM webhook failed',
      details: result
    });
  } catch (error) {
    console.error('[API] Error testing CRM webhook:', error);
    return reply.code(500).send({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fallback TwiML endpoint
server.all('/fallback-twiml', async (request, reply) => {
  const { CallSid, ErrorCode } = request.body;
  console.log(`[Fallback] Received fallback for call ${CallSid}, error code: ${ErrorCode}`);
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're sorry, but there was a problem connecting your call. Please try again later.</Say><Hangup/></Response>`;
  if (activeCalls.has(CallSid)) {
    const callInfo = activeCalls.get(CallSid);
    callInfo.errorCode = ErrorCode; callInfo.status = 'failed'; callInfo.endTime = new Date();
    callInfo.error = 'Call failed and routed to fallback URL';
    activeCalls.set(CallSid, callInfo);
    handleCallStatusChange(CallSid, 'failed', callInfo);
    try {
      await getCallRepository().updateCallStatus(CallSid, 'failed', { errorCode: ErrorCode, endTime: new Date(), error: 'Call failed and routed to fallback URL' });
    } catch (error) { console.error(`[MongoDB] Error updating call in fallback handler:`, error); }
  }
  return reply.type("text/xml").send(twimlResponse);
});

// Recording status callback
server.post('/recording-status-callback', async (request, reply) => {
  try {
    console.log('[Recording] Received recording status callback. Event:', request.body.RecordingStatus);
    const result = recordingHandler.processRecordingCallback(request.body);
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'recording_update', { recordingStatus: request.body.RecordingStatus, recordingSid: request.body.RecordingSid, ...result });
    }
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration, RecordingChannels } = request.body;
      if (CallSid && RecordingSid) {
        await getRecordingRepository().saveRecording({
          recordingSid: RecordingSid, callSid: CallSid, url: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : null,
          channels: RecordingChannels ? parseInt(RecordingChannels) : 1,
          status: RecordingStatus || 'completed'
        });
        console.log(`[MongoDB] Saved recording ${RecordingSid} for call ${CallSid}`);
      }
    } catch (error) { console.error(`[MongoDB] Error storing recording data:`, error); }
    return reply.code(200).send({ success: true, message: 'Recording status update received', ...result });
  } catch (error) {
    console.error('[Recording] Error processing recording callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// AMD status callback
server.post('/amd-status-callback', async (request, reply) => {
  try {
    console.log('[AMD] Received answering machine detection callback');
    const { CallSid, AnsweredBy, CallStatus, MachineBehavior, Timestamp, TranscribedText, ...rest } = request.body;
    console.log(`[AMD] Call ${CallSid} answered by: ${AnsweredBy}, status: ${CallStatus}`);
    
    // Import the enhanced AMD detection function
    const { enhanceAMDDetection } = await import('./amd-config.js');
    
    // Record raw AMD metrics
    const amdData = { CallSid, AnsweredBy, MachineBehavior, CallStatus, TranscribedText, Timestamp: Timestamp || new Date().toISOString(), ...rest };
    recordAMDResult(CallSid, amdData);
    
    // Apply enhanced detection logic to reduce false positives
    const enhancedResult = enhanceAMDDetection(amdData);
    console.log(`[AMD Enhancement] Original: ${AnsweredBy}, Enhanced: ${enhancedResult.enhancedDetection}, Confidence: ${enhancedResult.confidence}`);
    if (enhancedResult.reason.length > 0) {
      console.log(`[AMD Enhancement] Reasoning: ${enhancedResult.reason.join(', ')}`);
    }
    
    // Use enhanced detection for decision making
    const effectiveDetection = enhancedResult.enhancedDetection;
    const processData = { ...amdData, AnsweredBy: effectiveDetection };
    
    // Process machine detection (includes ElevenLabs termination)
    enhancedCallHandler.processMachineDetection(processData);
    
    // Emit Socket.IO update with both original and enhanced detection
    emitCallUpdate(CallSid, 'machine_detection', { 
      answeredBy: AnsweredBy, 
      enhancedDetection: effectiveDetection,
      confidence: enhancedResult.confidence,
      machineBehavior: MachineBehavior, 
      status: CallStatus 
    });
    
    // Update database with enhanced detection
    try {
      await getCallRepository().updateCallStatus(CallSid, CallStatus, { 
        answeredBy: AnsweredBy,
        enhancedAnsweredBy: effectiveDetection,
        amdConfidence: enhancedResult.confidence,
        machineBehavior: MachineBehavior 
      });
      console.log(`[MongoDB] Updated call ${CallSid} with machine detection data`);
    } catch (error) { 
      console.error(`[MongoDB] Error updating call with machine detection data:`, error); 
    }
    
    return reply.code(200).send({ 
      success: true, 
      message: 'AMD status update received', 
      answeredBy: AnsweredBy,
      enhancedDetection: effectiveDetection,
      confidence: enhancedResult.confidence,
      callSid: CallSid 
    });
  } catch (error) {
    console.error('[AMD] Error processing AMD callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// Enhanced call status callback
server.post('/call-status-callback', async (request, reply) => {
  try {
    const { CallSid, CallStatus, RecordingUrl, RecordingSid } = request.body;
    console.log(`[Twilio Callback] Call ${CallSid} status: ${CallStatus}`);
    try {
      await getCallRepository().updateCallStatus(CallSid, CallStatus, request.body);
      console.log(`[MongoDB] Updated call ${CallSid} status to ${CallStatus}`);
    } catch (error) { console.error(`[MongoDB] Error updating call status:`, error); }
    try {
      await getCallEventRepository().logEvent(CallSid, 'status_change', { status: CallStatus, source: 'twilio', timestamp: new Date().toISOString(), body: request.body });
      console.log(`[MongoDB] Logged status_change event for call ${CallSid}`);
    } catch (error) { console.error(`[MongoDB] Error logging call event:`, error); }
    const callInfo = activeCalls.get(CallSid) || { sid: CallSid, startTime: new Date(), recordings: [] };
    const previousStatus = callInfo.status;
    callInfo.status = CallStatus;
    callInfo.from = request.body.From || callInfo.from || 'unknown';
    callInfo.to = request.body.To || callInfo.to || 'unknown';
    if (['completed', 'failed', 'canceled', 'busy', 'no-answer'].includes(CallStatus)) {
      callInfo.endTime = new Date();
      if (callInfo.startTime) { callInfo.duration = Math.round((callInfo.endTime - new Date(callInfo.startTime)) / 1000); }
      
      // Fetch actual call details from Twilio to get "Who Hung Up" data
      let whoHungUp = null;
      try {
        if (twilioClient && CallStatus === 'completed') {
          console.log(`[Twilio] Fetching call details for ${CallSid} to get Who Hung Up data`);
          const callDetails = await twilioClient.calls(CallSid).fetch();
          
          // Twilio provides answeredBy in the call details
          if (callDetails.answeredBy) {
            await getCallRepository().updateCallStatus(CallSid, null, {
              answeredBy: callDetails.answeredBy
            });
          }
          
          // Get Voice Insights data if available (this is where "Who Hung Up" lives)
          // For now, we'll parse it from the subresource URIs or use heuristics
          const duration = callDetails.duration;
          const direction = callDetails.direction;
          
          // Determine who hung up based on call characteristics
          // This is a temporary solution until we implement full Voice Insights
          if (CallStatus === 'completed' && duration) {
            // Default to 'agent' for completed calls unless we have evidence otherwise
            whoHungUp = 'agent';
            
            // Very short calls are likely user hangups
            if (duration < 10) {
              whoHungUp = 'user';
            }
            
            // If we have existing termination info from ElevenLabs, use that
            const existingTermination = getTerminationInfo(CallSid);
            if (existingTermination && existingTermination.source === 'elevenlabs_webhook') {
              // ElevenLabs terminated means AI agent completed
              whoHungUp = 'agent';
            }
          }
        }
      } catch (twilioError) {
        console.error(`[Twilio] Error fetching call details:`, twilioError);
      }
      
      // Track call termination if not already tracked
      const existingTermination = getTerminationInfo(CallSid);
      if (!existingTermination) {
        // Call ended but we didn't track it from WebSocket/ElevenLabs
        // This means it was likely a user hangup or system issue
        trackTermination(CallSid, 'twilio_status', CallStatus, {
          duration: callInfo.duration,
          hasTranscript: !!callInfo.transcriptId,
          from: callInfo.from,
          to: callInfo.to,
          whoHungUp: whoHungUp
        });
      }
      
      // Get final termination info to save to database
      const terminationInfo = getTerminationInfo(CallSid);
      if (terminationInfo || whoHungUp) {
        // Update database with terminatedBy
        try {
          const updateData = {};
          if (terminationInfo) {
            updateData.terminatedBy = terminationInfo.terminatedBy;
            updateData.terminationReason = terminationInfo.reason;
            updateData.terminationSource = terminationInfo.source;
          }
          
          // Override with actual Twilio data if we have it
          if (whoHungUp) {
            updateData.terminatedBy = whoHungUp;
            updateData.terminationSource = 'twilio_call_details';
          }
          
          await getCallRepository().updateCallStatus(CallSid, null, updateData);
          console.log(`[MongoDB] Updated call ${CallSid} with termination info: ${updateData.terminatedBy}`);
        } catch (error) {
          console.error(`[MongoDB] Error updating termination info:`, error);
        }
      }
      
      // Trigger CRM webhook for completed calls
      try {
        console.log(`[Twilio Callback] Triggering CRM webhook for ${CallStatus} call ${CallSid}`);
        const crmResult = await handleTwilioCallCompletion(request.body);
        if (!crmResult.success) {
          console.error(`[Twilio Callback] CRM webhook failed:`, crmResult.error);
        } else {
          console.log(`[Twilio Callback] CRM webhook sent successfully for call ${CallSid}`);
        }
      } catch (crmError) {
        console.error(`[Twilio Callback] Error sending to CRM:`, crmError);
      }
    }
    // Clean up completed calls from memory
    if (['completed', 'failed', 'canceled', 'busy', 'no-answer'].includes(CallStatus)) {
      // Remove from activeCalls map to prevent memory leak
      activeCalls.delete(CallSid);
      console.log(`[Call Status] Removed completed call ${CallSid} from activeCalls (status: ${CallStatus})`);
    } else {
      // Only update if call is still active
      activeCalls.set(CallSid, callInfo);
    }
    
    if (previousStatus !== CallStatus) { handleCallStatusChange(CallSid, CallStatus, callInfo); }
    enhancedCallHandler.updateCallActivity(CallSid);
    
    // Update campaign status if this call is part of a campaign
    if (callInfo.campaignId) {
      try {
        await handleCampaignCallStatus(CallSid, CallStatus);
        console.log(`[Campaign Engine] Updated campaign status for call ${CallSid}`);
      } catch (campaignError) {
        console.error(`[Campaign Engine] Error updating campaign status:`, campaignError);
      }
    }
    
    if (RecordingUrl && RecordingSid) { recordingHandler.processRecordingCallback({ ...request.body, RecordingUrl, RecordingSid, CallSid }); }
    return reply.code(200).send({ success: true, message: "Status update received" });
  } catch (error) {
    console.error('[Call Status] Error processing callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});

// Quality insights callback
server.post('/quality-insights-callback', async (request, reply) => {
  try {
    console.log('[Quality] Received call quality metrics callback');
    const result = callQualityMetrics.processQualityData(request.body);
    if (request.body.CallSid && result && result.success) {
      emitCallUpdate(request.body.CallSid, 'quality_update', { metrics: result.metrics });
    }
    try {
      const { CallSid } = request.body;
      if (CallSid && result && result.metrics) {
        await getCallRepository().updateCallStatus(CallSid, null, { qualityMetrics: result.metrics });
        console.log(`[MongoDB] Updated call ${CallSid} with quality metrics`);
        await getCallEventRepository().logEvent(CallSid, 'call_quality', { metrics: result.metrics, source: 'twilio', timestamp: new Date().toISOString() });
        console.log(`[MongoDB] Logged call_quality event for call ${CallSid}`);
      }
    } catch (error) { console.error(`[MongoDB] Error storing quality metrics:`, error); }
    return reply.code(200).send({ success: true, message: 'Quality metrics received', ...result });
  } catch (error) {
    console.error('[Quality] Error processing metrics callback:', error);
    return reply.code(200).send({ success: true, status: 'error', message: error.message });
  }
});
// API endpoint for sending emails
server.post('/api/email/send', async (request, reply) => {
  try {
    // API Key Authentication
    const apiKey = process.env.EMAIL_API_KEY;
    const authHeader = request.headers.authorization;

    if (!apiKey) {
      console.error('[API Email] EMAIL_API_KEY is not set on the server.');
      return reply.code(500).send({ success: false, error: 'Email service not configured (no API key).' });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== apiKey) {
      console.warn('[API Email] Unauthorized attempt to send email. Invalid or missing API key.');
      return reply.code(401).send({ success: false, error: 'Unauthorized' });
    }

    const { to_email, subject, content, customer_name } = request.body;

    if (!to_email || !subject || !content) {
      return reply.code(400).send({ success: false, error: 'Missing required fields: to_email, subject, content' });
    }

    console.log(`[API Email] Received request to send email to: ${to_email} | Subject: ${subject}`);

    const result = await sendEmail({ to_email, subject, content, customer_name });
    
    console.log('[API Email] Email sent successfully via api-email-service.');
    return reply.code(200).send({ success: true, message: 'Email sent successfully', details: result });

  } catch (error) {
    console.error('[API Email] Error processing /api/email/send:', error.message);
    // Check if the error is from the sendEmail function (e.g., validation or API call failure)
    if (error.message.includes('Invalid email format') || error.message.includes('Email address, subject, and content are required')) {
      return reply.code(400).send({ success: false, error: error.message });
    }
    if (error.message.includes('API responded with status')) {
      return reply.code(502).send({ success: false, error: `Email service provider error: ${error.message}` });
    }
    // Generic server error
    return reply.code(500).send({ success: false, error: 'Internal server error while sending email.' });
  }
});

// AMD statistics endpoint
server.get('/api/amd-stats', async (request, reply) => {
  try {
    server.log.info('[AMD Stats] Retrieving AMD performance statistics');
    
    const stats = getAMDStats();
    
    return reply.send({
      success: true,
      stats: stats,
      message: 'AMD statistics retrieved successfully'
    });
  } catch (error) {
    server.log.error('[AMD Stats] Error retrieving statistics:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint for transcript repository and emission
server.post('/api/test-transcript-repo', async (request, reply) => {
  try {
    const { callSid, conversationId, role, message } = request.body;
    
    if (!callSid || !role || !message) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Missing required fields: callSid, role, message' 
      });
    }
    
    server.log.info(`[Test Transcript Repo] Testing transcript save and emit for call ${callSid}`);
    
    const transcriptRepository = getTranscriptRepository();
    
    if (!transcriptRepository || !transcriptRepository.appendRealtimeTranscriptMessage) {
      return reply.code(500).send({ 
        success: false, 
        error: 'Transcript repository or appendRealtimeTranscriptMessage not available' 
      });
    }
    
    // Test the full flow through the repository (which includes Socket.IO emission)
    const result = await transcriptRepository.appendRealtimeTranscriptMessage(
      callSid,
      conversationId || 'test-conversation',
      role,
      message,
      0 // timeInCall
    );
    
    return reply.send({ 
      success: true, 
      message: 'Transcript saved and emitted successfully',
      transcriptId: result._id
    });
  } catch (error) {
    server.log.error(`[Test Transcript Repo] Error:`, error);
    return reply.code(500).send({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint to verify WebSocket proxy is registered
server.get('/api/test-websocket-proxy', async (request, reply) => {
  try {
    const hasWebSocketPlugin = server.hasDecorator('websocket');
    const routes = [];
    
    // Check if the outbound-media-stream route exists
    server.printRoutes().split('\n').forEach(line => {
      if (line.includes('outbound-media-stream')) {
        routes.push(line.trim());
      }
    });
    
    return reply.send({
      success: true,
      websocketPluginRegistered: hasWebSocketPlugin,
      mediaStreamRoutes: routes,
      transcriptRepositoryAvailable: !!getTranscriptRepository,
      socketIOAvailable: !!server.io
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint for transcript emission debugging
server.post('/api/test-transcript-emit', async (request, reply) => {
  try {
    const { callSid, role, message } = request.body;
    
    if (!callSid || !role || !message) {
      return reply.code(400).send({ 
        success: false, 
        error: 'Missing required fields: callSid, role, message' 
      });
    }
    
    server.log.info(`[Test Transcript] Testing transcript emission for call ${callSid}`);
    
    // Test direct Socket.IO emission
    if (typeof emitTranscriptTypewriter === 'function') {
      server.log.info(`[Test Transcript] emitTranscriptTypewriter is available`);
      emitTranscriptTypewriter(callSid, {
        role,
        message,
        timestamp: new Date().toISOString()
      }, 4);
      
      return reply.send({ 
        success: true, 
        message: 'Transcript emitted via Socket.IO typewriter',
        method: 'emitTranscriptTypewriter'
      });
    } else if (typeof emitTranscriptMessage === 'function') {
      server.log.info(`[Test Transcript] emitTranscriptMessage is available`);
      emitTranscriptMessage(callSid, {
        role,
        message,
        timestamp: new Date().toISOString()
      });
      
      return reply.send({ 
        success: true, 
        message: 'Transcript emitted via Socket.IO',
        method: 'emitTranscriptMessage'
      });
    } else {
      server.log.error(`[Test Transcript] No transcript emission functions available`);
      return reply.code(500).send({ 
        success: false, 
        error: 'Socket.IO transcript emission functions not available'
      });
    }
  } catch (error) {
    server.log.error(`[Test Transcript] Error:`, error);
    return reply.code(500).send({ 
      success: false, 
      error: error.message 
    });
  }
});

// REMOVED: Old WebSocket Proxy Handler

// --- ADDED: Manual WebSocket Server for Media Stream ---
const wss = new WebSocketServer({ noServer: true }); // CORRECTED: Use WebSocketServer constructor

wss.on('connection', (ws, request) => {
  // This is the main handler logic, copied and adapted from the previous handler
  server.log.info('[WS Manual] Twilio connected via manual upgrade');

  // --- Send Connected message immediately ---
  try {
    server.log.info('[WS Manual] Attempting to send "connected" event immediately...');
    ws.send(JSON.stringify({ event: "connected" }), (err) => {
      if (err) {
        server.log.error('[WS Manual] ERROR sending "connected" event immediately:', err);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      } else {
        server.log.info('[WS Manual] Successfully sent "connected" event immediately.');
      }
    });
  } catch (err) {
    server.log.error('[WS Manual] EXCEPTION sending "connected" event immediately:', err);
    if (ws.readyState === WebSocket.OPEN) ws.close();
    return;
  }
  // -----------------------------------------

  const callRepository = getCallRepository();
  const callEventRepository = getCallEventRepository();
  const transcriptRepository = getTranscriptRepository();

  let streamSid = null;
  let callSid = null;
  let elevenLabsWs = null;
  let customParameters = {}; // Will be populated from 'start' message
  let conversationId = null;
  let initialConfigSent = false;
  const INACTIVITY_TIMEOUT_MS = 300000; // 300 seconds (5 minutes)
  let inactivityTimeout = null; // Stores the timeout ID

  const clearExistingInactivityTimer = () => {
      if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
          inactivityTimeout = null;
          // server.log.debug(`[WS Manual][Timer] Cleared existing inactivity timer for call ${callSid}`);
      }
  };

  const scheduleInactivityTermination = () => {
      clearExistingInactivityTimer(); // Always clear previous before setting a new one

      if (!callSid) {
          server.log.debug('[WS Manual][Timer] scheduleInactivityTermination called before callSid is set. Skipping.');
          return;
      }

      server.log.debug(`[WS Manual][Timer] Scheduling inactivity termination for call ${callSid} in ${INACTIVITY_TIMEOUT_MS / 1000}s`);
      inactivityTimeout = setTimeout(() => {
          server.log.warn(`[WS Manual][Timer] INACTIVITY TIMEOUT fired for call ${callSid}. Terminating.`);
          
          // Ensure terminateCall from enhanced-call-handler is used if available, or the local one.
          // The one from enhanced-call-handler is preferred as it updates activeCalls map.
          // We need to ensure the correct terminateCall is in scope or passed.
          // For now, assuming 'terminateCall' refers to the one imported from './outbound.js'
          // or enhanced-call-handler.js if it's been set up to use that.
          // The `terminateCall` in this file's scope is likely from `outbound.js` (imported as part of registerOutboundRoutes)
          // Let's use the one from enhancedCallHandler if available, otherwise the one from outbound.js
          const terminateFunction = enhancedCallHandler?.terminateCall || terminateCall; // terminateCall is also from outbound.js

          if (twilioClient) { // twilioClient should be in the outer scope of server-mongodb.js
            terminateFunction(twilioClient, callSid, { reason: 'inactivity_timeout_ws' })
              .catch(err => server.log.error(`[WS Manual][Timer] Error terminating call ${callSid} due to inactivity:`, err));
          } else {
            server.log.error(`[WS Manual][Timer] twilioClient not available, cannot terminate call ${callSid}`);
          }
          
          if (elevenLabsWs?.readyState === WebSocket.OPEN) {
              server.log.warn('[WS Manual][Timer] Closing ElevenLabs WS due to inactivity.');
              elevenLabsWs.close();
          }
          if (ws.readyState === WebSocket.OPEN) {
              server.log.warn('[WS Manual][Timer] Closing Twilio WS due to inactivity.');
              ws.close();
          }
      }, INACTIVITY_TIMEOUT_MS);
  };

  const updateActivity = () => {
      if (!callSid) {
          // server.log.debug('[WS Manual][Timer] updateActivity called before callSid is set. Skipping timer reset.');
          return;
      }
      // server.log.debug(`[WS Manual][Timer] Activity detected for call ${callSid}. Resetting inactivity timer.`);
      scheduleInactivityTermination(); // Clear old timer and set a new one
  };

  const setupElevenLabs = async () => {
    try {
      const { signed_url } = await getSignedUrl();
      server.log.info('[WS Manual] Creating ElevenLabs WebSocket connection');
      elevenLabsWs = new WebSocket(signed_url);

      elevenLabsWs.on("open", () => {
        server.log.info('[WS Manual] Connected to ElevenLabs. Waiting for metadata...');
        updateActivity();
        
        // Emit Socket.IO event for ElevenLabs connection
        if (callSid) {
          emitCallUpdate(callSid, 'elevenlabs_connected', {
            status: 'elevenlabs_connected',
            timestamp: new Date().toISOString()
          });
        }
      });

      elevenLabsWs.on("message", (data) => {
        updateActivity();
        let message = null;
        const rawData = data.toString();
        try { message = JSON.parse(rawData); } catch (parseError) {
          server.log.error('[WS Manual] Could not parse message from ElevenLabs as JSON:', parseError.message, { rawData });
          if (!initialConfigSent) return;
        }

        if (message?.type === "conversation_initiation_metadata" && !initialConfigSent) {
          initialConfigSent = true;
          const metadataEvent = message.conversation_initiation_metadata_event;
          server.log.info('[WS Manual] Received conversation_initiation_metadata');
          if (metadataEvent?.conversation_id) {
            conversationId = metadataEvent.conversation_id;
            server.log.info(`[WS Manual] Extracted conversation_id ${conversationId} from metadata`);
            if (callSid && callRepository) {
              callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
                .catch(err => server.log.error(`[WS Manual][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
            }
          } else { server.log.warn('[WS Manual] conversation_initiation_metadata missing conversation_id'); }

          const agentOverrideConfig = {};

          // Handle first_message override FROM THE FORM ONLY
          if (customParameters?.first_message && customParameters.first_message.trim() !== "") {
              // If a first message is provided in the form, use it.
              // Replace {name} in THIS form-provided message if applicable.
              let formFirstMessage = customParameters.first_message;
              if (customParameters?.name && formFirstMessage.includes('{name}')) {
                  formFirstMessage = formFirstMessage.replace(/{name}/g, customParameters.name);
              }
              agentOverrideConfig.first_message = formFirstMessage;
          }
          // If customParameters.first_message (from form) is EMPTY,
          // agentOverrideConfig will NOT have a first_message property.
          // This allows ElevenLabs to use its own configured default first message.
          // The 'name' in dynamic_variables below will be used by EL for its template.

          // Handle system_prompt override from the form
          if (customParameters?.prompt && customParameters.prompt.trim() !== "") {
              agentOverrideConfig.system_prompt = customParameters.prompt;
          }

          const initialConfig = {
              type: "conversation_initiation_client_data",
              // Only include conversation_config_override if agentOverrideConfig has any properties to override
              ...(Object.keys(agentOverrideConfig).length > 0 && { conversation_config_override: { agent: agentOverrideConfig } }),
              dynamic_variables: {
                  phone_number: customParameters?.to || "Unknown",
                  name: customParameters?.name || "Unknown", // This is what EL should use for its {{name}} template
                  call_sid: callSid || "Unknown",
                  campaign_id: customParameters?.campaignId || null,
                  contact_id: customParameters?.contactId || null
              }
          };
          server.log.debug('[WS Manual] Sending initial config to ElevenLabs');
          elevenLabsWs.send(JSON.stringify(initialConfig));
          return;
        }

        if (!initialConfigSent) { server.log.warn('[WS Manual] Received message before initial metadata/config sent. Ignoring.'); return; }

        if (message && !conversationId && message.conversation_id) {
          conversationId = message.conversation_id;
          server.log.info(`[WS Manual] Received conversation_id ${conversationId} from subsequent message`);
          if (callSid && callRepository) {
            callRepository.updateCallStatus(callSid, null, { conversationId: conversationId })
              .catch(err => server.log.error(`[WS Manual][DB] Error updating call ${callSid} with conversationId ${conversationId}:`, err));
          }
          // Emit Socket.IO event for conversation start
          if (callSid) {
            emitCallUpdate(callSid, 'conversation_started', {
              conversationId: conversationId,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (message) {
          if (isConversationComplete(message)) {
            server.log.info(`[WS Manual] Conversation complete detected, terminating call ${callSid}`);
            // Emit Socket.IO event for conversation completion
            if (callSid) {
              emitCallUpdate(callSid, 'conversation_completed', {
                conversationId: conversationId,
                timestamp: new Date().toISOString()
              });
            }
            if (callSid && twilioClient) { terminateCall(twilioClient, callSid); }
            return;
          }
          switch (message.type) {
            case "audio":
              // DOCS CONFIRM: audio_event.audio_base_64 is already Base64 encoded.
              // Do NOT encode it again. Send the received payload directly.
              // Assuming the received message structure is { type: "audio", audio_event: { audio_base_64: "...", event_id: ... } }
              // or potentially { type: "audio", audio: { chunk: "..." } } based on older code? Let's use audio_event based on docs.
              if (streamSid && message.audio_event?.audio_base_64) {
                const payloadBase64 = message.audio_event.audio_base_64;
                const mediaEventToSend = { event: "media", streamSid, media: { payload: payloadBase64 } };
                // Keep the debug log, but use the correct payload variable
                const mediaJsonString = JSON.stringify(mediaEventToSend); // Stringify once
                server.log.debug(`[WS Manual] Sending media event to Twilio. StreamSid: ${streamSid}, Payload (start): ${payloadBase64.substring(0, 20)}... Full Message: ${mediaJsonString.substring(0, 100)}...`);
                ws.send(mediaJsonString, (err) => { // Send the stringified version
                  if (err) {
                     server.log.error(`[WS Manual] ERROR sending media event (StreamSid: ${streamSid}):`, err);
                  }
                });
              } else if (streamSid && message.audio?.chunk) {
                // Fallback for older structure just in case, but log a warning
                server.log.warn('[WS Manual] Received audio chunk in unexpected format (message.audio.chunk). Sending directly.');
                const payloadBase64 = message.audio.chunk; // Assuming it's already base64
                const mediaEventToSend = { event: "media", streamSid, media: { payload: payloadBase64 } };
                const mediaJsonStringFallback = JSON.stringify(mediaEventToSend); // Stringify once
                server.log.debug(`[WS Manual] Sending media event (fallback format) to Twilio. StreamSid: ${streamSid}, Payload (start): ${payloadBase64.substring(0, 20)}... Full Message: ${mediaJsonStringFallback.substring(0, 100)}...`);
                ws.send(mediaJsonStringFallback, (err) => { // Send the stringified version
                  if (err) {
                     server.log.error(`[WS Manual] ERROR sending media event (fallback format) (StreamSid: ${streamSid}):`, err);
                  }
                });
              }
              break;
            case "interruption":
              if (streamSid) {
                const clearEventToSend = { event: "clear", streamSid };
                const clearJsonString = JSON.stringify(clearEventToSend);
                server.log.debug(`[WS Manual] Sending clear event to Twilio. StreamSid: ${streamSid}. Full Message: ${clearJsonString}`);
                ws.send(clearJsonString, (err) => {
                  if (err) {
                    server.log.error(`[WS Manual] ERROR sending clear event (StreamSid: ${streamSid}):`, err);
                  }
                });
              }
              break;
            case "ping": if (message.ping_event?.event_id) { elevenLabsWs.send(JSON.stringify({ type: "pong", event_id: message.ping_event.event_id })); } break;
            case "transcript_update":
              const transcriptMsg = message.transcript_update;
              if (transcriptMsg && transcriptMsg.message) {
                server.log.debug(`[WS Manual] Transcript: ${transcriptMsg.role}: ${transcriptMsg.message.substring(0, 50)}...`);
                // Append transcript to proper Transcript model and emit via Socket.IO
                if (callSid && transcriptRepository) {
                  // Calculate time in call (in seconds)
                  const callData = activeCalls.get(callSid);
                  const timeInCall = callData && callData.startTime ? 
                    Math.floor((Date.now() - new Date(callData.startTime).getTime()) / 1000) : 0;
                  
                  transcriptRepository.appendRealtimeTranscriptMessage(
                    callSid, 
                    conversationId, 
                    transcriptMsg.role, 
                    transcriptMsg.message,
                    timeInCall
                  )
                    .then(() => {
                      server.log.info(`[WS Manual][DB] Successfully saved transcript message for call ${callSid}`);
                    })
                    .catch(err => 
                      server.log.error(`[WS Manual][DB] Error appending transcript message for call ${callSid}:`, err)
                    );
                }
                if (callSid && callEventRepository) { 
                  callEventRepository.logEvent(callSid, 'transcript_segment', { 
                    role: transcriptMsg.role, 
                    text: transcriptMsg.message, 
                    timestamp: new Date().toISOString() 
                  }, { source: 'elevenlabs_stream' }).catch(err => 
                    server.log.error(`[WS Manual][DB] Error logging transcript segment for ${callSid}:`, err)
                  ); 
                }
                // Socket.IO emission is now handled inside appendRealtimeTranscriptMessage
                // No need for duplicate emission here
              } break;
            default:
              server.log.debug(`[WS Manual] Received ElevenLabs message type: ${message.type}`);
              if (callSid && callEventRepository) { callEventRepository.logEvent(callSid, message.type, message, { source: 'elevenlabs_stream' }).catch(err => server.log.error(`[WS Manual][DB] Error logging event type ${message.type} for ${callSid}:`, err)); }
          }
        }
      });

      elevenLabsWs.on("error", (error) => { server.log.error('[WS Manual] ElevenLabs WebSocket error', error); if (ws.readyState === WebSocket.OPEN) ws.close(); });
      elevenLabsWs.on("close", () => { server.log.info('[WS Manual] ElevenLabs WebSocket disconnected'); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (callSid && twilioClient) { server.log.info(`[WS Manual] ElevenLabs WS closed. Ensuring call ${callSid} is terminated.`); terminateCall(twilioClient, callSid); } if (ws.readyState === WebSocket.OPEN) ws.close(); });
    } catch (error) { server.log.error('[WS Manual] ElevenLabs setup error', error); if (ws.readyState === WebSocket.OPEN) ws.close(); }
  };

  ws.on("message", (message) => {
    updateActivity();
    try {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid; 
          callSid = msg.start.callSid; 
          customParameters = msg.start.customParameters || {};
          
          // Emit Socket.IO event for stream start
          if (callSid) {
            emitCallUpdate(callSid, 'stream_started', {
              streamSid: streamSid,
              timestamp: new Date().toISOString()
            });
          }
          server.log.info(`[WS Manual] Received TwiML Parameters:`, customParameters); server.log.info(`[WS Manual] Twilio Stream started`, { streamSid, callSid });
          if (activeCalls.has(callSid)) { const callInfo = activeCalls.get(callSid); callInfo.streamSid = streamSid; activeCalls.set(callSid, callInfo); }
          scheduleInactivityTermination(); // Start the inactivity timer now that callSid is known
          setupElevenLabs(); // This will now use the captured callSid and customParameters
          break;
        case "media": if (elevenLabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) { elevenLabsWs.send(JSON.stringify({ user_audio_chunk: msg.media.payload })); } break;
        case "stop": server.log.info(`[WS Manual] Twilio Stream ended`, { streamSid }); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); break;
        case "mark": server.log.debug(`[WS Manual] Twilio Mark: ${msg.mark?.name}`); break;
        default: server.log.debug(`[WS Manual] Unhandled Twilio event: ${msg.event}`);
      }
    } catch (error) { server.log.error('[WS Manual] Error processing Twilio message', error); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); if (ws.readyState === WebSocket.OPEN) ws.close(); }
  });

  ws.on('error', (error) => { server.log.error('[WS Manual] Twilio WebSocket error', error); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); });
  ws.on("close", () => { server.log.info('[WS Manual] Twilio WebSocket disconnected'); if (inactivityTimeout) clearTimeout(inactivityTimeout); if (elevenLabsWs?.readyState === WebSocket.OPEN) elevenLabsWs.close(); if (callSid && twilioClient) { server.log.info(`[WS Manual] Twilio WS closed. Ensuring call ${callSid} is terminated.`); terminateCall(twilioClient, callSid); } });
});
// --- End Manual WebSocket Server ---

// Initialize MongoDB
let mongodbIntegration = null;

// Function to initialize MongoDB
async function initializeDatabase() {
  console.log('[Server] Starting MongoDB initialization...');
  console.log(`[Server] MongoDB URI: ${process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set'}`);
  try {
    console.log('[Server] Calling initializeMongoDB...');
    // Assuming initializeMongoDB returns an object with repositories or sets them up internally
    const dbIntegrationResult = await initializeMongoDB(server, { activeCalls, syncExistingCalls: true });
    mongodbIntegration = dbIntegrationResult; // Keep if needed elsewhere
    
    // Attach repositories to the server instance for access in routes
    // Assuming the get... functions return the initialized repositories
    server.callRepository = getCallRepository();
    server.recordingRepository = getRecordingRepository();
    server.transcriptRepository = getTranscriptRepository(); // Get and attach
    server.callEventRepository = getCallEventRepository();
    server.analyticsRepository = getAnalyticsRepository();
    
    console.log('[Server] MongoDB initialized, repositories attached.');
    enhancedWebhookHandler = getEnhancedWebhookHandler(); // This likely uses the repositories internally
    console.log('[Server] MongoDB integration initialized successfully');
    return true;
  } catch (error) {
    console.error('[Server] MongoDB initialization error:', error);
    console.log('[Server] Error stack:', error.stack);
    console.log('[Server] Continuing without MongoDB integration');
    enhancedWebhookHandler = { handleElevenLabsWebhook: async () => ({ success: false, error: 'Database connection failed' }) };
    return false;
  }
}

// Custom Global Error Handler
server.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'An error occurred');

  if (error.validation) {
    // Handle Fastify schema validation errors
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Input validation failed',
      details: error.validation.map(v => ({
        path: v.instancePath || v.dataPath || 'N/A',
        message: v.message,
        params: v.params
      }))
    });
  } else if (error.statusCode && error.statusCode < 500) {
    // Handle errors that already have a client-side status code
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.error || 'Client Error',
      message: error.message
    });
  } else {
    // Handle generic server errors
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred on the server.'
    });
  }
});
console.log('[Server] Registered custom global error handler.');

// Start the server
const start = async () => {
  console.log('[Server] Starting server initialization...');
  try {
    await initializeDatabase(); // Initialize DB first (which also registers routes internally)
    
    // REMOVED explicit registration debug step
    
    const port = process.env.PORT || 8000; // Use PORT from Railway, default to 8000 locally
    const host = '0.0.0.0';
    console.log(`[Server] Attempting to listen on ${host}:${port}...`);
    await server.listen({ port, host }); // Start listening first
    // Note: Fastify logs the listening address automatically with logger: true

    // --- ADDED: Attach manual WebSocket upgrade handler ---
    server.server.on('upgrade', (request, socket, head) => {
      // Use URL constructor for robust parsing
      // Use http protocol as base, ws/wss is handled by upgrade mechanism
      const { pathname } = new URL(request.url, `http://${request.headers.host}`);

      // *** Only handle the specific path for the Twilio media stream ***
      if (pathname === '/outbound-media-stream') {
        server.log.info(`[Server Upgrade] Handling upgrade request for ${pathname}`);
        // Let our manual WebSocket server handle this specific upgrade
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // *** IMPORTANT: If it's not our path, do nothing. ***
        // This allows other handlers (like fastify-socket.io's internal one)
        // to process the upgrade request for their paths (e.g., /socket.io/).
        // Do NOT destroy the socket here.
        server.log.debug(`[Server Upgrade] Ignoring upgrade request for path ${pathname}, letting other handlers process.`);
      }
    });
    server.log.info('[Server] Attached manual WebSocket upgrade handler');
    // --- End Attach upgrade handler ---

    // Initialize our Socket.IO logic AFTER server is listening AND plugin is registered
    try {
      initializeSocketServer(server, activeCalls); 
      console.log('[Server] Socket.IO logic initialized using fastify-socket.io');
    } catch (socketErr) {
       console.error('[Server] Socket.IO logic initialization failed:', socketErr);
    }
    
    // Initialize Campaign Engine
    try {
      await initializeCampaignEngine();
      console.log('[Server] Campaign engine initialized successfully');
    } catch (campaignErr) {
      console.error('[Server] Campaign engine initialization failed:', campaignErr);
      // Continue running - campaigns won't work but other features will
    }
    
    // Removed custom WebSocket server initialization - moved to media-proxy-server.js

    console.log('[Server] Enhanced features activated.'); 
    
  } catch (err) {
    console.error('[Server] Error starting server:', err);
    console.error('[Server] Error stack:', err.stack);
    server.log.error(err);
    enhancedCallHandler.stopCallMonitoringHeartbeat();
    process.exit(1);
  }
};

// Handle graceful shutdown
function cleanup() {
  console.log('\n[Server] Shutting down...');
  enhancedCallHandler.stopCallMonitoringHeartbeat();
  if (mongodbIntegration) {
    try {
      mongodbIntegration.closeConnection();
      console.log('[MongoDB] Connection closed');
    } catch (error) {
      console.error('[MongoDB] Error closing connection:', error);
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('[Server] Starting server...');
start();

export default server;
