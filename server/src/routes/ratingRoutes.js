const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { rateMovie, getMyRatings, getMovieRatings, deleteRating, checkRating } = require('../controllers/ratingController');

router.get('/my', auth, getMyRatings);
router.get('/check/:tmdbId', auth, checkRating);
router.get('/movie/:tmdbId', getMovieRatings);   // Public: see movie ratings
router.post('/', auth, rateMovie);
router.delete('/:tmdbId', auth, deleteRating);

module.exports = router;
