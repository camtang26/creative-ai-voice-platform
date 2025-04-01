/**
 * MongoDB Structure Test Script
 * Validates the structure of the MongoDB integration
 */
import fs from 'fs';
import path from 'path';

// Base directory for MongoDB integration
const baseDir = './db';

// Expected structure
const expectedStructure = {
  directories: [
    'models',
    'repositories',
    'api'
  ],
  files: [
    'index.js',
    'mongodb-connection.js',
    'webhook-handler-db.js',
    'MONGODB_INTEGRATION_GUIDE.md'
  ],
  models: [
    'call.model.js',
    'recording.model.js',
    'transcript.model.js',
    'callEvent.model.js'
  ],
  repositories: [
    'call.repository.js',
    'recording.repository.js',
    'transcript.repository.js',
    'callEvent.repository.js',
    'analytics.repository.js'
  ],
  apis: [
    'call-api.js',
    'recording-api.js',
    'transcript-api.js',
    'callEvent-api.js',
    'analytics-api.js',
    'dashboard-api.js'
  ]
};

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} Whether the file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param {string} dirPath - Path to the directory
 * @returns {boolean} Whether the directory exists
 */
function directoryExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Run the structure test
 */
function runStructureTest() {
  console.log('MongoDB Structure Test');
  console.log('=====================');
  
  let allPassed = true;
  
  // Check base directory
  console.log('\nChecking base directory...');
  if (directoryExists(baseDir)) {
    console.log(`✅ Base directory exists: ${baseDir}`);
  } else {
    console.log(`❌ Base directory does not exist: ${baseDir}`);
    allPassed = false;
    return;
  }
  
  // Check directories
  console.log('\nChecking directories...');
  for (const dir of expectedStructure.directories) {
    const dirPath = path.join(baseDir, dir);
    if (directoryExists(dirPath)) {
      console.log(`✅ Directory exists: ${dirPath}`);
    } else {
      console.log(`❌ Directory does not exist: ${dirPath}`);
      allPassed = false;
    }
  }
  
  // Check files
  console.log('\nChecking files...');
  for (const file of expectedStructure.files) {
    const filePath = path.join(baseDir, file);
    if (fileExists(filePath)) {
      console.log(`✅ File exists: ${filePath}`);
    } else {
      console.log(`❌ File does not exist: ${filePath}`);
      allPassed = false;
    }
  }
  
  // Check models
  console.log('\nChecking models...');
  for (const model of expectedStructure.models) {
    const modelPath = path.join(baseDir, 'models', model);
    if (fileExists(modelPath)) {
      console.log(`✅ Model exists: ${modelPath}`);
    } else {
      console.log(`❌ Model does not exist: ${modelPath}`);
      allPassed = false;
    }
  }
  
  // Check repositories
  console.log('\nChecking repositories...');
  for (const repo of expectedStructure.repositories) {
    const repoPath = path.join(baseDir, 'repositories', repo);
    if (fileExists(repoPath)) {
      console.log(`✅ Repository exists: ${repoPath}`);
    } else {
      console.log(`❌ Repository does not exist: ${repoPath}`);
      allPassed = false;
    }
  }
  
  // Check APIs
  console.log('\nChecking APIs...');
  for (const api of expectedStructure.apis) {
    const apiPath = path.join(baseDir, 'api', api);
    if (fileExists(apiPath)) {
      console.log(`✅ API exists: ${apiPath}`);
    } else {
      console.log(`❌ API does not exist: ${apiPath}`);
      allPassed = false;
    }
  }
  
  // Final result
  console.log('\nStructure test result:');
  if (allPassed) {
    console.log('✅ All structure tests passed!');
  } else {
    console.log('❌ Some structure tests failed. See above for details.');
  }
}

// Run the structure test
runStructureTest();