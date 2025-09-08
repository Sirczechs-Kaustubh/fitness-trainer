// apps/api/src/api/routes/plan.routes.js

const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { generatePlan, savePlan, getLatestPlan } = require('../controllers/plan.controller');

const router = express.Router();

router.post('/generate', authMiddleware, generatePlan);
router.post('/save', authMiddleware, savePlan);
router.get('/latest', authMiddleware, getLatestPlan);

module.exports = router;

