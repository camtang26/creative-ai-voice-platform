/**
 * Test script to verify ElevenLabs API access
 * Usage: node test-elevenlabs-api.js <conversationId>
 */
// Removed node-fetch import - using native fetch
import 'dotenv/config';

async function testElevenLabsAPI(conversationId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in .env file');
    process.exit(1);
  }
  
  if (!conversationId) {
    console.error('❌ Please provide a conversation ID as argument');
    console.log('Usage: node test-elevenlabs-api.js <conversationId>');
    process.exit(1);
  }
  
  console.log('🔍 Testing ElevenLabs API...');
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Conversation ID: ${conversationId}`);
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': apiKey }
      }
    );
    
    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n✅ Successfully fetched conversation data');
    console.log(`Status: ${data.status}`);
    console.log(`Agent ID: ${data.agent_id}`);
    console.log(`Has Analysis: ${!!data.analysis}`);
    
    if (data.analysis?.transcript_summary) {
      console.log('\n📝 AI Summary:');
      console.log(data.analysis.transcript_summary);
    } else {
      console.log('\n⚠️  No AI summary available yet');
      if (data.status === 'processing') {
        console.log('   (Conversation is still being processed)');
      }
    }
    
    console.log('\n📊 Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get conversation ID from command line
const conversationId = process.argv[2];
testElevenLabsAPI(conversationId);