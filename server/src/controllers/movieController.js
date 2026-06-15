const tmdb = require('../services/tmdbService');
const Movie = require('../models/Movie');
const cache = require('../services/cacheService');
const upcomingLeavingData = require('../data/upcomingLeaving.json');

// GET /api/v1/movies/trending (Restarted server successfully)
const getTrending = async (req, res) => {
  const { window = 'week', page = 1 } = req.query;
  const result = await tmdb.getTrendingMovies(window, parseInt(page));
  res.json({ success: true, data: result });
};

// GET /api/v1/movies/search?q=&page=
const search = async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }
  const result = await tmdb.searchMovies(q.trim(), parseInt(page));
  res.json({ success: true, data: result });
};

// GET /api/v1/movies/:tmdbId
const getMovieDetail = async (req, res) => {
  const { tmdbId } = req.params;
  const id = parseInt(tmdbId);

  // Check local DB first
  let movie = await Movie.findOne({ tmdbId: id });

  // Fetch from TMDB regardless for fresh data
  const tmdbData = await tmdb.getMovieDetails(id);
  if (!tmdbData) {
    if (movie) return res.json({ success: true, data: movie });
    return res.status(404).json({ success: false, message: 'Movie not found' });
  }

  // Upsert into local DB
  const trailerKey = tmdb.getMovieTrailerKey(tmdbData);
  const upsertData = {
    tmdbId: tmdbData.id,
    title: tmdbData.title,
    originalTitle: tmdbData.original_title,
    overview: tmdbData.overview,
    genres: tmdbData.genres || [],
    director: tmdbData.credits?.crew?.find((c) => c.job === 'Director')?.name || '',
    cast: (tmdbData.credits?.cast || []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    })),
    releaseDate: tmdbData.release_date,
    releaseYear: tmdbData.release_date ? parseInt(tmdbData.release_date.split('-')[0]) : null,
    runtime: tmdbData.runtime,
    language: tmdbData.original_language,
    country: tmdbData.production_countries?.[0]?.iso_3166_1 || '',
    posterPath: tmdbData.poster_path,
    backdropPath: tmdbData.backdrop_path,
    tmdbRating: tmdbData.vote_average,
    tmdbVoteCount: tmdbData.vote_count,
    keywords: (tmdbData.keywords?.keywords || []).map((k) => k.name),
    popularity: tmdbData.popularity,
    adult: tmdbData.adult,
    status: tmdbData.status,
    tagline: tmdbData.tagline,
    budget: tmdbData.budget,
    revenue: tmdbData.revenue,
    productionCompanies: (tmdbData.production_companies || []).map((c) => ({
      id: c.id,
      name: c.name,
      logoPath: c.logo_path,
    })),
    spokenLanguages: (tmdbData.spoken_languages || []).map((l) => ({ code: l.iso_639_1, name: l.english_name })),
    trailerKey: trailerKey || '',
    imdbRating: tmdbData.imdbRating || 'N/A',
    rottenTomatoesRating: tmdbData.rottenTomatoesRating || 'N/A',
    metacriticRating: tmdbData.metacriticRating || 'N/A',
    streamingPlatforms: tmdbData.streamingPlatforms || [],
  };

  // Upsert into local DB using the verified ID from tmdbData
  movie = await Movie.findOneAndUpdate(
    { tmdbId: tmdbData.id }, 
    upsertData, 
    { upsert: true, new: true }
  );

  // Attach TMDB image URLs to response
  const responseData = {
    ...movie.toJSON(),
    posterUrl: tmdb.getPosterUrl(movie.posterPath),
    backdropUrl: tmdb.getBackdropUrl(movie.backdropPath),
    similar: tmdbData.similar?.results?.slice(0, 12) || [],
  };

  res.json({ success: true, data: responseData });
};

// GET /api/v1/movies/genre/:genreId
const getByGenre = async (req, res) => {
  const { genreId } = req.params;
  const { page = 1 } = req.query;
  const result = await tmdb.getMoviesByGenre(genreId, parseInt(page));
  res.json({ success: true, data: result });
};

// GET /api/v1/movies/:tmdbId/similar
const getSimilar = async (req, res) => {
  const { tmdbId } = req.params;
  const similar = await tmdb.getSimilarMovies(parseInt(tmdbId));
  res.json({ success: true, data: { movies: similar } });
};

// GET /api/v1/movies/genres (TMDB genre list)
const getGenres = async (req, res) => {
  const cacheKey = 'tmdb:genres';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const TMDB_KEY = process.env.TMDB_API_KEY;
  const isMockMode = !TMDB_KEY || TMDB_KEY === 'your_tmdb_api_key_here';

  if (isMockMode) {
    const mockGenres = [
      { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 18, name: 'Drama' },
      { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 10749, name: 'Romance' }
    ];
    return res.json({ success: true, data: mockGenres });
  }

  const axios = require('axios');
  try {
    const { data } = await axios.get(
      `${process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3'}/genre/movie/list`,
      { params: { api_key: TMDB_KEY } }
    );
    await cache.set(cacheKey, data.genres, 86400 * 7);
    res.json({ success: true, data: data.genres });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch genres' });
  }
};

// GET /api/v1/movies/discover
const discover = async (req, res) => {
  const { genre, language, year, sort_by = 'popularity.desc', page = 1 } = req.query;
  
  const TMDB_KEY = process.env.TMDB_API_KEY;
  const isMockMode = !TMDB_KEY || TMDB_KEY === 'your_tmdb_api_key_here';

  if (isMockMode) {
    const result = await tmdb.getMoviesByGenre(genre, parseInt(page));
    return res.json({ success: true, data: result });
  }

  const axios = require('axios');
  const params = {
    api_key: TMDB_KEY,
    sort_by,
    page: parseInt(page),
  };
  if (genre) params.with_genres = genre;
  if (language) params.with_original_language = language;
  if (year) params.primary_release_year = year;

  const cacheKey = `tmdb:discover:${JSON.stringify(params)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const { data } = await axios.get(
      `${process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3'}/discover/movie`,
      { params }
    );
    const result = { movies: data.results, totalPages: data.total_pages, totalResults: data.total_results };
    await cache.set(cacheKey, result, 3600);
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to discover movies' });
  }
};

// GET /api/v1/movies/adult
const getAdultMovies = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {
      $or: [
        { adult: true },
        { 'genres.name': { $in: ['Horror', 'Thriller', 'Crime'] } }
      ]
    };
    
    const movies = await Movie.find(query)
      .sort({ popularity: -1, trendingScore: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    res.json({ success: true, data: { movies } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/movies/child
const getChildMovies = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {
      'genres.name': { 
        $in: ['Animation', 'Family'],
        $nin: ['Horror', 'Thriller', 'Crime']
      },
      adult: { $ne: true }
    };
    
    const movies = await Movie.find(query)
      .sort({ popularity: -1, trendingScore: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    res.json({ success: true, data: { movies } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/movies/upcoming
const getUpcomingMovies = async (req, res) => {
  try {
    const rawMovies = upcomingLeavingData.upcoming || [];
    const enrichedMovies = await Promise.all(
      rawMovies.map(async (movie) => {
        const dbMovie = await Movie.findOne({ tmdbId: movie.tmdbId });
        if (dbMovie) {
          return {
            ...movie,
            ...dbMovie.toJSON(),
            posterUrl: tmdb.getPosterUrl(dbMovie.posterPath),
            backdropUrl: tmdb.getBackdropUrl(dbMovie.backdropPath),
          };
        }
        return {
          ...movie,
          posterUrl: tmdb.getPosterUrl(movie.posterPath),
          backdropUrl: tmdb.getBackdropUrl(movie.backdropPath),
        };
      })
    );
    res.json({ success: true, data: { movies: enrichedMovies } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/movies/leaving
const getLeavingSoonMovies = async (req, res) => {
  try {
    const rawMovies = upcomingLeavingData.leaving || [];
    const enrichedMovies = await Promise.all(
      rawMovies.map(async (movie) => {
        const dbMovie = await Movie.findOne({ tmdbId: movie.tmdbId });
        if (dbMovie) {
          return {
            ...movie,
            ...dbMovie.toJSON(),
            posterUrl: tmdb.getPosterUrl(dbMovie.posterPath),
            backdropUrl: tmdb.getBackdropUrl(dbMovie.backdropPath),
          };
        }
        return {
          ...movie,
          posterUrl: tmdb.getPosterUrl(movie.posterPath),
          backdropUrl: tmdb.getBackdropUrl(movie.backdropPath),
        };
      })
    );
    res.json({ success: true, data: { movies: enrichedMovies } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = { 
  getTrending, 
  search, 
  getMovieDetail, 
  getByGenre, 
  getSimilar, 
  getGenres, 
  discover, 
  getAdultMovies, 
  getChildMovies, 
  getUpcomingMovies, 
  getLeavingSoonMovies 
};
