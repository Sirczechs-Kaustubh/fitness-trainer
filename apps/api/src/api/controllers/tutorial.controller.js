const Tutorial = require('../../models/Tutorial.model');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/responseHandler');

/**
 * @desc    Get all tutorials
 * @route   GET /api/v1/tutorials
 * @access  Public
 */
const getTutorials = asyncHandler(async (req, res) => {
    // Fetch all tutorials from the database, sorted by the 'order' field
    const tutorials = await Tutorial.find({}).sort({ order: 'asc' });

    if (!tutorials || tutorials.length === 0) {
        return successResponse(res, 404, { message: "No tutorials found." });
    }

    return successResponse(res, 200, {
        message: "Tutorials retrieved successfully.",
        data: tutorials,
    });
});

module.exports = {
    getTutorials,
};
