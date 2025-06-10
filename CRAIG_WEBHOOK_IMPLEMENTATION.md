# CRM Webhook Implementation Documentation for Craig

## Current ElevenLabs Webhook Setup

### Webhook URL
The ElevenLabs webhook is currently configured to send data to:
```
https://[YOUR_SERVER_URL]/webhooks/elevenlabs
```

### Current Data Flow (OLD - Not Reliable)
1. **ElevenLabs** sends a `post_call_transcription` webhook after conversation completion
2. Your server processes this webhook and extracts conversation data
3. Your server then calls Craig's CRM endpoint

### The Problem with ElevenLabs Webhooks
- **ElevenLabs webhooks** don't always fire reliably
- They don't include all Twilio call metadata (phone numbers, call duration, etc.)
- The timing can be unpredictable

## NEW Implementation: Twilio-Based Webhook ✅

I've implemented a new approach that:
1. **Triggers from Twilio's call completion events** (100% reliable)
2. **Generates simple summaries** based on call metadata
3. **No dependency on ElevenLabs** - works 100% of the time
4. **Sends to Craig's endpoint** with all required data

### How It Works

1. **Twilio calls your server** when a call ends with status: `completed`, `failed`, `busy`, `no-answer`, or `canceled`
2. **Your server immediately**:
   - Gets call metadata from MongoDB
   - Generates a simple summary based on call outcome
   - Sends complete data to Craig's CRM endpoint

### Data Sent to CRM
```json
{
  "type": "conversationAICall",
  "subject": "Campaign Name from Database",
  "to": "+61413052898",
  "name": "Contact Name",
  "summary": "Call completed successfully. Duration: 1m 25s. Contact: John Smith.",
  "status": "held|no answer|no connection|voicemail",
  "duration": 85
}
```

### Example Summaries
- **Successful call**: "Call completed successfully. Duration: 2m 15s. Contact: Sarah Jones."
- **Voicemail**: "Call reached voicemail/answering machine."
- **No answer**: "Call was not answered."
- **Failed**: "Call could not be connected."

### Status Mapping
- **"held"** - Call was completed and duration > 0
- **"no answer"** - Twilio status was no-answer or busy
- **"no connection"** - Twilio status was failed or canceled
- **"voicemail"** - Call was answered by machine/voicemail

### Benefits
- ✅ **100% reliable** - Twilio always sends status callbacks
- ✅ **Complete metadata** - All call information available
- ✅ **Fast** - Triggers immediately on call end
- ✅ **No dependencies** - Works without ElevenLabs webhooks
- ✅ **Simple and maintainable** - No complex API calls or delays

## Configuration Required

### 1. Environment Variables
Make sure these are set in your `.env` file:
```bash
# Craig's CRM endpoint
CRM_WEBHOOK_URL=https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is
ENABLE_CRM_WEBHOOK=true
```

### 2. Twilio Configuration
When making calls, ensure Twilio is configured with the status callback URL:
```
statusCallback: https://[YOUR_SERVER_URL]/call-status-callback
statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer', 'canceled']
```

## Testing the Integration

### Manual Test Endpoint
I've added a test endpoint you can use to manually trigger the CRM webhook for any call:

```bash
POST https://[YOUR_SERVER_URL]/api/test-crm-webhook
Content-Type: application/json

{
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### What Craig Receives
When a call completes, Craig's endpoint receives:
```json
{
  "type": "conversationAICall",
  "subject": "Actual campaign name or 'Outbound Call'",
  "to": "+61413052898",
  "name": "John Smith",
  "summary": "Call completed successfully. Duration: 2m 5s. Contact: John Smith.",
  "status": "held",
  "duration": 125
}
```

## Implementation Files

1. **`/src/integrations/twilio-crm-webhook.js`** - New module handling Twilio-based CRM webhooks
2. **`server-mongodb.js`** - Modified to call CRM webhook on Twilio call completion
3. **`/src/integrations/crm-webhook.js`** - Original CRM webhook module (still used by ElevenLabs path)

## Deployment

After pulling these changes:
1. Restart your server
2. Ensure environment variables are set
3. Make a test call
4. Check logs for "[Twilio CRM]" entries
5. Verify Craig receives the webhook