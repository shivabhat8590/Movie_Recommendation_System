const WatchHistory = require('../models/WatchHistory');
const User = require('../models/User');
const Wishlist = require('../models/Wishlist');
const Rating = require('../models/Rating');
const ChatMessage = require('../models/ChatMessage');
const Movie = require('../models/Movie');
const tmdb = require('../services/tmdbService');
const ActivityLog = require('../models/ActivityLog');


// POST /api/v1/history
const addToHistory = async (req, res) => {
  const { tmdbId, title, posterPath, genres, releaseYear, duration, watchedDuration } = req.body;

  if (!tmdbId) {
    return res.status(400).json({ success: false, message: 'tmdbId is required' });
  }

  const existing = await WatchHistory.findOne({ userId: req.user._id, tmdbId: parseInt(tmdbId) });

  let entry;
  try {
    if (existing) {
      existing.watchedAt = new Date();
      if (watchedDuration) existing.watchedDuration = watchedDuration;
      existing.rewatchCount += 1;
      entry = await existing.save();
    } else {
      console.log('--- ATTEMPTING HISTORY CREATE ---');
      entry = await WatchHistory.create({
        userId: req.user._id,
        tmdbId: parseInt(tmdbId),
        movieTitle: title || '',
        posterPath: posterPath || '',
        genres: genres || [],
        releaseYear: releaseYear || null,
        duration: duration || 0,
        watchedDuration: watchedDuration || 0,
      });
      await User.findByIdAndUpdate(req.user._id, { $inc: { watchedCount: 1, points: 10 } });
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user._id,
      activityType: 'movie_view',
      metadata: {
        tmdbId: parseInt(tmdbId),
        movieTitle: title || '',
        genres: genres || []
      }
    }).catch(err => console.error('Failed to log movie_view activity:', err));

    // Enforce FIFO limit of maximum 10 movies per user
    const historyCount = await WatchHistory.countDocuments({ userId: req.user._id });
    if (historyCount > 10) {
      const oldestEntries = await WatchHistory.find({ userId: req.user._id })
        .sort({ watchedAt: -1 })
        .skip(10)
        .select('_id')
        .lean();

      if (oldestEntries.length > 0) {
        const idsToRemove = oldestEntries.map(e => e._id);
        await WatchHistory.deleteMany({ _id: { $in: idsToRemove } });
      }
    }
  } catch (err) {
    console.error('--- HISTORY ERROR ---');
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(201).json({ success: true, message: 'Watch history updated', data: { entry } });
};

// GET /api/v1/history
const getHistory = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [history, total] = await Promise.all([
    WatchHistory.find({ userId: req.user._id }).sort({ watchedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    WatchHistory.countDocuments({ userId: req.user._id }),
  ]);

  const enriched = history.map((h) => ({
    ...h,
    posterUrl: tmdb.getPosterUrl(h.posterPath),
  }));

  res.json({
    success: true,
    data: { history: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
  });
};

// DELETE /api/v1/history/:tmdbId
const removeFromHistory = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const result = await WatchHistory.findOneAndDelete({ userId: req.user._id, tmdbId });
  if (!result) return res.status(404).json({ success: false, message: 'Entry not found' });
  res.json({ success: true, message: 'Removed from watch history' });
};

// DELETE /api/v1/history (clear all)
const clearHistory = async (req, res) => {
  await WatchHistory.deleteMany({ userId: req.user._id });
  res.json({ success: true, message: 'Watch history cleared' });
};

// GET /api/v1/history/stats
const getStats = async (req, res) => {
  const userId = req.user._id;
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [
    total,
    watchedThisWeek,
    wishlistThisWeek,
    ratingsThisWeek,
    chatsThisWeek,
    genreAggOverall
  ] = await Promise.all([
    WatchHistory.countDocuments({ userId }),
    WatchHistory.find({ userId, watchedAt: { $gte: last7Days } }).lean(),
    Wishlist.find({ userId, addedAt: { $gte: last7Days } }).lean(),
    Rating.find({ userId, createdAt: { $gte: last7Days } }).lean(),
    ChatMessage.find({ user: userId, role: 'user', createdAt: { $gte: last7Days } }).lean(),
    WatchHistory.aggregate([
      { $match: { userId } },
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
  ]);

  // Fetch movie genres for ratings submitted in the last 7 days
  const ratedMovieIds = ratingsThisWeek.map(r => r.tmdbId);
  const ratedMovies = await Movie.find({ tmdbId: { $in: ratedMovieIds } }).lean();
  const movieGenresMap = {};
  for (const m of ratedMovies) {
    movieGenresMap[m.tmdbId] = m.genres?.map(g => g.name || g) || [];
  }

  // Calculate weekly genre distribution (last 7 days of watch/trailer history & ratings)
  const weeklyGenreCounts = {};
  for (const w of watchedThisWeek) {
    if (w.genres && Array.isArray(w.genres)) {
      for (const g of w.genres) {
        const genreName = typeof g === 'string' ? g : (g.name || '');
        if (genreName) {
          weeklyGenreCounts[genreName] = (weeklyGenreCounts[genreName] || 0) + 1;
        }
      }
    }
  }

  for (const r of ratingsThisWeek) {
    const genres = movieGenresMap[r.tmdbId] || [];
    for (const g of genres) {
      const genreName = typeof g === 'string' ? g : (g.name || '');
      if (genreName) {
        weeklyGenreCounts[genreName] = (weeklyGenreCounts[genreName] || 0) + 1;
      }
    }
  }

  let topGenres = Object.entries(weeklyGenreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Fallback to overall top genres if no activity in the last 7 days
  if (topGenres.length === 0) {
    topGenres = genreAggOverall.map(g => ({ genre: g._id, count: g.count }));
  }

  let topGenreThisWeek = topGenres.length > 0 ? topGenres[0].genre : null;

  // Map genre to friendly insight explanation
  let insightText = '';
  const g = topGenreThisWeek ? topGenreThisWeek.toLowerCase() : '';

  if (g.includes('action')) {
    insightText = "You seem to enjoy Action movies because you’re drawn to fast-paced stories, intense moments, and exciting adventures. Your recent activity shows a strong preference for thrilling and energetic entertainment.";
  } else if (g.includes('comedy')) {
    insightText = "You seem to enjoy Comedy movies because you appreciate lighthearted humor, witty banter, and stories that make you laugh. Your recent activity shows a preference for fun, feel-good entertainment to unwind.";
  } else if (g.includes('drama')) {
    insightText = "You seem to enjoy Drama movies because you appreciate deep character studies, emotional storylines, and realistic conflicts. Your recent activity shows a preference for thought-provoking and moving narratives.";
  } else if (g.includes('sci-fi') || g.includes('science fiction')) {
    insightText = "You seem to enjoy Science Fiction movies because you're fascinated by futuristic technology, space exploration, and mind-bending concepts. Your recent activity shows a strong interest in imaginative and visionary storytelling.";
  } else if (g.includes('thriller') || g.includes('crime')) {
    insightText = "You seem to enjoy Thriller movies because you love suspenseful plots, mystery, and high-stakes tension. Your recent activity shows you're drawn to edge-of-your-seat, gripping stories.";
  } else if (g.includes('horror')) {
    insightText = "You seem to enjoy Horror movies because you love suspenseful plots, spine-chilling thrills, and eerie atmospheres. Your recent activity shows a preference for mysterious and hair-raising stories.";
  } else if (g.includes('romance')) {
    insightText = "You seem to enjoy Romance movies because you appreciate heartwarming stories of connection, passion, and emotional journeys. Your recent activity shows a preference for sweet and moving narratives.";
  } else if (g.includes('animation')) {
    insightText = "You seem to enjoy Animation movies because you love colorful, imaginative worlds, creative visuals, and heartwarming stories. Your recent activity shows a preference for fun and uplifting adventures.";
  } else if (g.includes('family')) {
    insightText = "You seem to enjoy Family movies because you love heartwarming bonds, lighthearted stories, and shared adventures. Your recent activity shows a preference for comforting and uplifting entertainment.";
  } else if (g.includes('adventure')) {
    insightText = "You seem to enjoy Adventure movies because you love epic journeys, heroic quests, and exploring the unknown. Your recent activity shows you're drawn to vast, exciting worlds and high-stakes travel.";
  } else if (g.includes('fantasy')) {
    insightText = "You seem to enjoy Fantasy movies because you're drawn to magical worlds, mythical creatures, and epic tales of wonder. Your recent activity shows a preference for highly imaginative storytelling.";
  } else if (g.includes('mystery')) {
    insightText = "You seem to enjoy Mystery movies because you love solving puzzles, plotting detective work, and uncovering hidden truths. Your recent activity shows you're drawn to clever, intriguing stories.";
  } else {
    insightText = "You seem to enjoy exploring diverse movies because you're drawn to fresh stories, compelling narratives, and unique genres. Your recent activity shows an open-minded approach to discovering great cinema.";
  }

  const weeklyActivity = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

  const addPoints = (dateField, points) => {
    if (!dateField) return;
    const d = new Date(dateField);
    const day = d.getDay(); // 0 is Sun, 1 is Mon, etc.
    let index = 0;
    if (day === 0) {
      index = 6; // Sunday
    } else {
      index = day - 1; // Mon -> 0, Tue -> 1, etc.
    }
    weeklyActivity[index] += points;
  };

  // Movie Click = 1 pt, Detail View = 2 pt, Recommendation Click = 2 pt
  // Assumed 1 click + 1 view + 1 rec click for each watched movie = 5 points
  for (const w of watchedThisWeek) {
    addPoints(w.watchedAt, 1 + 2 + 2);
  }

  // Watchlist Add = 3 points
  for (const wi of wishlistThisWeek) {
    addPoints(wi.addedAt, 3);
  }

  // Rating = 4 points, Review = 5 points
  for (const r of ratingsThisWeek) {
    const pts = (r.review && r.review.trim().length > 0) ? 5 : 4;
    addPoints(r.createdAt, pts);
  }

  // Chatbot Interaction = 2 points
  for (const c of chatsThisWeek) {
    addPoints(c.createdAt, 2);
  }

  res.json({
    success: true,
    data: {
      totalWatched: total,
      topGenres: topGenres,
      totalPoints: req.user.points,
      totalRatings: req.user.totalRatings,
      insight: insightText,
      weeklyActivity: weeklyActivity,
    },
  });
};

const getDailyStats = async (req, res) => {
  const userId = req.user._id;
  const { dayName } = req.params;

  const dayNameMap = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  const targetDay = dayNameMap[dayName.toLowerCase()];
  if (targetDay === undefined) {
    return res.status(400).json({ success: false, message: 'Invalid day name' });
  }

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [watchedThisWeek, wishlistThisWeek, ratingsThisWeek, chatsThisWeek] = await Promise.all([
    WatchHistory.find({ userId, watchedAt: { $gte: last7Days } }).lean(),
    Wishlist.find({ userId, addedAt: { $gte: last7Days } }).lean(),
    Rating.find({ userId, createdAt: { $gte: last7Days } }).lean(),
    ChatMessage.find({ user: userId, role: 'user', createdAt: { $gte: last7Days } }).lean(),
  ]);

  const dayWatches = watchedThisWeek.filter(w => w.watchedAt && new Date(w.watchedAt).getDay() === targetDay);
  const dayWishlists = wishlistThisWeek.filter(w => w.addedAt && new Date(w.addedAt).getDay() === targetDay);
  const dayRatings = ratingsThisWeek.filter(r => r.createdAt && new Date(r.createdAt).getDay() === targetDay);
  const dayChats = chatsThisWeek.filter(c => c.createdAt && new Date(c.createdAt).getDay() === targetDay);

  // Viewed titles
  const viewed = dayWatches.map(w => w.movieTitle || w.title || 'Unknown Movie');
  
  // Added to watchlist
  const addedToWatchlist = dayWishlists.map(w => w.movieTitle || w.title || 'Unknown Movie');

  // Rated list: e.g. "Movie Title (8/10)"
  const rated = dayRatings.map(r => `${r.movieTitle} (${r.score}/10)`);

  // Reviewed list: any rating with a review
  const reviewed = dayRatings
    .filter(r => r.review && r.review.trim().length > 0)
    .map(r => `"${r.review}" on ${r.movieTitle}`);

  // Searches performed (empty for now)
  const searchedFor = [];

  // Chat queries
  const aiAssistantQueries = dayChats.map(c => c.content);

  // Favorite Genre / Most explored genre
  const genreCounts = {};
  for (const w of dayWatches) {
    if (w.genres && Array.isArray(w.genres)) {
      for (const g of w.genres) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
  }
  for (const wi of dayWishlists) {
    if (wi.genres && Array.isArray(wi.genres)) {
      for (const g of wi.genres) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
  }
  let favoriteGenre = '—';
  let maxGenreCount = 0;
  for (const [genre, count] of Object.entries(genreCounts)) {
    if (count > maxGenreCount) {
      maxGenreCount = count;
      favoriteGenre = genre;
    }
  }

  // Most interacted movie
  const movieInteractions = {};
  const recordInteraction = (title) => {
    if (!title) return;
    movieInteractions[title] = (movieInteractions[title] || 0) + 1;
  };
  dayWatches.forEach(w => recordInteraction(w.movieTitle || w.title));
  dayWishlists.forEach(wi => recordInteraction(wi.movieTitle || wi.title));
  dayRatings.forEach(r => recordInteraction(r.movieTitle));

  let mostInteractedMovie = '—';
  let maxMovieCount = 0;
  for (const [title, count] of Object.entries(movieInteractions)) {
    if (count > maxMovieCount) {
      maxMovieCount = count;
      mostInteractedMovie = title;
    }
  }

  // Total actions
  const totalActions = dayWatches.length + dayWishlists.length + dayRatings.length + dayChats.length;

  let engagementLevel = 'Low';
  if (totalActions >= 8) {
    engagementLevel = 'High';
  } else if (totalActions >= 3) {
    engagementLevel = 'Medium';
  } else if (totalActions === 0) {
    engagementLevel = 'None';
  }

  // Summary builder
  let summary = '';
  if (totalActions === 0) {
    summary = `No activity recorded on this day. Start exploring movies or talking with the AI chat helper to build your weekly insights!`;
  } else {
    const segments = [];
    
    if (viewed.length > 0) {
      if (viewed.length === 1) {
        segments.push(`enjoying the movie "${viewed[0]}"`);
      } else {
        segments.push(`watching ${viewed.length} movies, including "${viewed[0]}"`);
      }
    }
    
    if (addedToWatchlist.length > 0) {
      if (addedToWatchlist.length === 1) {
        segments.push(`saving "${addedToWatchlist[0]}" to your watchlist`);
      } else {
        segments.push(`updating your watchlist with ${addedToWatchlist.length} new titles like "${addedToWatchlist[0]}"`);
      }
    }

    if (dayRatings.length > 0) {
      const bestRated = dayRatings.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), dayRatings[0]);
      segments.push(`rating your favorites (giving "${bestRated.movieTitle}" a solid ${bestRated.score}/10)`);
    }

    if (aiAssistantQueries.length > 0) {
      segments.push(`chatting with our AI helper to find the perfect recommendations`);
    }

    let activityPhrase = '';
    if (segments.length === 1) {
      activityPhrase = `spent your day ${segments[0]}`;
    } else if (segments.length === 2) {
      activityPhrase = `spent your day ${segments[0]} and ${segments[1]}`;
    } else {
      const last = segments.pop();
      activityPhrase = `had a busy day ${segments.join(', ')}, and ${last}`;
    }

    let genreComment = 'It was a fantastic day of diverse cinematic exploration!';
    const fg = favoriteGenre.toLowerCase();
    if (fg.includes('comedy')) {
      genreComment = 'It looks like you were in the mood for some lighthearted fun and laughter!';
    } else if (fg.includes('action')) {
      genreComment = 'It was a high-energy day filled with thrills and exciting adventures!';
    } else if (fg.includes('drama')) {
      genreComment = 'You were drawn to deeper, emotionally rich storytelling!';
    } else if (fg.includes('sci-fi') || fg.includes('science fiction')) {
      genreComment = 'You explored some mind-bending futuristic concepts!';
    } else if (fg.includes('horror')) {
      genreComment = 'You were in the mood for some spine-chilling thrills and mystery!';
    }

    summary = `${dayName} was a wonderful day of movie discovery! You ${activityPhrase}. ${genreComment}`;
  }

  res.json({
    success: true,
    data: {
      day: dayName,
      summary,
      viewed,
      addedToWatchlist,
      rated,
      reviewed,
      searchedFor,
      aiAssistantQueries,
      favoriteGenre,
      mostInteractedMovie,
      engagementLevel,
      totalActions
    }
  });
};

module.exports = { addToHistory, getHistory, removeFromHistory, clearHistory, getStats, getDailyStats };
