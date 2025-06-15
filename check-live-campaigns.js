// Removed node-fetch import - using native fetch
async function checkLiveCampaigns() {
  try {
    console.log('Fetching campaigns from live backend...\n');

    const response = await fetch('https://twilio-elevenlabs-app.onrender.com/api/db/campaigns', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    
    if (result.success && result.data && result.data.campaigns) {
      const campaigns = result.data.campaigns;
      console.log(`\nFound ${campaigns.length} campaigns:\n`);
      
      campaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name}`);
        console.log(`   ID: ${campaign._id}`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Contacts: ${campaign.contactIds?.length || 0}`);
        console.log(`   Created: ${new Date(campaign.createdAt).toLocaleString()}`);
        
        if (campaign.name.includes('200 leads') || campaign.name.includes('CSV')) {
          console.log('   ⚠️  This might be your CSV campaign!');
        }
        console.log('');
      });
      
      // Find campaigns with 'draft' status
      const draftCampaigns = campaigns.filter(c => c.status === 'draft');
      if (draftCampaigns.length > 0) {
        console.log(`\n⚠️  Found ${draftCampaigns.length} draft campaigns that need to be activated!`);
      }
      
    } else {
      console.log('Failed to fetch campaigns or unexpected response format');
      console.log('Response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('Error fetching campaigns:', error.message);
  }
}

checkLiveCampaigns();