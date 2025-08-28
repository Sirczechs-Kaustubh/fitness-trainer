// apps/api/src/api/controllers/workout.controller.js

// Import the Workout model to interact with the workouts collection in the database.
const Workout = require('../../models/Workout.model');

/**
 * @controller getAllWorkouts
 * @description Retrieves all workout sessions for the currently authenticated user.
 * It queries the Workout collection and filters by the logged‑in user's ID.
 * The results are sorted by date in descending order (newest first).
 * @route GET /api/v1/workouts
 * @access Private
 */
const getAllWorkouts = async (req, res) => {
    try {
        // The authenticated user's ID is available on req.user thanks to the auth middleware.
        const userId = req.user.id;

        // Find all workouts belonging to this user and sort them by date (most recent first).
        const workouts = await Workout.find({ user: userId }).sort({ date: -1 });

        res.status(200).json({
            count: workouts.length,
            data: workouts,
        });
    } catch (error) {
        console.error('Get Workouts Error:', error.message);
        res.status(500).json({
            message: 'Server Error',
        });
    }
};

/**
 * @controller getWorkoutById
 * @description Retrieves a single workout session by its ID for the logged‑in user.
 * It ensures the workout belongs to the requesting user before returning it.
 * @route GET /api/v1/workouts/:id
 * @access Private
 */
const getWorkoutById = async (req, res) => {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;

        // Find the workout by ID and ensure it belongs to the current user.
        const workout = await Workout.findOne({ _id: workoutId, user: userId });

        if (!workout) {
            return res.status(404).json({
                message: 'Workout not found',
            });
        }

        res.status(200).json(workout);
    } catch (error) {
        console.error('Get Workout Error:', error.message);
        // If the provided ID is not a valid ObjectId, Mongoose will throw a CastError.
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid workout ID' });
        }
        res.status(500).json({
            message: 'Server Error',
        });
    }
};

/**
 * @controller deleteWorkout
 * @description Deletes a workout session belonging to the logged‑in user.
 * It ensures the workout belongs to the requester before removing it.
 * @route DELETE /api/v1/workouts/:id
 * @access Private
 */
const deleteWorkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;

        // Find the workout by ID and ensure it belongs to the current user.
        const workout = await Workout.findOneAndDelete({ _id: workoutId, user: userId });

        if (!workout) {
            return res.status(404).json({
                message: 'Workout not found or unauthorized',
            });
        }

        res.status(200).json({
            message: 'Workout deleted successfully',
        });
    } catch (error) {
        console.error('Delete Workout Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid workout ID' });
        }
        res.status(500).json({
            message: 'Server Error',
        });
    }
};

// Export the controller functions.
module.exports = {
    getAllWorkouts,
    getWorkoutById,
    deleteWorkout,
};