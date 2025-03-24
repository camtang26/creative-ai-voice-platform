# Using the Local Server Setup

This guide explains how to use your local server setup for making calls with ElevenLabs and Twilio.

## Starting the Local Server

1. **Start ngrok and the server**:
   ```
   start-server-simple.bat
   ```

   This will:
   - Start ngrok to expose your local server
   - Update your .env.local file with the ngrok URL
   - Start the Node.js server with the local environment

2. **Check the server URL**:
   - Look in the console output for `Using ngrok URL: https://xxxx-xxxx-xxxx-xxxx.ngrok.io`
   - This URL will be used for all API calls

## Making Calls with the Local Server

Use these scripts to ensure calls go through your local server:

### For Single Calls

```
make-call-local.bat +61XXXXXXXXX "Optional custom prompt" "Optional first message"
```

### For Sheet-Based Calls

```
sheet-call-local.bat YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

### For Sheet-Based Calls with Australia Region

```
sheet-call-au-local.bat YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

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
   You should see a response like: `{"status":"Server is running","server":"Local (ngrok)","environment":"production","serverTime":"2025-03-20T12:34:56.789Z"}`

2. **Check latency metrics**:
   ```
   curl http://localhost:8000/debug/latency
   ```
   This will show performance statistics for your server

## Troubleshooting

If calls are still going through Railway instead of your local server:

1. **Check your .env.local file**:
   - Make sure SERVER_URL is set to your ngrok URL
   - If not, update it manually

2. **Make sure you're using the local scripts**:
   - Use `make-call-local.bat` instead of `make-call.js`
   - Use `sheet-call-local.bat` instead of `sheet-call.js`

3. **Check ngrok connection**:
   - Visit http://localhost:4040 in your browser
   - Verify the tunnel is active and note the URL

4. **Verify server is running locally**:
   - You should see log output in the server console
   - Requests should appear in the logs when you make calls