// apps/api/src/config/database.js

// Import the mongoose library, which is an Object Data Modeling (ODM) library for MongoDB and Node.js.
const mongoose = require('mongoose');

/**
 * @function connectDB
 * @description Establishes a connection to the MongoDB database using Mongoose.
 * The function is asynchronous and uses the MONGO_URI environment variable for the connection string.
 * It includes error handling to log and exit the process if the connection fails.
 */
const connectDB = async () => {
    try {
        // Attempt to connect to the database using the URI from environment variables.
        // The options { useNewUrlParser: true, useUnifiedTopology: true } are recommended by Mongoose
        // for stable connections, although they are default in recent versions.
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // If the connection is successful, log a confirmation message to the console.
        // The 'conn.connection.host' property shows which host the application is connected to.
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // If an error occurs during the connection attempt, log the error message.
        console.error(`Error: ${error.message}`);
        // Exit the Node.js process with a failure code (1) to prevent the app from running without a database connection.
        process.exit(1);
    }
};

// Export the connectDB function to be used in the main server entry point (index.js).
module.exports = connectDB;
