const https = require('https');
const Plan = require('../../models/Plan.model');
const Exercise = require('../../models/Exercise.model');

function buildPrompt(user, extra = {}) {
  const goals = (user?.fitnessGoals || []).join(', ');
  const age = user?.age ? `${user.age}` : 'unknown';
  const height = user?.height ? `${user.height} cm` : 'unknown';
  const weight = user?.weight ? `${user.weight} kg` : 'unknown';
  const allowedExercises = Array.isArray(extra.allowedExercises) && extra.allowedExercises.length
    ? extra.allowedExercises
    : [];
  const header = `Create a 7-day workout and diet plan personalized to the following user profile. Return STRICT JSON only, matching the schema.

User Profile:
- Name: ${user?.name || 'User'}
- Age: ${age}
- Height: ${height}
- Weight: ${weight}
- Goals: ${goals || 'general fitness'}

Requirements:
- Provide weeklyPlan: array of 7 days with day, focus, items (array of exercises), and optional sets/reps or duration per item.
- IMPORTANT: For weeklyPlan.items, you MUST choose exercise names ONLY from the Allowed Exercises list below, EXACTLY as written (case and punctuation must match). Do not invent, pluralize, or use synonyms.
- Provide diet: macros (per kg bodyweight: protein, carbs, fats), guidance note, and sampleMeals (breakfast, lunch, snack, dinner strings).
- Provide calories: maintainLow, maintainHigh (daily kcal), and delta (e.g., -400 for fat loss or +250 for muscle).
- Keep exercises bodyweight or light equipment by default.
- Keep language concise.

Allowed Exercises:
${allowedExercises.length ? allowedExercises.map((n) => `- ${n}`).join('\n') : '- (none provided)'}

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

    // Fetch allowed exercise names from DB (canonical list)
    const allExercises = await Exercise.find({}, 'name').sort({ name: 1 }).lean();
    const allowedNames = allExercises.map((e) => e.name);

    const prompt = buildPrompt(user, { allowedExercises: allowedNames });
    const { text } = await callGemini({ apiKey, model, prompt });
    let planObject = tryExtractJson(text);

    // Post-process planObject to strictly use allowed exercise names
    if (planObject && Array.isArray(planObject.weeklyPlan)) {
      const normMap = new Map();
      const toKey = (s) => String(s || '').trim().toLowerCase()
        .replace(/\([^)]*\)/g, '') // remove parenthetical
        .replace(/[^a-z0-9]+/g, ' ') // collapse punctuation
        .replace(/\s+/g, ' ') // trim spaces
        .trim();
      for (const name of allowedNames) normMap.set(toKey(name), name);

      function bestMatch(raw) {
        const k = toKey(raw);
        if (normMap.has(k)) return normMap.get(k);
        // Try naive singularization for common plurals
        const singular = k.endsWith('s') ? k.slice(0, -1) : k;
        if (normMap.has(singular)) return normMap.get(singular);
        // Common manual mappings (plural -> singular)
        const manual = new Map([
          ['push ups', 'Push-up'],
          ['pushup', 'Push-up'],
          ['pushups', 'Push-up'],
          ['squat', 'Squat'],
          ['squats', 'Squat'],
          ['lunge', 'Lunge'],
          ['lunges', 'Lunge'],
          ['bicep curl', 'Bicep Curl'],
          ['bicep curls', 'Bicep Curl'],
          ['tricep dip', 'Tricep Dip'],
          ['tricep dips', 'Tricep Dip'],
          ['mountain climber', 'Mountain Climber'],
          ['mountain climbers', 'Mountain Climber'],
          ['jumping jack', 'Jumping Jack'],
          ['jumping jacks', 'Jumping Jack'],
          ['shoulder press', 'Shoulder Press'],
        ]);
        if (manual.has(k)) return manual.get(k);
        if (manual.has(singular)) return manual.get(singular);
        return null;
      }

      planObject.weeklyPlan = planObject.weeklyPlan.map((day) => {
        const items = Array.isArray(day.items) ? day.items : [];
        const mapped = items
          .map((it) => bestMatch(it))
          .filter((x) => !!x);
        // If nothing matched, provide a small default from allowed list to avoid empty days
        const safeItems = mapped.length ? mapped : allowedNames.slice(0, Math.min(4, allowedNames.length));
        return { ...day, items: Array.from(new Set(safeItems)) };
      });
    }

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
    let { planObject, planText, provider = 'google', model = 'gemini-1.5-flash' } = req.body || {};
    if (!planObject && !planText) return res.status(400).json({ message: 'Missing planObject or planText' });
    // If planObject present, sanitize items against DB exercise names
    if (planObject && Array.isArray(planObject.weeklyPlan)) {
      const allExercises = await Exercise.find({}, 'name').sort({ name: 1 }).lean();
      const allowedNames = allExercises.map((e) => e.name);
      const toKey = (s) => String(s || '').trim().toLowerCase()
        .replace(/\([^)]*\)/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const normMap = new Map();
      for (const name of allowedNames) normMap.set(toKey(name), name);
      const manual = new Map([
        ['push ups', 'Push-up'],
        ['pushup', 'Push-up'],
        ['pushups', 'Push-up'],
        ['squat', 'Squat'],
        ['squats', 'Squat'],
        ['lunge', 'Lunge'],
        ['lunges', 'Lunge'],
        ['bicep curl', 'Bicep Curl'],
        ['bicep curls', 'Bicep Curl'],
        ['tricep dip', 'Tricep Dip'],
        ['tricep dips', 'Tricep Dip'],
        ['mountain climber', 'Mountain Climber'],
        ['mountain climbers', 'Mountain Climber'],
        ['jumping jack', 'Jumping Jack'],
        ['jumping jacks', 'Jumping Jack'],
        ['shoulder press', 'Shoulder Press'],
      ]);
      const best = (raw) => {
        const k = toKey(raw);
        if (normMap.has(k)) return normMap.get(k);
        const singular = k.endsWith('s') ? k.slice(0, -1) : k;
        if (normMap.has(singular)) return normMap.get(singular);
        if (manual.has(k)) return manual.get(k);
        if (manual.has(singular)) return manual.get(singular);
        return null;
      };
      planObject.weeklyPlan = planObject.weeklyPlan.map((day) => {
        const items = Array.isArray(day.items) ? day.items : [];
        const mapped = items.map(best).filter(Boolean);
        const safeItems = mapped.length ? mapped : allowedNames.slice(0, Math.min(4, allowedNames.length));
        return { ...day, items: Array.from(new Set(safeItems)) };
      });
    }
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
