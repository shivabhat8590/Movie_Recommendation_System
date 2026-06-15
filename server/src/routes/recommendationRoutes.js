const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getPersonalized, getMoodBased, getSimilar, explainRecommendation, getTrending } = require('../controllers/recommendationController');

router.get('/trending', getTrending);           // Public
router.get('/mood', getMoodBased);              // Public
router.get('/similar/:tmdbId', getSimilar);     // Public
router.get('/personalized', auth, getPersonalized);
router.get('/:tmdbId/explain', auth, explainRecommendation);

module.exports = router;
