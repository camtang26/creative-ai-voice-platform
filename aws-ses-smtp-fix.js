import 'dotenv/config';
import nodemailer from 'nodemailer';
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

// Create log file name with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = path.join(logDir, `aws-ses-smtp-fix-${timestamp}.log`);

/**
 * Custom logger that writes to both console and file
 */
function log(message, level = 'INFO') {
  const formattedMessage = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(logFile, formattedMessage + '\n');
}

/**
 * Test AWS SES SMTP connection with specific authentication method
 */
async function testSMTPConnection(config) {
  const { name, transporterConfig } = config;
  
  log(`\n===== TESTING AUTH METHOD: ${name} =====`, 'TEST');
  log(`Config: ${JSON.stringify({
    ...transporterConfig,
    auth: {
      ...transporterConfig.auth,
      pass: transporterConfig.auth.pass ? '***REDACTED***' : undefined
    }
  }, null, 2)}`, 'CONFIG');
  
  try {
    // Create transporter with the provided config
    const transporter = nodemailer.createTransport(transporterConfig);
    
    // Verify the connection
    log('Verifying SMTP connection...', 'ATTEMPT');
    await transporter.verify();
    log('✅ SMTP Connection successful!', 'SUCCESS');
    
    // Try to send a test email
    log('Attempting to send test email...', 'ATTEMPT');
    const info = await transporter.sendMail({
      from: process.env.SES_FROM_EMAIL || 'noreply@sessyd.investorsignals.com',
      to: 'craig@elevenlabs.io',
      subject: `AWS SES SMTP Test - ${name}`,
      text: `This is a test email sent using AWS SES SMTP with ${name} authentication method.`,
      html: `<h1>AWS SES SMTP Test</h1><p>This is a test email sent using AWS SES SMTP with <strong>${name}</strong> authentication method at ${new Date().toISOString()}.</p>`
    });
    
    log(`✅ Email sent successfully! Message ID: ${info.messageId}`, 'SUCCESS');
    log(`Full response: ${JSON.stringify(info)}`, 'DETAIL');
    
    return { success: true, method: name, messageId: info.messageId };
  } catch (error) {
    log(`❌ ${name} Auth Failed: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`SMTP Response: ${error.response}`, 'ERROR');
    }
    return { success: false, method: name, error: error.message };
  }
}

/**
 * Get base configurations from environment
 */
function getBaseConfig() {
  // Get values from environment
  const host = process.env.SES_SMTP_HOST || 'email-smtp.ap-southeast-2.amazonaws.com';
  const port = parseInt(process.env.SES_SMTP_PORT || '587', 10);
  const username = process.env.SES_SMTP_USERNAME;
  const password = process.env.SES_SMTP_PASSWORD;
  
  return { host, port, username, password };
}

/**
 * Main function that runs multiple tests with different configurations
 */
async function runSMTPTests() {
  log('===== AWS SES SMTP AUTHENTICATION TROUBLESHOOTER =====', 'START');
  
  const { host, port, username, password } = getBaseConfig();
  
  log(`SMTP Host: ${host}`, 'CONFIG');
  log(`SMTP Port: ${port}`, 'CONFIG');
  log(`SMTP Username: ${username}`, 'CONFIG');
  log(`SMTP Password: ${password ? '***REDACTED***' : 'NOT SET'}`, 'CONFIG');
  
  if (!username || !password) {
    log('❌ SMTP credentials are missing in environment variables!', 'ERROR');
    return;
  }
  
  // Test different authentication methods and configurations
  const testConfigs = [
    {
      name: 'Default Config (PLAIN auth)',
      transporterConfig: {
        host,
        port,
        secure: false, // STARTTLS
        auth: {
          user: username,
          pass: password
        }
      }
    },
    {
      name: 'Explicit LOGIN Auth',
      transporterConfig: {
        host,
        port,
        secure: false,
        auth: {
          type: 'login', // Force LOGIN auth method
          user: username,
          pass: password
        }
      }
    },
    {
      name: 'No STARTTLS (secure: true)',
      transporterConfig: {
        host,
        port: 465, // AWS SES secure port
        secure: true, // Use SSL/TLS
        auth: {
          user: username,
          pass: password
        }
      }
    },
    {
      name: 'Full TLS Options',
      transporterConfig: {
        host,
        port,
        secure: false,
        auth: {
          user: username,
          pass: password
        },
        requireTLS: true,
        debug: true, // Enable debug
        logger: true, // Enable logger
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        }
      }
    },
    {
      name: 'Custom Auth (CRAM-MD5)',
      transporterConfig: {
        host,
        port,
        secure: false,
        auth: {
          type: 'CRAM-MD5',
          user: username,
          pass: password
        }
      }
    },
    {
      name: 'Base64 Encoded Password',
      transporterConfig: {
        host,
        port,
        secure: false,
        auth: {
          user: username,
          pass: Buffer.from(password).toString('base64')
        }
      }
    },
    {
      name: 'AWS SES Special Config',
      transporterConfig: {
        host,
        port,
        secure: false,
        auth: {
          user: username,
          pass: password
        },
        // SES recommended settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000 // 60 seconds
      }
    }
  ];
  
  // Run all tests
  const results = [];
  for (const config of testConfigs) {
    const result = await testSMTPConnection(config);
    results.push(result);
    
    // If we found a working method, save it as the recommended config
    if (result.success) {
      log(`\n🎉 Found working authentication method: ${result.method}`, 'SUCCESS');
      
      // Save the working configuration
      const workingConfigData = `
// WORKING AWS SES CONFIGURATION
// Tested on: ${new Date().toISOString()}
// Authentication Method: ${result.method}

function createSESTransporter() {
  return nodemailer.createTransport(${JSON.stringify(config.transporterConfig, null, 2)});
}
`;
      fs.writeFileSync(path.join(__dirname, 'working-ses-config.js'), workingConfigData);
      log('💾 Saved working configuration to working-ses-config.js', 'SUCCESS');
      
      // No need to try more methods if one is working
      break;
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summarize results
  log('\n===== TEST RESULTS SUMMARY =====', 'SUMMARY');
  let successCount = 0;
  
  results.forEach(result => {
    if (result.success) {
      successCount++;
      log(`✅ ${result.method}: SUCCESS (Message ID: ${result.messageId})`, 'SUMMARY');
    } else {
      log(`❌ ${result.method}: FAILED (${result.error})`, 'SUMMARY');
    }
  });
  
  if (successCount === 0) {
    log('\n⚠️ No working authentication methods found!', 'WARNING');
    log('Recommendations:', 'HELP');
    log('1. Verify your AWS SES credentials are correct', 'HELP');
    log('2. Check if your AWS SES account is out of the sandbox', 'HELP');
    log('3. Verify the sending domain and email address are verified in AWS SES', 'HELP');
    log('4. Check for IP restrictions in your AWS SES settings', 'HELP');
    log('5. Try regenerating your SMTP credentials in the AWS console', 'HELP');
    
    // Create a quick AWS SES console link
    log('\nTo regenerate SMTP credentials, visit:', 'HELP');
    log('https://console.aws.amazon.com/ses/home?region=ap-southeast-2#/account', 'HELP');
  }
  
  log(`\nDetailed logs available at: ${logFile}`, 'INFO');
}

// Run the tests
runSMTPTests().catch(error => {
  log(`Unhandled error: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
}); 