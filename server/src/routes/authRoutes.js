const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { register, login, refresh, logout, getMe, updateMe, changePassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.put('/change-password', auth, changePassword);

module.exports = router;
