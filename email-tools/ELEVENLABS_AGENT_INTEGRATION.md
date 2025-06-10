# ElevenLabs Agent Email Integration Guide

This document explains how to integrate the email functionality with your ElevenLabs conversational AI agent.

## Overview

The email integration allows your ElevenLabs AI agent to send professionally formatted emails directly from voice conversations. This is particularly useful for sending complex information, follow-up details, or documentation that would be difficult to convey verbally.

## How It Works

1. **User Request**: During a voice conversation, the user requests information via email
2. **Agent Processing**: The AI agent recognizes this request and determines email is appropriate
3. **Email Collection**: The agent asks for and confirms the user's email address
4. **Content Creation**: The agent crafts appropriate HTML email content
5. **Tool Invocation**: The agent calls the `send_email` custom tool
6. **Email Delivery**: Our server processes the request and sends via the Investor Signals API
7. **Branded Email**: The user receives a professionally formatted email with Investor Signals branding

## Setup Instructions

### 1. Server Configuration

Ensure your server is properly configured:

- The server is running and accessible via a public URL (ngrok or production URL)
- Email functionality is working correctly (tested via `test-api-email.js`)
- `.env` file has correct settings, especially `SERVER_URL` and `EMAIL_API_KEY`

### 2. ElevenLabs Agent Configuration

1. **Log in** to your ElevenLabs dashboard
2. **Navigate** to the Agent section
3. **Select** your conversational AI agent
4. **Go to** the "Custom Tools" section
5. **Add** a new custom tool with the following configuration:

#### Tool Configuration

Use the exact JSON from `email-tool-definition.json`, ensuring to replace placeholder values:

```json
{
  "name": "send_email",
  "display_name": "Email Sender",
  "description": "Sends a professionally formatted email to a recipient using the Investor Signals email service. Use this tool when the user specifically requests to receive information by email or when you need to send detailed information that is better suited for email than for a phone conversation. Emails will automatically include Investor Signals branding and come from info@investorsignals.com.",
  "input_schema": {
    "type": "object",
    "properties": {
      "to_email": {
        "type": "string",
        "description": "Email address of the recipient. Must be a valid email format."
      },
      "subject": {
        "type": "string",
        "description": "Subject line of the email. Should be clear, concise, and relevant to the content."
      },
      "content": {
        "type": "string",
        "description": "HTML content of the email. You can use basic HTML formatting (<h1>, <p>, <ul>, <li>, <strong>, <em>, etc.) to structure the email and make it more readable. The Investor Signals logo and company footer will be automatically added."
      },
      "customer_name": {
        "type": "string",
        "description": "Name of the customer (optional). If provided, it will be used to personalize the email."
      }
    },
    "required": ["to_email", "subject", "content"]
  },
  "authentication": {
    "type": "bearer",
    "authorization_header": "Authorization"
  },
  "api": {
    "url": "https://your-server-url.com/api/email/send",
    "method": "POST"
  }
}
```

⚠️ Important: Replace `https://your-server-url.com` with your actual server URL.

### 3. Configure Agent Knowledge

Add the `AGENT_EMAIL_GUIDELINES.md` file content to your agent's knowledge base:

1. **Go to** the "Knowledge" section of your agent
2. **Click** "Add Knowledge"
3. **Upload** or paste the content from `AGENT_EMAIL_GUIDELINES.md`
4. **Name it** "Email Guidelines"
5. **Save** the knowledge

### 4. Agent Prompt Enhancement

Add these instructions to your agent's system prompt to encourage appropriate email usage:

```
EMAILS: You can send emails to customers using the send_email tool. Offer to send an email when:
- The customer specifically asks for information via email
- You need to share complex information difficult to convey verbally
- The customer would benefit from having a written record

When sending an email:
1. Ask for and confirm their email address
2. Create well-structured HTML content with clear headings and formatting
3. Use a descriptive subject line
4. Include next steps or a call to action
5. Inform the customer that the email will come from info@investorsignals.com
```

## Testing the Integration

1. **Run a test call** with your agent
2. **Ask** for information to be sent via email
3. **Provide** a test email address
4. **Verify** the email is correctly delivered with proper formatting

## Troubleshooting

If the agent isn't offering email or using the tool correctly:

1. **Check the server logs** for any API errors
2. **Verify** the tool configuration in ElevenLabs matches exactly
3. **Confirm** the server URL is correct and accessible
4. **Test** the email endpoint directly using Postman or the test script
5. **Review** the system prompt to ensure email instructions are clear

## Examples

See the `test-agent-email-integration.js` file for a simulation of how the agent interacts with the email functionality.

## Advanced Integration

For more advanced integration:
- Enable email analytics tracking
- Add customer records integration
- Implement automated follow-ups
- Create specialized email templates for different conversation scenarios

## Support

For any issues with the email integration, contact Craig at craig@elevenlabs.io 