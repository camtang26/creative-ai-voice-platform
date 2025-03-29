# ElevenLabs Twilio Outbound Calling - Enhanced Version

This project enables outbound calling capabilities using ElevenLabs Conversational AI and Twilio. It creates a server that can initiate calls to phone numbers and connect them with an AI agent that can engage in natural conversation.

## Features

- Initiate outbound calls to any phone number (within Twilio's supported regions)
- Connect callers to ElevenLabs Conversational AI agents
- Customize AI behavior with prompts and first messages
- Secure communication with authenticated requests
- Real-time bidirectional audio streaming
- Google Sheets integration for bulk outbound calling campaigns
- Email integration for sending conversation summaries and follow-ups
- Enhanced data streaming from Twilio for comprehensive call analytics
- Automatic call recordings with dual-channel support
- Intelligent call termination when conversations end
- Advanced architecture with better code organization and error handling

## Major Enhancements

### 1. Enhanced Data Streaming from Twilio

The system now captures and stores comprehensive data from Twilio for better monitoring and analysis:

- **Call Status Tracking**: All call status changes are tracked and stored in an in-memory map (`activeCalls`)
- **Call Recording**: All calls are recorded by default using Twilio's dual-channel recording
- **Detailed Analytics**: The system collects data on call duration, outcome, and performance metrics
- **Accessible API**: New API endpoints offer easy access to all call data and recordings

### 2. Call Recording Implementation

All calls are now automatically recorded, with:

- **Dual-Channel Recording**: Both sides of the conversation are recorded separately
- **Recording Access**: Recordings are accessible via `/api/calls/:callSid/recordings` API endpoint
- **Webhook Integration**: Recording information is included in webhook payloads to the CRM
- **Local Caching**: Recording metadata is stored for quick access

### 3. Automatic Call Termination

The system now properly terminates calls when the ElevenLabs agent ends the conversation:

- **Multiple Detection Methods**:
  - Direct detection from conversation_completed events
  - Pattern detection from transcript content (goodbye phrases)
  - Inactivity detection (60-second timeout)

- **Reliable Termination**: Uses Twilio API to properly end calls
- **Cross-Module Communication**: Webhook handler and WebSocket handlers can both trigger termination

### 4. Architectural Improvements

- **Module Organization**: Better separation of concerns between modules
- **Shared Data Structures**: Centralized tracking of call information
- **Better Error Handling**: Comprehensive error handling across all components
- **Enhanced Logging**: Detailed logging for debugging and monitoring
- **Call Statistics**: New module for collecting and analyzing call performance
- **Configuration**: More flexible configuration options

## Implementation Methods

This repository includes four different ways to implement outbound calling with ElevenLabs:

### 1. Enhanced Server Implementation (Recommended)

Uses the enhanced architecture with `server.js` to create a robust local server that bridges Twilio and ElevenLabs. This is the recommended approach for production use.

**Benefits:**
- Full control over the call flow
- Comprehensive data collection
- Automatic call recording
- Intelligent call termination
- Production-ready architecture

**Usage:**
```bash
npm start
# or use the convenience script
.\start-enhanced.bat
```

### 2. Direct API Implementation

Uses `outbound-calls.js` to directly connect Twilio to ElevenLabs without a local server intermediary. Better for simple testing or batch calling scenarios.

**Benefits:**
- Simpler setup (no need for ngrok)
- Support for batch calling multiple numbers
- Easier to configure

**Usage:**
```bash
npm run batch-call
```

### 3. Custom Message Implementation

Uses `custom-message.js` to make single calls with customized first messages.

**Benefits:**
- Simplest approach for quick tests
- Support for custom greeting messages
- Easy to run from command line

**Usage:**
```bash
npm run custom-call -- +1234567890 "Hello, this is a test call"
# or
node custom-message.js +1234567890 "Hello, this is a test call" "Customer Name"
```

### 4. Google Sheets Integration

Uses `sheet-call.js` to automate outbound calls using contact data from a Google Spreadsheet. Ideal for call campaigns and automated outreach.

**Benefits:**
- Manage call lists in Google Sheets
- Automated tracking of call status
- Support for personalized messages
- Call batching and throttling

**Usage:**
```bash
npm run sheet-call -- YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

## New API Endpoints

### Call Management

- `POST /outbound-call` - Initiate an outbound call
- `GET /call/:callSid` - Get information about a call
- `GET /api/calls/:callSid/recordings` - Get recordings for a call
- `GET /api/call-stats` - Get comprehensive call statistics
- `POST /api/calls/:callSid/terminate` - Terminate an active call

### Email

- `POST /api/email/send` - Send an email
- `GET /api/email/health` - Check email service health

### Webhooks

- `POST /webhooks/elevenlabs` - ElevenLabs webhook endpoint
- `POST /webhooks/elevenlabs-debug` - Debug webhook endpoint
- `GET /webhooks/elevenlabs/health` - Check webhook health

### WebSocket Endpoints

- `/outbound-media-stream` - WebSocket endpoint for Twilio media streaming

## Testing Enhanced Features

1. **Recording Test**:
   - Make a test call using `make-call.js`
   - When the call completes, use `/api/calls/:callSid/recordings` to verify recording data
   - Download the recording using the provided URLs

2. **Auto-Termination Test**:
   - Make a test call and wait for the ElevenLabs agent to complete its task
   - Observe that the call is automatically terminated without human intervention
   - Check the logs for "[Call Control] Terminating call" messages

3. **Inactivity Test**:
   - Make a test call but do not respond to the agent
   - The call should automatically terminate after 60 seconds of inactivity
   - Check the logs for "[Call Control] Inactivity detected" messages

## Google Sheets Integration

This feature allows you to manage your outbound calls using Google Sheets. You can maintain a spreadsheet with contact information and the system will automatically make calls and track the results.

### Setup Google Sheets API

1. **Create a Google Cloud Project:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API for your project

2. **Create OAuth credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Desktop app" as the application type
   - Download the JSON file and save it as `credentials.json` in your project root

3. **Authenticate with Google:**
   - Run the authentication script:
   ```bash
   node google-auth.js
   ```
   - Follow the prompts to authorize the application
   - This will create a `token.json` file for future authentication

### Prepare Your Spreadsheet

1. **Create a Google Sheet** with the following columns:
   - `Phone` or `Phone Number` or `Mobile` (required): Phone numbers to call
   - `Name` or `Contact Name` or `Full Name` (optional): Contact names for personalization
   - `Status` or `Call Status` (optional): Will be updated with call results
   - `Message` or `Custom Message` (optional): Custom first message for each contact

2. **Share your spreadsheet** with the email address associated with your Google Cloud project

3. **Get your Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
   ```

### Making Calls from Spreadsheet

**Basic Usage:**
```bash
node sheet-call.js YOUR_SPREADSHEET_ID
```

**Advanced Options:**
```bash
# Specify a sheet name (default is "Sheet1")
node sheet-call.js YOUR_SPREADSHEET_ID Contacts

# Limit the number of calls to make
node sheet-call.js YOUR_SPREADSHEET_ID Contacts 5
```

### How It Works

1. The script reads contact information from your Google Sheet
2. It filters for contacts with a status of "pending" or empty
3. For each contact:
   - It makes a call using the phone number
   - Uses the contact's name to personalize the greeting if available
   - Uses any custom message specified in the spreadsheet
   - Updates the status column with "called" or "failed"
   - Records call details in the notes column
4. Maintains the delay between calls specified in your .env file

### Tips for Google Sheets Integration

- Use the "Status" column to track which contacts have been called
- Add a "Notes" column next to your "Status" column for call details
- For large campaigns, use the maxCalls parameter to break calls into smaller batches
- Personalize first messages by including the contact's name
- Add custom messages for specific contacts in the "Message" column

## Email Integration

This project includes integration with email services through Amazon SES. This allows the ElevenLabs agent to send emails as part of the conversation flow.

### Email Configuration

The email functionality requires additional environment variables:

```bash
# Email configuration for Amazon SES
SES_SMTP_HOST=email-smtp.ap-southeast-2.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USERNAME=your-ses-username
SES_SMTP_PASSWORD=your-ses-password
SES_FROM_EMAIL=noreply@yourdomain.com
SES_REPLY_TO=info@yourdomain.com
EMAIL_API_KEY=your-email-api-key

# Additional SES options
SES_REGION=ap-southeast-2
SES_DEBUG=true
EMAIL_FALLBACK_ENABLED=true
```

For more details on the email integration, see the [Email Integration Documentation](./email-tools/README.md).

## Prerequisites

- Node.js 16+ installed
- An ElevenLabs account with a configured Conversational AI agent
- A Twilio account with an active phone number
- ngrok for local development (for server-based implementation)

## Setup

1. **Clone this repository:**

```bash
git clone https://github.com/yourusername/elevenlabs-twilio-outbound-calling.git
cd elevenlabs-twilio-outbound-calling
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create a `.env` file with the following variables:**

```bash
# Twilio credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ElevenLabs credentials
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# ElevenLabs webhook settings
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret_from_elevenlabs
CRM_WEBHOOK_URL=https://your-crm-webhook-url

# Optional settings
VERIFIED_NUMBERS=+1234567890,+0987654321
CALL_DELAY=60000

# Server settings (used with ngrok)
# SERVER_URL=https://your-ngrok-url.ngrok.io
```

## Installing ngrok

ngrok is required for the server-based implementation to expose your local server to the internet. Here's how to install it:

### Windows Installation

#### Option 1: Using Chocolatey (Recommended)

If you have Chocolatey package manager installed:

```bash
choco install ngrok
```

#### Option 2: Manual Installation

1. Download ngrok from the [official website](https://ngrok.com/download)
2. Extract the downloaded zip file
3. Move the ngrok.exe file to a directory in your PATH or add its location to your PATH environment variable
4. Open PowerShell and verify the installation:

```powershell
ngrok --version
```

### ngrok Configuration

1. Sign up for a free account at [ngrok.com](https://ngrok.com)
2. Get your authtoken from the ngrok dashboard
3. Configure ngrok with your authtoken:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

## Running the Server

1. **Start the enhanced server:**

```bash
npm start
# or use the convenience script
.\start-enhanced.bat
```

2. **For development with auto-reload:**

```bash
npm run dev
```

3. **Expose your local server with ngrok:**

In a new terminal window, run:

```bash
ngrok http 8000
# or use the convenience script
.\start-ngrok.bat
```

4. **Note the forwarding URL:**

When ngrok starts, it will display a forwarding URL that looks like:
```
https://a1b2c3d4.ngrok.io -> http://localhost:8000
```

Save this URL - you'll need it for making API calls to your server. You can also add it to your `.env` file:

```
SERVER_URL=https://a1b2c3d4.ngrok.io
```

This allows the test script to automatically use your ngrok URL.

## Making Outbound Calls

You can make outbound calls in several ways:

### 1. Using the test script:

```bash
# Using localhost (default)
npm run test-call

# With a specific phone number
npm run test-call -- +1234567890

# With a specific phone number and prompt
npm run test-call -- +1234567890 "You are a sales agent"

# With a specific phone number, prompt, and first message
npm run test-call -- +1234567890 "You are a sales agent" "Hello, I'm calling about our new product"

# With a specific ngrok URL (if not set in .env)
npm run test-call -- +1234567890 "Default prompt" "Default message" https://a1b2c3d4.ngrok.io
```

### 2. Using the enhanced test script:

```bash
# Makes a call using the enhanced server features
.\test-enhanced-call.bat +1234567890
```

### 3. Using curl or any HTTP client:

```bash
curl -X POST https://your-ngrok-url/outbound-call \
-H "Content-Type: application/json" \
-d '{
  "prompt": "You are a customer service agent helping with product inquiries.",
  "number": "+1234567890",
  "first_message": "Hello, this is an AI assistant calling from ElevenLabs. How are you today?"
}'
```

## Parameters

- `number` (required): The phone number to call, in E.164 format (e.g., +12345678990)
- `prompt` (optional): A custom prompt to override the default agent behavior
- `first_message` (optional): The first message the agent should say when the call connects
- `name` (optional): The name of the person being called (for personalization)
- `callerId` (optional): A custom caller ID to use for this call
- `region` (optional): Twilio region to use for the call (defaults to au1 for Australia)

## Email Integration

The server includes email functionality for sending conversation summaries, follow-ups, or notifications. This is implemented using AWS SES (Simple Email Service) with a fallback to a test email account.

### Using the Email API

You can send emails through the server's API endpoint:

```bash
curl -X POST https://your-ngrok-url/api/email/send \
-H "Content-Type: application/json" \
-H "Authorization: Bearer your-email-api-key" \
-d '{
  "to_email": "recipient@example.com",
  "subject": "Call Summary from ElevenLabs AI",
  "content": "<h1>Call Summary</h1><p>This is a summary of your recent conversation...</p>",
  "customer_name": "John Doe"
}'
```

### Fallback Mode

If AWS SES authentication fails, the system can automatically fall back to using a test email account (Ethereal Email). This provides a preview URL instead of sending a real email, which is useful for development and testing.

To enable/disable fallback mode, set `EMAIL_FALLBACK_ENABLED` to `true` or `false` in your `.env` file.

## Troubleshooting

### Common Issues

1. **404 Not Found errors from ElevenLabs API**
   - Verify your ElevenLabs API key and agent ID
   - Ensure your agent is properly configured for Twilio integration

2. **Connection failures**
   - Make sure ngrok is running and your URL is up-to-date
   - Check that your Twilio credentials are correct
   - Verify that your ngrok authtoken is properly configured

3. **Call connects but no audio**
   - Verify WebSocket connections in the server logs
   - Check that your ElevenLabs agent is properly configured

4. **ngrok Issues**
   - If ngrok displays "tunnel session expired", restart ngrok
   - If you get "failed to start tunnel", check your firewall settings
   - For "address already in use", make sure no other service is using port 8000

5. **Recording Issues**
   - If recordings aren't being created, verify Twilio permissions
   - Check the logs for "[Recording]" entries to diagnose issues

6. **Call Not Ending Automatically**
   - Check that `ELEVENLABS_WEBHOOK_SECRET` is properly configured
   - Verify that the webhook is reaching your server
   - Check logs for "[Webhook]" entries

## Security Considerations

### Environment Variables

This project uses sensitive credentials (Twilio, ElevenLabs, and AWS SES) that should never be committed to version control:

1. **Never commit your .env file to git**. The repository includes a `.gitignore` file that excludes `.env` files.

2. Use the provided `.env.example` file as a template. Copy it to `.env` and add your credentials:
   ```bash
   cp .env.example .env
   # Then edit .env with your actual credentials
   ```

3. When sharing the codebase, ensure all real credentials are removed.

### For Production Deployments

1. **AWS SES Credentials**: Use AWS IAM roles or environment variable management services instead of hardcoding credentials.

2. **API Keys**: Use a secure key management system for storing and rotating API keys.

3. **IP Restrictions**: Consider restricting SMTP access to specific IP addresses.

4. **Encryption**: Ensure all communication channels use proper encryption (TLS/SSL).

## License

MIT

## Acknowledgements

- [ElevenLabs](https://elevenlabs.io) for their Conversational AI platform
- [Twilio](https://twilio.com) for their communication APIs
- [ngrok](https://ngrok.com) for secure tunneling software
- The open-source community for various tools and libraries used in this project
