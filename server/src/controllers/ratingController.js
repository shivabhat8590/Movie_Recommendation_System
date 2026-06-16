const Rating = require('../models/Rating');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// POST /api/v1/ratings
const rateMovie = async (req, res) => {
  const { tmdbId, title, score, review } = req.body;

  if (!tmdbId || !score) {
    return res.status(400).json({ success: false, message: 'tmdbId and score are required' });
  }
  if (score < 1 || score > 10) {
    return res.status(400).json({ success: false, message: 'Score must be between 1 and 10' });
  }

  const existing = await Rating.findOne({ userId: req.user._id, tmdbId: parseInt(tmdbId) });

  let rating;
  try {
    if (existing) {
      existing.score = score;
      if (review !== undefined) existing.review = review;
      rating = await existing.save();
    } else {
      console.log('--- ATTEMPTING RATING CREATE ---');
      console.log('Payload:', { userId: req.user._id, tmdbId: parseInt(tmdbId), score });
      rating = await Rating.create({
        userId: req.user._id,
        tmdbId: parseInt(tmdbId),
        movieTitle: title || '',
        score,
        review: review || '',
      });
      await User.findByIdAndUpdate(req.user._id, { $inc: { totalRatings: 1, points: 5 } });
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user._id,
      activityType: 'rating_submit',
      metadata: {
        tmdbId: parseInt(tmdbId),
        movieTitle: title || '',
        score
      }
    }).catch(err => console.error('Failed to log rating_submit activity:', err));

    if (review && review.trim()) {
      await ActivityLog.create({
        userId: req.user._id,
        activityType: 'review_post',
        metadata: {
          tmdbId: parseInt(tmdbId),
          movieTitle: title || '',
          score,
          reviewText: review.trim()
        }
      }).catch(err => console.error('Failed to log review_post activity:', err));
    }

  } catch (err) {
    console.error('--- RATING ERROR ---');
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing ? 'Rating updated' : 'Movie rated',
    data: { rating },
  });
};

// GET /api/v1/ratings/my
const getMyRatings = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [ratings, total] = await Promise.all([
    Rating.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Rating.countDocuments({ userId: req.user._id }),
  ]);

  res.json({ success: true, data: { ratings, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
};

// GET /api/v1/ratings/movie/:tmdbId
const getMovieRatings = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [ratings, total] = await Promise.all([
    Rating.find({ tmdbId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('userId', 'name avatar').lean(),
    Rating.countDocuments({ tmdbId }),
  ]);

  const avgScore = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : 0;

  res.json({ success: true, data: { ratings, total, avgScore: parseFloat(avgScore), page: parseInt(page) } });
};

// DELETE /api/v1/ratings/:tmdbId
const deleteRating = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const result = await Rating.findOneAndDelete({ userId: req.user._id, tmdbId });
  if (!result) return res.status(404).json({ success: false, message: 'Rating not found' });

  await User.findByIdAndUpdate(req.user._id, { $inc: { totalRatings: -1 } });
  res.json({ success: true, message: 'Rating deleted' });
};

// GET /api/v1/ratings/check/:tmdbId
const checkRating = async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  const rating = await Rating.findOne({ userId: req.user._id, tmdbId });
  res.json({ success: true, data: { hasRated: !!rating, score: rating ? rating.score : 0 } });
};

module.exports = { rateMovie, getMyRatings, getMovieRatings, deleteRating, checkRating };
