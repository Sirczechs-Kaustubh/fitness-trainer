// apps/api/src/api/routes/workout.routes.js

const express = require('express');
const {
    startWorkout, // new
    endWorkout,   // new
    getAllWorkouts,
    getWorkoutById,
    deleteWorkout,
} = require('../controllers/workout.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/v1/workouts/start
 * @desc    Starts a new workout session
 * @access  Private
 */
router.post('/start', authMiddleware, startWorkout);

/**
 * @route   POST /api/v1/workouts/:id/end
 * @desc    Ends an in-progress workout session
 * @access  Private
 */
router.post('/:id/end', authMiddleware, endWorkout);

/**
 * @route   GET /api/v1/workouts
 * @desc    Get all completed workouts of the logged-in user
 * @access  Private
 */
router.get('/', authMiddleware, getAllWorkouts);

/**
 * @route   GET /api/v1/workouts/:id
 * @desc    Get a specific workout by its ID
 * @access  Private
 */
router.get('/:id', authMiddleware, getWorkoutById);

/**
 * @route   DELETE /api/v1/workouts/:id
 * @desc    Delete a specific workout by its ID
 * @access  Private
 */
router.delete('/:id', authMiddleware, deleteWorkout);

module.exports = router;
