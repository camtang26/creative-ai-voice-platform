import 'dotenv/config';
import { sendEmail } from './email-tools/api-email-service.js';

// Function to run the test
async function runTest() {
  console.log('===== TESTING INVESTOR SIGNALS EMAIL API =====');
  console.log('Using the REST API provided by Craig');
  
  try {
    // Send a test email
    const result = await sendEmail({
      to_email: 'craig@elevenlabs.io', // Replace with your email for testing
      subject: 'Test Email - Investor Signals API',
      content: `
        <h1>This is a test email sent using the Investor Signals API</h1>
        <p>If you're seeing this, the API-based email implementation is working!</p>
        <p>This method bypasses all the AWS SES configuration issues we were encountering.</p>
        <p>This email was sent at: ${new Date().toISOString()}</p>
        <hr />
        <p><em>This is an automated test message.</em></p>
      `,
      customer_name: 'API Test User'
    });
    
    console.log('\n✅ SUCCESS: Email was sent successfully using the Investor Signals API!');
    console.log('Details:');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- From: ${result.fromEmail}`);
    console.log(`- Time Taken: ${result.elapsed}ms`);
    
    console.log('\n📧 REAL EMAIL SENT: Check the inbox to confirm delivery');
    
  } catch (error) {
    console.error('\n❌ ERROR: Email sending failed');
    console.error(`Error details: ${error.message}`);
    
    // Print specific error handling tips based on error message
    if (error.message.includes('NetworkingError')) {
      console.log('\nNETWORK ERROR TROUBLESHOOTING:');
      console.log('1. Check your internet connection');
      console.log('2. Verify that outbound HTTPS traffic (port 443) is not blocked');
    } else if (error.message.includes('status 4')) {
      console.log('\nAPI ERROR TROUBLESHOOTING:');
      console.log('1. Check that the API endpoint URL is correct');
      console.log('2. Verify that the request format is correct');
      console.log('3. Ensure the email address is valid');
    }
  }
}

// Run the test
runTest(); 