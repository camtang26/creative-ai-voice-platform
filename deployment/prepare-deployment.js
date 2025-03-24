import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const deploymentDir = path.join(rootDir, 'deployment', 'package');

async function prepareDeployment() {
  console.log('Preparing deployment package...');
  
  try {
    // Create deployment package directory
    await fs.mkdir(deploymentDir, { recursive: true });
    
    // List of essential files to copy
    const filesToCopy = [
      'server.js',
      'outbound.js',
      'make-call.js',
      'custom-message.js',
      'sheet-call.js',
      'google-auth.js',
      '.env.example',
      'package.json',
      'package-lock.json',
      'README.md'
    ];
    
    // Directories to copy
    const dirsToCopy = [
      'email-tools'
    ];
    
    // Copy individual files
    for (const file of filesToCopy) {
      const source = path.join(rootDir, file);
      const dest = path.join(deploymentDir, file);
      try {
        await fs.copyFile(source, dest);
        console.log(`Copied ${file}`);
      } catch (err) {
        console.error(`Error copying ${file}: ${err.message}`);
      }
    }
    
    // Copy directories
    for (const dir of dirsToCopy) {
      const source = path.join(rootDir, dir);
      const dest = path.join(deploymentDir, dir);
      
      try {
        // Create directory
        await fs.mkdir(dest, { recursive: true });
        
        // Copy directory contents
        await copyDirectory(source, dest);
        console.log(`Copied directory ${dir}`);
      } catch (err) {
        console.error(`Error copying directory ${dir}: ${err.message}`);
      }
    }
    
    // Copy deployment files
    const deploymentFiles = [
      'README.md',
      'DEPLOYMENT.md',
      'setup.sh',
      'package.json'
    ];
    
    for (const file of deploymentFiles) {
      const source = path.join(__dirname, file);
      const dest = path.join(deploymentDir, file);
      try {
        await fs.copyFile(source, dest);
        console.log(`Copied deployment/${file}`);
      } catch (err) {
        console.error(`Error copying deployment/${file}: ${err.message}`);
      }
    }
    
    // Create .gitignore
    await fs.writeFile(path.join(deploymentDir, '.gitignore'), `
# Environment variables
.env

# Logs
logs
*.log

# Node dependencies
node_modules

# Runtime data
.npm
.eslintcache

# Optional REPL history
.node_repl_history

# Uploaded files
uploads

# SSH keys
*.pem
*.key

# Credentials
credentials.json
token.json

# Optimized folder
optimized/
`);
    
    console.log('Created .gitignore');
    
    // Create folders for logs
    await fs.mkdir(path.join(deploymentDir, 'logs'), { recursive: true });
    console.log('Created logs directory');
    
    console.log('Deployment package ready!');
    console.log(`Location: ${deploymentDir}`);
    console.log('Next steps:');
    console.log('1. Copy this package to your US-East server');
    console.log('2. Follow the instructions in DEPLOYMENT.md');
    
  } catch (err) {
    console.error('Error preparing deployment:', err);
  }
}

async function copyDirectory(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Run the function
prepareDeployment();