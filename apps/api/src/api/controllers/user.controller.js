// apps/api/src/api/controllers/user.controller.js

const User = require('../../models/User.model');
const Workout = require('../../models/Workout.model');

/**
 * @controller getUserProfile
 * @description Retrieves the profile of the currently authenticated user.
 * @route GET /api/v1/users/me
 * @access Private
 */
const getUserProfile = async (req, res) => {
    try {
        const user = req.user;

        if (user) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                weight: user.weight,
                height: user.height,
                fitnessGoals: user.fitnessGoals,
            });
        } else {
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Get Profile Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

/**
 * @controller updateUserProfile
 * @description Updates the profile of the currently authenticated user.
 * @route PUT /api/v1/users/me
 * @access Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.age = req.body.age || user.age;
            user.weight = req.body.weight || user.weight;
            user.height = req.body.height || user.height;
            user.fitnessGoals = req.body.fitnessGoals || user.fitnessGoals;

            const updatedUser = await user.save();

            res.status(200).json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                age: updatedUser.age,
                weight: updatedUser.weight,
                height: updatedUser.height,
                fitnessGoals: updatedUser.fitnessGoals,
            });
        } else {
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Update Profile Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

/**
 * @controller getUserStats
 * @description Retrieves and calculates key fitness statistics for the authenticated user.
 * @route GET /api/v1/users/stats
 * @access Private
 */
const getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = req.user; // User object is already attached from auth middleware

        // 1. Fetch all workouts for the user
        const workouts = await Workout.find({ user: userId }).sort({ date: 'asc' });

        if (!workouts || workouts.length === 0) {
            return res.status(200).json({
                message: "No workout data available to generate stats.",
                stats: {
                    totalWorkouts: 0,
                    totalReps: 0,
                    totalDuration: 0,
                    averageWorkoutsPerWeek: 0,
                    bmi: null,
                }
            });
        }

        // 2. Calculate statistics
        const totalWorkouts = workouts.length;

        const totalDuration = workouts.reduce((acc, workout) => acc + workout.duration, 0);

        const totalReps = workouts.reduce((acc, workout) => {
            return acc + workout.exercises.reduce((exAcc, ex) => exAcc + (ex.reps * ex.sets), 0);
        }, 0);

        // 3. Calculate workout frequency (average workouts per week)
        let averageWorkoutsPerWeek = 0;
        if (totalWorkouts > 1) {
            const firstWorkoutDate = new Date(workouts[0].date);
            const lastWorkoutDate = new Date(workouts[workouts.length - 1].date);
            const diffTime = Math.abs(lastWorkoutDate - firstWorkoutDate);
            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            averageWorkoutsPerWeek = diffWeeks > 0 ? parseFloat((totalWorkouts / diffWeeks).toFixed(2)) : totalWorkouts;
        } else if (totalWorkouts === 1) {
            averageWorkoutsPerWeek = 1;
        }

        // 4. Calculate BMI
        let bmi = null;
        if (user.height && user.weight && user.height > 0) {
            // Assuming height is in cm and weight is in kg. BMI formula: weight (kg) / [height (m)]^2
            const heightInMeters = user.height / 100;
            bmi = parseFloat((user.weight / (heightInMeters * heightInMeters)).toFixed(2));
        }

        res.status(200).json({
            stats: {
                totalWorkouts,
                totalReps,
                totalDuration, // in minutes
                averageWorkoutsPerWeek,
                bmi,
            }
        });

    } catch (error) {
        console.error('Get User Stats Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};


module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserStats, // Export the new function
};
