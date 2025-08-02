const express = require('express');
const { getFacultyProfile, updateFacultyProfile } = require('../controllers/faculty.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/me', getFacultyProfile);
router.put('/update', updateFacultyProfile);

module.exports = router; 