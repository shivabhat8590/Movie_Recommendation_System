const axios = require('axios');
const WatchHistory = require('../models/WatchHistory');
const Rating = require('../models/Rating');
const Wishlist = require('../models/Wishlist');
const tmdb = require('../services/tmdbService');
const openai = require('../services/openaiService');
const cache = require('../services/cacheService');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// --- Mood → TMDB Genre ID map ---
const MOOD_GENRE_MAP = {
  happy: [35, 10402, 16],          // Comedy, Music, Animation
  sad: [18, 10749],                  // Drama, Romance
  excited: [28, 12, 878],            // Action, Adventure, Sci-Fi
  scared: [27, 53, 9648],            // Horror, Thriller, Mystery
  romantic: [10749, 35, 18],         // Romance, Comedy, Drama
  inspired: [99, 36, 18],            // Documentary, History, Drama
  adventurous: [12, 28, 14],         // Adventure, Action, Fantasy
  relaxed: [35, 16, 10751],          // Comedy, Animation, Family
  angry: [28, 80, 53],               // Action, Crime, Thriller (Intense)
  nostalgic: [36, 10752, 37],        // History, War, Western (Classics feel)
};

// GET /api/v1/recommendations/personalized
const getPersonalized = async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `recs:personalized:${userId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  try {
    // Get user's watch history + ratings for context
    const [history, ratings] = await Promise.all([
      WatchHistory.find({ userId }).sort({ watchedAt: -1 }).limit(20).lean(),
      Rating.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const watchedIds = history.map((h) => h.tmdbId);
    const ratedIds = ratings.filter((r) => r.score >= 4).map((r) => r.tmdbId);

    // Try ML service first
    try {
      const { data: mlData } = await axios.post(`${ML_URL}/recommendations/personalized`, {
        user_id: userId,
        watched_ids: watchedIds,
        highly_rated_ids: ratedIds,
        preferences: req.user.preferences,
      }, { timeout: 5000 });

      const result = { recommendations: mlData.recommendations || [], source: 'ml' };
      await cache.set(cacheKey, result, 1800);
      return res.json({ success: true, data: result });
    } catch {
      // Fallback: TMDB trending filtered by user preferences
      const genres = req.user.preferences?.genres || [];
      let movies = [];
      if (genres.length > 0) {
        const genreMap = { Action: 28, Comedy: 35, Drama: 18, Horror: 27, Romance: 10749, 'Sci-Fi': 878, Thriller: 53 };
        const genreId = genreMap[genres[0]] || 28;
        const result = await tmdb.getMoviesByGenre(genreId, 1);
        movies = result.movies || [];
      } else {
        const result = await tmdb.getTrendingMovies('week', 1);
        movies = result.movies || [];
      }

      const recs = movies
        .filter((m) => !watchedIds.includes(m.id))
        .slice(0, 20)
        .map((m) => ({ ...m, matchScore: Math.round(70 + Math.random() * 25) }));

      const fallback = { recommendations: recs, source: 'trending_fallback' };
      await cache.set(cacheKey, fallback, 900);
      return res.json({ success: true, data: fallback });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/recommendations/mood?mood=happy
const getMoodBased = async (req, res) => {
  const { mood } = req.query;
  if (!mood || !MOOD_GENRE_MAP[mood.toLowerCase()]) {
    return res.status(400).json({
      success: false,
      message: `Invalid mood. Choose from: ${Object.keys(MOOD_GENRE_MAP).join(', ')}`,
    });
  }

  const normalizedMood = mood.toLowerCase();
  const cacheKey = `recs:mood:${normalizedMood}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  const genreIds = MOOD_GENRE_MAP[normalizedMood];

  try {
    // Try ML service mood endpoint
    try {
      const { data: mlData } = await axios.post(`${ML_URL}/recommendations/mood`, {
        mood: normalizedMood,
        genre_ids: genreIds,
      }, { timeout: 5000 });

      const result = { mood: normalizedMood, recommendations: mlData.recommendations || [], source: 'ml' };
      await cache.set(cacheKey, result, 3600);
      return res.json({ success: true, data: result });
    } catch {
      // Fallback: fetch from multiple genres in TMDB
      const moviePromises = genreIds.slice(0, 2).map((gId) => tmdb.getMoviesByGenre(gId, 1));
      const results = await Promise.all(moviePromises);
      const allMovies = results.flatMap((r) => r.movies || []);

      const unique = Array.from(new Map(allMovies.map((m) => [m.id, m])).values());
      const recommendations = unique
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20)
        .map((m) => ({ ...m, mood: normalizedMood, matchScore: Math.round(75 + Math.random() * 20) }));

      const result = { mood: normalizedMood, recommendations, source: 'genre_fallback' };
      await cache.set(cacheKey, result, 3600);
      return res.json({ success: true, data: result });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/recommendations/similar/:tmdbId
const getSimilar = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const cacheKey = `recs:similar:${tmdbId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, fromCache: true });

  try {
    let movies;
    try {
      const { data: mlData } = await axios.get(`${ML_URL}/recommendations/similar/${tmdbId}`, { timeout: 5000 });
      movies = mlData.recommendations || [];
    } catch {
      movies = await tmdb.getSimilarMovies(tmdbId);
    }

    const result = { tmdbId, recommendations: movies.slice(0, 20) };
    await cache.set(cacheKey, result, 7200);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/recommendations/:tmdbId/explain
const explainRecommendation = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);

  const history = await WatchHistory.find({ userId: req.user._id }).sort({ watchedAt: -1 }).limit(5).lean();
  const userTopMovies = history.map((h) => ({ title: h.movieTitle || 'a movie', tmdbId: h.tmdbId }));

  const movieDetails = await tmdb.getMovieDetails(tmdbId);
  if (!movieDetails) {
    return res.status(404).json({ success: false, message: 'Movie not found' });
  }

  const explanation = await openai.generateRecommendationExplanation(userTopMovies, {
    title: movieDetails.title,
    tmdbId: movieDetails.id,
    releaseYear: movieDetails.release_date?.split('-')[0],
    genres: movieDetails.genres,
  });

  res.json({ success: true, data: { tmdbId, explanation } });
};

// GET /api/v1/recommendations/trending
const getTrending = async (req, res) => {
  const result = await tmdb.getTrendingMovies('week', 1);
  res.json({ success: true, data: result });
};

module.exports = { getPersonalized, getMoodBased, getSimilar, explainRecommendation, getTrending };
