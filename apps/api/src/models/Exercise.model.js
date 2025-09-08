// apps/api/src/models/Exercise.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required.'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required.'],
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
  },
  musclesTargeted: {
    type: [String], // Array of strings, e.g., ["Quadriceps", "Glutes"]
    required: true,
  },
  videoUrl: {
    type: String, // A URL to a demonstration video
    trim: true,
  },
}, {
  timestamps: true,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
