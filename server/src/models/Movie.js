const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    originalTitle: { type: String },
    overview: { type: String, default: '' },
    genres: [{ id: Number, name: String }],
    director: { type: String, default: '' },
    cast: [{ id: Number, name: String, character: String, profilePath: String }],
    releaseDate: { type: String },
    releaseYear: { type: Number, index: true },
    runtime: { type: Number },
    language: { type: String, default: 'en', index: true },
    country: { type: String, default: '' },
    posterPath: { type: String, default: '' },
    backdropPath: { type: String, default: '' },
    tmdbRating: { type: Number, default: 0 },
    tmdbVoteCount: { type: Number, default: 0 },
    keywords: [{ type: String }],
    trendingScore: { type: Number, default: 0, index: true },
    popularity: { type: Number, default: 0 },
    adult: { type: Boolean, default: false },
    status: { type: String, default: 'Released' },
    imdbRating: { type: String, default: 'N/A' },
    rottenTomatoesRating: { type: String, default: 'N/A' },
    metacriticRating: { type: String, default: 'N/A' },
    tagline: { type: String, default: '' },
    budget: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    productionCompanies: [{ id: Number, name: String, logoPath: String }],
    spokenLanguages: [{ code: String, name: String }],
    trailerKey: { type: String, default: '' },
    streamingPlatforms: [
      {
        platform: String,
        link: String,
        type: { type: String, enum: ['subscription', 'rent', 'buy'] },
      },
    ],
  },
  { timestamps: true }
);

movieSchema.index({ title: 'text', overview: 'text', keywords: 'text' }, { language_override: 'dummy' });
movieSchema.index({ 'genres.name': 1 });

module.exports = mongoose.model('Movie', movieSchema);
