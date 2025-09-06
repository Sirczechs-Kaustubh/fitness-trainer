const https = require('https');
const Plan = require('../../models/Plan.model');

function buildPrompt(user, extra = {}) {
  const goals = (user?.fitnessGoals || []).join(', ');
  const age = user?.age ? `${user.age}` : 'unknown';
  const height = user?.height ? `${user.height} cm` : 'unknown';
  const weight = user?.weight ? `${user.weight} kg` : 'unknown';
  const header = `Create a 7-day workout and diet plan personalized to the following user profile. Return STRICT JSON only, matching the schema.

User Profile:
- Name: ${user?.name || 'User'}
- Age: ${age}
- Height: ${height}
- Weight: ${weight}
- Goals: ${goals || 'general fitness'}

Requirements:
- Provide weeklyPlan: array of 7 days with day, focus, items (array of exercises), and optional sets/reps or duration per item.
- Provide diet: macros (per kg bodyweight: protein, carbs, fats), guidance note, and sampleMeals (breakfast, lunch, snack, dinner strings).
- Provide calories: maintainLow, maintainHigh (daily kcal), and delta (e.g., -400 for fat loss or +250 for muscle).
- Keep exercises bodyweight or light equipment by default.
- Keep language concise.

JSON Schema:
{
  "overview": "string",
  "weeklyPlan": [
    { "day": "Mon", "focus": "string", "items": ["string"], "sets": "string", "reps": "string", "duration": "string" }
  ],
  "diet": {
    "macros": { "protein": "number", "carbs": "number", "fats": "number" },
    "note": "string",
    "sampleMeals": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" }
  },
  "calories": { "maintainLow": "number", "maintainHigh": "number", "delta": "number" }
}`;
  return header;
}

async function callGemini({ apiKey, model = 'gemini-1.5-flash', prompt }) {
  const path = `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }]}],
  });

  const resText = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  let parsed;
  try { parsed = JSON.parse(resText); } catch { throw new Error('Invalid response from provider'); }
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { raw: parsed, text };
}

function tryExtractJson(text) {
  if (!text || typeof text !== 'string') return null;
  // Try fenced code block first
  const m = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  let str = m ? m[1] : text;
  // Attempt to locate the first JSON object
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  str = str.slice(start, end + 1);
  try { return JSON.parse(str); } catch { return null; }
}

// POST /api/v1/plans/generate  { apiKey, provider?, model?, save? }
const generatePlan = async (req, res) => {
  try {
    const user = req.user;
    const { apiKey, provider = 'google', model = 'gemini-1.5-flash', save = false } = req.body || {};
    if (!apiKey) return res.status(400).json({ message: 'Missing apiKey (BYOK)' });
    if (provider !== 'google') return res.status(400).json({ message: 'Only provider "google" (Gemini) is supported for now' });

    const prompt = buildPrompt(user);
    const { text } = await callGemini({ apiKey, model, prompt });
    const planObject = tryExtractJson(text);

    let saved = null;
    if (save) {
      const doc = new Plan({ user: user._id, provider, model, promptVersion: 'v1', planObject: planObject || undefined, planText: planObject ? undefined : text });
      saved = await doc.save();
    }

    return res.status(200).json({
      provider,
      model,
      planObject,
      planText: planObject ? undefined : text,
      savedId: saved?._id,
    });
  } catch (e) {
    console.error('Generate Plan Error:', e.message);
    return res.status(500).json({ message: 'Failed to generate plan', error: e.message });
  }
};

// POST /api/v1/plans/save  { planObject?, planText? }
const savePlan = async (req, res) => {
  try {
    const user = req.user;
    const { planObject, planText, provider = 'google', model = 'gemini-1.5-flash' } = req.body || {};
    if (!planObject && !planText) return res.status(400).json({ message: 'Missing planObject or planText' });
    const doc = new Plan({ user: user._id, provider, model, promptVersion: 'v1', planObject, planText });
    await doc.save();
    return res.status(201).json({ message: 'Plan saved', id: doc._id });
  } catch (e) {
    console.error('Save Plan Error:', e.message);
    return res.status(500).json({ message: 'Failed to save plan' });
  }
};

// GET /api/v1/plans/latest
const getLatestPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const plan = await Plan.findOne({ user: userId }).sort({ createdAt: -1 });
    if (!plan) return res.status(200).json({ plan: null });
    return res.status(200).json({ plan });
  } catch (e) {
    console.error('Get Latest Plan Error:', e.message);
    return res.status(500).json({ message: 'Failed to fetch latest plan' });
  }
};

module.exports = { generatePlan, savePlan, getLatestPlan };

