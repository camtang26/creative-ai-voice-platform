# GitHub Setup Guide

## Before Pushing to GitHub

Follow these steps to ensure you don't accidentally push sensitive data to GitHub:

1. **Clean Environment Files**

   Make sure you remove actual credentials from any files tracked by git:
   
   ```bash
   # Create a safe .env example file if not already done
   cp .env .env.example
   
   # Edit .env.example to remove real credentials
   # Replace actual values with placeholders like 'your_twilio_account_sid'
   ```

2. **Check for Sensitive Files**

   ```bash
   # Verify .gitignore contains all sensitive files
   cat .gitignore
   
   # Check what git will commit
   git status
   ```

3. **Remove Sensitive Files from Git Tracking**

   If you've already committed sensitive files, remove them from tracking:
   
   ```bash
   # Remove .env file from git tracking (but keep the file locally)
   git rm --cached .env
   
   # Remove token.json from git tracking (but keep the file locally)
   git rm --cached token.json
   
   # Remove credentials.json from git tracking (but keep the file locally)
   git rm --cached credentials.json
   ```

4. **Verify No Sensitive Data Before First Push**

   ```bash
   # Check if any sensitive patterns are present in files tracked by git
   git grep -i "password\|secret\|key\|token\|sid\|credential"
   
   # Check all changes to be committed
   git diff --staged
   ```

5. **Push to Your Private Repository**

   ```bash
   # Add your GitHub repository as a remote
   git remote add origin https://github.com/yourusername/repo-name.git
   
   # Push to GitHub
   git push -u origin main
   ```

## Initial Repository Structure

Before pushing, consider arranging the repository with this structure:

```
elevenlabs-outbound-calling/
├── .env.example          # Template with placeholder credentials
├── .gitignore            # Properly configured to ignore sensitive files
├── README.md             # Main documentation
├── SECURITY.md           # Security guidelines
├── package.json          # Dependencies and scripts
├── server.js             # Main server file
├── outbound.js           # Outbound calling functionality
├── email-tools/          # Email integration directory
│   ├── aws-ses-email.js  # AWS SES implementation
│   ├── email-tool-definition.json # Tool definition for ElevenLabs
│   └── README.md         # Email-specific documentation
└── backup-files/         # Not pushed to GitHub
```

## After Sharing with Craig

After Craig clones the repository, they will need to:

1. Create their own `.env` file based on `.env.example`
2. Install dependencies with `npm install`
3. Start the server with `npm start`

## Maintaining Security

Periodically audit your GitHub repository for accidentally committed credentials:

1. Check git history for sensitive data
2. Use GitHub's secret scanning feature (available in private repositories)
3. Consider automated credential scanning tools for your CI/CD pipeline 