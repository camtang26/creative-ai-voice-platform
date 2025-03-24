#!/usr/bin/env node

/**
 * Vercel Deployment Script for Twilio-ElevenLabs Server
 * 
 * This script automates the deployment of the Twilio-ElevenLabs server to Vercel in US-East region.
 * It requires the Vercel CLI to be installed.
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'deployment', 'railway-package');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Execute command and return promise
function executeCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Ask for confirmation
function askForConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main deployment function
async function deployToVercel() {
  try {
    console.log('\n=========================================');
    console.log('Twilio-ElevenLabs Server Deployment Tool');
    console.log('=========================================\n');
    
    // Check if Vercel CLI is installed
    try {
      await executeCommand('vercel --version');
    } catch (error) {
      console.log('Vercel CLI is not installed. Installing...');
      await executeCommand('npm install -g vercel');
    }
    
    // Confirm deployment
    const confirmDeploy = await askForConfirmation('This will deploy the Twilio-ElevenLabs server to Vercel in US-East region. Continue?');
    if (!confirmDeploy) {
      console.log('Deployment cancelled.');
      process.exit(0);
    }
    
    // Deploy to Vercel
    console.log('\nDeploying to Vercel...');
    
    // Copy files to temp directory
    const tempDir = path.join(rootDir, 'vercel-deploy-temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    // Copy deployment package to temp directory
    console.log('\nPreparing deployment files...');
    
    // Copy each file from railway-package to temp directory
    const files = await fs.readdir(packageDir);
    for (const file of files) {
      const sourcePath = path.join(packageDir, file);
      const destPath = path.join(tempDir, file);
      
      const stat = await fs.stat(sourcePath);
      if (stat.isDirectory()) {
        // Copy directory
        try {
          await fs.mkdir(destPath, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }
        
        // Copy files in directory
        const subFiles = await fs.readdir(sourcePath);
        for (const subFile of subFiles) {
          const subSourcePath = path.join(sourcePath, subFile);
          const subDestPath = path.join(destPath, subFile);
          
          const subStat = await fs.stat(subSourcePath);
          if (!subStat.isDirectory()) {
            await fs.copyFile(subSourcePath, subDestPath);
          }
        }
      } else {
        // Copy file
        await fs.copyFile(sourcePath, destPath);
      }
    }
    
    // Deploy to Vercel
    console.log('\nDeploying to Vercel...');
    let deployOutput;
    try {
      // Try non-interactive deployment
      deployOutput = await executeCommand('vercel --prod', tempDir);
    } catch (error) {
      // If it fails, try interactive deployment
      console.log('Non-interactive deployment failed. Trying interactive deployment...');
      deployOutput = await executeCommand('vercel', tempDir);
    }
    
    // Parse deployment URL from output
    const urlMatch = deployOutput.match(/(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/);
    const deployUrl = urlMatch ? urlMatch[1] : 'https://your-app-url.vercel.app';
    
    // Success message
    console.log('\n=========================================');
    console.log('Deployment completed successfully!');
    console.log('=========================================');
    console.log(`Server URL: ${deployUrl}`);
    console.log('\nIMPORTANT:');
    console.log('1. Update your Twilio webhook URLs to point to this server');
    console.log(`2. Set SERVER_URL in Vercel environment variables to ${deployUrl}`);
    console.log('   (You can do this in the Vercel dashboard)');
    
    // Clean up temp directory
    console.log('\nCleaning up...');
    // Commented out to keep the temp directory for debugging
    // await fs.rm(tempDir, { recursive: true, force: true });
    
    rl.close();
  } catch (error) {
    console.error('Deployment failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Start deployment
deployToVercel();
