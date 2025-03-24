# Twilio-ElevenLabs Integration

This Node.js application integrates Twilio with ElevenLabs Conversational AI for outbound calling.

## Railway.app Deployment

This repository is configured for deployment on Railway.app.

### Required Environment Variables

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
ELEVENLABS_API_KEY=your_elevenlabs_api_key
SERVER_URL=your_railway_app_url
```

### Start Command

```
node server.js
```

### Port

```
8000
```

## Important

After deployment, update the `SERVER_URL` environment variable with your Railway domain.
