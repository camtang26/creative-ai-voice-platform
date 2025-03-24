import dotenv from 'dotenv';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize dotenv
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create log directory if it doesn't exist
const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Set up logging
const logFile = `${logDir}/aws-credentials-test-${new Date().toISOString().replace(/:/g, '-')}.log`;
const logger = message => {
  const logMessage = `${new Date().toISOString()} - ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
};

logger('===== AWS CREDENTIALS VERIFICATION =====');

// Get credentials from environment
const envRegion = process.env.SES_REGION || 'ap-southeast-2';
const envAccessKey = process.env.SES_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || 'AKIARPCLH724LC3U6EDA';
const envSecretKey = process.env.SES_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b';

logger(`Region: ${envRegion}`);
logger(`Access Key: ${envAccessKey}`);
logger(`Secret Key: ${envSecretKey.substring(0, 5)}...${envSecretKey.substring(envSecretKey.length - 5)}`);

// Check for special characters in the secret key
const specialChars = envSecretKey.match(/[^\w\s]/g) || [];
logger(`Secret Key contains ${specialChars.length} special characters: ${specialChars.join(' ')}`);

// Test 1: Direct credentials
async function testDirectCredentials() {
  logger('\n----- Test 1: Direct Credentials -----');
  
  try {
    const sesClient = new SESClient({
      region: envRegion,
      credentials: {
        accessKeyId: envAccessKey,
        secretAccessKey: envSecretKey
      }
    });

    const command = new SendEmailCommand({
      Source: 'craig@elevenlabs.io',
      Destination: {
        ToAddresses: ['craig@elevenlabs.io']
      },
      Message: {
        Subject: {
          Data: 'AWS SDK Test - Direct Credentials'
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SDK with direct credentials.'
          }
        }
      }
    });

    logger('Attempting to send email with direct credentials...');
    const response = await sesClient.send(command);
    logger(`✅ SUCCESS! Message ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    logger(`❌ ERROR: ${error.name}`);
    logger(`Error message: ${error.message}`);
    logger(`Full error: ${error}`);
    if (error.$metadata) {
      logger(`HTTP Status Code: ${error.$metadata.httpStatusCode}`);
    }
    return false;
  }
}

// Test 2: URL-encoded secret key
async function testUrlEncodedKey() {
  logger('\n----- Test 2: URL-encoded Secret Key -----');
  
  const encodedSecretKey = encodeURIComponent(envSecretKey);
  logger(`Encoded Secret Key: ${encodedSecretKey.substring(0, 5)}...${encodedSecretKey.substring(encodedSecretKey.length - 5)}`);
  
  try {
    const sesClient = new SESClient({
      region: envRegion,
      credentials: {
        accessKeyId: envAccessKey,
        secretAccessKey: encodedSecretKey
      }
    });

    const command = new SendEmailCommand({
      Source: 'craig@elevenlabs.io',
      Destination: {
        ToAddresses: ['craig@elevenlabs.io']
      },
      Message: {
        Subject: {
          Data: 'AWS SDK Test - URL-encoded Secret Key'
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SDK with URL-encoded secret key.'
          }
        }
      }
    });

    logger('Attempting to send email with URL-encoded secret key...');
    const response = await sesClient.send(command);
    logger(`✅ SUCCESS! Message ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    logger(`❌ ERROR: ${error.name}`);
    logger(`Error message: ${error.message}`);
    return false;
  }
}

// Test 3: Try with AWS config file
async function testAwsConfigFile() {
  logger('\n----- Test 3: AWS Config File -----');
  
  // Create temporary AWS credentials file
  const awsCredentialsFolder = process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.aws` : `${process.env.HOME}/.aws`;
  
  if (!fs.existsSync(awsCredentialsFolder)) {
    fs.mkdirSync(awsCredentialsFolder, { recursive: true });
    logger(`Created AWS credentials folder: ${awsCredentialsFolder}`);
  }
  
  const credentialsFile = `${awsCredentialsFolder}\\credentials`;
  const credentialsContent = `[default]
aws_access_key_id=${envAccessKey}
aws_secret_access_key=${envSecretKey}
region=${envRegion}
`;

  logger(`Writing credentials to file: ${credentialsFile}`);
  fs.writeFileSync(credentialsFile, credentialsContent);
  
  try {
    // Use default credentials provider chain
    const sesClient = new SESClient({ region: envRegion });

    const command = new SendEmailCommand({
      Source: 'craig@elevenlabs.io',
      Destination: {
        ToAddresses: ['craig@elevenlabs.io']
      },
      Message: {
        Subject: {
          Data: 'AWS SDK Test - Config File Credentials'
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SDK with credentials from config file.'
          }
        }
      }
    });

    logger('Attempting to send email with config file credentials...');
    const response = await sesClient.send(command);
    logger(`✅ SUCCESS! Message ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    logger(`❌ ERROR: ${error.name}`);
    logger(`Error message: ${error.message}`);
    return false;
  } finally {
    // Clean up temporary credentials file
    try {
      // fs.unlinkSync(credentialsFile);
      logger(`Note: Left credentials file for reference at: ${credentialsFile}`);
    } catch (err) {
      logger(`Error cleaning up credentials file: ${err.message}`);
    }
  }
}

// Run tests
async function runAllTests() {
  logger('\nRunning all credential verification tests...');
  
  const results = [];
  results.push(await testDirectCredentials());
  results.push(await testUrlEncodedKey());
  results.push(await testAwsConfigFile());
  
  const anySuccess = results.some(result => result);
  
  if (anySuccess) {
    logger('\n✅ At least one test was successful! Check the logs for details.');
  } else {
    logger('\n❌ All tests failed. Recommendations:');
    logger('1. Verify the AWS credentials with Craig');
    logger('2. Confirm the IAM user has SES permissions');
    logger('3. Check for IP restrictions in AWS');
    logger('4. Try regenerating the AWS access keys');
    logger(`5. Check the log file for details: ${logFile}`);
  }
}

// Execute all tests
runAllTests().catch(error => {
  logger(`Unhandled error: ${error}`);
}); 