// apps/api/src/models/User.model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Ensure this is the native Node.js crypto module

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false,
    },
    age: Number,
    role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
    },
    weight: Number,
    height: Number,
    fitnessGoals: { type: [String], default: [] },
    passwordResetToken: String,
    passwordResetExpires: Date,
}, { timestamps: true });

// Mongoose middleware to hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to generate and hash the password reset token
UserSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expiration to 10 minutes from now
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken; // Return the unhashed token
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
