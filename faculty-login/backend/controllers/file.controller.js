const pool = require('../config/db');

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
      `INSERT INTO files (facultyId, fileName, originalName, filePath, fileSize, fileType, description) 
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
       WHERE facultyId = ? 
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
       WHERE id = ? AND facultyId = ?`,
      [fileId, facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'File not found or access denied' });
    }

    const file = rows[0];

    // Delete from database
    const [result] = await pool.execute(
      `DELETE FROM files 
       WHERE id = ? AND facultyId = ?`,
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

module.exports = {
  uploadFile,
  getMyFiles,
  deleteFile
}; 