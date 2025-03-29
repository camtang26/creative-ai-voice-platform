/**
 * Application entry point
 * 
 * This file serves as the main entry point for the application.
 * It starts the server and handles uncaught exceptions and unhandled rejections.
 */
import { start } from './src/server.js';
import logger from './src/utils/logger.js';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  
  // Exit with error code after logging
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason);
  
  // Exit with error code after logging
  process.exit(1);
});

// Start the server
start();
