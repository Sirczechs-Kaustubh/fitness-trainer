const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  key: { type: String, enum: ['breakfast','lunch','dinner','snack'], required: true },
  name: { type: String },
  status: { type: String, enum: ['pending','completed','skipped'], default: 'pending' },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
}, { _id: false });

const dietLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Store date normalized to 00:00:00 for easier lookups
  date: { type: Date, required: true, index: true },
  meals: { type: [mealSchema], default: [] },
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
  },
}, { timestamps: true });

dietLogSchema.index({ user: 1, date: 1 }, { unique: true });

const DietLog = mongoose.model('DietLog', dietLogSchema);
module.exports = DietLog;

