// apps/api/src/api/middlewares/admin.middleware.js

/**
 * @function adminMiddleware
 * @description An Express middleware to protect routes that require admin privileges.
 * It checks if the authenticated user has the 'admin' role.
 * This should be used AFTER the standard authMiddleware.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The callback function to pass control to the next middleware.
 */
const adminMiddleware = (req, res, next) => {
    // Check if a user object is attached to the request and if the user has the 'admin' role.
    if (req.user && req.user.role === 'admin') {
        // If the user is an admin, proceed to the next middleware or route handler.
        next();
    } else {
        // If the user is not an admin, send a 403 Forbidden response.
        res.status(403).json({
            message: 'Access denied. Admin privileges required.'
        });
    }
};

module.exports = adminMiddleware;
