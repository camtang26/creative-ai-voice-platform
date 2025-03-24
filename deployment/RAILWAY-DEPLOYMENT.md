# Railway.app Deployment Guide for Twilio-ElevenLabs Server

This guide will walk you through deploying your Twilio-ElevenLabs integration to Railway.app in the US-East region for reduced latency.

## Prerequisites

- GitHub account
- Your project code in a GitHub repository
- Your Twilio and ElevenLabs API credentials

## Step 1: Sign Up for Railway

1. Visit [Railway.app](https://railway.app/)
2. Click on "Start building" or "Login"
3. Sign up using your GitHub account (recommended)

## Step 2: Create a New Project

1. After logging in, click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your GitHub repository with the Twilio-ElevenLabs code
   - You may need to grant Railway access to your repositories
   - If your repository is not listed, click "Configure GitHub App" to add it

## Step 3: Configure Environment Variables

1. Once your repository is selected, click on "Variables" in the left sidebar
2. Add all required environment variables from your `.env` file:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

3. Do not include `SERVER_URL` yet, as we'll add that after deployment

## Step 4: Configure Deployment Settings

1. Click on "Settings" in the left sidebar
2. Under "Start Command", enter: `node server.js`
3. Under "Region", select "us-east-1" (Ohio)
4. Under "Port", enter `8000` (the port your server listens on)

## Step 5: Deploy Your Application

1. Click "Deploy" in the top right
2. Railway will build and deploy your application
3. Wait for the deployment to complete (monitor the logs for any errors)

## Step 6: Get Your Deployment URL

1. Once deployed, click on "Settings" again
2. Find the "Domains" section
3. You should see a URL like `https://your-project-name.up.railway.app`
4. Copy this URL - this is your new server address

## Step 7: Add Server URL Environment Variable

1. Go back to "Variables" in the left sidebar
2. Add a new variable:
   - Key: `SERVER_URL`
   - Value: The URL you copied from Step 6 (e.g., `https://your-project-name.up.railway.app`)
3. Click "Add" to save the variable
4. This will automatically redeploy your application

## Step 8: Update Twilio Webhook URLs

1. Log in to your [Twilio Console](https://www.twilio.com/console)
2. Navigate to your phone number settings
3. Update any webhook URLs to point to your new Railway URL:
   - From: `https://your-old-url.ngrok.io/outbound-call-twiml`
   - To: `https://your-project-name.up.railway.app/outbound-call-twiml`

## Step 9: Test Your Deployment

1. Run a test call using the original `make-call.js` script, updating the `SERVER_URL`:
   ```
   node make-call.js +1234567890 "Default prompt" "Default message" https://your-project-name.up.railway.app
   ```
2. Monitor the call quality and latency to see if there's improvement
3. Check the logs in Railway for any issues

## Monitoring and Management

- Railway provides real-time logs which you can access by clicking "Logs" in the left sidebar
- You can monitor CPU and memory usage in the "Metrics" section
- To make code changes, simply push to your GitHub repository - Railway will automatically redeploy

## Cost Management

- Railway offers a $5 free credit when you sign up
- After that, pricing is based on usage (typically $10-20/month for a small Node.js application)
- You can set spending limits in your account settings

## Troubleshooting

If you encounter issues:

1. **Deployment fails**: Check logs for error messages
2. **Cannot connect to server**: Verify the domain is correctly set up
3. **Twilio errors**: Double-check webhook URLs and make sure your server is responding correctly
4. **Environment variables**: Ensure all required variables are set correctly

For any specific errors, refer to Railway documentation or contact their support.