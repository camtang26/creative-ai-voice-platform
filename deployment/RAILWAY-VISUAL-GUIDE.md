# Railway.app Deployment Visual Guide

This guide provides detailed step-by-step instructions with descriptions of exactly what you'll see on each screen during the Railway.app deployment process.

## Step 1: Create GitHub Repository

![GitHub New Repository]
1. Open Chrome and navigate to GitHub.com
2. Click the "+" icon in the top right
3. Select "New repository"
4. Set repository name: "elevenlabs-twilio-server"
5. Add an optional description
6. Choose "Public" (or Private if you prefer)
7. Click "Create repository"

## Step 2: Upload Files to GitHub

![GitHub Upload Files]
1. On your new repository page, click "uploading an existing file" link
2. Drag and drop all files from the `deployment/railway-package` folder
3. Add a commit message: "Initial commit with Railway deployment files"
4. Click "Commit changes"

## Step 3: Sign Up for Railway

![Railway Homepage]
1. Open Chrome and navigate to [railway.app](https://railway.app/)
2. You'll see a dark-themed homepage with "Deploy Infra, Fast" text
3. Click the "Login" button in top right corner
4. Select "Login with GitHub" from the options
5. Authorize Railway to access your GitHub account
6. You'll be redirected to the Railway dashboard

## Step 4: Create New Project

![Railway Dashboard]
1. On the dashboard, you'll see a purple/dark background
2. Look for the "New Project" button in the center or top-right
3. Click this button
4. You'll see a menu with deployment options

![Railway Project Options]
5. Select "Deploy from GitHub repo"
6. A list of your GitHub repositories will appear
7. Find and click on "elevenlabs-twilio-server"
8. If you don't see your repository, click "Configure GitHub App" to grant access

## Step 5: Project Setup

![Railway Project Setup]
1. After selecting your repository, you'll see a loading screen
2. Railway will analyze your repository
3. It will automatically detect it's a Node.js application
4. You'll see your project dashboard with tabs in the left sidebar:
   - Overview
   - Deployments
   - Variables
   - Metrics
   - Settings

## Step 6: Configure Environment Variables

![Railway Variables]
1. Click on "Variables" in the left sidebar
2. You'll see an empty variables page with "New Variable" button
3. Click "New Variable"
4. Add each of these variables one by one:
   ```
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ```
5. For each variable:
   - Add the key (e.g., "TWILIO_ACCOUNT_SID")
   - Add the value
   - Click "Add"
6. Leave SERVER_URL for now - we'll add it after deployment

## Step 7: Configure Region

![Railway Settings]
1. Click on "Settings" in the left sidebar
2. Scroll down to find the "Region" section
3. You'll see a dropdown menu with region options
4. Click the dropdown and select "us-east-1" (Ohio