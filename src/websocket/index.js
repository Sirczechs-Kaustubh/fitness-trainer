// apps/api/src/websocket/index.js

// Import the Server class from the 'socket.io' library.
const { Server } = require('socket.io');

/**
 * @function initializeSocket
 * @description Creates and configures the Socket.IO server instance.
 * @param {object} httpServer - The Node.js HTTP server to attach the WebSocket server to.
 * @returns {object} The configured Socket.IO server instance.
 */
const initializeSocket = (httpServer) => {
    // Create a new Socket.IO server and attach it to the provided HTTP server.
    // Configure CORS to allow connections from your frontend's origin.
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000", // Allow frontend to connect
            methods: ["GET", "POST"]
        }
    });

    // --- Main Connection Handler ---
    // This event listener runs whenever a new client connects to the Socket.IO server.
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);

        // --- Workout Event Listeners ---

        // Listen for a 'session:start' event from a client.
        socket.on('session:start', (data) => {
            console.log(`[Socket ${socket.id}] Workout session started:`, data);
            // Here you could create a new workout document in the database
            // or join the user to a specific room for the session.
            socket.join(data.sessionId); // Example: join a room based on session ID
        });

        // Listen for 'pose:update' events, which will stream in real-time from the client.
        socket.on('pose:update', (data) => {
            // This is where the core real-time logic will happen.
            // The 'data' object would contain pose estimation coordinates.
            console.log(`[Socket ${socket.id}] Pose update received for session ${data.sessionId}`);

            // TODO: In a full implementation, you would pass this data to a "rules engine"
            // to analyze the form, count reps, and provide feedback.
            // e.g., const feedback = ExerciseRules.processPose(data.exercise, data.pose);

            // For now, we can just broadcast the received data to other clients in the room (if any)
            // or send feedback back to the original client.
            // socket.to(data.sessionId).emit('feedback:new', feedback);
        });

        // Listen for a 'session:end' event from a client.
        socket.on('session:end', (data) => {
            console.log(`[Socket ${socket.id}] Workout session ended:`, data);
            // Here you would finalize the workout, calculate final stats (duration, calories),
            // and save the complete workout session to the database.
            socket.leave(data.sessionId);
        });

        // --- Disconnect Handler ---
        // Listen for the built-in 'disconnect' event.
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    return io;
};

// Export the initializer function.
module.exports = initializeSocket;
