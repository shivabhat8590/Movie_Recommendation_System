const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tmdbId: { type: Number, required: true, index: true },
    movieTitle: { type: String, default: '' },
    posterPath: { type: String, default: '' },
    genres: [{ type: String }],
    releaseYear: { type: Number },
    duration: { type: Number, default: 0 },
    watchedDuration: { type: Number, default: 0 },
    watchedAt: { type: Date, default: Date.now },
    rewatchCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

watchHistorySchema.index({ userId: 1, tmdbId: 1 }, { unique: true });

module.exports = mongoose.model('WatchHistory', watchHistorySchema);
