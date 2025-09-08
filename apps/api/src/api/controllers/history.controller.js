const Workout = require('../../models/Workout.model');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

/**
 * @desc    Get a paginated list of the user's workout history
 * @route   GET /api/v1/history
 * @access  Private
 */
const getWorkoutHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query; // Default to page 1, 10 items per page

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { endTime: -1 }, // Show the most recent workouts first
        populate: 'exercises.exercise',
        lean: true,
    };

    // We only want to show completed workouts in the history
    const query = { user: userId, status: 'completed' };

    const result = await Workout.paginate(query, options);

    if (!result.docs || result.docs.length === 0) {
        // Return an empty docs array for consistent client handling
        return successResponse(res, 200, { message: "No workout history found.", docs: [] });
    }

    // Flatten result into the data payload to avoid nested data.data
    return successResponse(res, 200, { message: "Workout history retrieved successfully.", ...result });
});

/**
 * @desc    Get a single workout from history by its ID
 * @route   GET /api/v1/history/:workoutId
 * @access  Private
 */
const getWorkoutById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { workoutId } = req.params;

    const workout = await Workout.findOne({
        _id: workoutId,
        user: userId, // Ensure the user can only access their own workouts
        status: 'completed'
    }).populate('exercises.exercise');

    if (!workout) {
        return errorResponse(res, 404, "Workout not found in your history.");
    }

    return successResponse(res, 200, { message: "Workout details retrieved successfully.", workout });
});

/**
 * @desc    Delete a workout from history
 * @route   DELETE /api/v1/history/:workoutId
 * @access  Private
 */
const deleteWorkout = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { workoutId } = req.params;

    const workout = await Workout.findOneAndDelete({
        _id: workoutId,
        user: userId // Ensure the user can only delete their own workouts
    });

    if (!workout) {
        return errorResponse(res, 404, "Workout not found in your history.");
    }

    return successResponse(res, 200, { message: "Workout successfully deleted from your history." });
});


module.exports = {
    getWorkoutHistory,
    getWorkoutById,
    deleteWorkout
};
