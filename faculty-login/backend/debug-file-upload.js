const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Test multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called');
    console.log('File:', file);
    console.log('User:', req.user);
    
    const faculty = req.user || { firstName: 'Test', lastName: 'User' };
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const uploadPath = path.join(__dirname, 'uploads', folderName);
    
    console.log('Upload path:', uploadPath);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('Created directory:', uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    console.log('Multer filename called');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('Multer fileFilter called');
    console.log('File mimetype:', file.mimetype);
    console.log('File originalname:', file.originalname);
    
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    console.log('Extension test:', extname);
    console.log('Mimetype test:', mimetype);

    if (mimetype && extname) {
      console.log('File accepted');
      return cb(null, true);
    } else {
      console.log('File rejected');
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
});

console.log('Multer configuration test completed');
console.log('Storage:', storage);
console.log('Upload middleware:', upload);

// Test the path construction
const testUser = { firstName: 'kishore', lastName: 's' };
const folderName = `${testUser.firstName}_${testUser.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
const testUploadPath = path.join(__dirname, 'uploads', folderName);

console.log('Test user folder name:', folderName);
console.log('Test upload path:', testUploadPath);
console.log('Test path exists:', fs.existsSync(testUploadPath));

if (fs.existsSync(testUploadPath)) {
  const files = fs.readdirSync(testUploadPath);
  console.log('Files in test path:', files);
}

console.log('Debug completed!');