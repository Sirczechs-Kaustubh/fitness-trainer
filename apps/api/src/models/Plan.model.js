const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, default: 'google' },
  model: { type: String, default: 'gemini-1.5-flash' },
  promptVersion: { type: String, default: 'v1' },
  // Store either structured object or raw text
  planObject: { type: Object },
  planText: { type: String },
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;

