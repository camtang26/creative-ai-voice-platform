// Set environment variables directly before importing any modules
process.env.EMAIL_FALLBACK_ENABLED = 'false';
process.env.SES_DEBUG = 'true';

// Now import the email module
import { sendSESEmail } from './email-tools/aws-ses-email.js';

// Function to run the test
async function runTest() {
  console.log('===== TESTING EMAIL FUNCTIONALITY (DIRECT) =====');
  console.log('Using the AWS SES implementation with direct environment variables');
  console.log(`EMAIL_FALLBACK_ENABLED: ${process.env.EMAIL_FALLBACK_ENABLED}`);
  
  try {
    // Send a test email
    const result = await sendSESEmail({
      to_email: 'craig@elevenlabs.io', // Replace with your own email if needed
      subject: 'Direct Test Email from ElevenLabs AI Agent',
      content: `
        <h1>This is a direct test email from the ElevenLabs AI Agent</h1>
        <p>If you're seeing this, the email functionality is working!</p>
        <p>This email was sent at: ${new Date().toISOString()}</p>
        <hr />
        <p><em>This is an automated test message with fallback disabled.</em></p>
      `,
      customer_name: 'Test User'
    });
    
    console.log('\n✅ SUCCESS: Email was sent successfully!');
    console.log('Details:');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- From: ${result.fromEmail}`);
    console.log(`- Reply-To: ${result.replyTo}`);
    console.log(`- Test Mode: ${result.testMode ? 'YES (check preview URL)' : 'NO (real email)'}`);
    console.log(`- Time Taken: ${result.elapsed}ms`);
    
    if (result.previewUrl) {
      console.log(`\n📩 TEST EMAIL PREVIEW: ${result.previewUrl}`);
      console.log('(Open this URL to view the test email)');
    }
  } catch (error) {
    console.error('\n❌ ERROR: Email sending failed');
    console.error(`Error details: ${error.message}`);
    
    if (error.message.includes('EAUTH')) {
      console.log('\nAUTHENTICATION ERROR TROUBLESHOOTING:');
      console.log('1. Double-check your SES SMTP credentials');
      console.log('2. Verify your AWS SES service is properly set up');
      console.log('3. Check if your account is out of sandbox mode (if applicable)');
      console.log('4. Ensure your sending domain is verified in AWS SES');
    }
    
    if (error.message.includes('ESOCKET')) {
      console.log('\nCONNECTION ERROR TROUBLESHOOTING:');
      console.log('1. Verify your network connection');
      console.log('2. Check if a firewall is blocking the connection');
      console.log('3. Confirm the SES_SMTP_HOST and SES_SMTP_PORT are correct');
    }
  }
}

// Run the test
runTest(); 