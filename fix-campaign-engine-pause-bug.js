/**
 * Fix for Campaign Engine Pause Bug
 * 
 * Issue: Campaigns continue making calls after being paused
 * Root Cause: The pauseCampaign function doesn't properly stop the campaign execution
 * 
 * This script provides a proper fix for the campaign engine
 */

import fs from 'fs';
import path from 'path';

const campaignEnginePath = './db/campaign-engine.js';

// Read the current file
const currentCode = fs.readFileSync(campaignEnginePath, 'utf8');

// Create a backup
const backupPath = `./db/campaign-engine.backup.${Date.now()}.js`;
fs.writeFileSync(backupPath, currentCode);
console.log(`✅ Backup created: ${backupPath}`);

// Find and fix the pauseCampaign function
const fixedCode = currentCode.replace(
  /async function pauseCampaign\(campaignId\) \{[\s\S]*?return true;[\s\S]*?\} catch/,
  `async function pauseCampaign(campaignId) {
  try {
    console.log(\`[Campaign Engine] Pausing campaign: \${campaignId}\`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Check if campaign is active
    if (!activeCampaigns.has(campaignId)) {
      console.log(\`[Campaign Engine] Campaign not active: \${campaignId}\`);
      return false;
    }
    
    // CRITICAL FIX 1: Clear execution interval IMMEDIATELY
    const interval = campaignIntervals.get(campaignId);
    if (interval) {
      clearInterval(interval);
      campaignIntervals.delete(campaignId);
      console.log(\`[Campaign Engine] Interval cleared for campaign: \${campaignId}\`);
    }
    
    // CRITICAL FIX 2: Get campaign data before removing
    const campaignData = activeCampaigns.get(campaignId);
    
    // CRITICAL FIX 3: Remove from active campaigns to prevent any execution
    activeCampaigns.delete(campaignId);
    console.log(\`[Campaign Engine] Campaign removed from active campaigns: \${campaignId}\`);
    
    // Update campaign status to paused
    await campaignRepository.updateCampaignStatus(campaignId, 'paused');
    
    // Store paused campaign data separately if needed for resume
    // This prevents the campaign from being executed while paused
    pausedCampaigns.set(campaignId, {
      ...campaignData,
      pausedAt: new Date(),
      status: 'paused'
    });
    
    console.log(\`[Campaign Engine] Campaign paused successfully: \${campaignId}\`);
    
    return true;
  } catch`
);

// Add pausedCampaigns Map after activeCampaigns
const fixedCodeWithMap = fixedCode.replace(
  /const activeCampaigns = new Map\(\);/,
  `const activeCampaigns = new Map();

// Paused campaigns map - stores campaign data while paused
const pausedCampaigns = new Map();`
);

// Fix the resumeCampaign function to use pausedCampaigns
const fullyFixedCode = fixedCodeWithMap.replace(
  /async function resumeCampaign\(campaignId\) \{[\s\S]*?return true;[\s\S]*?\} catch/,
  `async function resumeCampaign(campaignId) {
  try {
    console.log(\`[Campaign Engine] Resuming campaign: \${campaignId}\`);
    
    // Get campaign repository
    const campaignRepository = getCampaignRepository();
    
    // Get campaign
    const campaign = await campaignRepository.getCampaignById(campaignId);
    
    if (!campaign) {
      console.error(\`[Campaign Engine] Campaign not found: \${campaignId}\`);
      return false;
    }
    
    // Check if campaign is already active
    if (activeCampaigns.has(campaignId)) {
      console.log(\`[Campaign Engine] Campaign already active: \${campaignId}\`);
      return true;
    }
    
    // Check if campaign was paused
    let campaignData;
    if (pausedCampaigns.has(campaignId)) {
      // Restore from paused campaigns
      campaignData = pausedCampaigns.get(campaignId);
      pausedCampaigns.delete(campaignId);
      delete campaignData.pausedAt;
      delete campaignData.status;
    } else {
      // Create new campaign data
      campaignData = {
        id: campaignId,
        name: campaign.name,
        activeCalls: new Map(),
        settings: campaign.settings || {},
        stats: campaign.stats || {}
      };
    }
    
    // Add campaign to active campaigns map
    activeCampaigns.set(campaignId, campaignData);
    
    // Update campaign status to active
    await campaignRepository.updateCampaignStatus(campaignId, 'active');
    
    // Start campaign execution interval
    const callDelay = campaign.settings?.callDelay || DEFAULT_CALL_DELAY;
    const interval = setInterval(() => executeCampaignCycle(campaignId), callDelay);
    
    // Store interval reference
    campaignIntervals.set(campaignId, interval);
    
    console.log(\`[Campaign Engine] Campaign resumed: \${campaign.name} (\${campaignId})\`);
    
    // Execute first cycle immediately
    executeCampaignCycle(campaignId);
    
    return true;
  } catch`
);

// Write the fixed code
fs.writeFileSync(campaignEnginePath, fullyFixedCode);
console.log('✅ Campaign engine fixed!');

// Create a verification script
const verificationScript = `import { getActiveCampaigns } from './db/campaign-engine.js';

// Check current active campaigns
console.log('\\n=== ACTIVE CAMPAIGNS ===');
const activeCampaigns = getActiveCampaigns();
activeCampaigns.forEach(campaign => {
  console.log(\`- \${campaign.name} (ID: \${campaign.id})\`);
  console.log(\`  Active Calls: \${campaign.activeCalls}\`);
  console.log(\`  Paused: \${campaign.paused}\`);
});

if (activeCampaigns.length === 0) {
  console.log('No active campaigns found.');
}

console.log('\\n✅ Check complete');
`;

fs.writeFileSync('./verify-campaign-state.js', verificationScript);
console.log('✅ Verification script created: verify-campaign-state.js');

console.log('\n📋 SUMMARY OF FIXES:');
console.log('1. pauseCampaign now REMOVES campaign from activeCampaigns Map');
console.log('2. Added pausedCampaigns Map to store paused campaign data');
console.log('3. resumeCampaign restores from pausedCampaigns Map');
console.log('4. This prevents any race conditions or accidental execution');
console.log('\n⚠️  Server restart required for changes to take effect!');