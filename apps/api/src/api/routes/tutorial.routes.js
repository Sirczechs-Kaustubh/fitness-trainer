const express = require('express');
const router = express.Router();
const { getTutorials } = require('../controllers/tutorial.controller');

/**
 * @swagger
 * /api/v1/tutorials:
 * get:
 * summary: Retrieve a list of all tutorials
 * tags: [Tutorials]
 * responses:
 * 200:
 * description: A list of tutorials.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * data:
 * type: array
 * items:
 * type: object
 * properties:
 * _id:
 * type: string
 * title:
 * type: string
 * description:
 * type: string
 * videoUrl:
 * type: string
 * steps:
 * type: array
 * items:
 * type: string
 * order:
 * type: number
 * 404:
 * description: No tutorials found.
 */
router.get('/', getTutorials);

module.exports = router;
