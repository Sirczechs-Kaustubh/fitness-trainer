// apps/api/src/api/routes/auth.routes.js

const express = require('express');
const {
    registerUser,
    loginUser,
    logoutUser,       // Import new controller
    forgotPassword,   // Import new controller
    resetPassword,    // Import new controller
} = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middlewares/validators');
const authMiddleware = require('../middlewares/auth.middleware'); // Import auth middleware for protected routes

const router = express.Router();

// --- Existing Public Routes ---
router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);

// --- New Public Password Reset Routes ---
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// --- New Private Route ---
router.post('/logout', authMiddleware, logoutUser);


module.exports = router;