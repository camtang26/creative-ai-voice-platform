/**
 * Test script to verify dashboard API endpoint
 */
import 'dotenv/config';

async function testDashboardAPI() {
  console.log('[Test] Testing dashboard API endpoint...');
  
  const apiUrl = 'http://localhost:8000/api/db/analytics/dashboard?days=7';
  
  try {
    console.log(`[Test] Fetching from: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    console.log(`[Test] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Test] Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('[Test] Response data:', JSON.stringify(data, null, 2));
    
    // Check the structure
    if (data.success && data.data) {
      console.log('[Test] ✓ API response has correct structure');
      console.log('[Test] Dashboard summary:');
      console.log(`  - Total calls: ${data.data.calls?.total || 0}`);
      console.log(`  - Success rate: ${data.data.calls?.successRate || 0}%`);
      console.log(`  - Average duration: ${data.data.calls?.avgDuration || 0} seconds`);
    } else {
      console.error('[Test] ✗ API response missing expected structure');
    }
    
  } catch (error) {
    console.error('[Test] Failed to connect to API:', error.message);
    console.log('\n[Test] Make sure the backend server is running with: npm run dev');
  }
}

// Run the test
testDashboardAPI();