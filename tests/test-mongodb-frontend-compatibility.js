/**
 * MongoDB Frontend API Compatibility Test
 * Verifies the API endpoints provide the correct data for frontend integration
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import { io } from 'socket.io-client';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Test data
const testCallSid = `TEST_FRONTEND_${Date.now()}`;

// Performance metrics
const metrics = {
  responseTime: {},
  responseSize: {},
  corsHeaders: {},
  jsonStructure: {},
  errors: [],
  warnings: []
};

/**
 * Test CORS configuration
 */
async function testCorsConfiguration() {
  console.log('\n1. Testing CORS configuration...');
  
  const endpoints = [
    '/api/db/calls',
    '/api/db/dashboard/overview',
    '/api/db/analytics/duration/day',
    '/api/db/events'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting CORS for endpoint: ${endpoint}`);
    
    try {
      // Send OPTIONS request to check CORS headers
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      // Get CORS headers
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
        'access-control-max-age': response.headers.get('access-control-max-age')
      };
      
      // Store CORS headers
      metrics.corsHeaders[endpoint] = corsHeaders;
      
      console.log(`  Status: ${response.status}`);
      console.log('  CORS Headers:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        console.log(`    ${key}: ${value || 'not set'}`);
      });
      
      // Check if CORS is properly configured
      if (corsHeaders['access-control-allow-origin']) {
        console.log('  ✅ CORS is configured');
        
        // Check if CORS allows localhost:3000
        if (corsHeaders['access-control-allow-origin'] === 'http://localhost:3000' || 
            corsHeaders['access-control-allow-origin'] === '*') {
          console.log('  ✅ CORS allows frontend origin');
        } else {
          console.log('  ⚠️ CORS does not explicitly allow frontend origin');
          metrics.warnings.push({
            endpoint,
            warning: 'CORS does not explicitly allow frontend origin'
          });
        }
      } else {
        console.log('  ❌ CORS is not configured');
        metrics.errors.push({
          endpoint,
          error: 'CORS is not configured'
        });
      }
    } catch (error) {
      console.error(`  ❌ Error testing CORS for ${endpoint}:`, error.message);
      metrics.errors.push({
        endpoint,
        error: error.message
      });
    }
  }
}

/**
 * Test API response times
 */
async function testApiResponseTimes() {
  console.log('\n2. Testing API response times...');
  
  const endpoints = [
    { url: '/api/db/calls', description: 'Get all calls' },
    { url: '/api/db/dashboard/overview', description: 'Dashboard overview' },
    { url: '/api/db/analytics/duration/day', description: 'Call duration stats' },
    { url: '/api/db/analytics/outcomes', description: 'Call outcome distribution' },
    { url: '/api/db/dashboard/realtime', description: 'Real-time dashboard data' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting response time for: ${endpoint.description}`);
    
    try {
      const startTime = performance.now();
      
      // Send GET request
      const response = await fetch(`${serverUrl}${endpoint.url}`);
      const data = await response.json();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Calculate response size
      const responseSize = JSON.stringify(data).length;
      
      // Store metrics
      metrics.responseTime[endpoint.url] = responseTime;
      metrics.responseSize[endpoint.url] = responseSize;
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Response time: ${responseTime.toFixed(2)}ms`);
      console.log(`  Response size: ${formatBytes(responseSize)}`);
      
      // Check if response time is acceptable
      if (responseTime > 1000) {
        console.log('  ⚠️ Response time is slow (>1000ms)');
        metrics.warnings.push({
          endpoint: endpoint.url,
          warning: `Slow response time: ${responseTime.toFixed(2)}ms`
        });
      } else {
        console.log('  ✅ Response time is acceptable');
      }
      
      // Check if response size is acceptable
      if (responseSize > 1000000) {
        console.log('  ⚠️ Response size is large (>1MB)');
        metrics.warnings.push({
          endpoint: endpoint.url,
          warning: `Large response size: ${formatBytes(responseSize)}`
        });
      } else {
        console.log('  ✅ Response size is acceptable');
      }
    } catch (error) {
      console.error(`  ❌ Error testing response time for ${endpoint.url}:`, error.message);
      metrics.errors.push({
        endpoint: endpoint.url,
        error: error.message
      });
    }
  }
}

/**
 * Test pagination
 */
async function testPagination() {
  console.log('\n3. Testing pagination...');
  
  // Create test data
  console.log('\nCreating test data for pagination...');
  
  const calls = [];
  
  for (let i = 0; i < 25; i++) {
    const callSid = `${testCallSid}_${i}`;
    calls.push(callSid);
    
    // Create call
    await fetch(`${serverUrl}/api/db/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callSid,
        status: 'completed',
        from: '+1234567890',
        to: '+0987654321',
        direction: 'outbound-api',
        duration: 120,
        createdAt: new Date()
      })
    });
  }
  
  console.log(`✅ Created ${calls.length} test calls for pagination testing`);
  
  // Test pagination
  console.log('\nTesting pagination for calls endpoint...');
  
  const paginationTests = [
    { page: 1, limit: 10, description: 'First page with 10 items' },
    { page: 2, limit: 10, description: 'Second page with 10 items' },
    { page: 3, limit: 10, description: 'Third page with 5 items' },
    { page: 1, limit: 20, description: 'First page with 20 items' },
    { page: 2, limit: 20, description: 'Second page with 5 items' }
  ];
  
  for (const test of paginationTests) {
    console.log(`\nTesting: ${test.description}`);
    
    try {
      // Send GET request with pagination
      const response = await fetch(`${serverUrl}/api/db/calls?page=${test.page}&limit=${test.limit}`);
      const data = await response.json();
      
      console.log(`  Status: ${response.status}`);
      
      if (response.ok && data.success) {
        console.log(`  Returned ${data.data.calls.length} calls`);
        console.log(`  Total calls: ${data.data.pagination.total}`);
        console.log(`  Page: ${data.data.pagination.page}`);
        console.log(`  Limit: ${data.data.pagination.limit}`);
        console.log(`  Total pages: ${data.data.pagination.pages}`);
        
        // Check if pagination is working correctly
        if (data.data.pagination.page === test.page && 
            data.data.pagination.limit === test.limit) {
          console.log('  ✅ Pagination parameters are correct');
        } else {
          console.log('  ❌ Pagination parameters are incorrect');
          metrics.errors.push({
            endpoint: '/api/db/calls',
            error: 'Pagination parameters are incorrect'
          });
        }
        
        // Check if the number of items is correct
        const expectedItems = Math.min(test.limit, 
                                      data.data.pagination.total - (test.page - 1) * test.limit);
        
        if (data.data.calls.length === expectedItems) {
          console.log('  ✅ Number of items is correct');
        } else {
          console.log(`  ❌ Number of items is incorrect (expected ${expectedItems}, got ${data.data.calls.length})`);
          metrics.errors.push({
            endpoint: '/api/db/calls',
            error: `Number of items is incorrect (expected ${expectedItems}, got ${data.data.calls.length})`
          });
        }
      } else {
        console.log(`  ❌ Request failed: ${data.error || 'Unknown error'}`);
        metrics.errors.push({
          endpoint: '/api/db/calls',
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error(`  ❌ Error testing pagination:`, error.message);
      metrics.errors.push({
        endpoint: '/api/db/calls',
        error: error.message
      });
    }
  }
  
  // Clean up test data
  console.log('\nCleaning up test data...');
  
  for (const callSid of calls) {
    await fetch(`${serverUrl}/api/db/calls/${callSid}`, {
      method: 'DELETE'
    });
  }
  
  console.log('✅ Test data cleaned up');
}

/**
 * Test JSON structure consistency
 */
async function testJsonStructureConsistency() {
  console.log('\n4. Testing JSON structure consistency...');
  
  const endpoints = [
    { url: '/api/db/calls', description: 'Get all calls' },
    { url: '/api/db/dashboard/overview', description: 'Dashboard overview' },
    { url: '/api/db/analytics/duration/day', description: 'Call duration stats' },
    { url: '/api/db/analytics/outcomes', description: 'Call outcome distribution' },
    { url: '/api/db/dashboard/realtime', description: 'Real-time dashboard data' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nAnalyzing JSON structure for: ${endpoint.description}`);
    
    try {
      // Send GET request
      const response = await fetch(`${serverUrl}${endpoint.url}`);
      const data = await response.json();
      
      if (response.ok) {
        // Analyze top-level structure
        const topLevelKeys = Object.keys(data);
        console.log(`  Top-level keys: ${topLevelKeys.join(', ')}`);
        
        // Check for success field
        if (topLevelKeys.includes('success')) {
          console.log('  ✅ Has success field');
        } else {
          console.log('  ❌ Missing success field');
          metrics.errors.push({
            endpoint: endpoint.url,
            error: 'Missing success field'
          });
        }
        
        // Check for data field
        if (topLevelKeys.includes('data')) {
          console.log('  ✅ Has data field');
          
          // Analyze data structure
          const dataKeys = Object.keys(data.data);
          console.log(`  Data keys: ${dataKeys.join(', ')}`);
          
          // Store JSON structure
          metrics.jsonStructure[endpoint.url] = {
            topLevel: topLevelKeys,
            data: dataKeys
          };
        } else {
          console.log('  ❌ Missing data field');
          metrics.errors.push({
            endpoint: endpoint.url,
            error: 'Missing data field'
          });
        }
        
        // Check for timestamp field
        if (topLevelKeys.includes('timestamp')) {
          console.log('  ✅ Has timestamp field');
        } else {
          console.log('  ⚠️ Missing timestamp field');
          metrics.warnings.push({
            endpoint: endpoint.url,
            warning: 'Missing timestamp field'
          });
        }
      } else {
        console.log(`  ❌ Request failed: ${data.error || 'Unknown error'}`);
        metrics.errors.push({
          endpoint: endpoint.url,
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error(`  ❌ Error analyzing JSON structure for ${endpoint.url}:`, error.message);
      metrics.errors.push({
        endpoint: endpoint.url,
        error: error.message
      });
    }
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n5. Testing error handling...');
  
  const errorTests = [
    { url: '/api/db/calls/nonexistent', method: 'GET', description: 'Get non-existent call' },
    { url: '/api/db/calls/invalid-sid', method: 'GET', description: 'Get call with invalid SID' },
    { url: '/api/db/calls', method: 'POST', body: {}, description: 'Create call without required fields' },
    { url: '/api/db/calls/nonexistent', method: 'DELETE', description: 'Delete non-existent call' }
  ];
  
  for (const test of errorTests) {
    console.log(`\nTesting: ${test.description}`);
    
    try {
      // Send request
      const options = {
        method: test.method
      };
      
      if (test.body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(`${serverUrl}${test.url}`, options);
      const data = await response.json();
      
      console.log(`  Status: ${response.status}`);
      
      // Check if error response is properly formatted
      if (response.status >= 400) {
        console.log(`  Error: ${data.error || 'No error message'}`);
        
        if (data.success === false) {
          console.log('  ✅ Has success=false field');
        } else {
          console.log('  ❌ Missing success=false field');
          metrics.errors.push({
            endpoint: test.url,
            error: 'Missing success=false field in error response'
          });
        }
        
        if (data.error) {
          console.log('  ✅ Has error message');
        } else {
          console.log('  ❌ Missing error message');
          metrics.errors.push({
            endpoint: test.url,
            error: 'Missing error message in error response'
          });
        }
      } else {
        console.log('  ⚠️ Expected error response but got success');
        metrics.warnings.push({
          endpoint: test.url,
          warning: 'Expected error response but got success'
        });
      }
    } catch (error) {
      console.error(`  ❌ Error testing error handling for ${test.url}:`, error.message);
      metrics.errors.push({
        endpoint: test.url,
        error: error.message
      });
    }
  }
}

/**
 * Test Socket.IO browser compatibility
 */
async function testSocketIoBrowserCompatibility() {
  console.log('\n6. Testing Socket.IO browser compatibility...');
  
  try {
    console.log('Connecting to Socket.IO server...');
    
    // Connect to Socket.IO server
    const socket = io(serverUrl, {
      transports: ['websocket'],
      path: '/socket.io/'
    });
    
    // Set up promise to wait for connection
    const connectionPromise = new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
      
      // Connection event
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      // Connection error event
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // Wait for connection
    await connectionPromise;
    
    console.log('✅ Connected to Socket.IO server');
    console.log(`  Socket ID: ${socket.id}`);
    console.log(`  Transport: ${socket.io.engine.transport.name}`);
    
    // Subscribe to call updates
    socket.emit('subscribe_to_calls');
    console.log('✅ Subscribed to call updates');
    
    // Wait for active calls event
    const activeCallsPromise = new Promise((resolve) => {
      socket.on('active_calls', (data) => {
        resolve(data);
      });
      
      // Set timeout
      setTimeout(() => {
        resolve(null);
      }, 3000);
    });
    
    // Wait for active calls event
    const activeCalls = await activeCallsPromise;
    
    if (activeCalls) {
      console.log(`✅ Received active_calls event with ${activeCalls.length} calls`);
    } else {
      console.log('⚠️ Did not receive active_calls event within timeout');
      metrics.warnings.push({
        endpoint: 'Socket.IO',
        warning: 'Did not receive active_calls event within timeout'
      });
    }
    
    // Disconnect
    socket.disconnect();
    console.log('✅ Disconnected from Socket.IO server');
  } catch (error) {
    console.error('❌ Error testing Socket.IO browser compatibility:', error.message);
    metrics.errors.push({
      endpoint: 'Socket.IO',
      error: error.message
    });
  }
}

/**
 * Generate compatibility report
 */
async function generateCompatibilityReport() {
  console.log('\n7. Generating compatibility report...');
  
  // Calculate overall compatibility score
  let compatibilityScore = 100;
  
  // Deduct points for errors
  if (metrics.errors.length > 0) {
    const deduction = Math.min(50, metrics.errors.length * 5);
    compatibilityScore -= deduction;
    console.log(`  Deducting ${deduction} points for errors`);
  }
  
  // Deduct points for warnings
  if (metrics.warnings.length > 0) {
    const deduction = Math.min(20, metrics.warnings.length * 2);
    compatibilityScore -= deduction;
    console.log(`  Deducting ${deduction} points for warnings`);
  }
  
  // Ensure compatibility score is between 0 and 100
  compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));
  
  console.log(`\nFrontend API Compatibility Score: ${compatibilityScore}/100`);
  
  // Determine compatibility status
  let compatibilityStatus;
  if (compatibilityScore >= 90) {
    compatibilityStatus = 'Excellent';
  } else if (compatibilityScore >= 75) {
    compatibilityStatus = 'Good';
  } else if (compatibilityScore >= 50) {
    compatibilityStatus = 'Fair';
  } else {
    compatibilityStatus = 'Poor';
  }
  
  console.log(`Frontend API Compatibility Status: ${compatibilityStatus}`);
  
  // Generate recommendations
  console.log('\nRecommendations:');
  
  if (metrics.errors.length > 0) {
    console.log('  - Fix API errors:');
    const uniqueErrors = [...new Set(metrics.errors.map(error => error.error))];
    uniqueErrors.slice(0, 5).forEach(error => {
      console.log(`    - ${error}`);
    });
    
    if (uniqueErrors.length > 5) {
      console.log(`    - ... and ${uniqueErrors.length - 5} more`);
    }
  }
  
  if (metrics.warnings.length > 0) {
    console.log('  - Address API warnings:');
    const uniqueWarnings = [...new Set(metrics.warnings.map(warning => warning.warning))];
    uniqueWarnings.slice(0, 5).forEach(warning => {
      console.log(`    - ${warning}`);
    });
    
    if (uniqueWarnings.length > 5) {
      console.log(`    - ... and ${uniqueWarnings.length - 5} more`);
    }
  }
  
  // Check for CORS issues
  const corsIssues = Object.entries(metrics.corsHeaders)
    .filter(([_, headers]) => !headers['access-control-allow-origin'])
    .map(([endpoint]) => endpoint);
  
  if (corsIssues.length > 0) {
    console.log('  - Configure CORS for the following endpoints:');
    corsIssues.forEach(endpoint => {
      console.log(`    - ${endpoint}`);
    });
  }
  
  // Check for slow endpoints
  const slowEndpoints = Object.entries(metrics.responseTime)
    .filter(([_, time]) => time > 1000)
    .map(([endpoint, time]) => ({ endpoint, time }));
  
  if (slowEndpoints.length > 0) {
    console.log('  - Optimize response time for the following endpoints:');
    slowEndpoints.forEach(({ endpoint, time }) => {
      console.log(`    - ${endpoint}: ${time.toFixed(2)}ms`);
    });
  }
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    serverUrl,
    corsHeaders: metrics.corsHeaders,
    responseTime: metrics.responseTime,
    responseSize: metrics.responseSize,
    jsonStructure: metrics.jsonStructure,
    errors: metrics.errors,
    warnings: metrics.warnings,
    compatibilityScore,
    compatibilityStatus,
    recommendations: {
      fixApiErrors: metrics.errors.length > 0,
      addressApiWarnings: metrics.warnings.length > 0,
      configureCors: corsIssues.length > 0,
      optimizeResponseTime: slowEndpoints.length > 0
    }
  };
  
  await fs.writeFile('frontend-compatibility-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Frontend compatibility report saved to frontend-compatibility-report.json');
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted bytes
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Frontend API Compatibility Test');
  console.log('======================================');
  console.log(`Server URL: ${serverUrl}`);
  
  try {
    // Test CORS configuration
    await testCorsConfiguration();
    
    // Test API response times
    await testApiResponseTimes();
    
    // Test pagination
    await testPagination();
    
    // Test JSON structure consistency
    await testJsonStructureConsistency();
    
    // Test error handling
    await testErrorHandling();
    
    // Test Socket.IO browser compatibility
    await testSocketIoBrowserCompatibility();
    
    // Generate compatibility report
    await generateCompatibilityReport();
    
    console.log('\nFrontend API Compatibility Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  }
}

// Run the main function
main();