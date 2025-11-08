const express = require('express');
const { getDashboardStats, getRecentActivity } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/activity', getRecentActivity);

module.exports = router;