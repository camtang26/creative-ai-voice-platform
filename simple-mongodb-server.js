/**
 * Simple MongoDB Server
 * 
 * This script starts a basic HTTP server that connects to MongoDB
 */
import 'dotenv/config';
import fastify from 'fastify';
import mongoose from 'mongoose';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Create Fastify server
const server = fastify({ 
  logger: true
});

// Add a health check route
server.get('/health', async (request, reply) => {
  return { status: 'ok', mongodb: 'connected' };
});

// Add a route to get all calls
server.get('/api/db/calls', async (request, reply) => {
  try {
    const limit = parseInt(request.query.limit) || 10;
    const offset = parseInt(request.query.offset) || 0;
    
    // Get the Call model
    const Call = mongoose.model('Call');
    
    // Get total count
    const total = await Call.countDocuments();
    
    // Get calls with pagination
    const calls = await Call.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
    
    return {
      success: true,
      data: calls,
      total,
      page: {
        limit,
        offset,
        hasMore: offset + calls.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching calls:', error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to fetch calls',
      details: error.message
    });
  }
});

// Start the server
const start = async () => {
  try {
    // Connect to MongoDB
    console.log(`[MongoDB] Connecting to ${MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('[MongoDB] Connection established successfully');
    
    // Define a simple Call schema if it doesn't exist
    if (!mongoose.models.Call) {
      const CallSchema = new mongoose.Schema({
        callSid: { type: String, required: true, unique: true },
        status: { type: String },
        from: { type: String },
        to: { type: String },
        duration: { type: Number },
        startTime: { type: Date },
        endTime: { type: Date },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });
      
      mongoose.model('Call', CallSchema);
      console.log('[MongoDB] Call model defined');
    }
    
    // Start the server
    const port = process.env.PORT || 8000;
    const host = '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`[Server] Simple MongoDB server listening on port ${port}`);
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
function cleanup() {
  console.log('\n[Server] Shutting down...');
  
  // Close MongoDB connection
  try {
    mongoose.connection.close();
    console.log('[MongoDB] Connection closed');
  } catch (error) {
    console.error('[MongoDB] Error closing connection:', error);
  }
  
  process.exit(0);
}

// Listen for termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
start();