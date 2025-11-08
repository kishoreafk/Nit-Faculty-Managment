const pool = require('../config/db');
const pdfFormService = require('../services/pdfFormService');
const path = require('path');
const fs = require('fs');

const uploadFile = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const filePath = `/uploads/${folderName}/${req.file.filename}`;
    const fileSize = req.file.size;
    const fileType = req.file.mimetype;

    const [result] = await pool.execute(
      `INSERT INTO files (faculty_id, fileName, originalName, filePath, fileSize, fileType, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [facultyId, fileName, originalName, filePath, fileSize, fileType, description || null]
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      fileId: result.insertId,
      filePath
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyFiles = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    const [rows] = await pool.execute(
      `SELECT * FROM files 
       WHERE faculty_id = ? 
       ORDER BY createdAt DESC`,
      [facultyId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Get my files error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteFile = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const facultyId = req.user.facultyId;
    const { fileId } = req.params;

    // First, get the file to find the file path
    const [rows] = await pool.execute(
      `SELECT * FROM files 
       WHERE id = ? AND faculty_id = ?`,
      [fileId, facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'File not found or access denied' });
    }

    const file = rows[0];

    // Delete from database
    const [result] = await pool.execute(
      `DELETE FROM files 
       WHERE id = ? AND faculty_id = ?`,
      [fileId, facultyId]
    );

    // Delete file from uploads folder if it exists
    if (file.filePath) {
      const filePath = path.join(__dirname, '..', file.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('File deleted from uploads folder:', filePath);
        
        // Delete user folder if empty
        const userFolder = path.dirname(filePath);
        if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
          fs.rmdirSync(userFolder);
          console.log('Empty user folder deleted:', userFolder);
        }
      }
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Extract form fields from PDF
const extractPDFFormFields = async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }
    
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const formFields = await pdfFormService.extractFormFields(fullPath);
    
    res.json({
      message: 'Form fields extracted successfully',
      formFields: formFields,
      fieldCount: formFields.length
    });
    
  } catch (error) {
    console.error('Extract PDF form fields error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Create fillable PDF from existing PDF
const createFillablePDF = async (req, res) => {
  try {
    const { inputPath, outputName } = req.body;
    
    if (!inputPath) {
      return res.status(400).json({ message: 'Input path is required' });
    }
    
    const fullInputPath = path.join(__dirname, '..', inputPath);
    
    if (!fs.existsSync(fullInputPath)) {
      return res.status(404).json({ message: 'Input file not found' });
    }
    
    const outputFileName = outputName || `fillable_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '..', 'uploads', 'fillable_forms', outputFileName);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const result = await pdfFormService.generateFillablePDFTemplate(fullInputPath, outputPath);
    
    res.json({
      message: 'Fillable PDF created successfully',
      outputPath: `/uploads/fillable_forms/${outputFileName}`,
      formFields: result.formFields,
      fieldCount: result.formFields.length
    });
    
  } catch (error) {
    console.error('Create fillable PDF error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get all available PDF forms with their fields
const getAvailablePDFForms = async (req, res) => {
  try {
    const { staffType = 'Teaching' } = req.query;
    
    const formsWithFields = await pdfFormService.getAllFormsWithFields(staffType);
    
    res.json({
      message: 'Available PDF forms retrieved successfully',
      forms: formsWithFields,
      count: formsWithFields.length
    });
    
  } catch (error) {
    console.error('Get available PDF forms error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get form structure for a specific leave type
const getPDFFormStructure = async (req, res) => {
  try {
    const { leaveType, staffType = 'Teaching', contractType = 'Regular' } = req.query;
    
    if (!leaveType) {
      return res.status(400).json({ message: 'Leave type is required' });
    }
    
    const formStructure = await pdfFormService.getFormStructure(leaveType, staffType, contractType);
    
    res.json({
      message: 'Form structure retrieved successfully',
      structure: formStructure
    });
    
  } catch (error) {
    console.error('Get PDF form structure error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Convert existing PDF to fillable form
const convertToFillableForm = async (req, res) => {
  try {
    const { inputPath } = req.body;
    
    if (!inputPath) {
      return res.status(400).json({ message: 'Input path is required' });
    }
    
    const fullInputPath = path.join(__dirname, '..', inputPath);
    
    if (!fs.existsSync(fullInputPath)) {
      return res.status(404).json({ message: 'Input file not found' });
    }
    
    const outputFileName = `fillable_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '..', 'uploads', 'fillable_forms', outputFileName);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const fillablePdfBytes = await pdfFormService.convertToFillableForm(fullInputPath, outputPath);
    
    res.json({
      message: 'PDF converted to fillable form successfully',
      outputPath: `/uploads/fillable_forms/${outputFileName}`,
      size: fillablePdfBytes.length
    });
    
  } catch (error) {
    console.error('Convert to fillable form error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  uploadFile,
  getMyFiles,
  deleteFile,
  extractPDFFormFields,
  createFillablePDF,
  getAvailablePDFForms,
  getPDFFormStructure,
  convertToFillableForm
}; 