import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create a specifically formatted log for email activity
 */
function logEmail(data) {
  const timestamp = new Date().toISOString();
  const logDir = path.join(__dirname, '..', 'logs');
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'email-activity.log');
  const logMessage = `[${timestamp}] TO: ${data.to} | SUBJECT: ${data.subject} | SUCCESS: ${data.success} ${data.error ? '| ERROR: ' + data.error : ''}\n`;
  
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Error writing to email log:', err);
    }
  });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send email using the Investor Signals REST API
 * This bypasses all AWS SES configuration challenges
 */
export async function sendEmail({ to_email, subject, content, customer_name }) {
  // Validate required fields
  if (!to_email || !subject || !content) {
    throw new Error('Email address, subject, and content are required');
  }
  
  // Validate email format
  if (!isValidEmail(to_email)) {
    throw new Error('Invalid email format');
  }

  const API_ENDPOINT = 'https://qr4h1dage6.execute-api.ap-southeast-2.amazonaws.com/notices/email';
  const startTime = Date.now();
  
  try {
    console.log(`[Email API] Sending email to ${to_email} with subject "${subject}"`);
    
    // Create a plain text version of the content by stripping HTML tags
    const plainContent = content.replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    
    // Prepare the request payload
    const payload = {
      to: to_email,
      subject: subject,
      plain: plainContent,
      html: content,
      // Include customer_name as metadata if provided
      ...(customer_name && { metadata: { customer_name } })
    };
    
    // Make the API request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`[Email API] Email sent successfully! Response:`, result);
    console.log(`[Email API] Email delivery time: ${Date.now() - startTime}ms`);
    
    // Log successful email
    logEmail({
      to: to_email,
      subject: subject,
      success: true
    });
    
    return {
      success: true,
      messageId: result.messageId || 'unknown',
      fromEmail: 'info@investorsignals.com', // As per Craig's note, always from this address
      elapsed: Date.now() - startTime
    };
    
  } catch (error) {
    console.error(`[Email API] Error sending email:`, error);
    
    // Log failure
    logEmail({
      to: to_email,
      subject: subject,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}

// Simple test function - can be called directly
export async function testEmail() {
  try {
    const result = await sendEmail({
      to_email: 'test@example.com', // Replace with your test email
      subject: 'Test Email from Investor Signals API',
      content: '<h1>This is a test email</h1><p>This email was sent using the Investor Signals API endpoint to verify the configuration is working correctly.</p>',
      customer_name: 'Test User'
    });
    
    console.log('Test email result:', result);
    return result;
  } catch (error) {
    console.error('Test email failed:', error.message);
    throw error;
  }
}

// If this file is run directly, run the test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running email API test...');
  testEmail()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err.message));
} 