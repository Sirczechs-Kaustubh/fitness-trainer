// apps/api/src/api/controllers/workout.controller.js

const Workout = require('../../models/Workout.model');
const User = require('../../models/User.model');

/**
 * @controller startWorkout
 * @description Creates a new workout session and sets its status to "in-progress".
 * @route POST /api/v1/workouts/start
 * @access Private
 */
const startWorkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { plannedExercises } = req.body;

        const newWorkout = new Workout({
            user: userId,
            status: 'in-progress',
            plannedExercises: plannedExercises || [],
            exercises: [],
            date: new Date(),
        });

        await newWorkout.save();

        res.status(201).json({
            message: 'Workout session started successfully.',
            workoutId: newWorkout._id,
            data: newWorkout,
        });
    } catch (error) {
        console.error('Start Workout Error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @controller endWorkout
 * @description Finalizes an "in-progress" workout session, updating its details and status.
 * @route POST /api/v1/workouts/:id/end
 * @access Private
 */
const endWorkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;
        const { exercises } = req.body;

        const workout = await Workout.findOne({ _id: workoutId, user: userId });

        if (!workout) {
            return res.status(404).json({ message: 'Workout not found.' });
        }

        if (workout.status !== 'in-progress') {
            return res.status(400).json({ message: 'This workout is not in-progress.' });
        }

        const now = new Date();
        const duration = Math.round((now - workout.createdAt) / (1000 * 60));

        // --- Estimate calories burned ---
        // Basic MET estimates per exercise name (approximate)
        const METS = {
            'Squat': 5.0,
            'Lunge': 5.0,
            'Push-up': 8.0,
            'Bicep Curl': 3.8,
            'Shoulder Press': 3.8,
            'Jumping Jack': 8.0,
            'Tricep Dip': 6.0,
            'Mountain Climber': 8.0,
        };
        // Calories formula: MET * 3.5 * weight(kg) / 200 * minutes
        let userWeightKg = 70;
        try {
            const u = await User.findById(userId).select('weight');
            if (u && typeof u.weight === 'number' && u.weight > 0) userWeightKg = u.weight;
        } catch {}

        const exs = Array.isArray(exercises) && exercises.length ? exercises : [];
        const perExerciseMinutes = exs.length > 0 ? Math.max(1, duration) / exs.length : Math.max(1, duration);
        let calories = 0;
        for (const ex of exs) {
            const name = ex?.name || 'Workout';
            const met = METS[name] || 5.0;
            calories += met * 3.5 * userWeightKg / 200 * perExerciseMinutes;
        }
        calories = Math.round(calories);

        // Update the workout document
        workout.status = 'completed';
        workout.exercises = exercises;
        workout.duration = duration;
        workout.caloriesBurned = calories;
        workout.endTime = now; // <-- THE FIX IS HERE

        await workout.save();

        res.status(200).json({
            message: 'Workout session ended successfully.',
            data: workout,
        });
    } catch (error) {
        console.error('End Workout Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid workout ID' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};


/**
 * @controller getAllWorkouts
 * @description Retrieves all workout sessions for the currently authenticated user with pagination and filtering.
 * @route GET /api/v1/workouts
 * @access Private
 */
const getAllWorkouts = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const query = { user: userId, status: 'completed' };

        if (req.query.exercise) {
            query['exercises.name'] = { $regex: new RegExp(req.query.exercise, 'i') };
        }

        if (req.query.date) {
            const startDate = new Date(req.query.date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(req.query.date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const workouts = await Workout.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const totalWorkouts = await Workout.countDocuments(query);

        res.status(200).json({
            total: totalWorkouts,
            page,
            pages: Math.ceil(totalWorkouts / limit),
            limit,
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
 * @description Retrieves a single workout session by its ID for the logged-in user.
 * @route GET /api/v1/workouts/:id
 * @access Private
 */
const getWorkoutById = async (req, res) => {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;

        const workout = await Workout.findOne({ _id: workoutId, user: userId });

        if (!workout) {
            return res.status(404).json({
                message: 'Workout not found',
            });
        }

        res.status(200).json(workout);
    } catch (error) {
        console.error('Get Workout Error:', error.message);
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
 * @description Deletes a workout session belonging to the logged-in user.
 * @route DELETE /api/v1/workouts/:id
 * @access Private
 */
const deleteWorkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;

        const workout = await Workout.findOneAndDelete({ _id: workoutId, user: userId });

        if (!workout) {
            return res.status(404).json({
                message: 'Workout not found or unauthorized',
            });
        }

        res.status(200).json({
            message: 'Workout deleted successfully',
        });
    } catch (error)
    {
        console.error('Delete Workout Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid workout ID' });
        }
        res.status(500).json({
            message: 'Server Error',
        });
    }
};

module.exports = {
    startWorkout,
    endWorkout,
    getAllWorkouts,
    getWorkoutById,
    deleteWorkout,
};
