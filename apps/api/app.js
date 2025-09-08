// apps/api/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan'); // Import morgan
require('dotenv').config();

const authRoutes = require('./src/api/routes/auth.routes');
const userRoutes = require('./src/api/routes/user.routes');
const workoutRoutes = require('./src/api/routes/workout.routes');
const { globalErrorHandler } = require('./src/api/middlewares/errorHandler'); // Import error handler
const planRoutes = require('./src/api/routes/plan.routes');
// in app.js
const exerciseRoutes = require('./src/api/routes/exercise.routes');
const progressRoutes = require('./src/api/routes/progress.routes');
const historyRoutes = require('./src/api/routes/history.routes');
const tutorialRoutes = require('./src/api/routes/tutorial.routes');
const dietRoutes = require('./src/api/routes/diet.routes');

// ...

const app = express();

// --- Core Middleware ---
app.use(cors());
app.use(helmet());
app.use(express.json());

// Use morgan for logging in development environment
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// --- API Routes ---
app.get('/', (req, res) => {
    res.send('AI Fitness Trainer API is running...');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/workouts', workoutRoutes);

app.use('/api/v1/exercises', exerciseRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/plans', planRoutes);

// Mount the new history routes
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/tutorials', tutorialRoutes);
app.use('/api/v1/diet', dietRoutes);

// --- Global Error Handling Middleware ---
// This must be the LAST middleware added.
app.use(globalErrorHandler);

module.exports = app;
