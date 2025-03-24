# Restoring Full Agent Functionality

Now that the minimal server is working, we need to restore the full agent functionality with AU region for optimal performance.

## Option 1: Quick Update (Recommended)

1. Copy the complete outbound file:
   ```
   copy outbound-complete.js outbound.js
   ```

2. Deploy to Railway:
   ```
   railway up
   ```

3. Test the server with the client script:
   ```
   node test-server.js
   ```

## Option 2: Manual Update

If you prefer to manually update the files:

1. Edit `outbound.js` to add Australia region to Twilio client:
   ```javascript
   // Initialize Twilio client with Australia region
   const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, {
     region: 'au1'  // Specify Australia region for lower latency
   });
   console.log("[Twilio] Initialized with Australia region (au1) for lower latency");
   ```

2. Add region parameter to outbound call creation:
   ```javascript
   const call = await twilioClient.calls.create({
     from: callerId || TWILIO_PHONE_NUMBER,
     to: number,
     url: urlWithFirstMessage,
     region: 'au1' // Use Australia region
   });
   ```

3. Add callerId parameter handling:
   ```javascript
   const { number, prompt, first_message, callerId } = request.body;
   ```

## Client-Side Updates

Use the updated sheet-call script that properly formats the caller ID:

```
cd ..
node sheet-call-au.js YOUR_SPREADSHEET_ID [SheetName] [MaxCalls]
```

## Troubleshooting

If you encounter any issues:

1. Check Railway logs:
   ```
   railway logs
   ```

2. Test individual endpoints:
   ```
   node test-server.js
   ```

3. If needed, revert to minimal working version:
   ```
   copy outbound-minimal.js outbound.js
   railway up
   ```

## Understanding the Changes

The only changes made to restore full agent functionality while keeping AU region are:

1. Using the AU region when initializing the Twilio client
2. Adding the region parameter to outbound calls
3. Supporting the callerId parameter for flexibility
4. Keeping all the original agent functionality intact

These changes ensure that calls are routed through the Australia Twilio region, reducing latency while maintaining all the original agent functionality.