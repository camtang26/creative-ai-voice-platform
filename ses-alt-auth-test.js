import 'dotenv/config';
import nodemailer from 'nodemailer';

// Log the environment variables (partially redacted for security)
console.log('===== ENVIRONMENT VARIABLES CHECK =====');
console.log(`SMTP Host: ${process.env.SES_SMTP_HOST}`);
console.log(`SMTP Port: ${process.env.SES_SMTP_PORT}`);
console.log(`SMTP Username: ${process.env.SES_SMTP_USERNAME}`);
console.log(`SMTP Password: ${process.env.SES_SMTP_PASSWORD ? '***REDACTED***' : 'NOT SET'}`);
console.log('======================================');

// Test with URL encoded password
function encodePassword(password) {
  try {
    return encodeURIComponent(password);
  } catch (error) {
    console.error('Error encoding password:', error);
    return password;
  }
}

// Test different authentication methods
async function testAuthMethods() {
  // 1. Basic Auth Method (Plain Username/Password)
  const basicConfig = {
    host: 'email-smtp.ap-southeast-2.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: 'AKIARPCLH724LC3U6EDA',
      pass: 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b'
    }
  };

  // 2. Test with URL encoded password
  const encodedPasswordConfig = {
    host: 'email-smtp.ap-southeast-2.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: 'AKIARPCLH724LC3U6EDA',
      pass: encodePassword('BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b')
    }
  };

  // 3. Test with explicit AUTH LOGIN method
  const explicitLoginConfig = {
    host: 'email-smtp.ap-southeast-2.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      type: 'login', // Explicit AUTH LOGIN
      user: 'AKIARPCLH724LC3U6EDA',
      pass: 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b'
    },
    authMethod: 'LOGIN'
  };

  // 4. Test with minimal configuration
  const minimalConfig = {
    host: 'email-smtp.ap-southeast-2.amazonaws.com',
    port: 587,
    auth: {
      user: 'AKIARPCLH724LC3U6EDA',
      pass: 'BD12ifUp9poEt1EivbKSgzR/GjJLLptb0NgiFel6LK0b'
    }
  };

  // 5. Test with environment variables but minimal config
  const envMinimalConfig = {
    host: process.env.SES_SMTP_HOST,
    port: parseInt(process.env.SES_SMTP_PORT, 10),
    auth: {
      user: process.env.SES_SMTP_USERNAME,
      pass: process.env.SES_SMTP_PASSWORD
    }
  };

  // Test each configuration
  const configs = [
    { name: 'Basic Auth', config: basicConfig },
    { name: 'Encoded Password', config: encodedPasswordConfig },
    { name: 'Explicit LOGIN', config: explicitLoginConfig },
    { name: 'Minimal Config', config: minimalConfig },
    { name: 'Env Minimal Config', config: envMinimalConfig }
  ];

  for (const { name, config } of configs) {
    console.log(`\n===== TESTING ${name} =====`);
    try {
      const transporter = nodemailer.createTransport(config);
      
      console.log(`Verifying ${name} connection...`);
      const result = await transporter.verify();
      console.log(`✅ ${name} CONNECTION SUCCESSFUL:`, result);
    } catch (error) {
      console.error(`❌ ${name} CONFIGURATION FAILED:`);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }
}

// Run tests
testAuthMethods().catch(console.error); 