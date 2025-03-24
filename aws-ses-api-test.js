import 'dotenv/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create log directory
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create log file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(logDir, `aws-ses-api-test-${timestamp}.log`);

// Logger function
function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

async function testSESAPI() {
  log('===== AWS SES API TEST =====');
  
  // Get environment variables
  const region = process.env.SES_REGION || 'ap-southeast-2';
  
  // Extract the access key and secret key from the SMTP credentials
  // AWS SMTP credentials follow a pattern where:
  // - Access key is the SMTP username
  // - Secret key needs to be derived from the SMTP password
  const smtpUsername = process.env.SES_SMTP_USERNAME;
  const smtpPassword = process.env.SES_SMTP_PASSWORD;
  
  log(`Region: ${region}`);
  log(`SMTP Username: ${smtpUsername}`);
  log(`SMTP Password: ${smtpPassword ? '[REDACTED]' : 'NOT SET'}`);
  
  // Note: For AWS SES, the SMTP credentials are different from the API credentials
  // SMTP password is a version of the secret key that's been processed, not the secret key itself
  // We're going to try direct API access with the SMTP credentials to see if they work
  
  try {
    // Create SES client with SMTP credentials
    // This might not work since SMTP credentials != API credentials
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId: smtpUsername,
        secretAccessKey: smtpPassword
      }
    });
    
    // Create the send email command
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL || 'craig@elevenlabs.io',
      Destination: {
        ToAddresses: ['craig@elevenlabs.io']
      },
      Message: {
        Subject: {
          Data: 'Test Email via AWS SES API'
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using the AWS SES API instead of SMTP.'
          },
          Html: {
            Data: `
              <h1>AWS SES API Test</h1>
              <p>This is a test email sent using the AWS SES API approach instead of SMTP.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            `
          }
        }
      }
    });
    
    log('Attempting to send email via AWS SES API...');
    const response = await sesClient.send(command);
    
    log(`✅ SUCCESS! Message ID: ${response.MessageId}`);
    log(`Response: ${JSON.stringify(response)}`);
    
    return true;
  } catch (error) {
    log(`❌ API ERROR: ${error.name}`);
    log(`Error message: ${error.message}`);
    log(`Full error: ${error}`);
    
    if (error.$metadata) {
      log(`HTTP Status Code: ${error.$metadata.httpStatusCode}`);
    }
    
    // If we got a signature mismatch error, explain that SMTP credentials can't be used directly with the API
    if (error.name === 'SignatureDoesNotMatch') {
      log('\n⚠️ NOTE: SMTP credentials cannot be used directly with the AWS SES API.');
      log('The SMTP password is derived from but is not the same as your AWS secret access key.');
      log('To use the API directly, you need API credentials (access key ID and secret access key).');
      log('These would need to be obtained from the AWS IAM console, not the SES SMTP settings.');
    }
    
    return false;
  }
}

async function testOutboundConnectivity() {
  log('\n===== TESTING OUTBOUND CONNECTIVITY =====');
  
  // Test common email ports
  const ports = [25, 465, 587];
  const host = process.env.SES_SMTP_HOST || 'email-smtp.ap-southeast-2.amazonaws.com';
  
  for (const port of ports) {
    try {
      log(`Testing connectivity to ${host}:${port}...`);
      
      // We'll use a simple TCP client to test connectivity
      const net = await import('net');
      const socket = new net.Socket();
      
      // Set a timeout for the connection attempt
      socket.setTimeout(5000);
      
      // Create a promise to handle the connection
      const connectPromise = new Promise((resolve, reject) => {
        // Handle successful connection
        socket.on('connect', () => {
          log(`✅ Successfully connected to ${host}:${port}`);
          socket.end();
          resolve(true);
        });
        
        // Handle connection error
        socket.on('error', (err) => {
          log(`❌ Failed to connect to ${host}:${port}: ${err.message}`);
          reject(err);
        });
        
        // Handle connection timeout
        socket.on('timeout', () => {
          log(`❌ Connection to ${host}:${port} timed out`);
          socket.destroy();
          reject(new Error('Connection timed out'));
        });
      });
      
      // Attempt the connection
      socket.connect(port, host);
      await connectPromise;
    } catch (error) {
      // The error was already logged in the promise rejection
    }
  }
  
  log('\nIf any of the SMTP ports failed to connect, your outbound SMTP traffic might be blocked.');
  log('Consider trying on a different network (like a mobile hotspot) or using AWS SES API instead of SMTP.');
}

// Run both tests
async function runTests() {
  await testOutboundConnectivity();
  await testSESAPI();
  
  log('\nTests completed. Check the logs for results.');
  log(`Log file: ${logFile}`);
}

runTests().catch(error => {
  log(`Unhandled error: ${error.message}`);
}); 