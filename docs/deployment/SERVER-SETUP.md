# Investor Signals Local Server Setup

This document outlines the simplified local server setup for the Investor Signals AI calling platform.

## Overview

This system uses a local Node.js server with ngrok to create an AI calling platform with lower latency than cloud alternatives. The server integrates Twilio with ElevenLabs Conversational AI to make outbound calls.

## Starting the Server

1. Simply run the `start.bat` file:
   ```
   start.bat
   ```

   This will:
   - Start ngrok (creates a secure tunnel to your local server)
   - Get a public URL for your server
   - Update your .env file with this URL
   - Start the Node.js server

2. The ngrok URL will be displayed in the console and automatically updated in your `.env` file

## Making Calls

### From Google Sheets

Use the sheet-call.js script to make calls from a Google Spreadsheet:

```
node sheet-call.js YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

Example:
```
node sheet-call.js 1gpLvi_KwJpw5EiF2Wnln44wsSOwXVSap2TB2v_oxKiM
```

### Individual Calls

To make a single call:

```
node make-call.js +61XXXXXXXXX "Custom message"
```

## Setting Up Webhooks

For the CRM integration to work:

1. In the ElevenLabs dashboard:
   - Go to Conversational AI → Settings
   - Under "Post-call webhooks" section, click "Create a Webhook"
   - Set the URL to your ngrok URL + `/webhooks/elevenlabs` (e.g., `https://a1b2c3d4.ngrok.io/webhooks/elevenlabs`)
   - Use HMAC authentication
   - Copy the secret and paste it in your `.env` file as `ELEVENLABS_WEBHOOK_SECRET`

## Using Railway as Backup

If your local server isn't available, you can switch to the Railway deployment by:

1. Commenting out the local SERVER_URL line in .env
2. Uncommenting the Railway SERVER_URL line
3. Updating the webhook URL in the ElevenLabs dashboard

## Troubleshooting

- **"ngrok not found"**: Make sure ngrok is installed and in your PATH
- **Cannot start server**: Check if port 8000 is already in use
- **Webhook not working**: Verify your ngrok URL is correctly set in the ElevenLabs dashboard
- **Poor audio quality**: Check if DEBUG_LATENCY=true in .env and view latency stats at `/debug/latency`