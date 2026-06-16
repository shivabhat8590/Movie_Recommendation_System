const express = require('express');
const router = express.Router();
const { logActivity } = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/log', authMiddleware, logActivity);

module.exports = router;
