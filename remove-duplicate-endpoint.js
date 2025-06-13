#!/usr/bin/env node

/**
 * Remove the duplicate CSV upload endpoint from campaign-api.js
 */

import fs from 'fs';

const filePath = './db/api/campaign-api.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find the start and end of the duplicate endpoint
const startMarker = "// Start campaign from CSV upload";
const endMarker = "  });";

let lines = content.split('\n');
let newLines = [];
let skipLines = false;
let endMarkerCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Start skipping when we find the start marker
  if (line.includes(startMarker)) {
    skipLines = true;
    newLines.push('  // Note: CSV upload endpoint is now handled in server-mongodb.js');
    newLines.push('  // Removed duplicate implementation to avoid conflicts');
    continue;
  }
  
  // If we're skipping and find the end marker, count them
  if (skipLines && line.trim() === '});') {
    endMarkerCount++;
    // Skip until we find the end of the fastify.post function (should be the next });)
    if (endMarkerCount >= 1) {
      skipLines = false;
      continue; // Skip this line too
    }
  }
  
  // Add line if we're not skipping
  if (!skipLines) {
    newLines.push(line);
  }
}

// Write the modified content
fs.writeFileSync(filePath, newLines.join('\n'));
console.log('✅ Removed duplicate CSV upload endpoint from campaign-api.js');