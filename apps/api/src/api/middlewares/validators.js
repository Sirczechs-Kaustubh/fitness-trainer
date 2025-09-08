// apps/api/src/api/middlewares/validators.js

const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../../utils/responseHandler');

/**
 * @middleware handleValidationErrors
 * @description Checks for validation errors from express-validator and sends a formatted response.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map((err) => err.msg).join(', ');
        return errorResponse(res, 400, errorMessage);
    }
    next();
};

// Validation chain for user registration
const validateRegistration = [
    body('name', 'Name is required').not().isEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    handleValidationErrors,
];

// Validation chain for user login
const validateLogin = [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').not().isEmpty(),
    handleValidationErrors,
];

module.exports = {
    validateRegistration,
    validateLogin,
};