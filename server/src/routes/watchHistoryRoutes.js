const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { addToHistory, getHistory, removeFromHistory, clearHistory, getStats, getDailyStats } = require('../controllers/watchHistoryController');

router.use(auth); // All history routes require auth

router.get('/', getHistory);
router.post('/', addToHistory);
router.get('/stats', getStats);
router.get('/stats/day/:dayName', getDailyStats);
router.delete('/clear', clearHistory);
router.delete('/:tmdbId', removeFromHistory);

module.exports = router;
