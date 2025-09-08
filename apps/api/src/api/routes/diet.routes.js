const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { getDailyDiet, saveDailyDiet, getDietHistory } = require('../controllers/diet.controller');

const router = express.Router();

// Daily diet (date format YYYY-MM-DD)
router.get('/:date', authMiddleware, getDailyDiet);
router.post('/:date', authMiddleware, saveDailyDiet);

// History
router.get('/', authMiddleware, getDietHistory);

module.exports = router;

