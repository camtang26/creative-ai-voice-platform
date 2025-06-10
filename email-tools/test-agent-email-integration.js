import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * This script simulates how the ElevenLabs AI agent would interact with the email functionality.
 * It demonstrates the tool call pattern that would be used by the conversational AI.
 */

// Configuration
const SERVER_URL = 'https://65a4-117-20-68-34.ngrok-free.app'; // Use the active ngrok URL
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;

if (!EMAIL_API_KEY) {
  console.error('ERROR: EMAIL_API_KEY environment variable is required');
  process.exit(1);
}

// Simulate a conversation where the user asks for information by email
async function simulateAgentEmailInteraction() {
  console.log('\n====== SIMULATING AI AGENT EMAIL INTERACTION ======\n');
  
  // Step 1: Simulate user asking for information by email
  console.log('🧑‍💼 USER: "Can you send me information about your investment options by email? My email is user@example.com"');
  
  // Step 2: Simulate agent processing the request
  console.log('\n🤖 AI AGENT: (thinking) "User has requested information by email. I should use the send_email tool."');
  
  // Step 3: Simulate agent preparing email content
  console.log('\n🤖 AI AGENT: "I\'d be happy to send you information about our investment options by email. I\'ll send it to user@example.com now."');

  // Step 4: Simulate the tool call that the agent would make
  console.log('\n📤 MAKING EMAIL TOOL CALL...');
  console.log(`Using server URL: ${SERVER_URL}`);
  
  const emailRequest = {
    to_email: 'user@example.com',
    subject: 'Investment Options from Investor Signals',
    content: `
      <h2>Investment Options from Investor Signals</h2>
      
      <p>Thank you for your interest in our investment options. Here's an overview of the main options we offer:</p>
      
      <h3>Growth Fund</h3>
      <p>Our Growth Fund is designed for investors seeking capital growth over the long term (7+ years).</p>
      <ul>
        <li><strong>Risk level:</strong> High</li>
        <li><strong>Target return:</strong> 8-10% p.a.</li>
        <li><strong>Minimum investment:</strong> $10,000</li>
      </ul>
      
      <h3>Balanced Fund</h3>
      <p>The Balanced Fund offers a mix of growth and income, suitable for medium-term investing (5+ years).</p>
      <ul>
        <li><strong>Risk level:</strong> Medium</li>
        <li><strong>Target return:</strong> 6-8% p.a.</li>
        <li><strong>Minimum investment:</strong> $5,000</li>
      </ul>
      
      <h3>Income Fund</h3>
      <p>Our Income Fund focuses on generating regular income with lower volatility, ideal for shorter timeframes (3+ years).</p>
      <ul>
        <li><strong>Risk level:</strong> Low to Medium</li>
        <li><strong>Target return:</strong> 4-6% p.a.</li>
        <li><strong>Minimum investment:</strong> $2,000</li>
      </ul>
      
      <p>For more detailed information, please visit our website at <a href="https://www.investorsignals.com">www.investorsignals.com</a> or call us at 1300 614 002.</p>
    `,
    customer_name: 'Valued Investor'
  };
  
  try {
    // Make the actual API call to our email endpoint
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
      
      console.log('\n✅ EMAIL TOOL RESPONSE:');
      console.log(JSON.stringify(result, null, 2));
      
      // Step 5: Simulate agent's response after successful email
      console.log('\n🤖 AI AGENT: "Great! I\'ve sent a detailed email about our investment options to user@example.com. You should receive it shortly. The email includes information about our Growth Fund, Balanced Fund, and Income Fund with details on risk levels, expected returns, and minimum investment amounts. Is there anything specific from these options you\'d like to discuss further on our call?"');
    } else {
      const errorText = await response.text();
      console.log('\n❌ EMAIL TOOL ERROR:');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${errorText}`);
      
      // Step 5 (alternative): Simulate agent's response after failed email
      console.log('\n🤖 AI AGENT: "I apologize, but I encountered an issue sending the email. Let me provide you with the information during our call instead. We have three main investment options: the Growth Fund for long-term investors, the Balanced Fund for medium-term goals, and the Income Fund for those seeking regular income. Would you like me to go into more detail about any of these options?"');
    }
  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
    
    // Step 5 (alternative): Simulate agent's response after failed email
    console.log('\n🤖 AI AGENT: "I apologize, but I\'m having technical difficulties sending the email at the moment. Would you prefer that I explain our investment options during this call, or would you like me to have a customer service representative follow up with you by email later?"');
  }
  
  console.log('\n====== SIMULATION COMPLETE ======\n');
}

// Run the simulation
simulateAgentEmailInteraction().catch(console.error); 