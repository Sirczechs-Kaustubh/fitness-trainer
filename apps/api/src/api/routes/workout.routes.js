// apps/api/src/api/routes/workout.routes.js

// Import the Express module to create a router.
const express = require('express');
// Import the controller functions that will handle the logic for workouts.
const {
    getAllWorkouts,
    getWorkoutById,
    deleteWorkout,
} = require('../controllers/workout.controller');
// Import the authentication middleware to protect the routes.
const authMiddleware = require('../middlewares/auth.middleware');

// Create a new router object from Express.
const router = express.Router();

/**
 * @route   GET /api/v1/workouts
 * @desc    Get all workouts of the currently logged‑in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated before accessing the route.
 * @returns {object} 200 - An object containing the count and array of workouts.
 */
router.get('/', authMiddleware, getAllWorkouts);

/**
 * @route   GET /api/v1/workouts/:id
 * @desc    Get a specific workout by its ID for the logged‑in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated before accessing the route.
 * @returns {object} 200 - The workout object if found.
 * @returns {object} 404 - Not found if no workout with that ID exists for the user.
 */
router.get('/:id', authMiddleware, getWorkoutById);

/**
 * @route   DELETE /api/v1/workouts/:id
 * @desc    Delete a specific workout by its ID for the logged‑in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated before accessing the route.
 * @returns {object} 200 - Success message if deletion is successful.
 * @returns {object} 404 - Not found if no workout with that ID exists or user is unauthorized.
 */
router.delete('/:id', authMiddleware, deleteWorkout);

// Export the router to be used in the main application file (app.js).
module.exports = router;