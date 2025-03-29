import fs from 'fs';
import path from 'path';

// File paths
const serverPath = './server.js';
const backupPath = './server.js.backup';

// Read the current server.js file
console.log('Reading server.js...');
const content = fs.readFileSync(serverPath, 'utf8');

// Create a backup
console.log('Creating backup...');
fs.writeFileSync(backupPath, content);

// Replace the socket-server-enhanced.js import with socket-server.js
console.log('Updating imports...');
const updatedContent = content.replace(
  "} from './socket-server-enhanced.js';",
  "} from './socket-server.js';"
);

// Write the updated content back to server.js
console.log('Writing updated server.js...');
fs.writeFileSync(serverPath, updatedContent);

console.log('Server file updated successfully!');
