const Wishlist = require('../models/Wishlist');
const tmdb = require('../services/tmdbService');
const ActivityLog = require('../models/ActivityLog');

// GET /api/v1/wishlist
const getWishlist = async (req, res) => {
  const wishlist = await Wishlist.find({ userId: req.user._id }).sort({ addedAt: -1 }).lean();

  // Load leaving movies list to cross-reference
  const upcomingLeavingData = require('../data/upcomingLeaving.json');
  const leavingMovies = upcomingLeavingData.leaving || [];

  const enriched = wishlist.map((item) => {
    const leavingInfo = leavingMovies.find(m => m.tmdbId === item.tmdbId);
    return {
      ...item,
      posterUrl: item.posterPath ? tmdb.getPosterUrl(item.posterPath) : '',
      backdropUrl: item.backdropPath ? tmdb.getBackdropUrl(item.backdropPath) : '',
      leavingDate: leavingInfo ? leavingInfo.leavingDate : undefined
    };
  });


  res.json({ success: true, data: { wishlist: enriched, count: enriched.length } });
};

// POST /api/v1/wishlist
const addToWishlist = async (req, res) => {
  let { tmdbId, title, posterPath, backdropPath, releaseYear, genres, overview, tmdbRating, runtime } = req.body;

  if (!tmdbId || !title) {
    return res.status(400).json({ success: false, message: 'tmdbId and title are required' });
  }

  // Resolve to official TMDB ID to prevent duplicates with different IDs
  const officialMovie = await tmdb.getMovieDetails(tmdbId);
  const finalId = officialMovie ? officialMovie.id : parseInt(tmdbId);

  const existing = await Wishlist.findOne({ userId: req.user._id, tmdbId: finalId });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Movie already in wishlist' });
  }

  try {
    const item = await Wishlist.create({
      userId: req.user._id,
      tmdbId: finalId,
      title: officialMovie?.title || title,
      posterPath: officialMovie?.poster_path || posterPath || '',
      backdropPath: officialMovie?.backdrop_path || backdropPath || '',
      releaseYear: (officialMovie?.release_date ? parseInt(officialMovie.release_date.split('-')[0]) : releaseYear) || null,
      genres: (officialMovie?.genres?.map(g => g.name || g) || genres) || [],
      overview: officialMovie?.overview || overview || '',
      tmdbRating: officialMovie?.vote_average || tmdbRating || 0,
      runtime: officialMovie?.runtime || runtime || 0,
    });

    // Log Activity
    await ActivityLog.create({
      userId: req.user._id,
      activityType: 'watchlist_add',
      metadata: {
        tmdbId: finalId,
        movieTitle: item.title,
        genres: item.genres
      }
    }).catch(err => console.error('Failed to log watchlist_add activity:', err));

    res.status(201).json({ success: true, message: 'Added to wishlist', data: { item } });
  } catch (err) {
    if (err.code === 11000) {
      console.error('Duplicate Wishlist Error:', err.keyValue);
      return res.status(409).json({ 
        success: false, 
        message: 'Movie already in wishlist', 
        debug: err.keyValue 
      });
    }
    throw err;
  }
};

// DELETE /api/v1/wishlist/:tmdbId
const removeFromWishlist = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  
  // Try deleting by provided ID or resolved official ID
  const officialMovie = await tmdb.getMovieDetails(tmdbId);
  const finalId = officialMovie ? officialMovie.id : tmdbId;

  const result = await Wishlist.findOneAndDelete({ 
    userId: req.user._id, 
    $or: [{ tmdbId }, { tmdbId: finalId }] 
  });
  
  if (!result) {
    return res.status(404).json({ success: false, message: 'Movie not found in wishlist' });
  }

  // Log Activity
  await ActivityLog.create({
    userId: req.user._id,
    activityType: 'watchlist_remove',
    metadata: {
      tmdbId: result.tmdbId,
      movieTitle: result.title,
      genres: result.genres || []
    }
  }).catch(err => console.error('Failed to log watchlist_remove activity:', err));

  res.json({ success: true, message: 'Removed from wishlist' });
};

// GET /api/v1/wishlist/check/:tmdbId
const checkInWishlist = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const officialMovie = await tmdb.getMovieDetails(tmdbId);
  const finalId = officialMovie ? officialMovie.id : tmdbId;

  const exists = await Wishlist.exists({ 
    userId: req.user._id, 
    $or: [{ tmdbId }, { tmdbId: finalId }] 
  });
  
  res.json({ success: true, data: { inWishlist: !!exists } });
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkInWishlist };
