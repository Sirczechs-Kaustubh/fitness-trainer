// apps/api/src/models/User.model.js

// Import necessary modules from mongoose and bcryptjs for schema creation and password hashing.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @schema UserSchema
 * @description Defines the data structure for users in the database.
 * This schema includes personal details, authentication credentials, and fitness-related information.
 * It also includes timestamps to automatically track creation and update times.
 */
const UserSchema = new mongoose.Schema({
    // User's full name. This field is required.
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
    },
    // User's email address. It must be unique and is required for login and communication.
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    // User's password. It is required for authentication and will be hashed before saving.
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false, // Prevents password from being sent back in queries by default
    },
    // Optional fields for user profile
    age: {
        type: Number,
    },
    weight: {
        type: Number, // in kilograms
    },
    height: {
        type: Number, // in centimeters
    },
    fitnessGoals: {
        type: [String], // An array of strings to list multiple goals
        default: [],
    },
}, {
    // Automatically add 'createdAt' and 'updatedAt' fields to the document.
    timestamps: true,
});

/**
 * @middleware pre('save')
 * @description Mongoose middleware that runs before a 'User' document is saved to the database.
 * Its primary purpose is to hash the user's password for security if it has been modified.
 */
UserSchema.pre('save', async function(next) {
    // Only run this function if the password was actually modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate a salt with a cost factor of 10.
        const salt = await bcrypt.genSalt(10);
        // Hash the password using the generated salt.
        this.password = await bcrypt.hash(this.password, salt);
        // Proceed to the next middleware or save operation.
        next();
    } catch (error) {
        // If an error occurs during hashing, pass it to the next middleware.
        next(error);
    }
});

// Create the User model from the schema.
const User = mongoose.model('User', UserSchema);

// Export the User model to be used in other parts of the application.
module.exports = User;
