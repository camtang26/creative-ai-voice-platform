/**
 * Debug Script for server-mongodb.js
 * 
 * This script wraps server-mongodb.js with additional debugging
 */
import 'dotenv/config';
import fs from 'fs';
import { spawn } from 'child_process';

// Set up debug logging
const logFile = fs.createWriteStream('mongodb-server-debug.log', { flags: 'a' });

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Write to log file
  logFile.write(logMessage);
  
  // Also log to console
  console.log(message);
}

log('=== Starting MongoDB Server Debug ===');
log(`Current working directory: ${process.cwd()}`);
log(`Node version: ${process.version}`);
log(`Environment variables:`);
log(`- MONGODB_URI: ${process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set'}`);
log(`- PORT: ${process.env.PORT || '8000 (default)'}`);

// Start the server process
log('Spawning server-mongodb.js process...');

const serverProcess = spawn('node', ['--trace-warnings', 'server-mongodb.js'], {
  stdio: 'pipe',
  env: {
    ...process.env,
    DEBUG: '*'
  }
});

// Handle stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  log(`[STDOUT] ${output.trim()}`);
});

// Handle stderr
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  log(`[STDERR] ${output.trim()}`);
});

// Handle process exit
serverProcess.on('exit', (code, signal) => {
  log(`Server process exited with code ${code} and signal ${signal}`);
  
  if (code !== 0) {
    log('Server process exited with an error');
  }
  
  // Close log file
  logFile.end();
});

// Handle process error
serverProcess.on('error', (err) => {
  log(`Server process error: ${err.message}`);
  
  // Close log file
  logFile.end();
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  log('Received SIGINT. Stopping server process...');
  
  // Kill the server process
  serverProcess.kill('SIGINT');
  
  // Close log file
  logFile.end();
  
  // Exit this process
  process.exit(0);
});