/**
 * MongoDB Schema Validation Test
 * Verifies the integrity of the database schema
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs/promises';

// MongoDB URI
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs-outbound-calling';

// Performance metrics
const metrics = {
  collectionStats: {},
  indexStats: {},
  validationErrors: [],
  duplicateData: {},
  errors: []
};

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  console.log('\nConnecting to MongoDB...');
  
  try {
    await mongoose.connect(mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    metrics.errors.push({
      operation: 'connectToMongoDB',
      error: error.message
    });
    return false;
  }
}

/**
 * Get collection statistics
 */
async function getCollectionStats() {
  console.log('\n1. Getting collection statistics...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\nAnalyzing collection: ${collectionName}`);
      
      // Get collection stats
      const stats = await db.command({ collStats: collectionName });
      
      // Get document count
      const count = await db.collection(collectionName).countDocuments();
      
      // Get average document size
      const avgObjSize = stats.avgObjSize || 0;
      
      // Get storage size
      const storageSize = stats.storageSize || 0;
      
      // Get index size
      const totalIndexSize = stats.totalIndexSize || 0;
      
      // Store collection stats
      metrics.collectionStats[collectionName] = {
        count,
        avgObjSize,
        storageSize,
        totalIndexSize
      };
      
      console.log(`  Document count: ${count}`);
      console.log(`  Average document size: ${formatBytes(avgObjSize)}`);
      console.log(`  Storage size: ${formatBytes(storageSize)}`);
      console.log(`  Total index size: ${formatBytes(totalIndexSize)}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error getting collection statistics:', error.message);
    metrics.errors.push({
      operation: 'getCollectionStats',
      error: error.message
    });
    return false;
  }
}

/**
 * Check indexes
 */
async function checkIndexes() {
  console.log('\n2. Checking indexes...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\nChecking indexes for collection: ${collectionName}`);
      
      // Get indexes
      const indexes = await db.collection(collectionName).indexes();
      
      console.log(`  Found ${indexes.length} indexes`);
      
      // Store index stats
      metrics.indexStats[collectionName] = {
        count: indexes.length,
        indexes: []
      };
      
      // Analyze each index
      for (const index of indexes) {
        const indexName = index.name;
        const keys = Object.keys(index.key);
        const unique = index.unique || false;
        
        console.log(`  Index: ${indexName}`);
        console.log(`    Keys: ${keys.join(', ')}`);
        console.log(`    Unique: ${unique}`);
        
        // Store index details
        metrics.indexStats[collectionName].indexes.push({
          name: indexName,
          keys,
          unique
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
    metrics.errors.push({
      operation: 'checkIndexes',
      error: error.message
    });
    return false;
  }
}

/**
 * Validate documents
 */
async function validateDocuments() {
  console.log('\n3. Validating documents...');
  
  try {
    // Define expected schemas
    const schemas = {
      calls: {
        required: ['callSid', 'status'],
        types: {
          callSid: 'string',
          status: 'string',
          from: 'string',
          to: 'string',
          direction: 'string',
          duration: 'number',
          createdAt: 'date'
        }
      },
      recordings: {
        required: ['recordingSid', 'callSid', 'status'],
        types: {
          recordingSid: 'string',
          callSid: 'string',
          status: 'string',
          duration: 'number',
          url: 'string',
          createdAt: 'date'
        }
      },
      transcripts: {
        required: ['callSid', 'messages'],
        types: {
          callSid: 'string',
          conversationId: 'string',
          summary: 'string',
          messages: 'array',
          createdAt: 'date'
        }
      },
      callevents: {
        required: ['callSid', 'eventType', 'data'],
        types: {
          callSid: 'string',
          eventType: 'string',
          data: 'object',
          source: 'string',
          createdAt: 'date'
        }
      }
    };
    
    const db = mongoose.connection.db;
    
    // Validate each collection
    for (const [collectionName, schema] of Object.entries(schemas)) {
      console.log(`\nValidating collection: ${collectionName}`);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`  Collection ${collectionName} does not exist, skipping validation`);
        continue;
      }
      
      // Get documents
      const documents = await db.collection(collectionName).find({}).limit(100).toArray();
      
      console.log(`  Validating ${documents.length} documents`);
      
      let validCount = 0;
      let invalidCount = 0;
      
      // Validate each document
      for (const document of documents) {
        const validationErrors = [];
        
        // Check required fields
        for (const field of schema.required) {
          if (document[field] === undefined) {
            validationErrors.push(`Missing required field: ${field}`);
          }
        }
        
        // Check field types
        for (const [field, expectedType] of Object.entries(schema.types)) {
          if (document[field] !== undefined) {
            let actualType;
            
            if (document[field] === null) {
              actualType = 'null';
            } else if (Array.isArray(document[field])) {
              actualType = 'array';
            } else if (document[field] instanceof Date) {
              actualType = 'date';
            } else {
              actualType = typeof document[field];
            }
            
            if (actualType !== expectedType) {
              validationErrors.push(`Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`);
            }
          }
        }
        
        if (validationErrors.length > 0) {
          invalidCount++;
          
          // Store validation errors
          metrics.validationErrors.push({
            collectionName,
            documentId: document._id.toString(),
            errors: validationErrors
          });
          
          // Log first 5 invalid documents
          if (invalidCount <= 5) {
            console.log(`  ❌ Invalid document: ${document._id}`);
            validationErrors.forEach(error => console.log(`    - ${error}`));
          }
        } else {
          validCount++;
        }
      }
      
      console.log(`  ✅ Valid documents: ${validCount}`);
      console.log(`  ❌ Invalid documents: ${invalidCount}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating documents:', error.message);
    metrics.errors.push({
      operation: 'validateDocuments',
      error: error.message
    });
    return false;
  }
}

/**
 * Check for duplicate data
 */
async function checkForDuplicateData() {
  console.log('\n4. Checking for duplicate data...');
  
  try {
    const db = mongoose.connection.db;
    
    // Check for duplicate calls
    console.log('\nChecking for duplicate calls...');
    const duplicateCalls = await db.collection('calls').aggregate([
      { $group: { _id: '$callSid', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    if (duplicateCalls.length > 0) {
      console.log(`  ❌ Found ${duplicateCalls.length} duplicate calls`);
      duplicateCalls.forEach(duplicate => {
        console.log(`    - Call SID: ${duplicate._id}, Count: ${duplicate.count}`);
      });
      
      metrics.duplicateData.calls = duplicateCalls;
    } else {
      console.log('  ✅ No duplicate calls found');
      metrics.duplicateData.calls = [];
    }
    
    // Check for duplicate recordings
    console.log('\nChecking for duplicate recordings...');
    const duplicateRecordings = await db.collection('recordings').aggregate([
      { $group: { _id: '$recordingSid', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    if (duplicateRecordings.length > 0) {
      console.log(`  ❌ Found ${duplicateRecordings.length} duplicate recordings`);
      duplicateRecordings.forEach(duplicate => {
        console.log(`    - Recording SID: ${duplicate._id}, Count: ${duplicate.count}`);
      });
      
      metrics.duplicateData.recordings = duplicateRecordings;
    } else {
      console.log('  ✅ No duplicate recordings found');
      metrics.duplicateData.recordings = [];
    }
    
    // Check for duplicate transcripts
    console.log('\nChecking for duplicate transcripts...');
    const duplicateTranscripts = await db.collection('transcripts').aggregate([
      { $group: { _id: '$callSid', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    if (duplicateTranscripts.length > 0) {
      console.log(`  ❌ Found ${duplicateTranscripts.length} duplicate transcripts`);
      duplicateTranscripts.forEach(duplicate => {
        console.log(`    - Call SID: ${duplicate._id}, Count: ${duplicate.count}`);
      });
      
      metrics.duplicateData.transcripts = duplicateTranscripts;
    } else {
      console.log('  ✅ No duplicate transcripts found');
      metrics.duplicateData.transcripts = [];
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking for duplicate data:', error.message);
    metrics.errors.push({
      operation: 'checkForDuplicateData',
      error: error.message
    });
    return false;
  }
}

/**
 * Check for orphaned data
 */
async function checkForOrphanedData() {
  console.log('\n5. Checking for orphaned data...');
  
  try {
    const db = mongoose.connection.db;
    
    // Check for orphaned recordings
    console.log('\nChecking for orphaned recordings...');
    const orphanedRecordings = await db.collection('recordings').aggregate([
      {
        $lookup: {
          from: 'calls',
          localField: 'callSid',
          foreignField: 'callSid',
          as: 'call'
        }
      },
      { $match: { call: { $size: 0 } } },
      { $limit: 10 }
    ]).toArray();
    
    if (orphanedRecordings.length > 0) {
      console.log(`  ❌ Found ${orphanedRecordings.length} orphaned recordings`);
      orphanedRecordings.forEach(recording => {
        console.log(`    - Recording SID: ${recording.recordingSid}, Call SID: ${recording.callSid}`);
      });
      
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.recordings = orphanedRecordings.length;
    } else {
      console.log('  ✅ No orphaned recordings found');
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.recordings = 0;
    }
    
    // Check for orphaned transcripts
    console.log('\nChecking for orphaned transcripts...');
    const orphanedTranscripts = await db.collection('transcripts').aggregate([
      {
        $lookup: {
          from: 'calls',
          localField: 'callSid',
          foreignField: 'callSid',
          as: 'call'
        }
      },
      { $match: { call: { $size: 0 } } },
      { $limit: 10 }
    ]).toArray();
    
    if (orphanedTranscripts.length > 0) {
      console.log(`  ❌ Found ${orphanedTranscripts.length} orphaned transcripts`);
      orphanedTranscripts.forEach(transcript => {
        console.log(`    - Call SID: ${transcript.callSid}`);
      });
      
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.transcripts = orphanedTranscripts.length;
    } else {
      console.log('  ✅ No orphaned transcripts found');
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.transcripts = 0;
    }
    
    // Check for orphaned call events
    console.log('\nChecking for orphaned call events...');
    const orphanedEvents = await db.collection('callevents').aggregate([
      {
        $lookup: {
          from: 'calls',
          localField: 'callSid',
          foreignField: 'callSid',
          as: 'call'
        }
      },
      { $match: { call: { $size: 0 } } },
      { $limit: 10 }
    ]).toArray();
    
    if (orphanedEvents.length > 0) {
      console.log(`  ❌ Found ${orphanedEvents.length} orphaned call events`);
      orphanedEvents.forEach(event => {
        console.log(`    - Call SID: ${event.callSid}, Event Type: ${event.eventType}`);
      });
      
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.events = orphanedEvents.length;
    } else {
      console.log('  ✅ No orphaned call events found');
      metrics.orphanedData = metrics.orphanedData || {};
      metrics.orphanedData.events = 0;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking for orphaned data:', error.message);
    metrics.errors.push({
      operation: 'checkForOrphanedData',
      error: error.message
    });
    return false;
  }
}

/**
 * Analyze field distribution
 */
async function analyzeFieldDistribution() {
  console.log('\n6. Analyzing field distribution...');
  
  try {
    const db = mongoose.connection.db;
    
    // Analyze call status distribution
    console.log('\nAnalyzing call status distribution...');
    const statusDistribution = await db.collection('calls').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('  Call Status Distribution:');
    statusDistribution.forEach(status => {
      console.log(`    - ${status._id}: ${status.count}`);
    });
    
    metrics.fieldDistribution = metrics.fieldDistribution || {};
    metrics.fieldDistribution.callStatus = statusDistribution;
    
    // Analyze call direction distribution
    console.log('\nAnalyzing call direction distribution...');
    const directionDistribution = await db.collection('calls').aggregate([
      { $group: { _id: '$direction', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('  Call Direction Distribution:');
    directionDistribution.forEach(direction => {
      console.log(`    - ${direction._id}: ${direction.count}`);
    });
    
    metrics.fieldDistribution = metrics.fieldDistribution || {};
    metrics.fieldDistribution.callDirection = directionDistribution;
    
    // Analyze recording status distribution
    console.log('\nAnalyzing recording status distribution...');
    const recordingStatusDistribution = await db.collection('recordings').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('  Recording Status Distribution:');
    recordingStatusDistribution.forEach(status => {
      console.log(`    - ${status._id}: ${status.count}`);
    });
    
    metrics.fieldDistribution = metrics.fieldDistribution || {};
    metrics.fieldDistribution.recordingStatus = recordingStatusDistribution;
    
    // Analyze call event type distribution
    console.log('\nAnalyzing call event type distribution...');
    const eventTypeDistribution = await db.collection('callevents').aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('  Call Event Type Distribution:');
    eventTypeDistribution.forEach(eventType => {
      console.log(`    - ${eventType._id}: ${eventType.count}`);
    });
    
    metrics.fieldDistribution = metrics.fieldDistribution || {};
    metrics.fieldDistribution.eventType = eventTypeDistribution;
    
    return true;
  } catch (error) {
    console.error('❌ Error analyzing field distribution:', error.message);
    metrics.errors.push({
      operation: 'analyzeFieldDistribution',
      error: error.message
    });
    return false;
  }
}

/**
 * Generate schema health report
 */
async function generateSchemaHealthReport() {
  console.log('\n7. Generating schema health report...');
  
  // Calculate overall health score
  let healthScore = 100;
  
  // Deduct points for validation errors
  if (metrics.validationErrors.length > 0) {
    const deduction = Math.min(30, metrics.validationErrors.length);
    healthScore -= deduction;
    console.log(`  Deducting ${deduction} points for validation errors`);
  }
  
  // Deduct points for duplicate data
  const duplicateCount = (metrics.duplicateData.calls?.length || 0) +
                         (metrics.duplicateData.recordings?.length || 0) +
                         (metrics.duplicateData.transcripts?.length || 0);
  
  if (duplicateCount > 0) {
    const deduction = Math.min(20, duplicateCount * 2);
    healthScore -= deduction;
    console.log(`  Deducting ${deduction} points for duplicate data`);
  }
  
  // Deduct points for orphaned data
  const orphanedCount = (metrics.orphanedData?.recordings || 0) +
                        (metrics.orphanedData?.transcripts || 0) +
                        (metrics.orphanedData?.events || 0);
  
  if (orphanedCount > 0) {
    const deduction = Math.min(20, orphanedCount * 2);
    healthScore -= deduction;
    console.log(`  Deducting ${deduction} points for orphaned data`);
  }
  
  // Deduct points for errors
  if (metrics.errors.length > 0) {
    const deduction = Math.min(30, metrics.errors.length * 5);
    healthScore -= deduction;
    console.log(`  Deducting ${deduction} points for errors`);
  }
  
  // Ensure health score is between 0 and 100
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  console.log(`\nSchema Health Score: ${healthScore}/100`);
  
  // Determine health status
  let healthStatus;
  if (healthScore >= 90) {
    healthStatus = 'Excellent';
  } else if (healthScore >= 75) {
    healthStatus = 'Good';
  } else if (healthScore >= 50) {
    healthStatus = 'Fair';
  } else {
    healthStatus = 'Poor';
  }
  
  console.log(`Schema Health Status: ${healthStatus}`);
  
  // Generate recommendations
  console.log('\nRecommendations:');
  
  if (metrics.validationErrors.length > 0) {
    console.log('  - Fix validation errors in documents');
    console.log(`    Found ${metrics.validationErrors.length} documents with validation errors`);
  }
  
  if (duplicateCount > 0) {
    console.log('  - Remove duplicate data');
    console.log(`    Found ${duplicateCount} duplicate documents`);
  }
  
  if (orphanedCount > 0) {
    console.log('  - Clean up orphaned data');
    console.log(`    Found ${orphanedCount} orphaned documents`);
  }
  
  // Check for missing indexes
  const missingIndexes = [];
  
  if (!metrics.indexStats.calls?.indexes.some(index => index.keys.includes('callSid'))) {
    missingIndexes.push('calls.callSid');
  }
  
  if (!metrics.indexStats.recordings?.indexes.some(index => index.keys.includes('callSid'))) {
    missingIndexes.push('recordings.callSid');
  }
  
  if (!metrics.indexStats.transcripts?.indexes.some(index => index.keys.includes('callSid'))) {
    missingIndexes.push('transcripts.callSid');
  }
  
  if (!metrics.indexStats.callevents?.indexes.some(index => index.keys.includes('callSid'))) {
    missingIndexes.push('callevents.callSid');
  }
  
  if (missingIndexes.length > 0) {
    console.log('  - Add missing indexes:');
    missingIndexes.forEach(index => {
      console.log(`    - ${index}`);
    });
  }
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    collectionStats: metrics.collectionStats,
    indexStats: metrics.indexStats,
    validationErrors: metrics.validationErrors.length,
    duplicateData: {
      calls: metrics.duplicateData.calls?.length || 0,
      recordings: metrics.duplicateData.recordings?.length || 0,
      transcripts: metrics.duplicateData.transcripts?.length || 0
    },
    orphanedData: metrics.orphanedData || {},
    fieldDistribution: metrics.fieldDistribution || {},
    errors: metrics.errors,
    healthScore,
    healthStatus,
    recommendations: {
      fixValidationErrors: metrics.validationErrors.length > 0,
      removeDuplicateData: duplicateCount > 0,
      cleanupOrphanedData: orphanedCount > 0,
      addMissingIndexes: missingIndexes
    }
  };
  
  await fs.writeFile('schema-health-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Schema health report saved to schema-health-report.json');
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
  console.log('MongoDB Schema Validation Test');
  console.log('=============================');
  console.log(`MongoDB URI: ${mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    
    if (connected) {
      // Get collection statistics
      await getCollectionStats();
      
      // Check indexes
      await checkIndexes();
      
      // Validate documents
      await validateDocuments();
      
      // Check for duplicate data
      await checkForDuplicateData();
      
      // Check for orphaned data
      await checkForOrphanedData();
      
      // Analyze field distribution
      await analyzeFieldDistribution();
      
      // Generate schema health report
      await generateSchemaHealthReport();
    }
    
    console.log('\nSchema Validation Test completed!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the main function
main();