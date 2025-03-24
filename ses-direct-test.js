import 'dotenv/config';
import nodemailer from 'nodemailer';

// Log the environment variables (partially redacted for security)
console.log('===== ENVIRONMENT VARIABLES CHECK =====');
console.log(`SMTP Host: ${process.env.SES_SMTP_HOST}`);
console.log(`SMTP Port: ${process.env.SES_SMTP_PORT}`);
console.log(`SMTP Username: ${process.env.SES_SMTP_USERNAME}`);
console.log(`SMTP Password: ${process.env.SES_SMTP_PASSWORD ? 
  `${process.env.SES_SMTP_PASSWORD.substring(0, 3)}...${process.env.SES_SMTP_PASSWORD.substring(process.env.SES_SMTP_PASSWORD.length - 3)}` : 'NOT SET'}`);
console.log(`From Email: ${process.env.SES_FROM_EMAIL}`);
console.log(`Reply To: ${process.env.SES_REPLY_TO}`);
console.log('======================================');

// Direct configuration based on Craig's screenshot
// This bypasses any potential issues with how we load env variables
const directConfig = {
  host: 'email-smtp.ap-southeast-2.amazonaws.com',
  port: 587,
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: 'AKIARPCLH724LC3U6EDA',
    pass: 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b'
  },
  debug: true, // Enable debug logging
  logger: true, // Log to console
  tls: {
    // Require TLS and reject insecure connections
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }
};

// Alternative configuration from environment variables
const envConfig = {
  host: process.env.SES_SMTP_HOST || 'email-smtp.ap-southeast-2.amazonaws.com',
  port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD
  },
  debug: true, 
  logger: true,
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }
};

// Function to test both configurations
async function testSMTP() {
  console.log('\n===== TESTING DIRECT CONFIGURATION =====');
  try {
    // Create transporter with direct config
    const directTransporter = nodemailer.createTransport(directConfig);
    
    // Verify connection
    console.log('Verifying direct connection...');
    const directResult = await directTransporter.verify();
    console.log('✅ DIRECT CONNECTION SUCCESSFUL:', directResult);

    // Send test email
    const directInfo = await directTransporter.sendMail({
      from: '"SES Test" <noreply@sessyd.investorsignals.com>',
      to: "test@example.com", // Use your test email
      subject: "Direct Config Test",
      text: "This is a test email sent with direct configuration",
      html: "<b>This is a test email sent with direct configuration</b>"
    });
    
    console.log('✅ TEST EMAIL SENT:', directInfo.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(directInfo));
  } catch (error) {
    console.error('❌ DIRECT CONFIGURATION FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }

  console.log('\n===== TESTING ENV CONFIGURATION =====');
  try {
    // Create transporter with env config
    const envTransporter = nodemailer.createTransport(envConfig);
    
    // Verify connection
    console.log('Verifying env-based connection...');
    const envResult = await envTransporter.verify();
    console.log('✅ ENV CONNECTION SUCCESSFUL:', envResult);

    // Send test email
    const envInfo = await envTransporter.sendMail({
      from: `"SES Test" <${process.env.SES_FROM_EMAIL}>`,
      to: "test@example.com", // Use your test email
      subject: "Env Config Test",
      text: "This is a test email sent with environment configuration",
      html: "<b>This is a test email sent with environment configuration</b>"
    });
    
    console.log('✅ TEST EMAIL SENT:', envInfo.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(envInfo));
  } catch (error) {
    console.error('❌ ENV CONFIGURATION FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

// Alternative approach with explicit STARTTLS
async function testExplicitSTARTTLS() {
  console.log('\n===== TESTING EXPLICIT STARTTLS CONFIGURATION =====');
  
  const explicitConfig = {
    host: 'email-smtp.ap-southeast-2.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: 'AKIARPCLH724LC3U6EDA',
      pass: 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b'
    },
    debug: true,
    logger: true,
    requireTLS: true, // Require STARTTLS
    opportunisticTLS: true, // Use STARTTLS when available
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  };
  
  try {
    const starttlsTransporter = nodemailer.createTransport(explicitConfig);
    
    console.log('Verifying STARTTLS connection...');
    const result = await starttlsTransporter.verify();
    console.log('✅ STARTTLS CONNECTION SUCCESSFUL:', result);
    
    // No need to send another test email if verification works
  } catch (error) {
    console.error('❌ STARTTLS CONFIGURATION FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    await testSMTP();
    await testExplicitSTARTTLS();
    
    console.log('\n===== TEST RESULTS SUMMARY =====');
    console.log('Check the logs above to see which configurations worked.');
    console.log('If any of the configurations succeeded, update aws-ses-email.js to match that configuration.');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Execute tests
runTests().catch(console.error); 