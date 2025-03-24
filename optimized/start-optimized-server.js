import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

// Load environment variables from parent directory
const envPath = path.join(parentDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`ERROR: .env file not found at ${envPath}`);
  process.exit(1);
}

console.log('====================================================');
console.log('       ELEVENLABS TWILIO OPTIMIZED SERVER LAUNCHER  ');
console.log('====================================================');
console.log('This script will start the low-latency optimized server');
console.log('on port 8001 (by default) and help set up ngrok.');
console.log('');

// Check if we need to run ngrok as well
const runNgrok = process.argv.includes('--with-ngrok');
const port = process.env.OPTIMIZED_PORT || 8001;

// Function to start the server
function startServer() {
  console.log('Starting optimized server...');
  
  const serverProc = spawn('node', ['server-optimized.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit'
  });
  
  serverProc.on('error', (err) => {
    console.error('Failed to start server process:', err);
  });
  
  serverProc.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  return serverProc;
}

// Function to start ngrok
function startNgrok() {
  console.log(`Starting ngrok tunnel to port ${port}...`);
  
  // Look for ngrok in parent directory
  const ngrokPath = path.resolve(__dirname, '..', 'ngrok.exe');
  
  if (!fs.existsSync(ngrokPath)) {
    console.error('ngrok.exe not found in the parent directory');
    return null;
  }
  
  const ngrokProc = spawn(ngrokPath, ['http', port.toString()], {
    stdio: 'inherit'
  });
  
  ngrokProc.on('error', (err) => {
    console.error('Failed to start ngrok process:', err);
  });
  
  ngrokProc.on('close', (code) => {
    console.log(`ngrok process exited with code ${code}`);
  });
  
  return ngrokProc;
}

// Check required environment variables
const requiredVars = [
  'ELEVENLABS_API_KEY', 
  'ELEVENLABS_AGENT_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

let missingVars = [];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file in the parent directory');
  process.exit(1);
}

// Start the server
const serverProcess = startServer();

// Start ngrok if requested
let ngrokProcess = null;
if (runNgrok) {
  ngrokProcess = startNgrok();
}

// Handle termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (ngrokProcess) {
    ngrokProcess.kill();
  }
  
  process.exit(0);
});

console.log('');
console.log('IMPORTANT NOTES:');
console.log('1. The optimized server runs on port 8001 by default (different from regular server)');
console.log('2. You\'ll need to update your ngrok tunnel to forward to port 8001');
console.log('3. After setting up ngrok, update SERVER_URL in .env to your new ngrok URL');
console.log('4. Use make-call-optimized.js to test calls with the optimized server');
console.log('');
console.log('To run a test call:');
console.log('node optimized/make-call-optimized.js +1234567890');
console.log('');