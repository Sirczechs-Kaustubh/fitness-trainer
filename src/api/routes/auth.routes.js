// apps/api/src/api/routes/auth.routes.js

// Import the Express module to create a router.
const express = require('express');
// Import the controller functions that will handle the logic for registration and login.
const {
    registerUser,
    loginUser
} = require('../controllers/auth.controller');

// Create a new router object from Express.
const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @param   {object} req.body - Should contain name, email, and password.
 * @returns {object} 201 - JSON object with a JWT token.
 * @returns {object} 400 - Bad request if validation fails.
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and get a token
 * @access  Public
 * @param   {object} req.body - Should contain email and password.
 * @returns {object} 200 - JSON object with a JWT token.
 * @returns {object} 400 - Bad request if email is not found.
 * @returns {object} 401 - Unauthorized if password does not match.
 */
router.post('/login', loginUser);

// Export the router to be mounted in the main application file (app.js).
module.exports = router;
