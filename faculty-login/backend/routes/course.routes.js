const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  getMyTimetable, 
  uploadTimetable, 
  deleteTimetable,
  getMyCoursePlans, 
  addCoursePlan, 
  updateCoursePlan, 
  deleteCoursePlan 
} = require('../controllers/course.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for timetable uploads
const timetableStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const uploadPath = `uploads/${folderName}`;
    
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

const timetableUpload = multer({ 
  storage: timetableStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow documents and images for timetables
    const allowedTypes = /pdf|doc|docx|xls|xlsx|jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.mimetype === 'application/vnd.ms-excel' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX, XLS, XLSX) and images are allowed for timetables!'));
    }
  }
});

// Configure multer for course material uploads
const courseMaterialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const uploadPath = `uploads/${folderName}`;
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'course-material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const courseMaterialUpload = multer({ 
  storage: courseMaterialStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for course materials
  },
  fileFilter: function (req, file, cb) {
    // Allow documents and images for course materials
    const allowedTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.mimetype === 'application/vnd.ms-powerpoint' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     file.mimetype === 'application/vnd.ms-excel' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.mimetype === 'text/plain';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT) and images are allowed for course materials!'));
    }
  }
});

router.use(authenticateToken);

// Timetable routes
router.get('/timetable/mine', getMyTimetable);
router.post('/timetable/upload', timetableUpload.single('timetable'), uploadTimetable);
router.delete('/timetable/mine', deleteTimetable);

// Course plan routes
router.get('/courseplan/mine', getMyCoursePlans);
router.post('/courseplan/add', courseMaterialUpload.single('courseMaterial'), addCoursePlan);
router.put('/courseplan/:planId', courseMaterialUpload.single('courseMaterial'), updateCoursePlan);
router.delete('/courseplan/:planId', deleteCoursePlan);

module.exports = router; 