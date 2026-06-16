require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const connectRedis = require('./config/redis');
const { initSocket } = require('./socket/socketManager');
const errorHandler = require('./middleware/errorHandler');

// --- Routes ---
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const watchHistoryRoutes = require('./routes/watchHistoryRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const adminRoutes = require('./routes/adminRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --- API Routes ---
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/movies`, movieRoutes);
app.use(`${API}/recommendations`, recommendationRoutes);
app.use(`${API}/wishlist`, wishlistRoutes);
app.use(`${API}/ratings`, ratingRoutes);
app.use(`${API}/history`, watchHistoryRoutes);
app.use(`${API}/chatbot`, chatbotRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/activities`, activityRoutes);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Startup ---
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  // await connectRedis();
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}${API}`);
    console.log(`🔌 Socket.io: enabled`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
})();

module.exports = { app, server };
