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

        // 1. Fetch all COMPLETED workouts for the user
        const workouts = await Workout.find({ user: userId, status: 'completed' }).sort({ date: 'asc' });

        // Pre-compute BMI (remains useful even without workouts)
        let bmi = null;
        if (req.user.height && req.user.weight && req.user.height > 0) {
            const heightInMeters = req.user.height / 100;
            bmi = parseFloat((req.user.weight / (heightInMeters * heightInMeters)).toFixed(2));
        }

        if (!workouts || workouts.length === 0) {
            // Return a consistent response shape to simplify the frontend
            return res.status(200).json({
                summary: {
                    caloriesWeek: 0,
                    totalRepsWeek: 0,
                    formAccuracy: 0,
                    minutesTrained: 0,
                    deltas: { calories: 0, reps: 0, accuracy: 0, minutes: 0 },
                },
                weeklyReps: Array(7).fill(0),
                monthlyCalories: [0, 0, 0, 0],
                accuracyHistory: [],
                stats: {
                    totalWorkouts: 0,
                    totalReps: 0,
                    totalDuration: 0,
                    averageWorkoutsPerWeek: 0,
                    bmi,
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

        // 4. BMI already computed above for consistency

        // --- Enhanced dashboard summary structure ---
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const weekMs = 7 * dayMs;
        const fourWeeksMs = 28 * dayMs;

        const within = (d, ms) => (now - new Date(d)) <= ms;

        // Weekly aggregates (last 7 days)
        const lastWeek = workouts.filter(w => within(w.date || w.createdAt, weekMs));
        const prevWeek = workouts.filter(w => {
            const dt = now - (w.date || w.createdAt);
            return dt > weekMs && dt <= 2 * weekMs;
        });

        const sumReps = (arr) => arr.reduce((acc, w) => acc + w.exercises.reduce((s, e) => s + (e.reps || 0) * (e.sets || 0), 0), 0);
        const sumMinutes = (arr) => arr.reduce((acc, w) => acc + (w.duration || 0), 0);
        const sumCalories = (arr) => arr.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
        const avgFormScore = (arr) => {
            let total = 0, count = 0;
            for (const w of arr) {
                for (const e of (w.exercises || [])) {
                    if (typeof e.formScore === 'number') {
                        total += e.formScore; count += 1;
                    }
                }
            }
            return count ? Math.round(total / count) : 0;
        };

        const repsWeek = sumReps(lastWeek);
        const minutesWeek = sumMinutes(lastWeek);
        const caloriesWeek = sumCalories(lastWeek);
        const formAccuracy4w = avgFormScore(workouts.filter(w => within(w.date || w.createdAt, fourWeeksMs)));

        const repsPrev = sumReps(prevWeek) || 0;
        const minutesPrev = sumMinutes(prevWeek) || 0;
        const caloriesPrev = sumCalories(prevWeek) || 0;
        const formPrev = avgFormScore(workouts.filter(w => {
            const dt = now - (w.date || w.createdAt);
            return dt > fourWeeksMs && dt <= 2 * fourWeeksMs;
        })) || 0;

        const pctDelta = (cur, prev) => {
            if (!prev && !cur) return 0;
            if (!prev) return 100;
            return Math.round(((cur - prev) / Math.max(1, prev)) * 100);
        };

        // Weekly reps series Mon..Sun
        const weeklyReps = Array(7).fill(0);
        for (const w of lastWeek) {
            const d = new Date(w.date || w.createdAt);
            // Map to Mon..Sun (0..6) with Monday=0
            let idx = d.getDay(); // 0=Sun..6=Sat
            idx = (idx + 6) % 7; // shift: Mon=0
            weeklyReps[idx] += w.exercises.reduce((s, e) => s + (e.reps || 0) * (e.sets || 0), 0);
        }

        // 4-week calories series (most recent week last)
        const monthlyCalories = [0,0,0,0];
        for (const w of workouts) {
            const dt = now - (w.date || w.createdAt);
            if (dt <= 4 * weekMs) {
                const bucket = 3 - Math.floor(dt / weekMs); // 0..3 => oldest..newest
                if (bucket >= 0 && bucket < 4) monthlyCalories[bucket] += (w.caloriesBurned || 0);
            }
        }

        const response = {
            summary: {
                caloriesWeek,
                totalRepsWeek: repsWeek,
                formAccuracy: formAccuracy4w, // average across last 4 weeks
                minutesTrained: minutesWeek,
                deltas: {
                    calories: pctDelta(caloriesWeek, caloriesPrev),
                    reps: pctDelta(repsWeek, repsPrev),
                    accuracy: pctDelta(formAccuracy4w, formPrev),
                    minutes: pctDelta(minutesWeek, minutesPrev),
                },
            },
            weeklyReps,
            monthlyCalories,
            accuracyHistory: [],
            // Back-compat for callers expecting `stats`
            stats: {
                totalWorkouts,
                totalReps,
                totalDuration,
                averageWorkoutsPerWeek,
                bmi,
            },
        };

        res.status(200).json(response);

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
