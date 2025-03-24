# Optimized ElevenLabs-Twilio Integration

This directory contains optimized versions of the ElevenLabs-Twilio integration designed to reduce latency in outbound calls.

## Overview of Optimizations

The optimized implementation includes multiple changes to reduce latency and improve performance:

1. **WebSocket Optimizations**
   - Disabled compression for real-time audio
   - Increased maximum payload size
   - Shorter timeouts for faster error detection
   - Optimized TCP socket settings

2. **Audio Processing Optimizations**
   - Reduced redundant base64 conversions
   - Faster processing path for audio messages
   - Streamlined JSON parsing for audio chunks

3. **Latency Measurement and Logging**
   - Detailed logging of audio round-trip times
   - Performance summaries at the end of calls
   - API response time tracking

4. **ElevenLabs API Optimizations**
   - Low-latency mode configuration
   - Smaller audio chunk size requests
   - Latency-optimized streaming parameters

## How to Use the Optimized Version

### 1. Starting the Optimized Server

The optimized server runs on port 8001 by default (instead of port 8000 used by the regular server).

To start the optimized server:

```bash
# Option 1: Using the start-optimized.bat file (Windows)
start-optimized.bat

# Option 2: Using Node.js directly
node optimized/start-optimized-server.js
```

### 2. Setting Up ngrok

Update your ngrok tunnel to point to the optimized server port:

```bash
ngrok http 8001
```

Then update your `.env` file with the new ngrok URL:

```
SERVER_URL=https://your-new-ngrok-url.ngrok.io
```

### 3. Making Test Calls

Use the optimized test call script to test calls:

```bash
node optimized/make-call-optimized.js +1234567890
```

## Configuring Optimization Settings

The optimization settings can be found at the top of `outbound-optimized.js`:

```javascript
const OPTIMIZATIONS = {
  DISABLE_WEBSOCKET_COMPRESSION: true,  // Reduces CPU overhead for real-time audio
  INCREASE_MAX_PAYLOAD: true,           // Allows larger audio chunks
  OPTIMIZE_AUDIO_PARSING: true,         // Faster audio processing
  LATENCY_LOGGING: true,                // Add detailed latency measurements
  LOW_LATENCY_MODE: true                // Prioritize latency over quality
};
```

You can toggle these settings on/off to find the best configuration for your use case.

## Understanding Latency Measurements

When `LATENCY_LOGGING` is enabled, the console will show timing information:

```
[LATENCY] Audio round trip: 450ms, Avg: 423.50ms
```

This measurement represents the time between:
1. Sending user audio to ElevenLabs
2. Receiving a response from ElevenLabs

Lower numbers are better, and you'll see a summary at the end of each call:

```
[LATENCY] Call Performance Summary:
  - Average round trip: 423.50ms
  - Minimum round trip: 350ms
  - Maximum round trip: 650ms
  - Total audio messages: 45
```

## Best Practices for Low Latency

For optimal performance:

1. **Server Location**: Deploy your server in the US, closer to ElevenLabs' infrastructure
2. **Use US Phone Numbers**: Twilio US phone numbers generally have lower latency to ElevenLabs
3. **Network Quality**: Run your server on a connection with low jitter and packet loss
4. **Monitoring**: Keep an eye on the latency logs to identify performance issues

## Troubleshooting

If you encounter issues:

1. **High Latency Persists**: Try modifying the WebSocket settings in `outbound-optimized.js`
2. **Call Quality Issues**: You may need to balance latency and quality by adjusting settings
3. **Connection Failures**: Make sure your ngrok tunnel is correctly configured
4. **Server Crashes**: Check the logs for errors and potential memory issues

## Additional Recommendations

1. **Regional Deployment**: Consider deploying in AWS US-East for closest proximity to ElevenLabs
2. **Direct Connections**: For production, avoid ngrok and use direct public endpoints
3. **Premium Twilio Account**: Ensure you're not on a trial account which may have additional routing

## Reverting to Original Implementation

If needed, you can always revert to the original implementation by:

1. Stopping the optimized server
2. Starting the original server on port 8000
3. Updating your ngrok tunnel to port 8000
4. Using the original test scripts