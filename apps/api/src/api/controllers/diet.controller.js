const DietLog = require('../../models/DietLog.model');
const Plan = require('../../models/Plan.model');

function normalizeDate(dStr) {
  const d = dStr ? new Date(dStr) : new Date();
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return n;
}

// GET /api/v1/diet/:date  -> returns latest plan diet snippet + existing log
const getDailyDiet = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = normalizeDate(req.params.date);

    // Latest saved plan for this user
    const planDoc = await Plan.findOne({ user: userId }).sort({ createdAt: -1 });
    const planDiet = planDoc?.planObject?.diet || null;

    const log = await DietLog.findOne({ user: userId, date });
    return res.status(200).json({ planDiet, log });
  } catch (e) {
    console.error('Get Daily Diet Error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch daily diet' });
  }
};

// POST /api/v1/diet/:date  { meals: [{ key, status, calories?, protein?, carbs?, fats?, name? }], totals? }
// Upsert daily log
const saveDailyDiet = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = normalizeDate(req.params.date);
    const payload = req.body || {};
    const meals = Array.isArray(payload.meals) ? payload.meals : [];
    const totals = payload.totals || {};

    const update = { $set: { meals, totals } };
    const opts = { new: true, upsert: true, setDefaultsOnInsert: true };
    const doc = await DietLog.findOneAndUpdate({ user: userId, date }, update, opts);
    return res.status(200).json({ message: 'Diet log saved', log: doc });
  } catch (e) {
    console.error('Save Daily Diet Error:', e.message);
    return res.status(500).json({ message: 'Failed to save daily diet' });
  }
};

// GET /api/v1/diet/history?limit=30&page=1
const getDietHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const q = { user: userId };
    const total = await DietLog.countDocuments(q);
    const logs = await DietLog.find(q).sort({ date: -1 }).skip(skip).limit(limit);
    return res.status(200).json({ total, page, pages: Math.ceil(total/limit), limit, data: logs });
  } catch (e) {
    console.error('Diet History Error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch diet history' });
  }
};

module.exports = { getDailyDiet, saveDailyDiet, getDietHistory };

