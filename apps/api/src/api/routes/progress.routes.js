const express = require('express');
const router = express.Router();
const { getProgressAnalytics } = require('../controllers/progress.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/progress:
 * get:
 * summary: Retrieve user's progress analytics
 * tags: [Progress]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: period
 * schema:
 * type: string
 * enum: [weekly, monthly]
 * default: weekly
 * description: The time period for the analytics (weekly or monthly).
 * responses:
 * 200:
 * description: Analytics data retrieved successfully.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * analytics:
 * type: object
 * properties:
 * caloriesBurnedTrend:
 * type: array
 * items:
 * type: object
 * properties:
 * date:
 * type: string
 * format: date
 * value:
 * type: number
 * repsVolumeTrend:
 * type: array
 * items:
 * type: object
 * properties:
 * date:
 * type: string
 * format: date
 * value:
 * type: number
 * accuracyTrend:
 * type: array
 * items:
 * type: object
 * properties:
 * date:
 * type: string
 * format: date
 * value:
 * type: number
 * bestScore:
 * type: object
 * properties:
 * score:
 * type: number
 * exercise:
 * type: string
 * date:
 * type: string
 * format: date-time
 * totalWorkouts:
 * type: integer
 * 401:
 * description: Unauthorized, token is missing or invalid.
 * 500:
 * description: Internal server error.
 */
router.get('/', authMiddleware, getProgressAnalytics);

module.exports = router;
