const express = require('express');
const router = express.Router();
const {
    getWorkoutHistory,
    getWorkoutById,
    deleteWorkout
} = require('../controllers/history.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes in this file are protected by the auth middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/history:
 * get:
 * summary: Retrieve a paginated list of user's workout history
 * tags: [History]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * description: The page number for pagination.
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 10
 * description: The number of items per page.
 * responses:
 * 200:
 * description: A paginated list of workouts.
 * 401:
 * description: Unauthorized.
 */
router.get('/', getWorkoutHistory);

/**
 * @swagger
 * /api/v1/history/{workoutId}:
 * get:
 * summary: Get a single workout by its ID
 * tags: [History]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: workoutId
 * required: true
 * schema:
 * type: string
 * description: The ID of the workout to retrieve.
 * responses:
 * 200:
 * description: Detailed information about the workout.
 * 404:
 * description: Workout not found.
 * 401:
 * description: Unauthorized.
 *
 * delete:
 * summary: Delete a workout from history
 * tags: [History]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: workoutId
 * required: true
 * schema:
 * type: string
 * description: The ID of the workout to delete.
 * responses:
 * 200:
 * description: Workout deleted successfully.
 * 404:
 * description: Workout not found.
 * 401:
 * description: Unauthorized.
 */
router.route('/:workoutId')
    .get(getWorkoutById)
    .delete(deleteWorkout);

module.exports = router;
