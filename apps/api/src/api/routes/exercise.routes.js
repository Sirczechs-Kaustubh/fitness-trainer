// apps/api/src/api/routes/exercise.routes.js

const express = require('express');
const router = express.Router();
const {
    getAllExercises,
    getExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseExample,
} = require('../controllers/exercise.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// --- Public Routes for All Authenticated Users ---

/**
 * @route   GET /api/v1/exercises
 * @desc    Get all exercises with pagination
 * @access  Private
 */
router.get('/', authMiddleware, getAllExercises);

/**
 * @route   GET /api/v1/exercises/example?name=Push-up
 * @desc    Get an instructional video URL for the given exercise name
 * @access  Private
 */
router.get('/example', authMiddleware, getExerciseExample);

/**
 * @route   GET /api/v1/exercises/:id
 * @desc    Get a single exercise by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, getExerciseById);


// --- Protected Routes for Admins Only ---

/**
 * @route   POST /api/v1/exercises
 * @desc    Create a new exercise
 * @access  Admin
 */
router.post('/', authMiddleware, adminMiddleware, createExercise);

/**
 * @route   PUT /api/v1/exercises/:id
 * @desc    Update an exercise by ID
 * @access  Admin
 */
router.put('/:id', authMiddleware, adminMiddleware, updateExercise);

/**
 * @route   DELETE /api/v1/exercises/:id
 * @desc    Delete an exercise by ID
 * @access  Admin
 */
router.delete('/:id', authMiddleware, adminMiddleware, deleteExercise);

module.exports = router;
