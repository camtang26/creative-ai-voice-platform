# Email Integration for ElevenLabs Agent

This directory contains the core files needed to integrate email functionality with your ElevenLabs conversational AI agent.

## Files

- `aws-ses-email.js` - Core implementation for sending emails via AWS SES
- `email-tool-definition.json` - Tool definition for ElevenLabs agent
- `urgent-message-for-craig.md` - References an authentication issue (for context)

## Setup Instructions

1. **Environment Variables**: Ensure your `.env` file contains these settings:

```
# Email configuration for Amazon SES
SES_SMTP_HOST=email-smtp.ap-southeast-2.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USERNAME=AKIARPCLH724LC3U6EDA
SES_SMTP_PASSWORD=your_ses_password
SES_FROM_EMAIL=noreply@sessyd.investorsignals.com
SES_REPLY_TO=info@investorsignals.com
EMAIL_API_KEY=your_secure_api_key
```

2. **API Key**: The `EMAIL_API_KEY` is used to authenticate requests to your email API. This should be a secure random string.

3. **Server URL**: Make sure `SERVER_URL` in your `.env` file is correctly set to your ngrok URL.

## Current Status

There is an ongoing issue with AWS SES authentication. The credentials are being rejected with error "535 Authentication Credentials Invalid". 

Options to resolve this:
1. Verify the AWS SES password with Craig
2. Consider using an alternative email service provider
3. Enable fallback email simulation for testing

## Registering the Tool with ElevenLabs

1. Go to ElevenLabs dashboard
2. Navigate to your agent's configuration
3. Find the "Custom Tools" section
4. Add a new tool with these settings:
   - **Name:** `send_email`
   - **Description:** Instructions for when and how to send emails
   - **Method:** POST
   - **URL:** Your ngrok URL + `/api/email/send`
   - **Headers:** Add `Authorization` header with `Bearer your_api_key_here`
   - **Body Parameters:** Include `to_email`, `subject`, `content`, and optional `customer_name`

## Testing

You can test the email functionality using the `verify-smtp.js` script in the root directory:

```bash
node verify-smtp.js
```

## Security Best Practices

- Never expose your SES SMTP password in publicly accessible code
- Avoid hardcoding credentials directly in your files
- Use secure random strings for the email API key
- Consider IP restrictions for SES SMTP access 