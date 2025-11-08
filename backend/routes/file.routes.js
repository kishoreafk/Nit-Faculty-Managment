const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  uploadFile, 
  getMyFiles, 
  deleteFile, 
  extractPDFFormFields, 
  createFillablePDF, 
  getAvailablePDFForms, 
  getPDFFormStructure, 
  convertToFillableForm 
} = require('../controllers/file.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const uploadPath = path.join(__dirname, '..', 'uploads', folderName);
    const normalizedPath = path.normalize(uploadPath);
    
    // Security check: ensure path is within uploads directory
    const baseUploadPath = path.join(__dirname, '..', 'uploads');
    if (!normalizedPath.startsWith(baseUploadPath)) {
      return cb(new Error('Invalid upload path'));
    }
    
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }
    cb(null, normalizedPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(sanitizedFilename));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow PDF, images, and common document formats
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
});

router.use(authenticateToken);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/mine', getMyFiles);
router.delete('/:fileId', deleteFile);

// PDF Form routes
router.post('/pdf/extract-fields', extractPDFFormFields);
router.post('/pdf/create-fillable', createFillablePDF);
router.get('/pdf/available-forms', getAvailablePDFForms);
router.get('/pdf/form-structure', getPDFFormStructure);
router.post('/pdf/convert-fillable', convertToFillableForm);

module.exports = router; 