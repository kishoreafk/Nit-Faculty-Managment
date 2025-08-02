const express = require('express');
const { 
  getAllUsers, 
  approveUser, 
  addUser, 
  removeUser, 
  resetPassword,
  getUserDetails,
  getLogs
} = require('../controllers/admin.controller');
const { assignTimetable } = require('../controllers/leave.controller');
const multer = require('multer');
const path = require('path');

// Configure multer for admin timetable uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const uploadPath = 'uploads/Admin_User';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'timetable-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/approve', approveUser);
router.post('/users', addUser);
router.delete('/users/:userId', removeUser);
router.put('/users/:userId/reset-password', resetPassword);
router.get('/logs', getLogs);
router.post('/assign-timetable/:facultyId', upload.single('timetable'), assignTimetable);

module.exports = router;