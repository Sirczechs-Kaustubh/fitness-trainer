// apps/api/src/api/routes/user.routes.js

const express = require('express');
const {
    getUserProfile,
    updateUserProfile,
    getUserStats // Import the new controller function
} = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Chain GET and PUT requests for the user's profile
router.route('/me')
    .get(authMiddleware, getUserProfile)
    .put(authMiddleware, updateUserProfile);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get key fitness statistics for the logged-in user
 * @access  Private
 * @middleware authMiddleware - Ensures the user is authenticated.
 * @returns {object} 200 - An object containing user's fitness stats.
 */
router.get('/stats', authMiddleware, getUserStats);


module.exports = router;
