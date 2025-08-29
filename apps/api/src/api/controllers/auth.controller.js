// apps/api/src/api/controllers/auth.controller.js

const User = require('../../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Ensure this is the native Node.js crypto module
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse, errorResponse } = require('../../utils/responseHandler');

// --- Helper function to generate JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

/**
 * @controller registerUser
 */
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        return errorResponse(res, 400, 'User with this email already exists');
    }

    const user = await User.create({ name, email, password });

    if (user) {
        successResponse(res, 201, {
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        errorResponse(res, 400, 'Invalid user data');
    }
});

/**
 * @controller loginUser
 */
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
        successResponse(res, 200, {
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        errorResponse(res, 401, 'Invalid email or password');
    }
});

/**
 * @controller logoutUser
 */
const logoutUser = asyncHandler(async (req, res) => {
    successResponse(res, 200, { message: 'Logged out successfully' });
});

/**
 * @controller forgotPassword
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return errorResponse(res, 400, 'Please provide an email');
    }

    const user = await User.findOne({ email });
    if (!user) {
        return successResponse(res, 200, { message: 'If a user with that email exists, a token has been generated.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    successResponse(res, 200, {
        message: 'Token generated successfully. Use this token to reset your password.',
        resetToken: resetToken,
    });
});

/**
 * @controller resetPassword
 */
const resetPassword = asyncHandler(async (req, res) => {
    // 1. Hash the token from the URL to match the one in the DB
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // 2. Find the user by the hashed token and check if it's not expired
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return errorResponse(res, 400, 'Token is invalid or has expired');
    }

    if (!req.body.password || req.body.password.length < 6) {
        return errorResponse(res, 400, 'Please provide a new password with at least 6 characters');
    }

    // 3. Update password and clear the reset token fields
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save(); // The pre-save hook will hash the new password

    // 4. Log the user in by sending a new JWT
    const token = generateToken(user._id);
    successResponse(res, 200, {
        message: 'Password reset successful.',
        token,
    });
});

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
};
