const axios = require('axios');
const cache = require('./cacheService');
const mockMovies = require('../data/mockMovies.json');

const TMDB_KEY = process.env.TMDB_API_KEY;
const isMockMode = !TMDB_KEY || TMDB_KEY === 'your_tmdb_api_key_here';

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  params: { api_key: TMDB_KEY || 'TMDB_KEY_NOT_SET' },
  timeout: 10000,
});

const IMAGE_BASE = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

const getPosterUrl = (path, size = 'w500') =>
  path ? (path.startsWith('http') ? path : `${IMAGE_BASE}/${size}${path}`) : `https://via.placeholder.com/500x750?text=No+Poster`;

const getBackdropUrl = (path, size = 'w1280') =>
  path ? (path.startsWith('http') ? path : `${IMAGE_BASE}/${size}${path}`) : '';

const getTrendingMovies = async (timeWindow = 'week', page = 1) => {
  if (isMockMode) {
    const sorted = [...mockMovies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return {
      movies: sorted.slice(0, 40).map(m => ({ 
        ...m, 
        id: m.tmdbId || m.id,
        tmdbId: m.tmdbId || m.id,
        poster_path: m.posterPath,
        backdrop_path: m.backdropPath,
        vote_average: m.tmdbRating,
        release_date: m.releaseDate || `${m.releaseYear}-01-01`
      })),
      totalPages: 10,
      totalResults: mockMovies.length
    };
  }

  const cacheKey = `tmdb:trending:${timeWindow}:${page}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tmdb.get(`/trending/movie/${timeWindow}`, { params: { page } });
    const result = {
      movies: data.results,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
    await cache.set(cacheKey, result, 3600);
    return result;
  } catch (err) {
    console.error('TMDB getTrending error:', err.message);
    return { movies: mockMovies.map(m => ({ ...m, id: m.tmdbId })), totalPages: 1, totalResults: mockMovies.length };
  }
};

const getMovieDetails = async (tmdbId) => {
  if (isMockMode) {
    const movie = mockMovies.find(m => 
      m.tmdbId === parseInt(tmdbId) || m.id === parseInt(tmdbId)
    );
    if (movie) {
      return {
        ...movie,
        id: movie.tmdbId,
        poster_path: movie.posterPath,
        backdrop_path: movie.backdropPath,
        release_date: movie.releaseDate || `${movie.releaseYear}-01-01`,
        credits: {
          cast: movie.cast?.map((c, i) => ({ id: i, name: c.name || c, character: c.character || 'Lead', profile_path: c.profilePath || '' })) || [],
          crew: [
            { id: 999, name: movie.director || 'Unknown', job: 'Director' }
          ]
        },
        genres: movie.genres.map((g, i) => (typeof g === 'string' ? { id: i, name: g } : g)),
        videos: { results: [{ key: movie.trailerKey, type: 'Trailer', site: 'YouTube' }] }
      };
    }
  }

  const cacheKey = `tmdb:movie:${tmdbId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tmdb.get(`/movie/${tmdbId}`, {
      params: { append_to_response: 'credits,keywords,videos,similar' },
    });
    await cache.set(cacheKey, data, 86400); // 24 hrs
    return data;
  } catch (err) {
    console.error(`TMDB getMovieDetails(${tmdbId}) error:`, err.message);
    const movie = mockMovies.find(m => 
      m.tmdbId === parseInt(tmdbId) || m.id === parseInt(tmdbId)
    );
    if (!movie) return null;
    return {
      ...movie,
      id: movie.tmdbId,
      poster_path: movie.posterPath,
      backdrop_path: movie.backdropPath,
      release_date: movie.releaseDate || `${movie.releaseYear}-01-01`,
      genres: movie.genres?.map((g, i) => (typeof g === 'string' ? { id: i, name: g } : g)) || []
    };
  }
};

const searchMovies = async (query, page = 1) => {
  if (isMockMode) {
    const filtered = mockMovies.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));
    return { 
      movies: filtered.map(m => ({ 
        ...m, 
        id: m.tmdbId,
        poster_path: m.posterPath,
        backdrop_path: m.backdropPath,
        vote_average: m.tmdbRating,
        release_date: m.releaseDate || `${m.releaseYear}-01-01`
      })), 
      totalPages: 1 
    };
  }

  const cacheKey = `tmdb:search:${encodeURIComponent(query)}:${page}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tmdb.get('/search/movie', { params: { query, page } });
    const result = { movies: data.results, totalPages: data.total_pages };
    await cache.set(cacheKey, result, 1800);
    return result;
  } catch (err) {
    console.error('TMDB searchMovies error:', err.message);
    return { movies: [], totalPages: 0 };
  }
};

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama',
  10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery',
  10749: 'Romance', 878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western', 10770: 'TV Movie'
};

const getMoviesByGenre = async (genreId, page = 1) => {
  if (isMockMode) {
    const genreName = GENRE_MAP[genreId];
    let filtered = mockMovies;
    if (genreName) {
      filtered = mockMovies.filter(m => 
        m.genres && m.genres.some(g => (typeof g === 'string' ? g : g.name) === genreName)
      );
    }
    // If no movies found for genre, fallback to some random ones
    if (filtered.length === 0) filtered = mockMovies;
    
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return { 
      movies: shuffled.slice(0, 20).map(m => ({ 
        ...m, 
        id: m.tmdbId || m.id, 
        tmdbId: m.tmdbId || m.id 
      })), 
      totalPages: 5 
    };
  }

  const cacheKey = `tmdb:genre:${genreId}:${page}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    });
    const result = { movies: data.results, totalPages: data.total_pages };
    await cache.set(cacheKey, result, 3600);
    return result;
  } catch (err) {
    console.error('TMDB getMoviesByGenre error:', err.message);
    return { movies: [], totalPages: 0 };
  }
};

const getSimilarMovies = async (tmdbId) => {
  if (isMockMode) return mockMovies.filter(m => m.tmdbId !== parseInt(tmdbId)).map(m => ({ ...m, id: m.tmdbId }));

  const cacheKey = `tmdb:similar:${tmdbId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await tmdb.get(`/movie/${tmdbId}/similar`);
    await cache.set(cacheKey, data.results, 86400);
    return data.results;
  } catch (err) {
    console.error('TMDB getSimilarMovies error:', err.message);
    return mockMovies.filter(m => m.tmdbId !== parseInt(tmdbId)).map(m => ({ ...m, id: m.tmdbId }));
  }
};

const getMovieTrailerKey = (movieDetails) => {
  if (movieDetails?.trailerKey) return movieDetails.trailerKey;
  if (!movieDetails?.videos?.results) return 'dQw4w9WgXcQ'; // Rickroll fallback for demo
  const trailer = movieDetails.videos.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );
  return trailer ? trailer.key : 'dQw4w9WgXcQ';
};

module.exports = {
  getTrendingMovies,
  getMovieDetails,
  searchMovies,
  getMoviesByGenre,
  getSimilarMovies,
  getMovieTrailerKey,
  getPosterUrl,
  getBackdropUrl,
};

