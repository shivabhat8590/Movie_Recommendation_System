const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { type: String, required: true },
  criteria: {
    type: { type: String, enum: ['watch_count', 'rate_count', 'mood_count', 'genre_count', 'login_streak'] },
    value: { type: Number, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
