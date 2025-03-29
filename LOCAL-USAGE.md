# Using the Enhanced Local Server Setup

This guide explains how to use the enhanced local server setup for making calls with ElevenLabs and Twilio.

## Starting the Enhanced Local Server

1. **Start ngrok and the enhanced server**:
   ```
   start-enhanced.bat
   ```

   This will:
   - Start ngrok to expose your local server
   - Update your .env file with the ngrok URL
   - Start the enhanced Node.js server with all improvements

2. **Check the server URL**:
   - Look in the console output for `Using ngrok URL: https://xxxx-xxxx-xxxx-xxxx.ngrok.io`
   - This URL will be used for all API calls

## Making Calls with the Enhanced Server

Use these scripts to ensure calls go through your local enhanced server:

### For Single Calls

```
test-enhanced-call.bat +61XXXXXXXXX "Optional custom prompt" "Optional first message"
```

### For Sheet-Based Calls

```
sheet-call-local.bat YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

### For Sheet-Based Calls with Australia Region

```
sheet-call-au-local.bat YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

## Enhanced Features

The enhanced server provides several improvements:

1. **Automatic Call Recording**:
   - All calls are automatically recorded
   - Recordings are available via the API at `/api/calls/:callSid/recordings`

2. **Automatic Call Termination**:
   - Calls end automatically when the ElevenLabs agent completes the conversation
   - Inactivity timeout terminates calls after 60 seconds with no activity

3. **Enhanced Data Collection**:
   - Detailed call statistics available at `/api/call-stats`
   - Individual call information at `/api/call/:callSid`

4. **Webhook Integration**:
   - Call recording information is sent to the CRM webhook
   - Conversation transcripts are included in webhook payloads

## Important Notes

1. **Always check your server console** to confirm that calls are being routed through your local server.

2. **Update the ElevenLabs webhook** to point to your ngrok URL:
   - Log into the ElevenLabs dashboard
   - Navigate to Conversational AI → Settings
   - Under "Post-call webhooks", update the URL to:
     `https://your-ngrok-url.ngrok.io/webhooks/elevenlabs`

3. **ngrok URL changes every restart** if you're using the free tier:
   - Each time you restart your server, you'll get a new ngrok URL
   - Update the webhook URL in ElevenLabs accordingly

## Verifying Server Operation

1. **Check the server status**:
   ```
   curl http://localhost:8000
   ```
   You should see a response that includes "Enhanced Version" in the status.

2. **Check call statistics**:
   ```
   curl http://localhost:8000/api/call-stats
   ```
   This will show statistics for all calls made through the server.

3. **Check webhook health**:
   ```
   curl http://localhost:8000/webhooks/elevenlabs/health
   ```
   This will show if your webhook is properly configured.

## Troubleshooting

If you encounter issues with the enhanced server:

1. **Check your .env file**:
   - Make sure SERVER_URL is set to your ngrok URL
   - Ensure ELEVENLABS_WEBHOOK_SECRET is properly set

2. **Check webhook configuration**:
   - Verify your webhook is properly configured in ElevenLabs
   - Check the server logs for "[Webhook]" entries

3. **Check recording issues**:
   - Verify Twilio permissions and account settings
   - Check the logs for "[Recording]" entries

4. **Verify server is running with enhanced features**:
   - You should see "[Server] Enhanced server listening on port 8000" in the logs
   - You should see "Enhanced features activated" messages in the startup logs
