// apps/api/src/api/middlewares/auth.middleware.js

// Import the jsonwebtoken library to verify the JWT.
const jwt = require('jsonwebtoken');
// Import the User model to find the user associated with the token.
const User = require('../../models/User.model');

/**
 * @function authMiddleware
 * @description An Express middleware to protect routes by verifying a JWT.
 * It checks for a token in the 'Authorization' header, verifies it, and attaches the user's data to the request object.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The callback function to pass control to the next middleware.
 */
const authMiddleware = async (req, res, next) => {
    let token;

    // Check if the Authorization header exists and starts with 'Bearer'.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the header (Bearer TOKEN).
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the JWT_SECRET from environment variables.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by the ID that was encoded in the token.
            // We exclude the password field from the result for security.
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                // If user is not found (e.g., deleted after token was issued), send an error.
                return res.status(401).json({
                    message: 'Not authorized, user not found'
                });
            }

            // If verification is successful and user is found, proceed to the next middleware or route handler.
            next();
        } catch (error) {
            // If the token is invalid (e.g., expired, malformed), send a 401 Unauthorized response.
            console.error('Token verification failed:', error.message);
            return res.status(401).json({
                message: 'Not authorized, token failed'
            });
        }
    }

    // If no token is found in the header, send a 401 Unauthorized response.
    if (!token) {
        return res.status(401).json({
            message: 'Not authorized, no token'
        });
    }
};

// Export the middleware to be used in the route files.
module.exports = authMiddleware;
