#!/usr/bin/env node

/**
 * AWS Lightsail Deployment Script for Twilio-ElevenLabs Server
 * 
 * This script automates the deployment of the Twilio-ElevenLabs server to AWS Lightsail in US-East-1 region.
 * It requires the AWS CLI to be installed and configured with appropriate credentials.
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

// Configuration
const config = {
  instanceName: 'twilio-elevenlabs-server',
  region: 'us-east-1',
  blueprint: 'amazon-linux-2-lts',
  bundleId: 'nano_3_0', // $5/month (first month free)
  keyPairName: 'twilio-elevenlabs-key',
  username: 'ec2-user',
  port: 8000
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Execute command and return promise
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
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
async function deployToLightsail() {
  try {
    console.log('\n=========================================');
    console.log('Twilio-ElevenLabs Server Deployment Tool');
    console.log('=========================================\n');
    
    // Check if AWS CLI is installed
    try {
      await executeCommand('aws --version');
    } catch (error) {
      console.error('AWS CLI is not installed or not in PATH.');
      console.error('Please install AWS CLI and configure it with your credentials.');
      console.error('https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html');
      process.exit(1);
    }
    
    // Confirm deployment
    const confirmDeploy = await askForConfirmation('This will deploy the Twilio-ElevenLabs server to AWS Lightsail in US-East-1 region. Continue?');
    if (!confirmDeploy) {
      console.log('Deployment cancelled.');
      process.exit(0);
    }
    
    // Create key pair
    console.log('\nCreating key pair...');
    try {
      await executeCommand(`aws lightsail create-key-pair --region ${config.region} --key-pair-name ${config.keyPairName} --output text > ${config.keyPairName}.pem`);
      await executeCommand(`chmod 400 ${config.keyPairName}.pem`);
      console.log(`Key pair created and saved to ${config.keyPairName}.pem`);
    } catch (error) {
      console.log('Key pair already exists, using existing key pair.');
    }
    
    // Create instance
    console.log('\nCreating Lightsail instance...');
    try {
      await executeCommand(`aws lightsail create-instances --region ${config.region} --availability-zone ${config.region}a --blueprint-id ${config.blueprint} --bundle-id ${config.bundleId} --instance-names ${config.instanceName} --key-pair-name ${config.keyPairName}`);
      console.log('Instance created successfully.');
    } catch (error) {
      console.log('Instance may already exist, continuing...');
    }
    
    // Wait for instance to be ready
    console.log('\nWaiting for instance to be ready...');
    await executeCommand(`aws lightsail wait instance-running --region ${config.region} --instance-name ${config.instanceName}`);
    
    // Get instance public IP
    console.log('\nGetting instance public IP...');
    const ipInfoJson = await executeCommand(`aws lightsail get-instance --region ${config.region} --instance-name ${config.instanceName} --query "instance.publicIpAddress" --output text`);
    const ipAddress = ipInfoJson.trim();
    console.log(`Instance public IP: ${ipAddress}`);
    
    // Open port for the server
    console.log('\nOpening port for the server...');
    await executeCommand(`aws lightsail open-instance-public-ports --region ${config.region} --instance-name ${config.instanceName} --port-info fromPort=${config.port},toPort=${config.port},protocol=TCP`);
    
    // Wait for SSH to be available
    console.log('\nWaiting for SSH to be available...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    // Create deployment package as tar.gz
    console.log('\nCreating deployment package...');
    const deploymentPackage = path.join(rootDir, 'deployment', 'deployment-package.tar.gz');
    await executeCommand(`tar -czf ${deploymentPackage} -C ${packageDir} .`);
    
    // Copy deployment package to instance
    console.log('\nCopying deployment package to instance...');
    await executeCommand(`aws lightsail put-instance-public-ports --region ${config.region} --instance-name ${config.instanceName} --port-infos fromPort=22,toPort=22,protocol=TCP`);
    await executeCommand(`scp -i ${config.keyPairName}.pem -o StrictHostKeyChecking=no ${deploymentPackage} ${config.username}@${ipAddress}:~/deployment-package.tar.gz`);
    
    // Install Node.js and deploy application
    console.log('\nInstalling Node.js and deploying application...');
    const setupCommands = `
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
      source ~/.nvm/nvm.sh
      nvm install 16
      mkdir -p ~/app
      tar -xzf ~/deployment-package.tar.gz -C ~/app
      cd ~/app
      npm install
      echo "SERVER_URL=http://${ipAddress}:${config.port}" >> .env
    `;
    
    const sshCommand = `ssh -i ${config.keyPairName}.pem -o StrictHostKeyChecking=no ${config.username}@${ipAddress} '${setupCommands}'`;
    await executeCommand(sshCommand);
    
    // Start the server with PM2
    console.log('\nStarting the server with PM2...');
    const startCommands = `
      source ~/.nvm/nvm.sh
      cd ~/app
      npm install -g pm2
      pm2 start server.js
      pm2 startup
      sudo env PATH=$PATH:/home/${config.username}/.nvm/versions/node/v16.*/bin pm2 startup systemd -u ${config.username}
      pm2 save
    `;
    
    const startSshCommand = `ssh -i ${config.keyPairName}.pem -o StrictHostKeyChecking=no ${config.username}@${ipAddress} '${startCommands}'`;
    await executeCommand(startSshCommand);
    
    // Success message
    console.log('\n=========================================');
    console.log('Deployment completed successfully!');
    console.log('=========================================');
    console.log(`Server URL: http://${ipAddress}:${config.port}`);
    console.log(`SSH command: ssh -i ${config.keyPairName}.pem ${config.username}@${ipAddress}`);
    console.log('\nIMPORTANT:');
    console.log('1. Update your Twilio webhook URLs to point to this server');
    console.log(`2. Update SERVER_URL in .env to http://${ipAddress}:${config.port}`);
    console.log('3. For production use, consider setting up a domain name and SSL');
    
    rl.close();
  } catch (error) {
    console.error('Deployment failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Start deployment
deployToLightsail();
