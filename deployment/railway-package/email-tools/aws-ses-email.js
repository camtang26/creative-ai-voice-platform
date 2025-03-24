import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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
 * Create a test account with Ethereal for local testing
 */
async function createTestAccount() {
  console.log('[Email] Creating test account for local email testing...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[Email] Test account created:', testAccount.user);
    
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    console.error('[Email] Failed to create test account:', error.message);
    return null;
  }
}

/**
 * Create a SES client to send emails via AWS SES API
 * This bypasses SMTP blocking issues that occur on many networks/platforms
 */
function createSESClient() {
  try {
    // Get values from environment
    const region = process.env.SES_REGION || 'ap-southeast-2';
    const accessKeyId = process.env.SES_SMTP_USERNAME;
    const secretAccessKey = process.env.SES_SMTP_PASSWORD;
    const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@sessyd.investorsignals.com';
    const replyTo = process.env.SES_REPLY_TO || 'info@investorsignals.com';

    console.log(`[SES] Creating API client with region: ${region}, username: ${accessKeyId}`);
    
    // Check if credentials exist
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('SES credentials missing. Check your environment variables.');
    }
    
    // Create SES client
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    
    return { sesClient, fromEmail, replyTo };
  } catch (error) {
    console.error('[SES] Client creation error:', error.message);
    throw error;
  }
}

/**
 * Send email using AWS SES API with fallback to test account if needed
 * This API-based approach works on networks where SMTP ports are blocked
 */
export async function sendSESEmail({ to_email, subject, content, customer_name }) {
  // Validate required fields
  if (!to_email || !subject || !content) {
    throw new Error('Email address, subject, and content are required');
  }
  
  // Validate email format
  if (!isValidEmail(to_email)) {
    throw new Error('Invalid email format');
  }
  
  // Prepare email data
  let messageId;
  let fromEmail;
  let replyTo;
  let previewUrl;
  const isFallbackEnabled = process.env.EMAIL_FALLBACK_ENABLED === 'true';
  const startTime = Date.now();
  
  try {
    // Try AWS SES API first (unless fallback is enabled and we're explicitly testing)
    if (!isFallbackEnabled) {
      console.log('[Email] Attempting to use AWS SES API...');
      const { sesClient, fromEmail: sesFromEmail, replyTo: sesReplyTo } = createSESClient();
      fromEmail = sesFromEmail;
      replyTo = sesReplyTo;
      
      // Format the SES API command parameters
      const sendEmailCommand = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [to_email]
        },
        Message: {
          Subject: {
            Data: subject
          },
          Body: {
            Html: {
              Data: content
            }
          }
        },
        ReplyToAddresses: [replyTo],
        Headers: [
          {
            Name: 'X-Customer-Name', 
            Value: customer_name || 'Guest'
          },
          {
            Name: 'X-Service',
            Value: 'ElevenLabs-AI'
          },
          {
            Name: 'X-Mail-Platform',
            Value: 'AWS-SES-API'
          }
        ]
      });
      
      // Send email via SES API
      console.log(`[SES] Sending email to ${to_email} with subject "${subject}"`);
      const response = await sesClient.send(sendEmailCommand);
      messageId = response.MessageId;
      
      console.log(`[SES] Email sent successfully via API! Message ID: ${messageId}`);
      console.log(`[SES] Email delivery time: ${Date.now() - startTime}ms`);
    } else {
      throw new Error('Fallback mode enabled, skipping SES attempt');
    }
  } catch (error) {
    if (isFallbackEnabled) {
      // Fallback to Ethereal/test account when SES fails
      console.log(`[Email] Falling back to test account: ${error.message}`);
      
      try {
        // Create test account
        const testTransporter = await createTestAccount();
        if (!testTransporter) {
          throw new Error('Failed to create test email account for fallback');
        }
        
        fromEmail = 'test@example.com';
        replyTo = 'reply@example.com';
        
        // Send via test account
        const info = await testTransporter.sendMail({
          from: fromEmail,
          to: to_email,
          subject: `[TEST] ${subject}`,
          html: `<div style="border: 2px solid #FF0000; padding: 10px; margin-bottom: 10px; background-color: #FFEEEE;">
                  <h3>⚠️ TEST MODE - NO REAL EMAIL SENT ⚠️</h3>
                  <p>SES is not configured or failed. This is a simulated email.</p>
                  <p>Error: ${error.message}</p>
                 </div>
                 ${content}`,
          headers: {
            'X-Customer-Name': customer_name || 'Guest',
            'X-Test-Mode': 'true',
            'X-Original-Error': error.message
          }
        });
        
        messageId = info.messageId;
        previewUrl = nodemailer.getTestMessageUrl(info);
        
        console.log(`[Email] Test email sent! Message ID: ${messageId}`);
        console.log(`[Email] Preview URL: ${previewUrl}`);
        console.log(`[Email] Test fallback time: ${Date.now() - startTime}ms`);
      } catch (fallbackError) {
        // If even the fallback fails, log both errors and throw
        console.error('[Email] Both SES and fallback failed:');
        console.error('  - Original error:', error.message);
        console.error('  - Fallback error:', fallbackError.message);
        
        // Log failure
        logEmail({
          to: to_email,
          subject: subject,
          success: false,
          error: `SES: ${error.message}, Fallback: ${fallbackError.message}`
        });
        
        throw new Error(`Email sending failed completely: ${fallbackError.message}`);
      }
    } else {
      // Rethrow if fallback is not enabled
      console.error(`[Email] Error sending email and no fallback enabled:`, error);
      
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
  
  // Log successful email
  logEmail({
    to: to_email,
    subject: subject,
    success: true
  });
  
  // Return sending result
  return {
    success: true,
    messageId,
    previewUrl,
    fromEmail,
    replyTo,
    testMode: !!previewUrl,
    elapsed: Date.now() - startTime
  };
}

// Simple test function - can be called directly
export async function testSESEmail() {
  try {
    const result = await sendSESEmail({
      to_email: 'test@example.com', // Replace with your test email
      subject: 'Test Email from SES',
      content: 'This is a test email to verify the SES configuration is working correctly.',
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
  console.log('Running SES email test...');
  testSESEmail()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err.message));
} 