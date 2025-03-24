import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Output all environment variables
console.log('===== DEBUGGING ENVIRONMENT VARIABLES =====');

// AWS SES SMTP Configuration
console.log('\nAWS SES SMTP Configuration:');
console.log(`SES_SMTP_HOST: ${process.env.SES_SMTP_HOST}`);
console.log(`SES_SMTP_PORT: ${process.env.SES_SMTP_PORT}`);
console.log(`SES_SMTP_USERNAME: ${process.env.SES_SMTP_USERNAME}`);
console.log(`SES_SMTP_PASSWORD: ${process.env.SES_SMTP_PASSWORD ? '********' + process.env.SES_SMTP_PASSWORD.substr(-4) : 'NOT SET'}`);
console.log(`SES_FROM_EMAIL: ${process.env.SES_FROM_EMAIL}`);
console.log(`SES_REPLY_TO: ${process.env.SES_REPLY_TO}`);
console.log(`SES_REGION: ${process.env.SES_REGION}`);
console.log(`SES_DEBUG: ${process.env.SES_DEBUG}`);

// Email Fallback
console.log('\nEmail Fallback Configuration:');
console.log(`EMAIL_FALLBACK_ENABLED: ${process.env.EMAIL_FALLBACK_ENABLED}`);
console.log(`EMAIL_FALLBACK_ENABLED === 'true': ${process.env.EMAIL_FALLBACK_ENABLED === 'true'}`);
console.log(`EMAIL_FALLBACK_ENABLED === 'false': ${process.env.EMAIL_FALLBACK_ENABLED === 'false'}`);

// Check the location of .env file being used
console.log('\nEnvironment File Location:');
try {
  const dotenv = await import('dotenv');
  console.log(`Dotenv version: ${dotenv.version || 'Unknown'}`);
  
  // Try to determine the path
  if (dotenv.config && dotenv.config.path) {
    console.log(`Dotenv config path: ${dotenv.config.path}`);
  } else {
    console.log('Dotenv config path: Not available');
  }
  
  // Check if .env exists in the current directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const localEnvPath = path.join(__dirname, '.env');
  
  console.log(`Root directory: ${rootDir}`);
  console.log(`.env in root exists: ${fs.existsSync(envPath)}`);
  console.log(`.env in current directory exists: ${fs.existsSync(localEnvPath)}`);
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const fallbackLine = envContent.split('\n').find(line => line.includes('EMAIL_FALLBACK_ENABLED'));
    console.log(`EMAIL_FALLBACK_ENABLED in .env file: ${fallbackLine || 'NOT FOUND'}`);
  }
} catch (error) {
  console.error(`Error checking environment file: ${error.message}`);
}

// Check current working directory
console.log('\nCurrent Working Directory:');
console.log(`process.cwd(): ${process.cwd()}`);

// Check modified time of .env file
console.log('\n.env File Details:');
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const stats = fs.statSync(envPath);
    console.log(`Last modified: ${stats.mtime}`);
    console.log(`File size: ${stats.size} bytes`);
  } else {
    console.log('.env file not found in current working directory');
  }
} catch (error) {
  console.error(`Error checking .env file: ${error.message}`);
} 