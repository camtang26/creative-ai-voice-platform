// Quick script to check if campaign engine is running and stop it
import { getCampaignEngine } from './db/campaign-engine.js';

async function checkAndStopEngine() {
  try {
    const engine = getCampaignEngine();
    
    console.log('Campaign Engine Status:');
    console.log('Is Running:', engine.isRunning);
    console.log('Active Campaigns:', Object.keys(engine.activeCampaigns || {}).length);
    
    if (engine.isRunning) {
      console.log('\nStopping campaign engine...');
      await engine.stop();
      console.log('✅ Campaign engine stopped');
    } else {
      console.log('\n✅ Campaign engine is already stopped');
    }
    
  } catch (error) {
    console.error('Error checking campaign engine:', error.message);
  }
}

checkAndStopEngine();