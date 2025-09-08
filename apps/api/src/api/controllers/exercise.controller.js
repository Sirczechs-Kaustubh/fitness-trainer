// apps/api/src/api/controllers/exercise.controller.js

const Exercise = require('../../models/Exercise.model');
const Tutorial = require('../../models/Tutorial.model');

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
    getExerciseExample,
};

/**
 * @controller getExerciseExample
 * @description Returns a best instructional URL for an exercise name. Prefers Exercise.videoUrl; falls back to Tutorial.videoUrl.
 * @route GET /api/v1/exercises/example?name=Push-up
 * @access Private (All authenticated users)
 */
async function getExerciseExample(req, res) {
    try {
        const name = (req.query.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Missing name query param' });

        // 1) Try exact exercise name match
        const ex = await Exercise.findOne({ name });
        if (ex && ex.videoUrl) {
            return res.status(200).json({ name: ex.name, videoUrl: ex.videoUrl, source: 'exercise', exerciseId: ex._id });
        }

        // 2) Try case-insensitive like match in exercises
        if (!ex) {
            const ex2 = await Exercise.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (ex2 && ex2.videoUrl) {
                return res.status(200).json({ name: ex2.name, videoUrl: ex2.videoUrl, source: 'exercise', exerciseId: ex2._id });
            }
        }

        // 3) Fallback to Tutorials: exact title
        const tut = await Tutorial.findOne({ title: name }).sort({ order: 'asc' });
        if (tut && tut.videoUrl) {
            return res.status(200).json({ name: tut.title, videoUrl: tut.videoUrl, source: 'tutorial', tutorialId: tut._id });
        }

        // 4) Fallback to Tutorials: contains name (case-insensitive)
        const tut2 = await Tutorial.findOne({ title: { $regex: new RegExp(name, 'i') } }).sort({ order: 'asc' });
        if (tut2 && tut2.videoUrl) {
            return res.status(200).json({ name: tut2.title, videoUrl: tut2.videoUrl, source: 'tutorial', tutorialId: tut2._id });
        }

        return res.status(404).json({ message: 'No example video found for exercise' });
    } catch (error) {
        console.error('Get Exercise Example Error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
}
