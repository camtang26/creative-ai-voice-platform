import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * This script sends a real test email to verify the email integration works properly.
 */

// Configuration
const SERVER_URL = 'https://65a4-117-20-68-34.ngrok-free.app'; // Use the active ngrok URL
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const TEST_EMAIL = 'leon@investorsignals.com'; // Changed to send to Leon at Investor Signals

if (!EMAIL_API_KEY) {
  console.error('ERROR: EMAIL_API_KEY environment variable is required');
  process.exit(1);
}

// Function to send a test email
async function sendTestEmail() {
  console.log('\n====== SENDING TEST EMAIL TO LEON AT INVESTOR SIGNALS ======\n');
  console.log(`Recipient: ${TEST_EMAIL}`);
  console.log(`Using server URL: ${SERVER_URL}`);
  
  const emailRequest = {
    to_email: TEST_EMAIL,
    subject: 'AI Assistant Email Integration Demo',
    content: `
      <h2>Email Integration Test for Leon</h2>
      
      <p>Hello Leon,</p>
      
      <p>This is a demonstration of the email functionality in our AI assistant. The assistant can now send professionally formatted emails with Investor Signals branding directly from voice conversations.</p>
      
      <h3>Key Features</h3>
      <ul>
        <li><strong>Seamless Integration:</strong> Emails are sent directly through your Investor Signals API</li>
        <li><strong>Professional Branding:</strong> All emails include your company branding automatically</li>
        <li><strong>Conversational Context:</strong> The AI can send personalized information based on the call</li>
        <li><strong>HTML Formatting:</strong> Rich content with proper formatting for better readability</li>
      </ul>
      
      <h3>Real-World Applications</h3>
      <p>During customer calls, the AI can:</p>
      <ol>
        <li>Send investment summaries and recommendations</li>
        <li>Deliver requested information and educational materials</li>
        <li>Follow up with appointment confirmations</li>
        <li>Provide portfolio analysis and suggestions</li>
      </ol>
      
      <h3>Technical Details</h3>
      <p>This email was sent at: ${new Date().toISOString()}</p>
      <p>From server: ${SERVER_URL}</p>
      <p>Using the Investor Signals API endpoint</p>
      
      <hr />
      
      <p>We hope this demonstration shows the potential of this integration for improving customer communications.</p>
      
      <p><em>This is a test message sent as part of the AI assistant implementation project.</em></p>
    `,
    customer_name: 'Leon'
  };
  
  try {
    console.log('\n📤 SENDING EMAIL...');
    
    // Make the API call to our email endpoint
    const response = await fetch(`${SERVER_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_API_KEY}`
      },
      body: JSON.stringify(emailRequest)
    });
    
    // Process the response
    if (response.ok) {
      const result = await response.json();
      
      console.log('\n✅ EMAIL SENT SUCCESSFULLY:');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nEmail successfully sent to ${TEST_EMAIL}.`);
      console.log('The email comes from info@investorsignals.com and includes full Investor Signals branding.');
    } else {
      const errorText = await response.text();
      console.log('\n❌ EMAIL SENDING FAILED:');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
  }
  
  console.log('\n====== TEST COMPLETE ======\n');
}

// Run the function
sendTestEmail().catch(console.error); 