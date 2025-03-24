import 'dotenv/config';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Print environment values
console.log('\n===== ENVIRONMENT CHECK =====');
console.log(`SES_SMTP_HOST: ${process.env.SES_SMTP_HOST}`);
console.log(`SES_SMTP_PORT: ${process.env.SES_SMTP_PORT}`);
console.log(`SES_SMTP_USERNAME: ${process.env.SES_SMTP_USERNAME}`);
console.log(`SES_FROM_EMAIL: ${process.env.SES_FROM_EMAIL}`);

// Hardcoded values from Craig's screenshot
const SMTP_HOST = 'email-smtp.ap-southeast-2.amazonaws.com';
const SMTP_PORT = 587;
const SMTP_USERNAME = 'AKIARPCLH724LC3U6EDA';
const SMTP_PASSWORD = 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b';
const FROM_EMAIL = 'noreply@sessyd.investorsignals.com';

// Look for special characters in password
console.log('\n===== PASSWORD ANALYSIS =====');
const specialChars = SMTP_PASSWORD.replace(/[a-zA-Z0-9]/g, '');
console.log(`Special chars in password: ${specialChars}`);
console.log(`Password length: ${SMTP_PASSWORD.length}`);

// Try different Base64 encoding approaches for AUTH PLAIN
function getAuthString(user, pass) {
  return Buffer.from(`\u0000${user}\u0000${pass}`).toString('base64');
}

// Create different encodings of the password
const encodings = [
  { 
    name: 'Direct Password', 
    password: SMTP_PASSWORD 
  },
  { 
    name: 'URL Encoded', 
    password: encodeURIComponent(SMTP_PASSWORD)
  },
  {
    name: 'Double Quoted',
    password: `"${SMTP_PASSWORD}"`
  },
  {
    name: 'Base64 Encoded',
    password: Buffer.from(SMTP_PASSWORD).toString('base64')
  },
  {
    name: 'No Special Chars',
    password: SMTP_PASSWORD.replace(/[^a-zA-Z0-9]/g, '')
  }
];

async function testConnection(name, password) {
  console.log(`\n===== TESTING ${name} =====`);
  console.log(`Password value: ${password.substring(0, 3)}...${password.substring(password.length - 3)}`);
  
  // Calculate the auth string that will be used
  const authString = getAuthString(SMTP_USERNAME, password);
  console.log(`Auth string: ${authString}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USERNAME,
        pass: password
      },
      debug: true
    });
    
    console.log(`Testing connection with ${name}...`);
    const result = await transporter.verify();
    console.log(`✅ ${name} CONNECTION SUCCESSFUL:`, result);
    return true;
  } catch (error) {
    console.error(`❌ ${name} CONNECTION FAILED:`);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}

async function runTests() {
  let successFound = false;
  
  for (const { name, password } of encodings) {
    const success = await testConnection(name, password);
    if (success) {
      successFound = true;
      console.log(`\n🎉 SUCCESS with ${name}! Update your code to use this approach.`);
    }
  }
  
  if (!successFound) {
    console.log('\n⚠️ All connection attempts failed.');
    console.log('Suggestions:');
    console.log('1. Double-check with Craig exactly how he configured his tool');
    console.log('2. Check if there are IP restrictions on the AWS SES account');
    console.log('3. Try to regenerate the SES SMTP password in AWS console');
  }
}

// Run all tests
runTests().catch(console.error); 