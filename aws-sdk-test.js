import 'dotenv/config';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Hardcoded credentials from Craig's screenshot
const region = "ap-southeast-2";
const username = "AKIARPCLH724LC3U6EDA";
const password = "BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b";

// Log test information
console.log('\n===== AWS SDK SES TEST =====');
console.log(`Region: ${region}`);
console.log(`Username: ${username}`);
console.log(`Password: [REDACTED]`);

// Create SES client with access key and secret
const sesClient = new SESClient({
  region: region,
  credentials: {
    accessKeyId: username, // AWS access key = SMTP username
    secretAccessKey: password // AWS secret = SMTP password
  }
});

// Function to send email using AWS SDK
async function sendEmailWithSdk() {
  const params = {
    Source: "noreply@sessyd.investorsignals.com",
    Destination: {
      ToAddresses: ["test@example.com"] // Replace with a real email for testing
    },
    Message: {
      Subject: {
        Data: "Test Email from AWS SDK"
      },
      Body: {
        Text: {
          Data: "This is a test email sent using the AWS SDK directly."
        }
      }
    }
  };

  try {
    console.log("Attempting to send email via AWS SDK...");
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log("✅ EMAIL SENT SUCCESSFULLY!");
    console.log("MessageId:", result.MessageId);
    return result;
  } catch (error) {
    console.error("❌ AWS SDK ERROR:");
    console.error("Error code:", error.Code || error.code);
    console.error("Error message:", error.Message || error.message);
    console.error("Full error:", error);
    
    // Special handling for SDK errors
    if (error.$metadata && error.$metadata.httpStatusCode) {
      console.error("HTTP Status Code:", error.$metadata.httpStatusCode);
    }
    
    throw error;
  }
}

// Handle results and provide recommendations
async function runTest() {
  try {
    await sendEmailWithSdk();
    console.log("\n🎉 AWS SDK TEST SUCCEEDED!");
    console.log("This indicates the issue is with Nodemailer configuration, not the credentials themselves.");
    console.log("Consider using the AWS SDK approach in your application instead of SMTP.");
  } catch (error) {
    console.log("\n⚠️ AWS SDK TEST FAILED");
    console.log("Recommendations:");
    console.log("1. Confirm with Craig if he's using SMTP or API-based approach");
    console.log("2. Check if IP restrictions are in place");
    console.log("3. Verify the AWS account has SES access permissions");
    console.log("4. Request AWS to regenerate the SMTP credentials");
  }
}

// Run the test
runTest().catch(console.error); 