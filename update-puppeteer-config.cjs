const fs = require('fs');
const path = require('path');

// Read the configuration file
const configPath = '/home/cameronai/.claude.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Find the project configuration
let projectKey = null;
for (const key of Object.keys(config.projects)) {
  if (key.includes('/mnt/c/Users/wowca')) {
    projectKey = key;
    break;
  }
}

if (!projectKey) {
  console.error('Project not found in configuration');
  process.exit(1);
}

// Update the puppeteer configuration
config.projects[projectKey].mcpServers.puppeteer = {
  "command": "npx",
  "args": [
    "-y",
    "puppeteer-mcp-server"
  ],
  "env": {
    "LOG_LEVEL": "debug",
    "NODE_ENV": "development"
  },
  "alwaysAllow": [
    "puppeteer_connect_active_tab",
    "puppeteer_navigate",
    "puppeteer_screenshot",
    "puppeteer_click",
    "puppeteer_fill",
    "puppeteer_select",
    "puppeteer_hover",
    "puppeteer_evaluate"
  ],
  "disabled": false  // Enable it!
};

// Backup the original file
fs.copyFileSync(configPath, configPath + '.backup-' + Date.now());

// Write the updated configuration
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ Puppeteer MCP server configuration updated successfully!');
console.log('📝 Configuration details:');
console.log('   - Using: puppeteer-mcp-server (with active tab support)');
console.log('   - Debug logging: enabled');
console.log('   - All tools: auto-allowed');
console.log('   - Status: enabled');
console.log('\n🚀 Next steps:');
console.log('1. Start Chrome with: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222');
console.log('2. Run: mcp (to verify connection)');
console.log('3. Use puppeteer_connect_active_tab tool to connect');