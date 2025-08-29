const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const exerciseLogSchema = new mongoose.Schema({
    exercise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exercise',
    },
    name: {
        type: String,
        required: [true, 'Exercise name is required'],
    },
    reps: {
        type: Number,
        default: 0,
    },
    sets: {
        type: Number,
        default: 0,
    },
    formScore: {
        type: Number,
        min: 0,
        max: 100,
    },
}, { _id: false });

const workoutSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['in-progress', 'completed'],
        default: 'in-progress',
    },
    plannedExercises: {
        type: [String],
    },
    exercises: [exerciseLogSchema],
    date: {
        type: Date,
        default: Date.now,
    },
    duration: { // in minutes
        type: Number,
        default: 0,
    },
    caloriesBurned: {
        type: Number,
        default: 0,
    },
    endTime: { // <-- THE FIX IS HERE
        type: Date,
        index: true,
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
});

workoutSchema.plugin(mongoosePaginate);

const Workout = mongoose.model('Workout', workoutSchema);

module.exports = Workout;
