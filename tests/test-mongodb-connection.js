/**
 * Simple MongoDB Connection Test
 * 
 * This script tests the connection to MongoDB using the connection string from .env
 */
import 'dotenv/config';
import mongoose from 'mongoose';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log(`[MongoDB] Connecting to ${MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')}`);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('[MongoDB] Connection established successfully');
  
  // Create a simple test schema
  const TestSchema = new mongoose.Schema({
    name: String,
    timestamp: { type: Date, default: Date.now }
  });
  
  // Create a model
  const Test = mongoose.model('Test', TestSchema);
  
  // Create a test document
  return Test.create({
    name: 'Connection Test',
    timestamp: new Date()
  });
})
.then(doc => {
  console.log(`[MongoDB] Test document created with ID: ${doc._id}`);
  console.log('[MongoDB] Connection test successful');
  
  // Close the connection
  return mongoose.connection.close();
})
.then(() => {
  console.log('[MongoDB] Connection closed');
  process.exit(0);
})
.catch(err => {
  console.error('[MongoDB] Connection error:', err);
  process.exit(1);
});