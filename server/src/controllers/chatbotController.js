const ChatMessage = require('../models/ChatMessage');
const openai = require('../services/openaiService');
const tmdb = require('../services/tmdbService');
const ActivityLog = require('../models/ActivityLog');

// POST /api/v1/chatbot/message
const sendMessage = async (req, res) => {
  const { message, sessionId, kidsMode } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message cannot be empty' });
  }

  const sid = sessionId || req.user._id.toString();

  // Save user message
  await ChatMessage.create({
    user: req.user._id,
    sessionId: sid,
    role: 'user',
    content: message.trim(),
  });

  // Log Activity
  await ActivityLog.create({
    userId: req.user._id,
    activityType: 'chatbot_conversation',
    metadata: {
      chatMessage: message.trim()
    }
  }).catch(err => console.error('Failed to log chatbot_conversation activity:', err));

  // Get recent conversation history (last 10 messages for context)
  const history = await ChatMessage.find({ user: req.user._id, sessionId: sid })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const messages = history
    .reverse()
    .slice(0, -1) // Exclude the message we just saved (it's the current one)
    .map((m) => ({ role: m.role, content: m.content }));

  messages.push({ role: 'user', content: message.trim() });

  // Get AI response
  const { content, movieSuggestions } = await openai.chatbotResponse(messages, { ...req.user.preferences, kidsMode });

  // Save assistant response safely by mapping TMDB IDs to MongoDB ObjectIds
  const Movie = require('../models/Movie');
  const dbMovieIds = [];

  // Strict kid-safe filter fallback for suggestions
  let filteredSuggestions = movieSuggestions || [];
  if (kidsMode) {
    filteredSuggestions = filteredSuggestions.filter(m => {
      const genres = m.genres || [];
      const hasMatureGenre = genres.some(g => {
        const name = typeof g === 'string' ? g : g?.name;
        return ['Horror', 'Thriller', 'Crime'].includes(name);
      });
      return !m.adult && !hasMatureGenre;
    });
  }

  if (filteredSuggestions.length > 0) {
    for (const m of filteredSuggestions) {
      const tmdbId = m.tmdbId || m.id;
      if (typeof tmdbId === 'number') {
        try {
          let dbMovie = await Movie.findOne({ tmdbId });
          if (!dbMovie) {
            // Dynamically insert movie to database so it exists and has an ObjectId
            dbMovie = await Movie.create({
              tmdbId: tmdbId,
              title: m.title,
              originalTitle: m.originalTitle || m.title,
              overview: m.overview || '',
              genres: m.genres?.map((g, i) => (typeof g === 'string' ? { id: i, name: g } : g)) || [],
              director: m.director || '',
              cast: m.cast || [],
              releaseDate: m.releaseDate || m.release_date || `${m.releaseYear}-01-01`,
              releaseYear: m.releaseYear || m.release_year || 2022,
              runtime: m.runtime || 120,
              posterPath: m.posterPath || m.poster_path || '',
              backdropPath: m.backdropPath || m.backdrop_path || '',
              tmdbRating: m.tmdbRating || m.vote_average || 0,
              trailerKey: m.trailerKey || '',
              streamingPlatforms: m.streamingPlatforms || [],
            });
          }
          dbMovieIds.push(dbMovie._id);
        } catch (err) {
          console.error(`Failed to auto-seed movie tmdbId ${tmdbId}:`, err.message);
        }
      }
    }
  }

  const assistantMsg = await ChatMessage.create({
    user: req.user._id,
    sessionId: sid,
    role: 'assistant',
    content,
    movieSuggestions: dbMovieIds,
  });

  res.json({
    success: true,
    data: {
      message: assistantMsg,
      movieSuggestions,
      sessionId: sid,
    },
  });
};

// GET /api/v1/chatbot/history
const getChatHistory = async (req, res) => {
  const { sessionId, limit = 50 } = req.query;

  const query = { user: req.user._id };
  if (sessionId) query.sessionId = sessionId;

  const messages = await ChatMessage.find(query)
    .populate('movieSuggestions')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({ success: true, data: { messages: messages.reverse() } });
};

// GET /api/v1/chatbot/sessions
const getSessions = async (req, res) => {
  const sessions = await ChatMessage.aggregate([
    { $match: { user: req.user._id, role: 'user' } },
    { $group: { _id: '$sessionId', lastMessage: { $last: '$content' }, lastAt: { $last: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { lastAt: -1 } },
    { $limit: 10 },
  ]);

  res.json({ success: true, data: { sessions } });
};

// DELETE /api/v1/chatbot/history
const clearHistory = async (req, res) => {
  const { sessionId } = req.query;
  const query = { user: req.user._id };
  if (sessionId) query.sessionId = sessionId;

  await ChatMessage.deleteMany(query);
  res.json({ success: true, message: 'Chat history cleared' });
};

module.exports = { sendMessage, getChatHistory, getSessions, clearHistory };
