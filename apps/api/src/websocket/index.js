// apps/api/src/websocket/index.js (Modified)

const { Server } = require('socket.io');
const Workout = require('../models/Workout.model');
const Exercise = require('../models/Exercise.model'); // <-- 1. IMPORT THE EXERCISE MODEL
const mongoose = require('mongoose');

// --- Import Exercise Processors ---
// 2. UPDATED KEYS TO MATCH DATABASE NAMES (Capitalized)
const exerciseProcessors = {
  Squat: require('./rules/squat'),
  Lunge: require('./rules/lunge'),
  'Push-up': require('./rules/pushup'),
  'Bicep Curl': require('./rules/bicepCurl'),
  'Shoulder Press': require('./rules/shoulderPress'),
  'Jumping Jack': require('./rules/jumpingJack'),
  'Tricep Dip': require('./rules/tricepDip'),
  'Mountain Climber': require('./rules/mountainClimber'),
};

const activeSessions = new Map();

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // --- Workout Event Listeners ---

    // 3. MODIFIED 'session:start' TO BE ASYNC AND VALIDATE AGAINST DB
    socket.on('session:start', async (data) => {
      console.log(`[Socket ${socket.id}] Session started request:`, data);
      const { exercise, userId } = data;

      try {
        // First, check if the exercise exists in the database
        const exerciseData = await Exercise.findOne({ name: exercise });

        if (!exerciseData) {
          console.error(`[Socket ${socket.id}] Invalid exercise requested: ${exercise}`);
          return socket.emit('error', { message: `Exercise '${exercise}' not found in the library.` });
        }

        // Next, check if we have a rule processor for this valid exercise
        const Processor = exerciseProcessors[exerciseData.name];
        if (!Processor) {
          console.error(`[Socket ${socket.id}] No rule processor for exercise: ${exercise}`);
          return socket.emit('error', { message: `Sorry, real-time analysis for '${exercise}' is not available yet.` });
        }

        // If both checks pass, create the session
        activeSessions.set(socket.id, {
          processor: new Processor(),
          exerciseName: exerciseData.name, // Use the name from the DB
          userId: userId,
          startTime: Date.now(),
          repHistory: [],
        });

        console.log(`[Socket ${socket.id}] Started tracking exercise: ${exerciseData.name}`);
        socket.emit('session:ready'); // Inform client we're ready

      } catch (err) {
        console.error(`[Socket ${socket.id}] Error starting session:`, err);
        socket.emit('error', { message: 'A server error occurred while starting the session.' });
      }
    });

    socket.on('pose:update', (data) => {
      const session = activeSessions.get(socket.id);
      if (session && session.processor) {
        const result = session.processor.process(data.poseLandmarks);
        socket.emit('feedback:new', {
          repCount: result.repCount,
          feedback: result.feedback,
          stage: result.stage,
          score: typeof result.score === 'number' ? Math.max(0, Math.min(100, Math.round(result.score))) : undefined,
        });

        const lastRepCount = session.repHistory.length > 0 ? session.repHistory[session.repHistory.length - 1] : 0;
        if (result.repCount > lastRepCount) {
          session.repHistory.push({ rep: result.repCount, timestamp: Date.now() });
        }
      }
    });

    socket.on('session:end', async (data) => {
      console.log(`[Socket ${socket.id}] Session ended.`);
      const session = activeSessions.get(socket.id);

      if (session) {
        try {
          const workoutDurationSeconds = (Date.now() - session.startTime) / 1000;
          const workoutDurationMinutes = workoutDurationSeconds / 60;
          const totalReps = session.processor.repCount || 0;

          const exerciseData = {
            name: session.exerciseName,
            reps: totalReps,
            sets: 1,
          };

          const newWorkout = new Workout({
            user: new mongoose.Types.ObjectId(session.userId),
            exercises: [exerciseData],
            duration: workoutDurationMinutes.toFixed(2),
          });

          await newWorkout.save();
          console.log(`[Socket ${socket.id}] Workout saved for user ${session.userId}.`);
          
          socket.emit('session:summary', {
            message: 'Workout saved successfully!',
            summary: {
              exercise: session.exerciseName,
              reps: totalReps,
              sets: 1,
              duration: workoutDurationSeconds.toFixed(1),
            }
          });

        } catch (error) {
            console.error(`[Socket ${socket.id}] Failed to save workout:`, error);
            socket.emit('error', { message: 'Failed to save your workout session.' });
        } finally {
            activeSessions.delete(socket.id);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      if (activeSessions.has(socket.id)) {
        activeSessions.delete(socket.id);
        console.log(`[Socket ${socket.id}] Cleared active session due to disconnect.`);
      }
    });
  });

  return io;
};

module.exports = initializeSocket;
