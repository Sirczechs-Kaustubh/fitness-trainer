const Workout = require('../../models/Workout.model');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/responseHandler');

/**
 * @desc    Get user progress analytics
 * @route   GET /api/v1/progress
 * @access  Private
 */
const getProgressAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { period = 'weekly' } = req.query; // Default to 'weekly' if not provided

    // 1. Define the time window for the analysis
    const now = new Date();
    let startDate;

    if (period.toLowerCase() === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else { // Default to weekly
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }

    // 2. Retrieve all of the user's completed workouts within the time frame
    const workouts = await Workout.find({
        user: userId,
        status: 'completed',
        endTime: { $gte: startDate }
    }).populate('exercises.exercise');

    if (!workouts || workouts.length === 0) {
        return successResponse(res, 200, {
            message: "No workout data found for the selected period.",
            analytics: {
                caloriesBurnedTrend: [],
                repsVolumeTrend: [],
                accuracyTrend: [],
                bestScore: null,
                totalWorkouts: 0,
            }
        });
    }

    // 3. Aggregate the filtered data to calculate key progress metrics
    const analytics = {
        caloriesBurnedTrend: {},
        repsVolumeTrend: {},
        accuracyTrend: {},
        bestScore: { score: 0, exercise: null, date: null },
        totalWorkouts: workouts.length,
    };

    workouts.forEach(workout => {
        const dateKey = workout.endTime.toISOString().split('T')[0]; // Group by day (YYYY-MM-DD)

        // Initialize daily aggregates if they don't exist
        if (!analytics.caloriesBurnedTrend[dateKey]) analytics.caloriesBurnedTrend[dateKey] = 0;
        if (!analytics.repsVolumeTrend[dateKey]) analytics.repsVolumeTrend[dateKey] = 0;
        if (!analytics.accuracyTrend[dateKey]) analytics.accuracyTrend[dateKey] = { totalScore: 0, count: 0 };

        // Aggregate Calories Burned
        analytics.caloriesBurnedTrend[dateKey] += workout.caloriesBurned;

        let workoutTotalScore = 0;
        let exerciseCount = 0;

        workout.exercises.forEach(ex => {
            // Aggregate Reps Volume
            const volume = (ex.reps || 0) * (ex.sets || 0);
            analytics.repsVolumeTrend[dateKey] += volume;

            // Aggregate Accuracy (Form Score)
            if (ex.formScore) {
                workoutTotalScore += ex.formScore;
                exerciseCount++;
            }
            
            // Find Best Score
            if (ex.formScore > analytics.bestScore.score) {
                analytics.bestScore = {
                    score: ex.formScore,
                    exercise: ex.exercise.name,
                    date: workout.endTime
                };
            }
        });
        
        // Update daily accuracy trend
        if(exerciseCount > 0) {
            analytics.accuracyTrend[dateKey].totalScore += workoutTotalScore;
            analytics.accuracyTrend[dateKey].count += exerciseCount;
        }
    });

    // 4. Format the aggregated data for the response
    const formattedAnalytics = {
        caloriesBurnedTrend: Object.keys(analytics.caloriesBurnedTrend).map(date => ({
            date,
            value: analytics.caloriesBurnedTrend[date]
        })).sort((a, b) => new Date(a.date) - new Date(b.date)),

        repsVolumeTrend: Object.keys(analytics.repsVolumeTrend).map(date => ({
            date,
            value: analytics.repsVolumeTrend[date]
        })).sort((a, b) => new Date(a.date) - new Date(b.date)),

        accuracyTrend: Object.keys(analytics.accuracyTrend).map(date => ({
            date,
            value: analytics.accuracyTrend[date].count > 0 ? (analytics.accuracyTrend[date].totalScore / analytics.accuracyTrend[date].count) : 0
        })).sort((a, b) => new Date(a.date) - new Date(b.date)),

        bestScore: analytics.bestScore.exercise ? analytics.bestScore : null,
        totalWorkouts: analytics.totalWorkouts,
    };

    return successResponse(res, 200, {
        message: "Progress analytics retrieved successfully.",
        analytics: formattedAnalytics
    });
});

module.exports = {
    getProgressAnalytics
};
