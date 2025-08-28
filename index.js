// apps/api/index.js

// Import the 'dotenv' package to load environment variables from a .env file.
// It's important to configure this at the very top so that all other modules can access the variables.
require('dotenv').config();

// Import the built-in 'http' module to create an HTTP server.
const http = require('http');
// Import the configured Express application from app.js.
const app = require('./app');
// Import the database connection function.
const connectDB = require('./src/config/database');
// Import the Socket.IO setup function.
const initializeSocket = require('./src/websocket');

// --- 1. Connect to Database ---
// Call the function to establish a connection with the MongoDB database.
connectDB();

// --- 2. Create HTTP Server ---
// Create the server instance using the Express app.
const server = http.createServer(app);

// --- 3. Initialize Socket.IO ---
// Pass the server instance to the WebSocket initializer.
// This will attach Socket.IO to the server and handle real-time events.
const io = initializeSocket(server);

// --- 4. Define Server Port ---
// Determine the port to run the server on. Use the environment variable or default to 5000.
const PORT = process.env.PORT || 5000;

// --- 5. Start Server ---
// Start listening for incoming HTTP requests on the specified port.
server.listen(PORT, () => {
    // Log a message to the console to confirm that the server is running and on which port.
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
