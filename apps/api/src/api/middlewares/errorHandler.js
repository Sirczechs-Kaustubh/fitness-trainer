// apps/api/src/api/middlewares/errorHandler.js

const { errorResponse } = require('../../utils/responseHandler');

/**
 * @middleware globalErrorHandler
 * @description Catches all errors passed via next(error), logs them, and sends a generic 500 response.
 */
const globalErrorHandler = (err, req, res, next) => {
    console.error('UNHANDLED ERROR:', err.stack);

    // Avoid leaking stack trace to the client in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred on the server.'
        : err.message;

    errorResponse(res, err.statusCode || 500, message);
};

module.exports = { globalErrorHandler };