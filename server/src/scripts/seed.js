require('dotenv').config({ path: require('path').resolve(__dirname, '../..', '.env') });

const connectDB = require('../config/db');
const Movie = require('../models/Movie');
const User = require('../models/User');
const axios = require('axios');

const mockMovies = require('../data/mockMovies.json');

const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

const isMockMode = !TMDB_KEY || TMDB_KEY === 'your_tmdb_api_key_here';

if (isMockMode) {
  console.log('⚠️ TMDB_API_KEY not set. Using mockMovies.json for seeding.');
}

const tmdb = axios.create({ baseURL: TMDB_BASE, params: { api_key: TMDB_KEY }, timeout: 15000 });

const fetchMovies = async (endpoint, params = {}) => {
  try {
    const { data } = await tmdb.get(endpoint, { params });
    return data.results || [];
  } catch (err) {
    console.error(`TMDB fetch error (${endpoint}):`, err.message);
    return [];
  }
};

const mapMovie = (m, credits = null) => ({
  tmdbId: m.tmdbId || m.id,
  title: m.title,
  originalTitle: m.originalTitle || m.original_title || m.title,
  overview: m.overview || '',
  genres: Array.isArray(m.genres) 
    ? m.genres.map(g => (typeof g === 'string' ? { name: g, id: 0 } : g))
    : (m.genre_ids || []).map((id) => ({ id, name: '' })),
  director: m.director || credits?.crew?.find((c) => c.job === 'Director')?.name || '',
  cast: (m.cast || (credits?.cast || []).slice(0, 8)).map((c) => ({
    id: c.id,
    name: c.name || c,
    character: c.character || 'Lead',
    profilePath: c.profilePath || c.profile_path || '',
  })),
  releaseDate: m.releaseDate || m.release_date || '',
  releaseYear: m.releaseYear || (m.release_date ? parseInt(m.release_date.split('-')[0]) : null),
  runtime: m.runtime || 0,
  language: m.language || m.original_language || 'en',
  country: m.country || m.production_countries?.[0]?.iso_3166_1 || '',
  posterPath: m.posterPath || m.poster_path || '',
  backdropPath: m.backdropPath || m.backdrop_path || '',
  posterUrl: m.posterUrl || '',
  backdropUrl: m.backdropUrl || '',
  tmdbRating: m.tmdbRating || m.vote_average || 0,
  tmdbVoteCount: m.tmdbVoteCount || m.vote_count || 0,
  keywords: m.keywords || (m.keywords?.keywords || []).map((k) => k.name),
  popularity: m.popularity || 0,
  adult: m.adult || false,
  status: m.status || 'Released',
  tagline: m.tagline || '',
  budget: m.budget || 0,
  revenue: m.revenue || 0,
  trendingScore: m.popularity || 0,
  productionCompanies: m.productionCompanies || (m.production_companies || []).map((c) => ({
    id: c.id,
    name: c.name,
    logoPath: c.logo_path,
  })),
  spokenLanguages: m.spokenLanguages || (m.spoken_languages || []).map((l) => ({ code: l.iso_639_1, name: l.english_name })),
  trailerKey: m.trailerKey || m.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key || 'dQw4w9WgXcQ',
  streamingPlatforms: m.streamingPlatforms || [],
  imdbRating: m.imdbRating || 'N/A',
  rottenTomatoesRating: m.rottenTomatoesRating || 'N/A',
  metacriticRating: m.metacriticRating || 'N/A',
});


const seedMovies = async () => {
  console.log('\n🎬 Starting movie seed...\n');
  
  // Clear existing movies to avoid duplicate key errors during mock re-generation
  if (isMockMode) {
    console.log('🗑 Clearing existing movies for fresh mock seed...');
    await Movie.deleteMany({});
  }

  const endpoints = [
    { ep: '/trending/movie/week', params: { page: 1 }, label: 'Trending (Page 1)' },
    { ep: '/trending/movie/week', params: { page: 2 }, label: 'Trending (Page 2)' },
    { ep: '/movie/popular', params: { page: 1 }, label: 'Popular' },
    { ep: '/movie/top_rated', params: { page: 1 }, label: 'Top Rated' },
    { ep: '/movie/upcoming', params: { page: 1 }, label: 'Upcoming' },
    { ep: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' }, label: 'Action' },
    { ep: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' }, label: 'Comedy' },
    { ep: '/discover/movie', params: { with_genres: '18', sort_by: 'popularity.desc' }, label: 'Drama' },
    { ep: '/discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc' }, label: 'Horror' },
    { ep: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' }, label: 'Sci-Fi' },
    { ep: '/discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' }, label: 'Romance' },
    { ep: '/discover/movie', params: { with_original_language: 'hi', sort_by: 'popularity.desc' }, label: 'Bollywood' },
  ];

  let allMovies = [];

  if (isMockMode) {
    allMovies = mockMovies;
  } else {
    for (const { ep, params, label } of endpoints) {
      const movies = await fetchMovies(ep, params);
      console.log(`  ✅ Fetched ${movies.length} movies: ${label}`);
      allMovies = allMovies.concat(movies);
    }
  }

  // Deduplicate by tmdbId
  const uniqueMap = new Map();
  allMovies.forEach((m) => uniqueMap.set(m.tmdbId || m.id, m));
  const uniqueMovies = Array.from(uniqueMap.values());
  console.log(`\n📦 Total unique movies to seed: ${uniqueMovies.length}`);

  let seeded = 0;
  let skipped = 0;

  for (const movie of uniqueMovies) {
    try {
      await Movie.findOneAndUpdate(
        { tmdbId: movie.tmdbId || movie.id },
        mapMovie(movie),
        { upsert: true, new: true }
      );
      seeded++;
    } catch (err) {
      console.error(`  ❌ Failed to seed ${movie.title}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Seeded: ${seeded} movies | Skipped: ${skipped}`);
};

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@movieai.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log(`\n👤 Admin already exists: ${adminEmail}`);
    return;
  }

  await User.create({
    name: 'Admin',
    email: adminEmail,
    passwordHash: adminPassword,
    role: 'admin',
    isActive: true,
  });

  console.log(`\n👤 Admin user created: ${adminEmail} / ${adminPassword}`);
};

const Badge = require('../models/Badge');

const seedBadges = async () => {
  const badges = [
    { name: 'First Watch', description: 'Watch your first movie', icon: '🎬', category: 'Milestone', criteria: { type: 'watch_count', value: 1 } },
    { name: 'Binge Watcher', description: 'Watch 10 movies', icon: '🔥', category: 'Activity', criteria: { type: 'watch_count', value: 10 } },
    { name: 'Critic', description: 'Rate 10 movies', icon: '⭐', category: 'Milestone', criteria: { type: 'rate_count', value: 10 } },
    { name: 'Cinephile', description: 'Watch 100 movies', icon: '👑', category: 'Milestone', criteria: { type: 'watch_count', value: 100 } }
  ];

  for (const b of badges) {
    await Badge.findOneAndUpdate({ name: b.name }, b, { upsert: true });
  }
  console.log('✅ Badges seeded');
};

(async () => {
  await connectDB();
  await seedAdmin();
  await seedBadges();
  await seedMovies();
  console.log('\n✅ Seed complete! Exiting...\n');
  process.exit(0);
})();

