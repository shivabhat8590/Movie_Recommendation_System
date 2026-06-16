const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityType: {
      type: String,
      enum: [
        'movie_view',
        'movie_click',
        'watchlist_add',
        'watchlist_remove',
        'rating_submit',
        'review_post',
        'search_perform',
        'chatbot_conversation'
      ],
      required: true
    },
    metadata: {
      tmdbId: { type: Number },
      movieTitle: { type: String },
      score: { type: Number },
      reviewText: { type: String },
      searchQuery: { type: String },
      chatMessage: { type: String },
      genres: [{ type: String }],
    },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
