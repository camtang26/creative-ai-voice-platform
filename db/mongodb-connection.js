/**
 * MongoDB Connection Module
 * Handles connection to MongoDB with proper error handling and connection pooling
 */
import mongoose from 'mongoose';
import 'dotenv/config';

// Get MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elevenlabs_twilio';

// Connection options with best practices for production
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  autoIndex: true, // Build indexes
};

// Track connection status
let isConnected = false;

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
export async function connectToDatabase() {
  if (isConnected) {
    console.log('[MongoDB] Already connected to database');
    return mongoose.connection;
  }

  try {
    console.log(`[MongoDB] Connecting to ${MONGODB_URI.split('@').pop()}`);
    
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connection established successfully');
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[MongoDB] Connection disconnected');
      isConnected = false;
    });

    // Handle Node.js process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed due to application termination');
      process.exit(0);
    });

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, connectionOptions);
    
    return mongoose.connection;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[MongoDB] Connection closed');
  } catch (error) {
    console.error('[MongoDB] Error closing connection:', error);
    throw error;
  }
}

/**
 * Get MongoDB connection status
 * @returns {boolean} Connection status
 */
export function getConnectionStatus() {
  return isConnected;
}

export default {
  connectToDatabase,
  closeConnection,
  getConnectionStatus,
};