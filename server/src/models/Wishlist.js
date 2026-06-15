const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: { type: String },
    backdropPath: { type: String },
    releaseYear: { type: Number },
    genres: [{ type: String }],
    overview: { type: String },
    tmdbRating: { type: Number },
    runtime: { type: Number },
    category: {
      type: String,
      enum: ['Watch Later', 'Favorites', 'Completed'],
      default: 'Watch Later',
    },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, tmdbId: 1 }, { unique: true });


module.exports = mongoose.model('Wishlist', wishlistSchema);
