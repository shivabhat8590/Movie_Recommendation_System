const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getWishlist, addToWishlist, removeFromWishlist, checkInWishlist } = require('../controllers/wishlistController');

router.use(auth); // All wishlist routes require auth

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.get('/check/:tmdbId', checkInWishlist);
router.delete('/:tmdbId', removeFromWishlist);

module.exports = router;
