// apps/api/src/api/controllers/exercise.controller.js

const Exercise = require('../../models/Exercise.model');

/**
 * @controller getAllExercises
 * @description Retrieves all exercises from the library with optional pagination.
 * @route GET /api/v1/exercises
 * @access Private (All authenticated users)
 */
const getAllExercises = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const exercises = await Exercise.find({}).skip(skip).limit(limit);
        const totalExercises = await Exercise.countDocuments();

        res.status(200).json({
            total: totalExercises,
            page,
            pages: Math.ceil(totalExercises / limit),
            data: exercises,
        });
    } catch (error) {
        console.error('Get All Exercises Error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @controller getExerciseById
 * @description Retrieves a single exercise by its ID.
 * @route GET /api/v1/exercises/:id
 * @access Private (All authenticated users)
 */
const getExerciseById = async (req, res) => {
    try {
        const exercise = await Exercise.findById(req.params.id);
        if (!exercise) {
            return res.status(404).json({ message: 'Exercise not found' });
        }
        res.status(200).json(exercise);
    } catch (error) {
        console.error('Get Exercise By ID Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid exercise ID' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @controller createExercise
 * @description Adds a new exercise to the library.
 * @route POST /api/v1/exercises
 * @access Admin only
 */
const createExercise = async (req, res) => {
    try {
        const { name, description, difficulty, musclesTargeted, videoUrl } = req.body;

        const newExercise = new Exercise({
            name,
            description,
            difficulty,
            musclesTargeted,
            videoUrl,
        });

        const savedExercise = await newExercise.save();
        res.status(201).json(savedExercise);
    } catch (error) {
        console.error('Create Exercise Error:', error.message);
        // Handle duplicate key error for the 'name' field
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An exercise with this name already exists.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @controller updateExercise
 * @description Updates an existing exercise by its ID.
 * @route PUT /api/v1/exercises/:id
 * @access Admin only
 */
const updateExercise = async (req, res) => {
    try {
        const updatedExercise = await Exercise.findByIdAndUpdate(
            req.params.id,
            req.body, { new: true, runValidators: true }
        );

        if (!updatedExercise) {
            return res.status(404).json({ message: 'Exercise not found' });
        }
        res.status(200).json(updatedExercise);
    } catch (error) {
        console.error('Update Exercise Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid exercise ID' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @controller deleteExercise
 * @description Deletes an exercise by its ID.
 * @route DELETE /api/v1/exercises/:id
 * @access Admin only
 */
const deleteExercise = async (req, res) => {
    try {
        const deletedExercise = await Exercise.findByIdAndDelete(req.params.id);

        if (!deletedExercise) {
            return res.status(404).json({ message: 'Exercise not found' });
        }
        res.status(200).json({ message: 'Exercise deleted successfully' });
    } catch (error) {
        console.error('Delete Exercise Error:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid exercise ID' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllExercises,
    getExerciseById,
    createExercise,
    updateExercise,
    deleteExercise,
};
