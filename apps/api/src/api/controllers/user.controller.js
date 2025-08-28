// apps/api/src/api/controllers/user.controller.js

// Import the User model to interact with the database.
const User = require('../../models/User.model');

/**
 * @controller getUserProfile
 * @description Retrieves the profile of the currently authenticated user.
 * The user's ID is obtained from the req.user object, which is attached by the authMiddleware.
 * @route GET /api/v1/users/me
 * @access Private
 */
const getUserProfile = async (req, res) => {
    try {
        // The user object is attached to the request in the authMiddleware.
        // We can directly send it as the response.
        const user = req.user;

        if (user) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                weight: user.weight,
                height: user.height,
                fitnessGoals: user.fitnessGoals,
            });
        } else {
            // This case is unlikely if authMiddleware is working correctly, but it's good practice.
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Get Profile Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

/**
 * @controller updateUserProfile
 * @description Updates the profile of the currently authenticated user.
 * It finds the user by their ID and updates their information with the data provided in the request body.
 * @route PUT /api/v1/users/me
 * @access Private
 */
const updateUserProfile = async (req, res) => {
    try {
        // Find the user by the ID from the token.
        const user = await User.findById(req.user.id);

        if (user) {
            // Update the user fields with data from the request body, or keep the existing value if not provided.
            user.name = req.body.name || user.name;
            user.age = req.body.age || user.age;
            user.weight = req.body.weight || user.weight;
            user.height = req.body.height || user.height;
            user.fitnessGoals = req.body.fitnessGoals || user.fitnessGoals;

            // Note: Email and password changes should typically be handled in separate, dedicated routes
            // for security and clarity, so we are not handling them here.

            // Save the updated user document to the database.
            const updatedUser = await user.save();

            // Send back the updated user profile.
            res.status(200).json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                age: updatedUser.age,
                weight: updatedUser.weight,
                height: updatedUser.height,
                fitnessGoals: updatedUser.fitnessGoals,
            });
        } else {
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Update Profile Error:', error.message);
        res.status(500).json({
            message: 'Server Error'
        });
    }
};

// Export the controller functions.
module.exports = {
    getUserProfile,
    updateUserProfile,
};
