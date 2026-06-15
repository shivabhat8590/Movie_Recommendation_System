const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { sendMessage, getChatHistory, getSessions, clearHistory } = require('../controllers/chatbotController');

router.use(auth); // All chatbot routes require auth

router.post('/message', sendMessage);
router.get('/history', getChatHistory);
router.get('/sessions', getSessions);
router.delete('/history', clearHistory);

module.exports = router;
