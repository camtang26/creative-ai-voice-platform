# Campaign System Documentation

## Overview

The campaign system enables automated outbound calling to lists of contacts with customizable AI agents. This document explains how the system works after recent integration fixes.

## Architecture

### Components

1. **Campaign Model** (`db/models/campaign.model.js`)
   - Stores campaign configuration, stats, and settings
   - Supports Google Sheets integration
   - Tracks call statistics and progress

2. **Campaign Engine** (`db/campaign-engine.js`)
   - Background process that executes campaigns
   - Manages concurrent calls and pacing
   - Updates campaign statistics in real-time

3. **Campaign API** (`db/api/campaign-api.js`)
   - REST endpoints for campaign management
   - CSV upload functionality
   - Campaign control (start/pause/stop)

4. **Frontend UI** (`frontend/src/app/campaigns/`)
   - Campaign listing and management
   - Real-time monitoring
   - Progress visualization

5. **Socket Integration** (`campaign-socket-integration.js`)
   - Real-time updates to connected clients
   - Campaign progress tracking
   - Live call status updates

## How It Works

### 1. Campaign Creation

Campaigns can be created via:
- Web UI form
- CSV upload with contacts
- API endpoints

Required fields:
- Name
- Phone number list (contacts)
- AI agent prompt
- First message template

### 2. Campaign Execution Flow

```
1. User starts campaign → API updates status to 'active'
2. Campaign engine picks up active campaign
3. Engine retrieves contacts from database
4. For each contact (respecting concurrent limits):
   a. Call makeOutboundCall() with campaign parameters
   b. Twilio initiates call with TwiML
   c. WebSocket connects to ElevenLabs AI
   d. Campaign/contact IDs passed through stream
5. Call status updates trigger campaign stat updates
6. Socket.IO broadcasts progress to UI
```

### 3. Call Integration

The `makeOutboundCall` function in `outbound.js` accepts:
- `campaignId` - Links call to campaign
- `contactId` - Links call to contact
- `prompt` - AI agent instructions
- `firstMessage` - Initial greeting
- `name` - Contact's name for personalization

These parameters flow through:
1. TwiML URL query parameters
2. WebSocket stream parameters
3. ElevenLabs conversation setup

### 4. Status Tracking

Campaign states:
- `draft` - Created but not started
- `active` - Currently making calls
- `paused` - Temporarily stopped
- `completed` - All contacts called
- `cancelled` - Manually stopped

Call statistics tracked:
- Total contacts
- Calls placed
- Calls completed
- Calls answered
- Average duration
- Success rate

## Configuration

### Environment Variables

```env
# Required for campaigns
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
ELEVENLABS_API_KEY=your_key
ELEVENLABS_AGENT_ID=your_agent_id
MONGODB_URI=your_connection_string
```

### Campaign Settings

Default settings in campaign model:
```javascript
{
  callDelay: 5000,         // 5 seconds between calls
  maxConcurrentCalls: 5,   // Max 5 calls at once
  retryCount: 1,           // Retry failed calls once
  retryDelay: 3600000      // Wait 1 hour before retry
}
```

## API Endpoints

### Campaign Management

- `GET /api/db/campaigns` - List campaigns
- `POST /api/db/campaigns` - Create campaign
- `GET /api/db/campaigns/:id` - Get campaign details
- `PUT /api/db/campaigns/:id` - Update campaign
- `DELETE /api/db/campaigns/:id` - Delete campaign

### Campaign Control

- `POST /api/db/campaigns/:id/start` - Start campaign
- `POST /api/db/campaigns/:id/pause` - Pause campaign
- `POST /api/db/campaigns/:id/resume` - Resume campaign
- `POST /api/db/campaigns/:id/stop` - Stop campaign

### Campaign Data

- `GET /api/db/campaigns/:id/stats` - Get statistics
- `GET /api/db/campaigns/:id/contacts` - List contacts
- `POST /api/db/campaigns/:id/contacts` - Add contacts
- `POST /api/db/campaigns/start-from-csv` - Create from CSV

## Real-time Monitoring

The system uses Socket.IO for real-time updates:

### Events Emitted

- `campaign_update` - Status changes
- `campaign_progress` - Statistics updates
- `campaign_call_update` - Individual call events
- `active_campaigns_list` - List of running campaigns

### Frontend Integration

```javascript
// Listen for campaign updates
socket.on('campaign_update', (data) => {
  // Update UI with campaign status
});

socket.on('campaign_progress', (data) => {
  // Update progress bars and stats
});
```

## Testing

Use the provided test script to verify functionality:

```bash
node test-campaign-integration.js
```

This will:
1. Create a test campaign
2. Add a test contact
3. Start the campaign
4. Monitor progress
5. Stop the campaign

## Troubleshooting

### Campaign Not Starting

1. Check MongoDB connection
2. Verify campaign engine initialized in server logs
3. Ensure Twilio credentials are set
4. Check for contacts in campaign

### Calls Not Being Placed

1. Verify phone numbers are valid format
2. Check Twilio account balance
3. Review campaign settings (delays, limits)
4. Check server logs for errors

### No Real-time Updates

1. Verify Socket.IO connection
2. Check browser console for errors
3. Ensure campaign socket integration loaded
4. Review network tab for socket traffic

## Recent Fixes

1. **Campaign Engine Initialization** - Added to server startup
2. **Status Update Integration** - Connected call callbacks to campaign engine
3. **Socket Updates** - Ensured repository updates trigger socket events
4. **Test Script** - Created for integration testing

## Future Enhancements

- Schedule campaigns for specific times
- A/B testing different prompts
- Advanced retry strategies
- Campaign templates
- Detailed analytics dashboard
- Export campaign results