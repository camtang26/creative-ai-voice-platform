import 'dotenv/config';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

// Load configuration from environment variables
const config = {
  smtp: {
    host: process.env.SES_SMTP_HOST || 'email-smtp.ap-southeast-2.amazonaws.com',
    port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
    username: process.env.SES_SMTP_USERNAME,
    password: process.env.SES_SMTP_PASSWORD,
    fromEmail: process.env.SES_FROM_EMAIL || 'noreply@sessyd.investorsignals.com'
  },
  api: {
    // Prefer localhost for testing to avoid issues with expired ngrok URLs
    url: process.env.LOCAL_TESTING ? 'http://localhost:8000' : (process.env.SERVER_URL || 'http://localhost:8000'),
    key: process.env.EMAIL_API_KEY
  }
};

// Print configuration (without showing full password)
console.log('\n=== EMAIL VERIFICATION TOOL ===');
console.log('This script tests both direct SMTP connection and the API endpoint');
console.log('\nSMTP Configuration:');
console.log(`Host: ${config.smtp.host}`);
console.log(`Port: ${config.smtp.port}`);
console.log(`Username: ${config.smtp.username}`);
console.log(`Password: ${config.smtp.password ? `${config.smtp.password.substring(0, 3)}...${config.smtp.password.substring(config.smtp.password.length - 3)}` : 'NOT SET'}`);
console.log(`From Email: ${config.smtp.fromEmail}`);

console.log('\nAPI Configuration:');
console.log(`Server URL: ${config.api.url}`);
console.log(`API Key: ${config.api.key ? `${config.api.key.substring(0, 3)}...${config.api.key.substring(config.api.key.length - 3)}` : 'NOT SET'}`);
console.log('================================\n');

// Test SMTP Connection
async function testSMTPConnection() {
  console.log('🔄 TESTING DIRECT SMTP CONNECTION...');
  try {
    console.log('Creating SMTP transporter...');
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.smtp.username,
        pass: config.smtp.password
      }
    });

    console.log('Verifying connection...');
    const result = await transporter.verify();
    
    console.log('✅ SMTP CONNECTION SUCCESSFUL!');
    console.log('The credentials are valid and the server accepts connections.');
    return { success: true };
  } catch (error) {
    console.error('❌ SMTP CONNECTION FAILED:');
    console.error(`Error Type: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error('This is an authentication error. The username or password might be incorrect.');
    } else if (error.code === 'ESOCKET') {
      console.error('This is a connection error. There might be network issues or port restrictions.');
    }
    
    return { success: false, error };
  }
}

// Test API Endpoint
async function testAPIEndpoint() {
  console.log('\n🔄 TESTING API ENDPOINT...');
  
  if (!config.api.url || !config.api.key) {
    console.error('❌ API TEST SKIPPED: Missing SERVER_URL or EMAIL_API_KEY in environment variables');
    return { success: false, error: 'Missing configuration' };
  }
  
  try {
    const testEmail = 'test@example.com';
    const testSubject = 'Test Email from Verification Script';
    const testContent = 'This is a test email sent from the verification script to check if the API endpoint is working.';
    
    console.log(`Sending request to: ${config.api.url}/api/email/send`);
    console.log(`Test recipient: ${testEmail}`);
    
    const response = await fetch(`${config.api.url}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api.key}`
      },
      body: JSON.stringify({
        to_email: testEmail,
        subject: testSubject,
        content: testContent,
        customer_name: 'Test User'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API TEST SUCCESSFUL!');
      console.log('Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.error('❌ API TEST FAILED:');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Response:', JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ API TEST FAILED:');
    console.error('Error:', error.message);
    return { success: false, error };
  }
}

// Run tests
async function runTests() {
  // Set to true to force testing with localhost
  process.env.LOCAL_TESTING = 'true';
  
  // Update the API URL to use localhost for this test run
  if (process.env.LOCAL_TESTING === 'true') {
    config.api.url = 'http://localhost:8000';
    console.log('🔄 Using local server for testing:', config.api.url);
  }
  
  const smtpResult = await testSMTPConnection();
  const apiResult = await testAPIEndpoint();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`SMTP Test: ${smtpResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`API Test: ${apiResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!smtpResult.success) {
    console.log('\n⚠️ AWS SES Connection Issue:');
    console.log('1. Verify with Craig that the SES_SMTP_PASSWORD is correct');
    console.log('2. Check if there are any IP restrictions on the AWS SES account');
    console.log('3. Consider using an alternative email provider if this persists');
  }
  
  if (!apiResult.success && smtpResult.success) {
    console.log('\n⚠️ API Issue:');
    console.log('1. Ensure the server is running at the correct URL');
    console.log('2. Check that EMAIL_API_KEY is correctly set in both .env and Elevenlabs');
    console.log('3. Verify your ngrok tunnel is active if using ngrok');
  }
  
  if (!apiResult.success && !smtpResult.success) {
    console.log('\n⚠️ Next Steps:');
    console.log('1. Contact Craig to resolve the AWS SES authentication issue');
    console.log('2. Update the server.js to provide proper error responses (done)');
    console.log('3. Consider implementing a fallback email mechanism for testing');
  }
}

// Execute tests
runTests().catch(console.error); 