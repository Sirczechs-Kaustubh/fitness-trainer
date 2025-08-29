// apps/api/src/utils/responseHandler.js

/**
 * @function successResponse
 * @description Sends a standardized success response.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {object} data - The payload to send.
 */
const successResponse = (res, statusCode, data) => {
    return res.status(statusCode).json({
        success: true,
        data,
    });
};

/**
 * @function errorResponse
 * @description Sends a standardized error response.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code.
 * @param {string} message - The error message.
 */
const errorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            message,
        },
    });
};

module.exports = {
    successResponse,
    errorResponse,
};