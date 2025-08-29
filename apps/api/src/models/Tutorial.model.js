const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const tutorialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Tutorial title is required.'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Tutorial description is required.'],
    },
    videoUrl: {
        type: String,
        // Optional: Add validation for a valid URL format if needed
    },
    steps: {
        type: [String],
        default: [],
    },
    order: {
        type: Number,
        required: true,
        default: 0,
        index: true, // Index for faster sorting
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

tutorialSchema.plugin(mongoosePaginate);

const Tutorial = mongoose.model('Tutorial', tutorialSchema);

module.exports = Tutorial;
