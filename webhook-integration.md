# ElevenLabs Webhook Integration for CRM

This document describes the webhook integration that sends call data from ElevenLabs Conversational AI to your CRM system.

## Overview

After each call completed by the ElevenLabs Conversational AI agent, a summary and relevant metadata are automatically sent to the CRM system. This allows for tracking of call outcomes, agent performance, and customer interactions without manual data entry.

## Webhook Setup

### 1. In the ElevenLabs Dashboard:

1. Log in to your ElevenLabs account
2. Navigate to Conversational AI → Settings
3. Under "Post-call webhooks" section, click "Create a Webhook"
4. Fill in the following information:
   - **Webhook Name**: `CRM Integration` (or any descriptive name)
   - **Callback URL**: `https://your-server-url.com/webhooks/elevenlabs` (replace with your actual server URL)
   - **Authentication Method**: `HMAC` (recommended for security)
5. Click "Create"
6. **Important**: Copy the generated Webhook Secret and store it securely

### 2. Update Environment Variables:

Add the following to your `.env` file:

```
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret_from_elevenlabs
CRM_WEBHOOK_URL=https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/crm/calls/webhook/is
```

### 3. Deploy or Restart Your Server:

Ensure your server is running and accessible from the internet. If using a local development environment, you'll need to use a service like ngrok to expose your local server.

## Data Flow

1. ElevenLabs agent makes/receives a call
2. Call completes and ElevenLabs processes the transcript
3. ElevenLabs sends the call data to your webhook endpoint (`/webhooks/elevenlabs`)
4. Your server processes this data and:
   - Extracts relevant information (phone number, contact name, call summary, etc.)
   - Formats it according to the CRM's requirements
   - Forwards it to the CRM API endpoint

## CRM Payload Format

The data sent to the CRM endpoint follows this format:

```json
{
  "type": "conversationAICall",
  "subject": "Invitation to re-trial",
  "to": "+61413052898",  // Phone number
  "name": "John Smith",  // Contact name
  "summary": "The AI assistant called regarding reactivating their Investor Signals trial...",
  "status": "held",      // "held", "no answer", "voicemail", etc.
  "duration": 65         // Call duration in seconds
}
```

## Status Values

The webhook can report the following status values:

- `held`: A conversation occurred between the agent and the contact
- `no answer`: The call was made but nobody answered
- `voicemail`: The call reached a voicemail system and a message was left
- `failed`: The call failed to connect (technical issues, wrong number, etc.)

## Testing the Webhook

You can test the webhook functionality by:

1. Making a test call with the ElevenLabs agent
2. Checking your server logs for webhook processing
3. Verifying the data appears in your CRM system

## Troubleshooting

- **Webhook not receiving data**: Verify your server is accessible and the webhook URL is correct in the ElevenLabs dashboard.
- **HMAC validation failing**: Ensure the webhook secret in your .env file matches the one from ElevenLabs.
- **Missing data in CRM**: Check server logs to verify data is being processed and sent correctly to the CRM endpoint.

## Security Considerations

- The HMAC authentication method ensures that webhooks are genuinely from ElevenLabs
- Your server should validate all incoming webhooks using the shared secret
- Consider implementing IP whitelisting using ElevenLabs' static egress IPs
