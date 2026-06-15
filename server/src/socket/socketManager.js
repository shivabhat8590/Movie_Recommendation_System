const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const openai = require('../services/openaiService');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // --- Auth middleware ---
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        // Allow unauthenticated connections (for public real-time features)
        socket.user = null;
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role');
      socket.user = user || null;
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?._id?.toString();

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`🔌 Socket connected: user ${socket.user.name} (${socket.id})`);
    } else {
      console.log(`🔌 Socket connected: anonymous (${socket.id})`);
    }

    // --- Real-time: join movie room for live updates ---
    socket.on('join:movie', (tmdbId) => {
      socket.join(`movie:${tmdbId}`);
    });

    socket.on('leave:movie', (tmdbId) => {
      socket.leave(`movie:${tmdbId}`);
    });

    // --- Mood-based real-time recommendation request ---
    socket.on('request:mood-recs', async ({ mood }) => {
      try {
        const axios = require('axios');
        const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const { data } = await axios.post(`${ML_URL}/recommendations/mood`, { mood }, { timeout: 5000 });
        socket.emit('mood:recommendations', { mood, movies: data.recommendations || [] });
      } catch {
        socket.emit('mood:recommendations', { mood, movies: [] });
      }
    });

    // --- Broadcast movie rating update to room ---
    socket.on('movie:rated', ({ tmdbId, score }) => {
      if (userId) {
        io.to(`movie:${tmdbId}`).emit('movie:rating-update', {
          tmdbId,
          newRating: score,
          userId,
          userName: socket.user?.name,
        });
      }
    });

    // --- Real-time: chatbot message via socket ---
    socket.on('chat:message', async ({ message, sessionId, kidsMode }) => {
      if (!userId) {
        return socket.emit('chat:error', { message: 'Authentication required' });
      }

      const sid = sessionId || userId;

      try {
        // Save user message to database
        const userMsg = await ChatMessage.create({
          user: socket.user._id,
          sessionId: sid,
          role: 'user',
          content: message.trim(),
        });

        // Notify client user message is saved (optional, helps keep consistent IDs)
        socket.emit('chat:message-saved', { message: userMsg });

        // Emit typing status
        socket.emit('chat:typing', { typing: true });

        // Get recent conversation history
        const history = await ChatMessage.find({ user: socket.user._id, sessionId: sid })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const messagesForAI = history
          .reverse()
          .slice(0, -1) // Exclude current user message we just saved
          .map((m) => ({ role: m.role, content: m.content }));

        messagesForAI.push({ role: 'user', content: message.trim() });

        // Get AI response
        const { content, movieSuggestions } = await openai.chatbotResponse(messagesForAI, { ...socket.user.preferences, kidsMode });

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
          user: socket.user._id,
          sessionId: sid,
          role: 'assistant',
          content,
          movieSuggestions: dbMovieIds,
        });

        // Add a typing simulation delay of 1.2s to feel real-time and natural
        setTimeout(() => {
          socket.emit('chat:typing', { typing: false });
          socket.emit('chat:message', {
            message: assistantMsg,
            movieSuggestions: filteredSuggestions,
            sessionId: sid,
          });
        }, 1200);

      } catch (err) {
        console.error('Socket Chatbot Error:', err);
        socket.emit('chat:typing', { typing: false });
        socket.emit('chat:error', { message: 'Sorry, I encountered an error. Please try again!' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket(server) first.');
  return io;
};

// Emit to a specific user
const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

// Broadcast to all
const broadcast = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, broadcast };
