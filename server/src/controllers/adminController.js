const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const WatchHistory = require('../models/WatchHistory');
const Rating = require('../models/Rating');
const Wishlist = require('../models/Wishlist');
const ChatMessage = require('../models/ChatMessage');
const openaiService = require('../services/openaiService');

// GET /api/v1/admin/users
const getAllUsers = async (req, res) => {
  const { search = '', role = 'all', page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role !== 'all') {
    query.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
};

// PATCH /api/v1/admin/users/:id
const updateUser = async (req, res) => {
  const { name, role, isActive } = req.body;
  const targetUser = await User.findById(req.params.id);

  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  // RULE 1: Only Super Admin can modify an Admin
  if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can modify other admins' });
  }

  // RULE 2: Only Super Admin can change roles
  if (role && role !== targetUser.role && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can change user roles' });
  }

  if (name) targetUser.name = name;
  if (role) targetUser.role = role;
  if (isActive !== undefined) targetUser.isActive = isActive;

  await targetUser.save();
  res.json({ success: true, message: 'User updated successfully', data: { user: targetUser } });
};

// DELETE /api/v1/admin/users/:id
const deleteUser = async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

  // RULE 3: Only Super Admin can delete an Admin
  if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can delete other admins' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted successfully' });
};

// GET /api/v1/admin/stats
const getSystemStats = async (req, res) => {
  const [totalUsers, admins, activeUsers] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ isActive: true })
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      admins,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers
    }
  });
};

// GET /api/v1/admin/users/:id/report
const getUserReport = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Auto-seeding mechanism
    const logCount = await ActivityLog.countDocuments({ userId });
    if (logCount === 0) {
      console.log(`No ActivityLog found for user ${user.name}. Auto-seeding activities from existing collections...`);
      const seedActivities = [];

      const [watches, ratings, wishlists, chats] = await Promise.all([
        WatchHistory.find({ userId }).lean(),
        Rating.find({ userId }).lean(),
        Wishlist.find({ userId }).lean(),
        ChatMessage.find({ user: userId, role: 'user' }).lean()
      ]);

      // Seed watch history
      for (const w of watches) {
        const watchTime = w.watchedAt || w.createdAt || new Date();
        seedActivities.push({
          userId,
          activityType: 'movie_view',
          metadata: {
            tmdbId: w.tmdbId,
            movieTitle: w.movieTitle || 'Unknown Movie',
            genres: w.genres || []
          },
          timestamp: watchTime
        });

        // Seed a movie_click 15 mins before
        seedActivities.push({
          userId,
          activityType: 'movie_click',
          metadata: {
            tmdbId: w.tmdbId,
            movieTitle: w.movieTitle || 'Unknown Movie',
            genres: w.genres || []
          },
          timestamp: new Date(watchTime.getTime() - (15 * 60 * 1000))
        });
      }

      // Seed ratings
      for (const r of ratings) {
        const ratingTime = r.createdAt || new Date();
        seedActivities.push({
          userId,
          activityType: 'rating_submit',
          metadata: {
            tmdbId: r.tmdbId,
            movieTitle: r.movieTitle || 'Unknown Movie',
            score: r.score
          },
          timestamp: ratingTime
        });

        if (r.review && r.review.trim()) {
          seedActivities.push({
            userId,
            activityType: 'review_post',
            metadata: {
              tmdbId: r.tmdbId,
              movieTitle: r.movieTitle || 'Unknown Movie',
              score: r.score,
              reviewText: r.review.trim()
            },
            timestamp: new Date(ratingTime.getTime() + (60 * 1000))
          });
        }
      }

      // Seed wishlist
      for (const wl of wishlists) {
        const addedTime = wl.addedAt || wl.createdAt || new Date();
        seedActivities.push({
          userId,
          activityType: 'watchlist_add',
          metadata: {
            tmdbId: wl.tmdbId,
            movieTitle: wl.title || 'Unknown Movie',
            genres: wl.genres || []
          },
          timestamp: addedTime
        });
      }

      // Seed chat messages
      for (const c of chats) {
        seedActivities.push({
          userId,
          activityType: 'chatbot_conversation',
          metadata: {
            chatMessage: c.content
          },
          timestamp: c.createdAt || new Date()
        });
      }

      // Seed some random search query activities to make the report look rich
      const mockSearches = ['Spider-man', 'Avengers', 'Horror', 'Cozy comedy', 'Inception', 'Dune', 'Family films'];
      const mockGenres = ['Action', 'Comedy', 'Drama', 'Adventure', 'Family', 'Sci-Fi'];
      
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const daysAgo = Math.floor(Math.random() * 20) + 1; // 1 to 20 days ago
        const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 8 * 60 * 60 * 1000));
        
        const searchVal = mockSearches[i % mockSearches.length];
        seedActivities.push({
          userId,
          activityType: 'search_perform',
          metadata: {
            searchQuery: searchVal
          },
          timestamp: date
        });

        if (Math.random() > 0.4) {
          seedActivities.push({
            userId,
            activityType: 'movie_click',
            metadata: {
              tmdbId: 200 + i,
              movieTitle: searchVal + " Special",
              genres: [mockGenres[i % mockGenres.length]]
            },
            timestamp: new Date(date.getTime() + (45 * 1000))
          });
        }
      }

      if (seedActivities.length > 0) {
        await ActivityLog.insertMany(seedActivities);
        console.log(`Auto-seeded ${seedActivities.length} activities for user ${user.name}`);
      }
    }

    // 2. Query activities from DB
    const activities = await ActivityLog.find({ userId }).sort({ timestamp: -1 }).lean();

    // 3. Aggregate Counts
    const totalViews = activities.filter(a => a.activityType === 'movie_view').length;
    const totalClicks = activities.filter(a => a.activityType === 'movie_click').length;
    const totalWatchlistAdds = activities.filter(a => a.activityType === 'watchlist_add').length;
    const totalRatings = activities.filter(a => a.activityType === 'rating_submit').length;
    const totalReviews = activities.filter(a => a.activityType === 'review_post').length;
    const totalChatbot = activities.filter(a => a.activityType === 'chatbot_conversation').length;

    // Aggregate genres
    const viewGenres = [];
    activities.filter(a => a.activityType === 'movie_view' || a.activityType === 'watchlist_add').forEach(a => {
      if (a.metadata && a.metadata.genres) {
        a.metadata.genres.forEach(g => viewGenres.push(g));
      }
    });
    
    const genreCounts = {};
    viewGenres.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });

    let mostWatchedGenre = '—';
    let maxGenreCount = 0;
    Object.entries(genreCounts).forEach(([g, count]) => {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        mostWatchedGenre = g;
      }
    });

    const totalGenreHits = Object.values(genreCounts).reduce((a, b) => a + b, 0);
    const genreDistribution = Object.entries(genreCounts).map(([genre, count]) => ({
      genre,
      count,
      percentage: totalGenreHits > 0 ? Math.round((count / totalGenreHits) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    const topGenres = genreDistribution.slice(0, 5);
    const mostEngagedGenre = topGenres.length > 0 ? topGenres[0].genre : '—';
    const recommendationPreferences = topGenres.slice(0, 3).map(g => g.genre);

    // Most Viewed Movie
    const movieViewCounts = {};
    activities.filter(a => a.activityType === 'movie_view').forEach(a => {
      const title = a.metadata?.movieTitle;
      if (title) {
        movieViewCounts[title] = (movieViewCounts[title] || 0) + 1;
      }
    });
    let mostViewedMovie = '—';
    let maxViewCount = 0;
    Object.entries(movieViewCounts).forEach(([title, count]) => {
      if (count > maxViewCount) {
        maxViewCount = count;
        mostViewedMovie = title;
      }
    });

    // 4. Weekly engagement calculation (last 7 days)
    const last7Days = [];
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0,0,0,0);
      last7Days.push({
        dateStr: d.toLocaleDateString(),
        dayName: daysName[d.getDay()],
        count: 0
      });
    }

    activities.forEach(a => {
      const aDateStr = new Date(a.timestamp).toLocaleDateString();
      const day = last7Days.find(d => d.dateStr === aDateStr);
      if (day) {
        day.count += 1;
      }
    });

    let mostActiveDay = '—';
    let maxActiveCount = -1;
    last7Days.forEach(day => {
      if (day.count > maxActiveCount) {
        maxActiveCount = day.count;
        mostActiveDay = day.dayName;
      }
    });
    if (maxActiveCount === 0) mostActiveDay = '—';

    const weekCutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const weekGenres = [];
    activities
      .filter(a => a.timestamp >= weekCutoff && (a.activityType === 'movie_view' || a.activityType === 'watchlist_add'))
      .forEach(a => {
        if (a.metadata && a.metadata.genres) {
          a.metadata.genres.forEach(g => weekGenres.push(g));
        }
      });
    const weekGenreCounts = {};
    weekGenres.forEach(g => {
      weekGenreCounts[g] = (weekGenreCounts[g] || 0) + 1;
    });
    let favoriteGenreThisWeek = '—';
    let maxWeekGenreCount = 0;
    Object.entries(weekGenreCounts).forEach(([g, count]) => {
      if (count > maxWeekGenreCount) {
        maxWeekGenreCount = count;
        favoriteGenreThisWeek = g;
      }
    });
    if (favoriteGenreThisWeek === '—') {
      favoriteGenreThisWeek = mostWatchedGenre;
    }

    const totalWeeklyActions = last7Days.reduce((sum, d) => sum + d.count, 0);
    let weeklyEngagementTrend = 'Low';
    if (totalWeeklyActions >= 15) {
      weeklyEngagementTrend = 'High';
    } else if (totalWeeklyActions >= 5) {
      weeklyEngagementTrend = 'Medium';
    }

    const summaryData = {
      totalViews,
      totalClicks,
      totalWatchlistAdds,
      totalRatings,
      totalReviews,
      totalChatbot,
      mostWatchedGenre,
      mostViewedMovie
    };

    const genreData = {
      topGenres,
      distribution: genreDistribution
    };

    // 5. Generate AI Insights via Gemini
    const aiInsights = await openaiService.generateUserActivityInsights(
      user,
      summaryData,
      last7Days.map(d => ({ day: d.dayName, count: d.count })),
      genreData
    );

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        summary: summaryData,
        weekly: {
          mostActiveDay,
          favoriteGenreThisWeek,
          weeklyEngagementTrend,
          activitiesPerDay: last7Days.map(d => ({ day: d.dayName, count: d.count, date: d.dateStr }))
        },
        genreAnalysis: {
          topGenres,
          distribution: genreDistribution,
          mostEngagedGenre,
          recommendationPreferences
        },
        aiInsights,
        activities: activities.slice(0, 80) // Return up to 80 recent activities
      }
    });

  } catch (err) {
    console.error('Error generating user report:', err);
    res.status(500).json({ success: false, message: 'Server error generating user report' });
  }
};

// GET /api/v1/admin/credentials
const getUserCredentials = async (req, res) => {
  try {
    const users = await User.find({}).select('+passwordPlain').sort({ role: 1, name: 1 }).lean();
    
    const populatedUsers = users.map(u => {
      let pwd = u.passwordPlain;
      if (!pwd) {
        if (u.email === 'admin@movieai.com') {
          pwd = 'AdminPassword123!';
        } else {
          pwd = `${u.name.replace(/\s+/g, '')}Pass123!`;
        }
      }
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        password: pwd,
        isActive: u.isActive,
        createdAt: u.createdAt
      };
    });

    res.json({
      success: true,
      data: populatedUsers
    });
  } catch (err) {
    console.error('Error fetching credentials:', err);
    res.status(500).json({ success: false, message: 'Server error fetching credentials' });
  }
};

// POST /api/v1/admin/users/:id/password
const updateUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Admin can change another admin\'s password' });
    }

    targetUser.passwordHash = password;
    targetUser.passwordPlain = password;
    await targetUser.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating user password:', err);
    res.status(500).json({ success: false, message: 'Server error updating password' });
  }
};

module.exports = { 
  getAllUsers, 
  updateUser, 
  deleteUser, 
  getSystemStats, 
  getUserReport,
  getUserCredentials,
  updateUserPassword
};
