const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  applyLeave, 
  getMyLeaves, 
  getAllLeaves, 
  reviewLeave, 
  getLeaveStats,
  updateLeaveRequest,
  deleteLeaveRequest,
  getAvailableForms,
  generatePDFForm,
  viewGeneratedForm,
  downloadGeneratedForm,
  getFormStructure,
  generateDocxForm,
  scanFormStructure
} = require('../controllers/leave.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const faculty = req.user;
    if (!faculty) {
      return cb(new Error('User not authenticated'));
    }
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const uploadPath = path.join(__dirname, '..', 'uploads', folderName);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow only specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
});

// Protected routes - require authentication
router.use(authenticateToken);

// Apply for leave with file upload (allow either proofFile or filledPdf)
router.post('/apply', upload.fields([
  { name: 'proofFile', maxCount: 1 },
  { name: 'filledPdf', maxCount: 1 }
]), applyLeave);

// Get faculty's own leave requests
router.get('/mine', getMyLeaves);

// Get all leave requests (for admin/HOD)
router.get('/all', getAllLeaves);

// Review leave request (for admin/HOD)
router.put('/review/:leaveId', reviewLeave);

// Get leave statistics
router.get('/stats', getLeaveStats);

// Update leave request
router.put('/:leaveId', upload.single('proofFile'), updateLeaveRequest);

// Delete leave request
router.delete('/:leaveId', deleteLeaveRequest);

// PDF services removed - keeping routes for backward compatibility but returning appropriate messages
router.get('/forms/available', getAvailableForms);
router.get('/:leaveId/generate-pdf', generatePDFForm);
router.get('/:leaveId/view-form', viewGeneratedForm);
router.get('/:leaveId/download-form', downloadGeneratedForm);
router.get('/forms/structure', getFormStructure);
router.get('/:leaveId/generate-docx', generateDocxForm);
router.get('/forms/scan-structure', scanFormStructure);

module.exports = router; 