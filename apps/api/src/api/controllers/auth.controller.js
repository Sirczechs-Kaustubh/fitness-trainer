// apps/api/src/api/controllers/auth.controller.js

// Import the User model to interact with the users collection in the database.
const User = require('../../models/User.model');
// Import jsonwebtoken for creating JWTs.
const jwt = require('jsonwebtoken');
// Import bcryptjs to compare passwords during login.
const bcrypt = require('bcryptjs');

/**
 * @function generateToken
 * @description Generates a JSON Web Token (JWT) for a given user ID.
 * @param {string} id - The user's MongoDB document ID.
 * @returns {string} The generated JWT.
 */
const generateToken = (id) => {
    return jwt.sign({
        id
    }, process.env.JWT_SECRET, {
        expiresIn: '30d', // The token will expire in 30 days.
    });
};

/**
 * @controller registerUser
 * @description Handles the registration of a new user.
 * It validates input, checks for existing users, creates a new user, and returns a JWT.
 * @route POST /api/v1/auth/register
 * @access Public
 */
const registerUser = async (req, res) => {
    const {
        name,
        email,
        password
    } = req.body;

    try {
        // 1. Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Please enter all fields'
            });
        }

        // 2. Check if user already exists
        const userExists = await User.findOne({
            email
        });
        if (userExists) {
            return res.status(400).json({
                message: 'User with this email already exists'
            });
        }

        // 3. Create a new user instance. The password will be hashed by the pre-save hook in the User model.
        const user = await User.create({
            name,
            email,
            password,
        });

        // 4. If user creation is successful, generate a token and send response
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({
                message: 'Invalid user data'
            });
        }
    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

/**
 * @controller loginUser
 * @description Authenticates an existing user.
 * It finds the user by email, compares the provided password with the stored hash, and returns a JWT if successful.
 * @route POST /api/v1/auth/login
 * @access Public
 */
const loginUser = async (req, res) => {
    const {
        email,
        password
    } = req.body;

    try {
        // 1. Find the user by email. We explicitly select the password field because it's excluded by default in the schema.
        const user = await User.findOne({
            email
        }).select('+password');

        // 2. If user exists and password matches, send back user data and token
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            // 3. If user not found or password doesn't match, send an error
            res.status(401).json({
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

// Export the controller functions to be used in the auth routes.
module.exports = {
    registerUser,
    loginUser,
};
