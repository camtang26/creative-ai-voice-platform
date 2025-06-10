/**
 * MongoDB Performance Test
 * Tests the performance of the MongoDB API with caching
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Test data
const testCallSid = `TEST_PERF_${Date.now()}`;

// Performance metrics
const metrics = {
  dashboardOverview: {
    withoutCache: [],
    withCache: []
  },
  callDetails: {
    withoutCache: [],
    withCache: []
  },
  realtime: {
    withoutCache: [],
    withCache: []
  }
};

/**
 * Measure API response time
 * @param {string} url - API URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data and time
 */
async function measureApiResponse(url, options = {}) {
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    const end = performance.now();
    const time = end - start;
    
    return {
      success: response.ok,
      status: response.status,
      data,
      time,
      cached: data.cached || false
    };
  } catch (error) {
    const end = performance.now();
    const time = end - start;
    
    return {
      success: false,
      error: error.message,
      time
    };
  }
}

/**
 * Create a test call
 * @returns {Promise<boolean>} Success status
 */
async function createTestCall() {
  console.log('\nCreating test call...');
  
  try {
    const response = await fetch(`${serverUrl}/api/db/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid: testCallSid,
        status: 'completed',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'outbound-api',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
        duration: 60,
        createdAt: new Date(Date.now() - 60000)
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ Created test call: ${testCallSid}`);
      return true;
    } else {
      console.error(`❌ Failed to create test call: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating test call: ${error.message}`);
    return false;
  }
}

/**
 * Delete test call
 * @returns {Promise<boolean>} Success status
 */
async function deleteTestCall() {
  console.log('\nDeleting test call...');
  
  try {
    const response = await fetch(`${serverUrl}/api/db/calls/${testCallSid}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ Deleted test call: ${testCallSid}`);
      return true;
    } else {
      console.error(`❌ Failed to delete test call: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting test call: ${error.message}`);
    return false;
  }
}

/**
 * Test dashboard overview endpoint
 * @returns {Promise<void>}
 */
async function testDashboardOverview() {
  console.log('\n=== Testing Dashboard Overview Endpoint ===');
  
  // First request (without cache)
  console.log('Making first request (without cache)...');
  const firstResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/overview`);
  
  if (firstResponse.success) {
    console.log(`✅ First request successful: ${firstResponse.time.toFixed(2)}ms`);
    metrics.dashboardOverview.withoutCache.push(firstResponse.time);
  } else {
    console.error(`❌ First request failed: ${firstResponse.error || 'Unknown error'}`);
  }
  
  // Second request (with cache)
  console.log('Making second request (with cache)...');
  const secondResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/overview`);
  
  if (secondResponse.success) {
    console.log(`✅ Second request successful: ${secondResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${secondResponse.cached}`);
    metrics.dashboardOverview.withCache.push(secondResponse.time);
  } else {
    console.error(`❌ Second request failed: ${secondResponse.error || 'Unknown error'}`);
  }
  
  // Third request (with cache)
  console.log('Making third request (with cache)...');
  const thirdResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/overview`);
  
  if (thirdResponse.success) {
    console.log(`✅ Third request successful: ${thirdResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${thirdResponse.cached}`);
    metrics.dashboardOverview.withCache.push(thirdResponse.time);
  } else {
    console.error(`❌ Third request failed: ${thirdResponse.error || 'Unknown error'}`);
  }
}

/**
 * Test call details endpoint
 * @returns {Promise<void>}
 */
async function testCallDetails() {
  console.log('\n=== Testing Call Details Endpoint ===');
  
  // First request (without cache)
  console.log('Making first request (without cache)...');
  const firstResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/call/${testCallSid}`);
  
  if (firstResponse.success) {
    console.log(`✅ First request successful: ${firstResponse.time.toFixed(2)}ms`);
    metrics.callDetails.withoutCache.push(firstResponse.time);
  } else {
    console.error(`❌ First request failed: ${firstResponse.error || 'Unknown error'}`);
  }
  
  // Second request (with cache)
  console.log('Making second request (with cache)...');
  const secondResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/call/${testCallSid}`);
  
  if (secondResponse.success) {
    console.log(`✅ Second request successful: ${secondResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${secondResponse.cached}`);
    metrics.callDetails.withCache.push(secondResponse.time);
  } else {
    console.error(`❌ Second request failed: ${secondResponse.error || 'Unknown error'}`);
  }
  
  // Third request (with cache)
  console.log('Making third request (with cache)...');
  const thirdResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/call/${testCallSid}`);
  
  if (thirdResponse.success) {
    console.log(`✅ Third request successful: ${thirdResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${thirdResponse.cached}`);
    metrics.callDetails.withCache.push(thirdResponse.time);
  } else {
    console.error(`❌ Third request failed: ${thirdResponse.error || 'Unknown error'}`);
  }
}

/**
 * Test real-time dashboard endpoint
 * @returns {Promise<void>}
 */
async function testRealtimeDashboard() {
  console.log('\n=== Testing Real-time Dashboard Endpoint ===');
  
  // First request (without cache)
  console.log('Making first request (without cache)...');
  const firstResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/realtime`);
  
  if (firstResponse.success) {
    console.log(`✅ First request successful: ${firstResponse.time.toFixed(2)}ms`);
    metrics.realtime.withoutCache.push(firstResponse.time);
  } else {
    console.error(`❌ First request failed: ${firstResponse.error || 'Unknown error'}`);
  }
  
  // Second request (with cache)
  console.log('Making second request (with cache)...');
  const secondResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/realtime`);
  
  if (secondResponse.success) {
    console.log(`✅ Second request successful: ${secondResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${secondResponse.cached}`);
    metrics.realtime.withCache.push(secondResponse.time);
  } else {
    console.error(`❌ Second request failed: ${secondResponse.error || 'Unknown error'}`);
  }
  
  // Third request (with cache)
  console.log('Making third request (with cache)...');
  const thirdResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/realtime`);
  
  if (thirdResponse.success) {
    console.log(`✅ Third request successful: ${thirdResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${thirdResponse.cached}`);
    metrics.realtime.withCache.push(thirdResponse.time);
  } else {
    console.error(`❌ Third request failed: ${thirdResponse.error || 'Unknown error'}`);
  }
}

/**
 * Test cache invalidation
 * @returns {Promise<void>}
 */
async function testCacheInvalidation() {
  console.log('\n=== Testing Cache Invalidation ===');
  
  // Make a request to get cached data
  console.log('Making initial request to cache data...');
  await measureApiResponse(`${serverUrl}/api/db/dashboard/overview`);
  await measureApiResponse(`${serverUrl}/api/db/dashboard/call/${testCallSid}`);
  await measureApiResponse(`${serverUrl}/api/db/dashboard/realtime`);
  
  // Update call status to trigger cache invalidation
  console.log('Updating call status to trigger cache invalidation...');
  const updateResponse = await fetch(`${serverUrl}/api/db/calls/${testCallSid}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'in-progress',
      timestamp: new Date().toISOString()
    })
  });
  
  const updateData = await updateResponse.json();
  
  if (updateResponse.ok && updateData.success) {
    console.log(`✅ Updated call status successfully`);
  } else {
    console.error(`❌ Failed to update call status: ${updateData.error || 'Unknown error'}`);
  }
  
  // Check if dashboard overview cache was invalidated
  console.log('Checking if dashboard overview cache was invalidated...');
  const overviewResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/overview`);
  
  if (overviewResponse.success) {
    console.log(`✅ Dashboard overview request successful: ${overviewResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${overviewResponse.cached}`);
    
    if (!overviewResponse.cached) {
      console.log('✅ Dashboard overview cache was invalidated');
    } else {
      console.error('❌ Dashboard overview cache was not invalidated');
    }
  } else {
    console.error(`❌ Dashboard overview request failed: ${overviewResponse.error || 'Unknown error'}`);
  }
  
  // Check if call details cache was invalidated
  console.log('Checking if call details cache was invalidated...');
  const callDetailsResponse = await measureApiResponse(`${serverUrl}/api/db/dashboard/call/${testCallSid}`);
  
  if (callDetailsResponse.success) {
    console.log(`✅ Call details request successful: ${callDetailsResponse.time.toFixed(2)}ms`);
    console.log(`   Cached: ${callDetailsResponse.cached}`);
    
    if (!callDetailsResponse.cached) {
      console.log('✅ Call details cache was invalidated');
    } else {
      console.error('❌ Call details cache was not invalidated');
    }
  } else {
    console.error(`❌ Call details request failed: ${callDetailsResponse.error || 'Unknown error'}`);
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log('\n=== Performance Report ===');
  
  // Dashboard overview
  if (metrics.dashboardOverview.withoutCache.length > 0 && metrics.dashboardOverview.withCache.length > 0) {
    const withoutCacheAvg = metrics.dashboardOverview.withoutCache.reduce((sum, time) => sum + time, 0) / metrics.dashboardOverview.withoutCache.length;
    const withCacheAvg = metrics.dashboardOverview.withCache.reduce((sum, time) => sum + time, 0) / metrics.dashboardOverview.withCache.length;
    const improvement = ((withoutCacheAvg - withCacheAvg) / withoutCacheAvg) * 100;
    
    console.log('\nDashboard Overview:');
    console.log(`  Without Cache: ${withoutCacheAvg.toFixed(2)}ms`);
    console.log(`  With Cache: ${withCacheAvg.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);
  }
  
  // Call details
  if (metrics.callDetails.withoutCache.length > 0 && metrics.callDetails.withCache.length > 0) {
    const withoutCacheAvg = metrics.callDetails.withoutCache.reduce((sum, time) => sum + time, 0) / metrics.callDetails.withoutCache.length;
    const withCacheAvg = metrics.callDetails.withCache.reduce((sum, time) => sum + time, 0) / metrics.callDetails.withCache.length;
    const improvement = ((withoutCacheAvg - withCacheAvg) / withoutCacheAvg) * 100;
    
    console.log('\nCall Details:');
    console.log(`  Without Cache: ${withoutCacheAvg.toFixed(2)}ms`);
    console.log(`  With Cache: ${withCacheAvg.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);
  }
  
  // Real-time dashboard
  if (metrics.realtime.withoutCache.length > 0 && metrics.realtime.withCache.length > 0) {
    const withoutCacheAvg = metrics.realtime.withoutCache.reduce((sum, time) => sum + time, 0) / metrics.realtime.withoutCache.length;
    const withCacheAvg = metrics.realtime.withCache.reduce((sum, time) => sum + time, 0) / metrics.realtime.withCache.length;
    const improvement = ((withoutCacheAvg - withCacheAvg) / withoutCacheAvg) * 100;
    
    console.log('\nReal-time Dashboard:');
    console.log(`  Without Cache: ${withoutCacheAvg.toFixed(2)}ms`);
    console.log(`  With Cache: ${withCacheAvg.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);
  }
  
  // Overall assessment
  console.log('\nOverall Assessment:');
  
  const allWithoutCache = [
    ...metrics.dashboardOverview.withoutCache,
    ...metrics.callDetails.withoutCache,
    ...metrics.realtime.withoutCache
  ];
  
  const allWithCache = [
    ...metrics.dashboardOverview.withCache,
    ...metrics.callDetails.withCache,
    ...metrics.realtime.withCache
  ];
  
  if (allWithoutCache.length > 0 && allWithCache.length > 0) {
    const withoutCacheAvg = allWithoutCache.reduce((sum, time) => sum + time, 0) / allWithoutCache.length;
    const withCacheAvg = allWithCache.reduce((sum, time) => sum + time, 0) / allWithCache.length;
    const improvement = ((withoutCacheAvg - withCacheAvg) / withoutCacheAvg) * 100;
    
    console.log(`  Overall Without Cache: ${withoutCacheAvg.toFixed(2)}ms`);
    console.log(`  Overall With Cache: ${withCacheAvg.toFixed(2)}ms`);
    console.log(`  Overall Improvement: ${improvement.toFixed(2)}%`);
    
    if (improvement >= 50) {
      console.log('  ✅ Caching is providing significant performance improvements (>50%)');
    } else if (improvement >= 25) {
      console.log('  ✅ Caching is providing good performance improvements (25-50%)');
    } else if (improvement > 0) {
      console.log('  ⚠️ Caching is providing minimal performance improvements (<25%)');
    } else {
      console.log('  ❌ Caching is not providing performance improvements');
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Performance Test');
  console.log('========================');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Call SID: ${testCallSid}`);
  
  try {
    // Create test call
    const callCreated = await createTestCall();
    if (!callCreated) {
      console.error('❌ Failed to create test call, aborting test');
      return;
    }
    
    // Test dashboard overview endpoint
    await testDashboardOverview();
    
    // Test call details endpoint
    await testCallDetails();
    
    // Test real-time dashboard endpoint
    await testRealtimeDashboard();
    
    // Test cache invalidation
    await testCacheInvalidation();
    
    // Delete test call
    await deleteTestCall();
    
    // Generate performance report
    generatePerformanceReport();
    
    console.log('\nPerformance test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  }
}

// Run the main function
main();