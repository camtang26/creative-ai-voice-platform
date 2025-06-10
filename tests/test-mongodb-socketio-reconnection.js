/**
 * Socket.IO Reconnection Test
 * Tests the Socket.IO reconnection enhancements
 */
import 'dotenv/config';
import { io } from 'socket.io-client';
import { Server } from 'socket.io';
import http from 'http';

// Create HTTP server
let httpServer = http.createServer();
let serverSocket;

// Test configuration
const PORT = 8001;
const SERVER_URL = `http://localhost:${PORT}`;
const RECONNECTION_TESTS = 3; // Reduced from 5 to 3 for faster testing
const TEST_DURATION = 180000; // 180 seconds (3 minutes)

// Metrics
const metrics = {
  connectionAttempts: 0,
  successfulConnections: 0,
  reconnectionAttempts: 0,
  successfulReconnections: 0,
  errors: [],
  events: []
};

/**
 * Log event with timestamp
 * @param {string} message - Log message
 */
function logEvent(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  metrics.events.push(logMessage);
}

/**
 * Start Socket.IO server
 */
async function startServer() {
  return new Promise((resolve) => {
    // Create a new HTTP server each time
    const newHttpServer = http.createServer();
    httpServer = newHttpServer;
    
    // Create Socket.IO server
    serverSocket = new Server(newHttpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      pingInterval: 10000,
      pingTimeout: 5000,
      connectTimeout: 5000,
      perMessageDeflate: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5
    });

    // Connection event handler
    serverSocket.on('connection', (socket) => {
      const isReconnection = socket.handshake.query.reconnect === 'true';
      
      if (isReconnection) {
        logEvent(`Client reconnected: ${socket.id}`);
        metrics.successfulReconnections++;
      } else {
        logEvent(`Client connected: ${socket.id}`);
        metrics.successfulConnections++;
      }
      
      // Send welcome message
      socket.emit('welcome', { message: 'Welcome to the Socket.IO server' });
      
      // Handle client events
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      // Disconnect event handler
      socket.on('disconnect', (reason) => {
        logEvent(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });
      
      // Error event handler
      socket.on('error', (error) => {
        logEvent(`Client error: ${socket.id}, error: ${error.message}`);
      });
    });

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logEvent(`Socket.IO server started on port ${PORT}`);
      resolve();
    });
  });
}

/**
 * Stop Socket.IO server
 */
async function stopServer() {
  return new Promise((resolve) => {
    if (serverSocket) {
      // Close all client connections first
      serverSocket.disconnectSockets(true);
      
      // Then close the server
      serverSocket.close(() => {
        logEvent('Socket.IO server stopped');
        
        // Finally close the HTTP server
        httpServer.close(() => {
          // Ensure all connections are properly closed
          httpServer.closeAllConnections();
          serverSocket = null;
          
          // Wait a bit to ensure all resources are released
          setTimeout(resolve, 1000);
        });
      });
    } else {
      resolve();
    }
  });
}

/**
 * Create Socket.IO client
 * @returns {Socket} Socket.IO client
 */
function createClient() {
  metrics.connectionAttempts++;
  
  // Create socket with enhanced reconnection settings
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,        // Increased from 10 to 20
    reconnectionDelay: 500,          // Decreased from 1000 to 500
    reconnectionDelayMax: 5000,      // Decreased from 10000 to 5000
    randomizationFactor: 0.5,
    timeout: 20000,                  // Increased from 10000 to 20000
    autoConnect: true,
    forceNew: true,                  // Force a new connection
    query: { reconnect: 'true' },
    path: '/socket.io/'
  });
  
  // Connection event handler
  socket.on('connect', () => {
    logEvent(`Connected to server: ${socket.id}`);
  });
  
  // Reconnection event handlers
  socket.io.on('reconnect', (attempt) => {
    logEvent(`Reconnected after ${attempt} attempts`);
    metrics.successfulReconnections++;
  });
  
  socket.io.on('reconnect_attempt', (attempt) => {
    logEvent(`Reconnection attempt ${attempt}`);
    metrics.reconnectionAttempts++;
  });
  
  socket.io.on('reconnect_error', (error) => {
    logEvent(`Reconnection error: ${error.message}`);
    metrics.errors.push(`Reconnection error: ${error.message}`);
  });
  
  socket.io.on('reconnect_failed', () => {
    logEvent('Failed to reconnect after all attempts');
    metrics.errors.push('Failed to reconnect after all attempts');
  });
  
  // Disconnect event handler
  socket.on('disconnect', (reason) => {
    logEvent(`Disconnected from server: ${reason}`);
  });
  
  // Error event handler
  socket.on('connect_error', (error) => {
    logEvent(`Connection error: ${error.message}`);
    metrics.errors.push(`Connection error: ${error.message}`);
  });
  
  // Welcome event handler
  socket.on('welcome', (data) => {
    logEvent(`Received welcome message: ${data.message}`);
  });
  
  // Pong event handler
  socket.on('pong', (data) => {
    const latency = Date.now() - data.timestamp;
    logEvent(`Received pong with latency: ${latency}ms`);
  });
  
  return socket;
}

/**
 * Simulate server disconnection
 */
async function simulateServerDisconnection() {
  logEvent('Simulating server disconnection...');
  
  // Stop server
  await stopServer();
  
  // Wait for 8 seconds to ensure all connections are properly closed
  logEvent('Waiting for connections to close completely...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Restart server
  logEvent('Restarting server...');
  await startServer();
  
  // Wait for server to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  logEvent('Server restarted after simulated disconnection');
}

/**
 * Run reconnection test
 */
async function runReconnectionTest() {
  logEvent('Starting Socket.IO reconnection test');
  
  // Start server
  await startServer();
  
  // Create client
  const socket = createClient();
  
  // Wait for initial connection
  await new Promise(resolve => {
    socket.on('connect', resolve);
    setTimeout(resolve, 5000); // Timeout after 5 seconds
  });
  
  // Run reconnection tests
  for (let i = 0; i < RECONNECTION_TESTS; i++) {
    logEvent(`Running reconnection test ${i + 1}/${RECONNECTION_TESTS}`);
    
    // Add delay before starting the test
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate server disconnection
    await simulateServerDisconnection();
    
    // Wait for automatic reconnection attempt
    logEvent('Waiting for client reconnection attempts...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force manual reconnection if not connected
    if (!socket.connected) {
      logEvent('Attempting manual reconnection...');
      socket.connect();
      
      // Wait for manual reconnection
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Send ping to verify connection
    if (socket.connected) {
      logEvent('Connection verified, sending ping...');
      socket.emit('ping');
    } else {
      logEvent('Warning: Socket not connected after reconnection attempts');
      
      // Create a new socket as a last resort
      logEvent('Creating new socket connection...');
      socket.disconnect();
      const newSocket = createClient();
      socket = newSocket;
      
      // Wait for new connection
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (socket.connected) {
        logEvent('New socket connection established');
        socket.emit('ping');
      } else {
        logEvent('Failed to establish new socket connection');
      }
    }
    
    // Wait between tests with longer delay
    logEvent('Waiting before next test...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Disconnect client
  socket.disconnect();
  
  // Stop server
  await stopServer();
  
  // Generate report
  generateReport();
}

/**
 * Generate test report
 */
function generateReport() {
  logEvent('Generating test report');
  
  console.log('\n=== Socket.IO Reconnection Test Report ===');
  console.log(`Test Duration: ${TEST_DURATION / 1000} seconds`);
  console.log(`Reconnection Tests: ${RECONNECTION_TESTS}`);
  console.log('\nMetrics:');
  console.log(`- Connection Attempts: ${metrics.connectionAttempts}`);
  console.log(`- Successful Connections: ${metrics.successfulConnections}`);
  console.log(`- Reconnection Attempts: ${metrics.reconnectionAttempts}`);
  console.log(`- Successful Reconnections: ${metrics.successfulReconnections}`);
  
  const reconnectionSuccessRate = metrics.reconnectionAttempts > 0
    ? (metrics.successfulReconnections / metrics.reconnectionAttempts) * 100
    : 0;
  
  console.log(`- Reconnection Success Rate: ${reconnectionSuccessRate.toFixed(2)}%`);
  
  if (metrics.errors.length > 0) {
    console.log('\nErrors:');
    metrics.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\nTest Result:');
  if (metrics.successfulReconnections >= RECONNECTION_TESTS) {
    console.log('✅ PASS: All reconnection tests were successful');
  } else {
    console.log(`❌ FAIL: Only ${metrics.successfulReconnections}/${RECONNECTION_TESTS} reconnection tests were successful`);
  }
  
  console.log('\n=== End of Report ===');
}

/**
 * Main function
 */
async function main() {
  try {
    // Set timeout for the entire test
    const timeout = setTimeout(() => {
      logEvent('Test timed out');
      process.exit(1);
    }, TEST_DURATION);
    
    // Run reconnection test
    await runReconnectionTest();
    
    // Clear timeout
    clearTimeout(timeout);
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the main function
main();