const mongoose = require('mongoose');

console.log('--- REGISTERING RATING MODEL ---');

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tmdbId: { type: Number, required: true, index: true },
    movieTitle: { type: String, default: '' },
    score: { type: Number, required: true, min: 1, max: 10 },
    review: { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// If the model already exists, use it, otherwise create it
const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);

module.exports = Rating;
