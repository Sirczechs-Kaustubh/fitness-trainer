// apps/api/src/models/Workout.model.js

// Import the mongoose module to define a schema and model.
const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * @schema ExerciseSchema
 * @description A sub-document schema to detail individual exercises within a workout session.
 * This is not a model itself but will be embedded within the Workout model.
 */
const ExerciseSchema = new Schema({
    // The name of the exercise, e.g., "Push-up", "Squat".
    name: {
        type: String,
        required: [true, 'Exercise name is required'],
        trim: true,
    },
    // The number of repetitions performed in each set.
    reps: {
        type: Number,
        required: [true, 'Reps are required'],
    },
    // The number of sets completed for the exercise.
    sets: {
        type: Number,
        required: [true, 'Sets are required'],
    },
    // A score from the AI trainer evaluating the user's form, typically on a scale (e.g., 1-100).
    formScore: {
        type: Number,
        min: 0,
        max: 100,
    },
});

/**
 * @schema WorkoutSchema
 * @description Defines the data structure for a workout session.
 * Each workout is linked to a user and contains details about the session.
 */
const WorkoutSchema = new Schema({
    // A reference to the User who performed this workout. This creates a link between the two models.
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // This must match the model name we gave to mongoose.model() for the User
        required: true,
        index: true, // Adding an index on the user field can improve query performance
    },
    // An array of exercises performed during the session, using the sub-document schema defined above.
    exercises: [ExerciseSchema],
    // The total duration of the workout session in minutes.
    duration: {
        type: Number, // Stored in minutes
        required: [true, 'Workout duration is required'],
    },
    // An estimate of the total calories burned during the session.
    caloriesBurned: {
        type: Number,
    },
    // The date and time when the workout session occurred. Defaults to the current date and time.
    date: {
        type: Date,
        default: Date.now,
    },
}, {
    // Automatically add 'createdAt' and 'updatedAt' fields.
    timestamps: true,
});

// Create the Workout model from the schema.
const Workout = mongoose.model('Workout', WorkoutSchema);

// Export the Workout model for use in other parts of the application.
module.exports = Workout;
