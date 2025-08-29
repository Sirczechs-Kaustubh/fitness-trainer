// apps/api/src/utils/asyncHandler.js

/**
 * @function asyncHandler
 * @description A higher-order function to wrap async route handlers,
 * catching any errors and passing them to the next error-handling middleware.
 * @param {function} requestHandler - The async controller function to execute.
 * @returns {function} An Express middleware function.
 */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;