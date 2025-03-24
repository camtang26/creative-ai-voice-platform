import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const railwayDir = path.join(rootDir, 'deployment', 'railway-package');

async function prepareRailwayDeployment() {
  console.log('Preparing Railway.app deployment package...');
  
  try {
    // Create railway package directory
    await fs.mkdir(railwayDir, { recursive: true });
    
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
      'package-lock.json'
    ];
    
    // Directories to copy
    const dirsToCopy = [
      'email-tools'
    ];
    
    // Copy individual files
    for (const file of filesToCopy) {
      const source = path.join(rootDir, file);
      const dest = path.join(railwayDir, file);
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
      const dest = path.join(railwayDir, dir);
      
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
    
    // Create .gitignore
    await fs.writeFile(path.join(railwayDir, '.gitignore'), `
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
    
    // Create README.md with Railway specific instructions
    await fs.writeFile(path.join(railwayDir, 'README.md'), `# Twilio-ElevenLabs Integration

This Node.js application integrates Twilio with ElevenLabs Conversational AI for outbound calling.

## Railway.app Deployment

This repository is configured for deployment on Railway.app.

### Required Environment Variables

\`\`\`
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
ELEVENLABS_API_KEY=your_elevenlabs_api_key
SERVER_URL=your_railway_app_url
\`\`\`

### Start Command

\`\`\`
node server.js
\`\`\`

### Port

\`\`\`
8000
\`\`\`

## Important

After deployment, update the \`SERVER_URL\` environment variable with your Railway domain.
`);
    
    console.log('Created README.md');
    
    // Create Railway configuration file
    await fs.writeFile(path.join(railwayDir, 'railway.json'), JSON.stringify({
      "$schema": "https://railway.app/railway.schema.json",
      "build": {
        "builder": "NIXPACKS"
      },
      "deploy": {
        "startCommand": "node server.js",
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 10
      }
    }, null, 2));
    
    console.log('Created railway.json configuration file');
    
    // Create logs directory
    await fs.mkdir(path.join(railwayDir, 'logs'), { recursive: true });
    console.log('Created logs directory');
    
    console.log('Railway.app deployment package ready!');
    console.log(`Location: ${railwayDir}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Create a new GitHub repository with these files');
    console.log('2. Connect the repository to Railway.app');
    console.log('3. Configure environment variables in Railway');
    console.log('4. Deploy to US-East region');
    console.log('5. Update SERVER_URL environment variable with your Railway domain');
    console.log('6. Update Twilio webhook URLs to your Railway domain');
    
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
prepareRailwayDeployment();