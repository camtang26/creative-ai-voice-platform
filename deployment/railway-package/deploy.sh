#!/bin/bash

# Deploy to US-East region
echo "Deploying to US-East-1 region..."
RAILWAY_REGION=us-east-1 railway up --region us-east-1

# After deployment succeeds, get domain
echo "Getting domain..."
DOMAIN=$(railway domain)
echo "Your domain is: $DOMAIN"

# Set SERVER_URL environment variable
echo "Setting SERVER_URL environment variable..."
railway variables --set "SERVER_URL=$DOMAIN"

# Deploy again to apply the SERVER_URL
echo "Redeploying to apply SERVER_URL..."
RAILWAY_REGION=us-east-1 railway up --region us-east-1

echo "Deployment completed successfully!"
echo "Your server is now running at: $DOMAIN"
echo "Update your Twilio webhook URLs to point to this domain."
