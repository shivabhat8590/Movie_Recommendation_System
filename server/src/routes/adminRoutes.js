const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, getSystemStats, getUserReport, getUserCredentials, updateUserPassword } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes require auth AND admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', getAllUsers);
router.get('/stats', getSystemStats);
router.get('/users/:id/report', getUserReport);
router.get('/credentials', getUserCredentials);
router.post('/users/:id/password', updateUserPassword);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
