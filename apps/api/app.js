// apps/api/app.js

// Import the main Express framework.
const express = require('express');
// Import middleware for security and cross-origin resource sharing.
const cors = require('cors');
const helmet = require('helmet');

// Import the route handlers for different parts of the API.
const authRoutes = require('./src/api/routes/auth.routes');
const userRoutes = require('./src/api/routes/user.routes');
// Import the workout routes to handle workout history APIs.
const workoutRoutes = require('./src/api/routes/workout.routes');

// Initialize the Express application.
const app = express();

// --- Core Middleware ---

// Enable Cross-Origin Resource Sharing (CORS) to allow requests from the frontend.
app.use(cors());

// Set various HTTP headers for security with Helmet.
app.use(helmet());

// Enable the Express app to parse JSON formatted request bodies.
app.use(express.json());

// --- API Routes ---

// A simple root endpoint to confirm the API is running.
app.get('/', (req, res) => {
    res.send('AI Fitness Trainer API is running...');
});

// Mount the authentication routes under the '/api/v1/auth' path.
app.use('/api/v1/auth', authRoutes);

// Mount the user profile routes under the '/api/v1/users' path.
app.use('/api/v1/users', userRoutes);

// Mount the workout routes under the '/api/v1/workouts' path.
app.use('/api/v1/workouts', workoutRoutes);

// --- Error Handling Middleware (Optional but Recommended) ---
// You can add custom error handlers here if needed.

// Export the configured Express app to be used by the main server entry point (index.js).
module.exports = app;
