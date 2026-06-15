const express = require('express');
const router = express.Router();
const { 
  getTrending, 
  search, 
  getMovieDetail, 
  getByGenre, 
  getSimilar, 
  getGenres, 
  discover, 
  getAdultMovies, 
  getChildMovies,
  getUpcomingMovies,
  getLeavingSoonMovies
} = require('../controllers/movieController');

// All movie routes are public
router.get('/trending', getTrending);
router.get('/search', search);
router.get('/genres', getGenres);
router.get('/discover', discover);
router.get('/adult', getAdultMovies);
router.get('/child', getChildMovies);
router.get('/upcoming', getUpcomingMovies);
router.get('/leaving', getLeavingSoonMovies);
router.get('/genre/:genreId', getByGenre);
router.get('/:tmdbId', getMovieDetail);
router.get('/:tmdbId/similar', getSimilar);

module.exports = router;
