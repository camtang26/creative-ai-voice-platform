# AWS Elastic Beanstalk Deployment Guide

This guide provides step-by-step instructions for deploying your Twilio-ElevenLabs server to AWS Elastic Beanstalk in the US-East region for minimum latency.

## Prerequisites

1. AWS Account (create one at [aws.amazon.com](https://aws.amazon.com/) if you don't have one)
2. AWS CLI installed
3. EB CLI installed
4. Node.js and npm installed

## Step 1: Install AWS CLI and EB CLI

If you haven't installed them yet:

```bash
# Install AWS CLI
pip install awscli

# Install EB CLI
pip install awsebcli
```

## Step 2: Configure AWS Credentials

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, and set the default region to `us-east-1`.

## Step 3: Prepare Your Deployment Package

The deployment package is already prepared at:
`C:\Users\wowca\Cursor Projects\Twilio Node.js server\elevenlabs-outbound-calling\deployment\railway-package\`

Navigate to that directory:

```bash
cd "C:\Users\wowca\Cursor Projects\Twilio Node.js server\elevenlabs-outbound-calling\deployment\railway-package\"
```

## Step 4: Initialize Elastic Beanstalk Application

```bash
eb init
```

When prompted:
1. Select a region: Choose `1) us-east-1 : US East (N. Virginia)`
2. Enter an application name: `twilio-elevenlabs-server`
3. Select platform: `Node.js`
4. Select platform