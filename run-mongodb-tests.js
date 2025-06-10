/**
 * MongoDB Integration Tests Runner
 * Runs all MongoDB integration tests and generates a comprehensive debug report
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Test scripts
const testScripts = [
  { name: 'End-to-End System Test', script: 'test-mongodb-e2e.js' },
  { name: 'Socket.IO Stress Test', script: 'test-mongodb-socketio-stress.js' },
  { name: 'Dashboard Overview Analysis', script: 'test-mongodb-dashboard-analysis.js' },
  { name: 'Deletion Cascade Test', script: 'test-mongodb-deletion-cascade.js' },
  { name: 'Schema Validation Test', script: 'test-mongodb-schema-validation.js' },
  { name: 'Frontend API Compatibility Test', script: 'test-mongodb-frontend-compatibility.js' }
];

// Results
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: testScripts.length,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  issues: {
    errors: [],
    warnings: []
  },
  recommendations: []
};

/**
 * Run a test script
 * @param {string} script - Script name
 * @param {string} name - Test name
 * @returns {Object} Test result
 */
async function runTest(script, name) {
  console.log(`\n========== Running ${name} ==========`);
  console.log(`Executing: node ${script}`);
  
  const startTime = Date.now();
  let status = 'passed';
  let output = '';
  let error = null;
  
  try {
    // Run the test script
    output = execSync(`node ${script}`, { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    status = 'failed';
    error = err.message;
    output = err.stdout || '';
    console.error(`Error running ${name}:`, err.message);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Parse output for errors and warnings
  const errors = [];
  const warnings = [];
  
  output.split('\n').forEach(line => {
    if (line.includes('❌') || line.includes('Error:')) {
      errors.push(line.trim());
    } else if (line.includes('⚠️')) {
      warnings.push(line.trim());
    }
  });
  
  // Check if any report files were generated
  let reportFile = null;
  
  if (script === 'test-mongodb-dashboard-analysis.js') {
    try {
      await fs.access('dashboard-analysis-report.json');
      reportFile = 'dashboard-analysis-report.json';
    } catch (err) {
      // Report file doesn't exist
    }
  } else if (script === 'test-mongodb-schema-validation.js') {
    try {
      await fs.access('schema-health-report.json');
      reportFile = 'schema-health-report.json';
    } catch (err) {
      // Report file doesn't exist
    }
  } else if (script === 'test-mongodb-frontend-compatibility.js') {
    try {
      await fs.access('frontend-compatibility-report.json');
      reportFile = 'frontend-compatibility-report.json';
    } catch (err) {
      // Report file doesn't exist
    }
  }
  
  // Return test result
  return {
    name,
    script,
    status,
    duration,
    error,
    errors,
    warnings,
    reportFile
  };
}

/**
 * Generate recommendations based on test results
 * @param {Array} testResults - Test results
 * @returns {Array} Recommendations
 */
function generateRecommendations(testResults) {
  const recommendations = [];
  
  // Check for Socket.IO issues
  const socketIoTest = testResults.find(result => result.name === 'Socket.IO Stress Test');
  if (socketIoTest && socketIoTest.errors.length > 0) {
    recommendations.push({
      priority: 'high',
      area: 'Socket.IO',
      recommendation: 'Fix Socket.IO connection issues to ensure real-time updates work properly',
      details: 'The Socket.IO stress test revealed connection problems that could affect real-time dashboard updates'
    });
  }
  
  // Check for dashboard overview issues
  const dashboardTest = testResults.find(result => result.name === 'Dashboard Overview Analysis');
  if (dashboardTest && dashboardTest.errors.length > 0) {
    recommendations.push({
      priority: 'high',
      area: 'Dashboard API',
      recommendation: 'Fix dashboard overview endpoint to ensure it returns the correct data structure',
      details: 'The dashboard overview endpoint is returning errors or incorrect data structure'
    });
  }
  
  // Check for deletion cascade issues
  const deletionTest = testResults.find(result => result.name === 'Deletion Cascade Test');
  if (deletionTest && deletionTest.errors.some(error => error.includes('orphaned'))) {
    recommendations.push({
      priority: 'high',
      area: 'Data Integrity',
      recommendation: 'Fix deletion cascade to ensure all associated data is properly deleted',
      details: 'The deletion cascade test found orphaned data after call deletion'
    });
  }
  
  // Check for schema validation issues
  const schemaTest = testResults.find(result => result.name === 'Schema Validation Test');
  if (schemaTest && schemaTest.errors.length > 0) {
    recommendations.push({
      priority: 'medium',
      area: 'Database Schema',
      recommendation: 'Fix schema validation issues to ensure data integrity',
      details: 'The schema validation test found documents with missing required fields or incorrect types'
    });
  }
  
  // Check for frontend API compatibility issues
  const frontendTest = testResults.find(result => result.name === 'Frontend API Compatibility Test');
  if (frontendTest && frontendTest.errors.some(error => error.includes('CORS'))) {
    recommendations.push({
      priority: 'high',
      area: 'CORS',
      recommendation: 'Configure CORS to allow frontend access to the API',
      details: 'The frontend API compatibility test found CORS issues that will prevent the frontend from accessing the API'
    });
  }
  
  // Check for slow API responses
  if (testResults.some(result => result.warnings.some(warning => warning.includes('slow')))) {
    recommendations.push({
      priority: 'medium',
      area: 'Performance',
      recommendation: 'Optimize slow API endpoints to improve dashboard responsiveness',
      details: 'Several API endpoints have slow response times that could affect dashboard performance'
    });
  }
  
  return recommendations;
}

/**
 * Generate debug report
 * @param {Array} testResults - Test results
 */
async function generateDebugReport(testResults) {
  console.log('\n========== Generating Debug Report ==========');
  
  // Update summary
  results.summary.passed = testResults.filter(result => result.status === 'passed').length;
  results.summary.failed = testResults.filter(result => result.status === 'failed').length;
  results.summary.skipped = testResults.filter(result => result.status === 'skipped').length;
  
  // Add test results
  results.tests = testResults;
  
  // Collect all errors and warnings
  testResults.forEach(result => {
    result.errors.forEach(error => {
      results.issues.errors.push({
        test: result.name,
        error
      });
    });
    
    result.warnings.forEach(warning => {
      results.issues.warnings.push({
        test: result.name,
        warning
      });
    });
  });
  
  // Generate recommendations
  results.recommendations = generateRecommendations(testResults);
  
  // Include report files
  const reportFiles = {};
  
  for (const result of testResults) {
    if (result.reportFile) {
      try {
        const reportContent = await fs.readFile(result.reportFile, 'utf8');
        reportFiles[result.reportFile] = JSON.parse(reportContent);
      } catch (err) {
        console.error(`Error reading report file ${result.reportFile}:`, err.message);
      }
    }
  }
  
  results.reportFiles = reportFiles;
  
  // Save debug report
  await fs.writeFile('mongodb-debug-report.json', JSON.stringify(results, null, 2));
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(results);
  await fs.writeFile('mongodb-debug-report.html', htmlReport);
  
  console.log('\nDebug report generated:');
  console.log('- mongodb-debug-report.json');
  console.log('- mongodb-debug-report.html');
}

/**
 * Generate HTML report
 * @param {Object} results - Test results
 * @returns {string} HTML report
 */
function generateHtmlReport(results) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MongoDB Integration Debug Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .count {
      font-size: 24px;
      font-weight: bold;
    }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .skipped { color: #6c757d; }
    .test-result {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    .test-header {
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f8f9fa;
      border-bottom: 1px solid #ddd;
    }
    .test-header h3 {
      margin: 0;
    }
    .test-body {
      padding: 15px;
    }
    .test-passed .test-header {
      background-color: #d4edda;
    }
    .test-failed .test-header {
      background-color: #f8d7da;
    }
    .test-skipped .test-header {
      background-color: #e2e3e5;
    }
    .issues {
      margin-top: 20px;
    }
    .issue-list {
      list-style-type: none;
      padding-left: 0;
    }
    .issue-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .error-item {
      color: #dc3545;
    }
    .warning-item {
      color: #ffc107;
    }
    .recommendations {
      margin-top: 20px;
    }
    .recommendation {
      margin-bottom: 15px;
      padding: 15px;
      border-radius: 5px;
      background-color: #f8f9fa;
    }
    .priority-high {
      border-left: 5px solid #dc3545;
    }
    .priority-medium {
      border-left: 5px solid #ffc107;
    }
    .priority-low {
      border-left: 5px solid #28a745;
    }
    .timestamp {
      color: #6c757d;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>MongoDB Integration Debug Report</h1>
  <p class="timestamp">Generated on: ${new Date(results.timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <div class="summary-item">
      <div class="count">${results.summary.total}</div>
      <div>Total Tests</div>
    </div>
    <div class="summary-item">
      <div class="count passed">${results.summary.passed}</div>
      <div>Passed</div>
    </div>
    <div class="summary-item">
      <div class="count failed">${results.summary.failed}</div>
      <div>Failed</div>
    </div>
    <div class="summary-item">
      <div class="count skipped">${results.summary.skipped}</div>
      <div>Skipped</div>
    </div>
  </div>
  
  <h2>Test Results</h2>
  ${results.tests.map(test => `
    <div class="test-result test-${test.status}">
      <div class="test-header">
        <h3>${test.name}</h3>
        <div>
          <span class="${test.status}">${test.status.toUpperCase()}</span>
          <span>(${(test.duration / 1000).toFixed(2)}s)</span>
        </div>
      </div>
      <div class="test-body">
        <p><strong>Script:</strong> ${test.script}</p>
        ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
        
        ${test.errors.length > 0 ? `
          <div class="issues">
            <h4>Errors (${test.errors.length})</h4>
            <ul class="issue-list">
              ${test.errors.map(error => `<li class="error-item">${error}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${test.warnings.length > 0 ? `
          <div class="issues">
            <h4>Warnings (${test.warnings.length})</h4>
            <ul class="issue-list">
              ${test.warnings.map(warning => `<li class="warning-item">${warning}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${test.reportFile ? `<p><strong>Report File:</strong> ${test.reportFile}</p>` : ''}
      </div>
    </div>
  `).join('')}
  
  <h2>Issues Summary</h2>
  <div class="issues">
    <h3>Errors (${results.issues.errors.length})</h3>
    ${results.issues.errors.length > 0 ? `
      <ul class="issue-list">
        ${results.issues.errors.map(issue => `
          <li class="error-item">
            <strong>${issue.test}:</strong> ${issue.error}
          </li>
        `).join('')}
      </ul>
    ` : '<p>No errors detected.</p>'}
    
    <h3>Warnings (${results.issues.warnings.length})</h3>
    ${results.issues.warnings.length > 0 ? `
      <ul class="issue-list">
        ${results.issues.warnings.map(issue => `
          <li class="warning-item">
            <strong>${issue.test}:</strong> ${issue.warning}
          </li>
        `).join('')}
      </ul>
    ` : '<p>No warnings detected.</p>'}
  </div>
  
  <h2>Recommendations</h2>
  <div class="recommendations">
    ${results.recommendations.length > 0 ? results.recommendations.map(rec => `
      <div class="recommendation priority-${rec.priority}">
        <h3>${rec.area}: ${rec.recommendation}</h3>
        <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
        <p>${rec.details}</p>
      </div>
    `).join('') : '<p>No recommendations available.</p>'}
  </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Main function
 */
async function main() {
  console.log('MongoDB Integration Tests Runner');
  console.log('===============================');
  
  // Check if test scripts exist
  for (const { script } of testScripts) {
    try {
      await fs.access(script);
    } catch (err) {
      console.error(`Error: Test script ${script} not found`);
      process.exit(1);
    }
  }
  
  // Create reports directory
  try {
    await fs.mkdir('reports', { recursive: true });
  } catch (err) {
    // Ignore error if directory already exists
  }
  
  // Run tests
  const testResults = [];
  
  for (const { script, name } of testScripts) {
    const result = await runTest(script, name);
    testResults.push(result);
  }
  
  // Generate debug report
  await generateDebugReport(testResults);
  
  console.log('\nAll tests completed!');
}

// Run the main function
main().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});