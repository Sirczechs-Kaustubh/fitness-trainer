// apps/api/src/api/routes/user.routes.js

// Import the Express module to create a router.
const express = require('express');
// Import the controller functions that will handle the logic for user profile management.
const {
    getUserProfile,
    updateUserProfile
} = require('../controllers/user.controller');
// Import the authentication middleware to protect the routes.
const authMiddleware = require('../middlewares/auth.middleware');

// Create a new router object from Express.
const router = express.Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get the profile of the currently logged-in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated before accessing the route.
 * @returns {object} 200 - User object (excluding password).
 * @returns {object} 401 - Unauthorized if the token is invalid or missing.
 */
router.get('/me', authMiddleware, getUserProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update the profile of the currently logged-in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated before accessing the route.
 * @param   {object} req.body - Can contain name, age, weight, height, fitnessGoals.
 * @returns {object} 200 - Updated user object.
 * @returns {object} 401 - Unauthorized if the token is invalid or missing.
 */
router.put('/me', authMiddleware, updateUserProfile);

// A more streamlined way to chain requests for the same route
// router.route('/me').get(authMiddleware, getUserProfile).put(authMiddleware, updateUserProfile);

// Export the router to be used in the main application file (app.js).
module.exports = router;
