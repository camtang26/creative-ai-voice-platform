/**
 * MongoDB Dashboard Overview Endpoint Analysis
 * Performs a detailed analysis of the dashboard overview endpoint
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';

// Server URL
const serverUrl = process.env.SERVER_URL || 'http://localhost:8000';

// Test data
const testCallSid = `TEST_DASHBOARD_${Date.now()}`;

// Performance metrics
const metrics = {
  queryTimes: [],
  responseStructure: {},
  errors: [],
  warnings: []
};

/**
 * Log query time
 * @param {string} query - Query description
 * @param {number} time - Query time in ms
 * @param {Object} params - Query parameters
 */
function logQueryTime(query, time, params = {}) {
  metrics.queryTimes.push({
    query,
    time: time,
    params
  });
  
  console.log(`Query: ${query}`);
  console.log(`  Time: ${time.toFixed(2)}ms`);
  if (Object.keys(params).length > 0) {
    console.log(`  Params: ${JSON.stringify(params)}`);
  }
}

/**
 * Create test data
 */
async function createTestData() {
  console.log('\n1. Creating test data...');
  
  try {
    // Create 10 test calls with different statuses and durations
    const statuses = ['completed', 'failed', 'busy', 'no-answer', 'in-progress'];
    const calls = [];
    
    for (let i = 0; i < 10; i++) {
      const callSid = `${testCallSid}_${i}`;
      const status = statuses[i % statuses.length];
      const duration = status === 'completed' ? Math.floor(Math.random() * 300) + 30 : 0;
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
      
      // Create call
      const response = await fetch(`${serverUrl}/api/db/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callSid,
          status,
          duration,
          from: '+1234567890',
          to: '+0987654321',
          direction: 'outbound-api',
          createdAt
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ Created test call ${i + 1}: ${callSid}`);
        calls.push(callSid);
        
        // Add events for the call
        await fetch(`${serverUrl}/api/db/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callSid,
            eventType: 'status_change',
            data: {
              status,
              timestamp: new Date().toISOString()
            },
            source: 'test'
          })
        });
      } else {
        console.error(`❌ Failed to create test call ${i + 1}`);
      }
    }
    
    console.log(`✅ Created ${calls.length} test calls`);
    return calls;
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    return [];
  }
}

/**
 * Test dashboard overview with various parameters
 */
async function testDashboardOverview() {
  console.log('\n2. Testing dashboard overview endpoint with various parameters...');
  
  // Test cases with different parameters
  const testCases = [
    { description: 'Default parameters', params: {} },
    { description: 'Last 1 day', params: { days: 1 } },
    { description: 'Last 7 days', params: { days: 7 } },
    { description: 'Last 30 days', params: { days: 30 } },
    { description: 'With period=day', params: { period: 'day' } },
    { description: 'With period=week', params: { period: 'week' } },
    { description: 'With period=month', params: { period: 'month' } }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.description}`);
    
    // Build query string
    const queryString = Object.entries(testCase.params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    const url = `${serverUrl}/api/db/dashboard/overview${queryString ? `?${queryString}` : ''}`;
    
    try {
      const startTime = performance.now();
      
      // Make request
      const response = await fetch(url);
      const data = await response.json();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Log query time
      logQueryTime('Dashboard Overview', responseTime, testCase.params);
      
      if (response.ok && data.success) {
        console.log('✅ Request successful');
        console.log(`   Status: ${response.status}`);
        
        // Analyze response structure
        if (testCase.description === 'Default parameters') {
          metrics.responseStructure = analyzeResponseStructure(data);
        }
        
        // Check for missing data
        checkForMissingData(data, testCase.description);
      } else {
        console.error('❌ Request failed');
        console.error(`   Status: ${response.status}`);
        console.error(`   Error: ${data.error || 'Unknown error'}`);
        console.error(`   Details: ${data.details || 'No details provided'}`);
        
        metrics.errors.push({
          endpoint: url,
          status: response.status,
          error: data.error || 'Unknown error',
          details: data.details || 'No details provided'
        });
      }
    } catch (error) {
      console.error('❌ Error making request:', error.message);
      
      metrics.errors.push({
        endpoint: url,
        error: error.message
      });
    }
  }
}

/**
 * Analyze response structure
 * @param {Object} data - Response data
 * @returns {Object} Structure analysis
 */
function analyzeResponseStructure(data) {
  console.log('\nAnalyzing response structure...');
  
  const structure = {
    topLevel: Object.keys(data),
    dataFields: data.data ? Object.keys(data.data) : [],
    summaryFields: data.data && data.data.summary ? Object.keys(data.data.summary) : [],
    recentCallsCount: data.data && data.data.recentCalls ? data.data.recentCalls.length : 0,
    sentimentFields: data.data && data.data.sentiment ? Object.keys(data.data.sentiment) : []
  };
  
  console.log('Response Structure:');
  console.log(`  Top Level Fields: ${structure.topLevel.join(', ')}`);
  console.log(`  Data Fields: ${structure.dataFields.join(', ')}`);
  console.log(`  Summary Fields: ${structure.summaryFields.join(', ')}`);
  console.log(`  Recent Calls Count: ${structure.recentCallsCount}`);
  console.log(`  Sentiment Fields: ${structure.sentimentFields.join(', ')}`);
  
  return structure;
}

/**
 * Check for missing data
 * @param {Object} data - Response data
 * @param {string} description - Test case description
 */
function checkForMissingData(data, description) {
  // Check for missing fields
  if (!data.data) {
    metrics.warnings.push({
      testCase: description,
      warning: 'Missing data field in response'
    });
    return;
  }
  
  if (!data.data.summary) {
    metrics.warnings.push({
      testCase: description,
      warning: 'Missing summary field in response'
    });
  }
  
  if (!data.data.recentCalls) {
    metrics.warnings.push({
      testCase: description,
      warning: 'Missing recentCalls field in response'
    });
  }
  
  if (!data.data.sentiment) {
    metrics.warnings.push({
      testCase: description,
      warning: 'Missing sentiment field in response'
    });
  }
}

/**
 * Test dashboard overview with empty database
 */
async function testEmptyDatabase() {
  console.log('\n3. Testing dashboard overview with empty database...');
  
  try {
    // Delete all test calls
    console.log('Deleting all test calls...');
    
    // Get all calls
    const response = await fetch(`${serverUrl}/api/db/calls`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      const calls = data.data.calls;
      const testCalls = calls.filter(call => call.callSid.startsWith(testCallSid));
      
      console.log(`Found ${testCalls.length} test calls to delete`);
      
      // Delete each test call
      for (const call of testCalls) {
        await fetch(`${serverUrl}/api/db/calls/${call.callSid}`, {
          method: 'DELETE'
        });
        console.log(`Deleted call: ${call.callSid}`);
      }
      
      console.log('✅ All test calls deleted');
    } else {
      console.error('❌ Failed to get calls for deletion');
    }
    
    // Test dashboard overview with empty database
    console.log('\nTesting dashboard overview with empty database...');
    
    const startTime = performance.now();
    
    // Make request
    const emptyResponse = await fetch(`${serverUrl}/api/db/dashboard/overview`);
    const emptyData = await emptyResponse.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log query time
    logQueryTime('Dashboard Overview (Empty Database)', responseTime);
    
    if (emptyResponse.ok && emptyData.success) {
      console.log('✅ Request successful with empty database');
      console.log(`   Status: ${emptyResponse.status}`);
      
      // Check for empty data structures
      if (emptyData.data && emptyData.data.recentCalls && emptyData.data.recentCalls.length > 0) {
        metrics.warnings.push({
          testCase: 'Empty Database',
          warning: 'Recent calls not empty in empty database'
        });
      }
      
      if (emptyData.data && emptyData.data.summary && emptyData.data.summary.totalCalls > 0) {
        metrics.warnings.push({
          testCase: 'Empty Database',
          warning: 'Total calls not zero in empty database'
        });
      }
    } else {
      console.error('❌ Request failed with empty database');
      console.error(`   Status: ${emptyResponse.status}`);
      console.error(`   Error: ${emptyData.error || 'Unknown error'}`);
      
      metrics.errors.push({
        endpoint: `${serverUrl}/api/db/dashboard/overview (Empty Database)`,
        status: emptyResponse.status,
        error: emptyData.error || 'Unknown error',
        details: emptyData.details || 'No details provided'
      });
    }
  } catch (error) {
    console.error('❌ Error testing empty database:', error.message);
    
    metrics.errors.push({
      endpoint: 'Empty Database Test',
      error: error.message
    });
  }
}

/**
 * Test dashboard overview with large dataset
 */
async function testLargeDataset() {
  console.log('\n4. Testing dashboard overview with large dataset simulation...');
  
  try {
    // Create 50 test calls
    const calls = [];
    
    for (let i = 0; i < 50; i++) {
      const callSid = `${testCallSid}_LARGE_${i}`;
      const status = Math.random() > 0.7 ? 'completed' : 
                    Math.random() > 0.5 ? 'failed' : 
                    Math.random() > 0.3 ? 'busy' : 
                    Math.random() > 0.1 ? 'no-answer' : 'in-progress';
      const duration = status === 'completed' ? Math.floor(Math.random() * 300) + 30 : 0;
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
      
      // Create call
      const response = await fetch(`${serverUrl}/api/db/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callSid,
          status,
          duration,
          from: '+1234567890',
          to: '+0987654321',
          direction: 'outbound-api',
          createdAt
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        calls.push(callSid);
        
        // Add events for the call (not for all calls to save time)
        if (i % 5 === 0) {
          await fetch(`${serverUrl}/api/db/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              callSid,
              eventType: 'status_change',
              data: {
                status,
                timestamp: new Date().toISOString()
              },
              source: 'test'
            })
          });
        }
      }
    }
    
    console.log(`✅ Created ${calls.length} test calls for large dataset simulation`);
    
    // Test dashboard overview with large dataset
    console.log('\nTesting dashboard overview with large dataset...');
    
    const startTime = performance.now();
    
    // Make request
    const largeResponse = await fetch(`${serverUrl}/api/db/dashboard/overview`);
    const largeData = await largeResponse.json();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Log query time
    logQueryTime('Dashboard Overview (Large Dataset)', responseTime);
    
    if (largeResponse.ok && largeData.success) {
      console.log('✅ Request successful with large dataset');
      console.log(`   Status: ${largeResponse.status}`);
      console.log(`   Response time: ${responseTime.toFixed(2)}ms`);
      
      // Check for performance issues
      if (responseTime > 1000) {
        metrics.warnings.push({
          testCase: 'Large Dataset',
          warning: `Slow response time: ${responseTime.toFixed(2)}ms`
        });
      }
    } else {
      console.error('❌ Request failed with large dataset');
      console.error(`   Status: ${largeResponse.status}`);
      console.error(`   Error: ${largeData.error || 'Unknown error'}`);
      
      metrics.errors.push({
        endpoint: `${serverUrl}/api/db/dashboard/overview (Large Dataset)`,
        status: largeResponse.status,
        error: largeData.error || 'Unknown error',
        details: largeData.details || 'No details provided'
      });
    }
    
    // Clean up large dataset
    console.log('\nCleaning up large dataset...');
    
    for (const callSid of calls) {
      await fetch(`${serverUrl}/api/db/calls/${callSid}`, {
        method: 'DELETE'
      });
    }
    
    console.log('✅ Large dataset cleaned up');
  } catch (error) {
    console.error('❌ Error testing large dataset:', error.message);
    
    metrics.errors.push({
      endpoint: 'Large Dataset Test',
      error: error.message
    });
  }
}

/**
 * Generate performance report
 */
async function generatePerformanceReport() {
  console.log('\n5. Generating performance report...');
  
  // Calculate average query time
  const avgQueryTime = metrics.queryTimes.reduce((sum, item) => sum + item.time, 0) / metrics.queryTimes.length;
  
  console.log('\nQuery Times:');
  console.log(`  Average: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...metrics.queryTimes.map(item => item.time)).toFixed(2)}ms`);
  console.log(`  Max: ${Math.max(...metrics.queryTimes.map(item => item.time)).toFixed(2)}ms`);
  
  console.log('\nQuery Times by Test Case:');
  metrics.queryTimes.forEach(query => {
    console.log(`  ${query.query}: ${query.time.toFixed(2)}ms`);
    if (Object.keys(query.params).length > 0) {
      console.log(`    Params: ${JSON.stringify(query.params)}`);
    }
  });
  
  console.log('\nResponse Structure:');
  console.log(`  Top Level Fields: ${metrics.responseStructure.topLevel.join(', ')}`);
  console.log(`  Data Fields: ${metrics.responseStructure.dataFields.join(', ')}`);
  console.log(`  Summary Fields: ${metrics.responseStructure.summaryFields.join(', ')}`);
  console.log(`  Recent Calls Count: ${metrics.responseStructure.recentCallsCount}`);
  console.log(`  Sentiment Fields: ${metrics.responseStructure.sentimentFields.join(', ')}`);
  
  console.log('\nErrors:');
  if (metrics.errors.length === 0) {
    console.log('  No errors detected');
  } else {
    metrics.errors.forEach(error => {
      console.log(`  ${error.endpoint}: ${error.status || ''} ${error.error}`);
      if (error.details) {
        console.log(`    Details: ${error.details}`);
      }
    });
  }
  
  console.log('\nWarnings:');
  if (metrics.warnings.length === 0) {
    console.log('  No warnings detected');
  } else {
    metrics.warnings.forEach(warning => {
      console.log(`  ${warning.testCase}: ${warning.warning}`);
    });
  }
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    serverUrl,
    queryTimes: metrics.queryTimes,
    responseStructure: metrics.responseStructure,
    errors: metrics.errors,
    warnings: metrics.warnings,
    summary: {
      avgQueryTime: avgQueryTime,
      minQueryTime: Math.min(...metrics.queryTimes.map(item => item.time)),
      maxQueryTime: Math.max(...metrics.queryTimes.map(item => item.time)),
      errorCount: metrics.errors.length,
      warningCount: metrics.warnings.length
    }
  };
  
  await fs.writeFile('dashboard-analysis-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Performance report saved to dashboard-analysis-report.json');
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Dashboard Overview Endpoint Analysis');
  console.log('===========================================');
  console.log(`Server URL: ${serverUrl}`);
  console.log(`Test Call SID Prefix: ${testCallSid}`);
  
  try {
    // Create test data
    const calls = await createTestData();
    
    // Test dashboard overview with various parameters
    await testDashboardOverview();
    
    // Test dashboard overview with empty database
    await testEmptyDatabase();
    
    // Test dashboard overview with large dataset
    await testLargeDataset();
    
    // Generate performance report
    await generatePerformanceReport();
    
    console.log('\nDashboard Overview Endpoint Analysis completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  }
}

// Run the main function
main();