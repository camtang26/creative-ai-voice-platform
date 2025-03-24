import 'dotenv/config';
import { sendSESEmail } from './email-tools/aws-ses-email.js';

// Set environment variables for testing
process.env.EMAIL_FALLBACK_ENABLED = 'false'; // Try real email sending
process.env.SES_DEBUG = 'true'; // Enable debug output

// Function to run the test
async function runTest() {
  console.log('===== TESTING AWS SES API EMAIL IMPLEMENTATION =====');
  console.log('Using API-based implementation to bypass SMTP blocking');
  
  try {
    // Send a test email
    const result = await sendSESEmail({
      to_email: 'craig@elevenlabs.io', // Replace with your email for testing
      subject: 'Test Email - AWS SES API Implementation',
      content: `
        <h1>This is a test email sent using the AWS SES API</h1>
        <p>If you're seeing this, the API-based email implementation is working!</p>
        <p>This method bypasses outbound SMTP blocking that might occur on certain networks or platforms.</p>
        <p>This email was sent at: ${new Date().toISOString()}</p>
        <hr />
        <p><em>This is an automated test message.</em></p>
      `,
      customer_name: 'API Test User'
    });
    
    console.log('\n✅ SUCCESS: Email was sent successfully using AWS SES API!');
    console.log('Details:');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- From: ${result.fromEmail}`);
    console.log(`- Reply-To: ${result.replyTo}`);
    console.log(`- Time Taken: ${result.elapsed}ms`);
    
    if (result.testMode && result.previewUrl) {
      console.log(`\n📩 TEST EMAIL PREVIEW: ${result.previewUrl}`);
      console.log('(This means you were using the fallback test email service)');
    } else {
      console.log('\n📧 REAL EMAIL SENT: Check the inbox to confirm delivery');
    }
  } catch (error) {
    console.error('\n❌ ERROR: Email sending failed');
    console.error(`Error details: ${error.message}`);
    
    // Print specific error handling tips based on error message
    if (error.message.includes('SignatureDoesNotMatch')) {
      console.log('\nAWS SIGNATURE ERROR TROUBLESHOOTING:');
      console.log('1. The AWS SMTP credentials cannot be directly used with the SES API');
      console.log('2. AWS IAM credentials are needed for API calls instead of SMTP credentials');
      console.log('3. Ask Craig to provide the proper AWS access key and secret for API usage');
    } else if (error.message.includes('InvalidParameterValue')) {
      console.log('\nPARAMETER ERROR TROUBLESHOOTING:');
      console.log('1. Verify that the from email address is verified in AWS SES');
      console.log('2. Check that the email format is correct');
    } else if (error.message.includes('NetworkingError')) {
      console.log('\nNETWORK ERROR TROUBLESHOOTING:');
      console.log('1. Check your internet connection');
      console.log('2. Verify that outbound HTTPS traffic (port 443) is not blocked');
    }
  }
}

// Run the test
runTest(); 