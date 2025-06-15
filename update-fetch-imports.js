#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const files = [
  'test-phone-validation.js',
  'server-mongodb.js',
  'outbound.js',
  'test-simple-post.js',
  'test-minimal-csv.js',
  'test-server-endpoint.js',
  'test-fresh-csv.js',
  'test-complete-csv-flow.js',
  'check-live-campaigns.js',
  'test-csv-upload.js',
  'test-elevenlabs-api.js',
  'src/integrations/twilio-crm-webhook.js',
  'webhook-handler.js',
  'db/api/recording-api.js',
  'test-recording-caching.js',
  'db/utils/recording-cache.js',
  'test-recording-download.js',
  'db/webhook-handler-db.js',
  'elevenlabs-api-routes.js',
  'make-call.js',
  'tests/test-mongodb-analytics.js',
  'mongodb-sheet-call.js',
  'tests/test-mongodb-campaign.js',
  'tests/test-mongodb-performance.js',
  'tests/test-mongodb-frontend-compatibility.js',
  'tests/test-mongodb-deletion-cascade.js',
  'tests/test-mongodb-dashboard-analysis.js',
  'tests/test-mongodb-socketio-stress.js',
  'tests/test-mongodb-e2e.js',
  'tests/test-mongodb-fixes.js',
  'tests/test-mongodb-call.js',
  'tests/test-mongodb-api.js',
  'tests/simulate-elevenlabs-webhook.js',
  'backup/server-fixed.js',
  'backup/server.js',
  'backup/server-imports-fix.js',
  'outbound.old.js',
  'get-ngrok-url.js',
  'tests/test-enhanced-call.js',
  'tests/test-call.js',
  'tests/test-enhancements.js',
  'webhook-server.js',
  'sheet-call.old.js',
  'call-sheet.js',
  'backup/latency-test.js',
  'make-call-debug.js',
  'email-tools/api-email-service.js',
  'email-tools/test-real-email.js',
  'email-tools/test-agent-email-integration.js'
];

async function updateFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Remove node-fetch import line
    const updatedContent = content.replace(
      /import\s+fetch\s+from\s+['"]node-fetch['"];?\s*\n?/g,
      '// Removed node-fetch import - using native fetch\n'
    );
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Updating node-fetch imports to use native fetch...\n');
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const result = await updateFile(file);
    if (result) updatedCount++;
    else if (result === false) continue;
    else errorCount++;
  }
  
  console.log(`\n✅ Summary: ${updatedCount} files updated, ${errorCount} errors`);
}

main().catch(console.error);