const pool = require('../config/db');

const getMyTimetable = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    const [rows] = await pool.execute(
      `SELECT * FROM faculty_timetables 
       WHERE faculty_id = ? 
       ORDER BY uploaded_at DESC 
       LIMIT 1`,
      [facultyId]
    );

    if (rows[0]) {
      // Transform the response to match frontend expectations
      const timetable = {
        ...rows[0],
        uploadedAt: rows[0].uploaded_at,
        fileUrl: rows[0].timetable_image_url,
        filePath: rows[0].timetable_image_url // For backward compatibility
      };
      res.json(timetable);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get my timetable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const uploadTimetable = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { semester } = req.body;
    
    // Get file URL from uploaded file
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const timetable_image_url = req.file ? `/uploads/${folderName}/${req.file.filename}` : null;

    if (!timetable_image_url) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Handle undefined semester by setting it to null
    const semesterValue = semester || null;

    const [result] = await pool.execute(
      `INSERT INTO faculty_timetables (faculty_id, timetable_image_url, semester) 
       VALUES (?, ?, ?)`,
      [facultyId, timetable_image_url, semesterValue]
    );

    res.status(201).json({
      message: 'Timetable uploaded successfully',
      timetableId: result.insertId,
      timetable_image_url
    });
  } catch (error) {
    console.error('Upload timetable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteTimetable = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const facultyId = req.user.facultyId;

    // First, get the current timetable to find the file path
    const [rows] = await pool.execute(
      `SELECT * FROM faculty_timetables 
       WHERE faculty_id = ? 
       ORDER BY uploaded_at DESC 
       LIMIT 1`,
      [facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No timetable found to delete' });
    }

    const timetable = rows[0];
    const filePath = path.join(__dirname, '..', timetable.timetable_image_url);

    // Delete from database
    await pool.execute(
      `DELETE FROM faculty_timetables WHERE id = ?`,
      [timetable.id]
    );

    // Delete file from uploads folder if it exists
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

    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyCoursePlans = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    const [rows] = await pool.execute(
      `SELECT * FROM course_plans 
       WHERE facultyId = ? 
       ORDER BY createdAt DESC`,
      [facultyId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Get my course plans error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const addCoursePlan = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const {
      courseName,
      courseCode,
      semester,
      academicYear,
      description,
      objectives,
      syllabus
    } = req.body;

    // Get file URL from uploaded file (if any)
    const faculty = req.faculty || req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const courseMaterialFile = req.file ? `/uploads/${folderName}/${req.file.filename}` : null;
    const courseMaterialFileName = req.file ? req.file.originalname : null;

    const [result] = await pool.execute(
      `INSERT INTO course_plans (facultyId, courseName, courseCode, semester, 
        academicYear, description, objectives, syllabus, courseMaterialFile, courseMaterialFileName) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyId, courseName, courseCode, semester, academicYear, 
       description, objectives, syllabus, courseMaterialFile, courseMaterialFileName]
    );

    res.status(201).json({
      message: 'Course plan added successfully',
      planId: result.insertId,
      courseMaterialFile
    });
  } catch (error) {
    console.error('Add course plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateCoursePlan = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const facultyId = req.user.facultyId;
    const { planId } = req.params;
    const {
      courseName,
      courseCode,
      semester,
      academicYear,
      description,
      objectives,
      syllabus
    } = req.body;

    // Get file URL from uploaded file (if any)
    const courseMaterialFile = req.file ? `/uploads/${req.file.filename}` : null;
    const courseMaterialFileName = req.file ? req.file.originalname : null;

    let query, params;
    let oldFilePath = null;

    if (courseMaterialFile) {
      // Get the old file path before updating
      const [oldRows] = await pool.execute(
        `SELECT courseMaterialFile FROM course_plans WHERE id = ? AND facultyId = ?`,
        [planId, facultyId]
      );
      
      if (oldRows.length > 0 && oldRows[0].courseMaterialFile) {
        oldFilePath = path.join(__dirname, '..', oldRows[0].courseMaterialFile);
      }

      // Update with new file
      const faculty = req.faculty || req.user;
      const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const newCourseMaterialFile = `/uploads/${folderName}/${req.file.filename}`;
      
      query = `UPDATE course_plans 
               SET courseName = ?, courseCode = ?, semester = ?, academicYear = ?, 
                   description = ?, objectives = ?, syllabus = ?, 
                   courseMaterialFile = ?, courseMaterialFileName = ?
               WHERE id = ? AND facultyId = ?`;
      params = [courseName, courseCode, semester, academicYear, 
                description, objectives, syllabus, 
                newCourseMaterialFile, courseMaterialFileName, planId, facultyId];
    } else {
      // Update without changing file
      query = `UPDATE course_plans 
               SET courseName = ?, courseCode = ?, semester = ?, academicYear = ?, 
                   description = ?, objectives = ?, syllabus = ?
               WHERE id = ? AND facultyId = ?`;
      params = [courseName, courseCode, semester, academicYear, 
                description, objectives, syllabus, planId, facultyId];
    }

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Course plan not found or access denied' });
    }

    // Delete old file if a new one was uploaded
    if (oldFilePath && fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log('Old course material file deleted from uploads folder:', oldFilePath);
      
      // Delete user folder if empty
      const userFolder = path.dirname(oldFilePath);
      if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
        fs.rmdirSync(userFolder);
        console.log('Empty user folder deleted:', userFolder);
      }
    }

    res.json({ 
      message: 'Course plan updated successfully',
      courseMaterialFile
    });
  } catch (error) {
    console.error('Update course plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteCoursePlan = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const facultyId = req.user.facultyId;
    const { planId } = req.params;

    // First, get the course plan to find the file path
    const [rows] = await pool.execute(
      `SELECT * FROM course_plans 
       WHERE id = ? AND facultyId = ?`,
      [planId, facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Course plan not found or access denied' });
    }

    const coursePlan = rows[0];

    // Delete from database
    const [result] = await pool.execute(
      `DELETE FROM course_plans 
       WHERE id = ? AND facultyId = ?`,
      [planId, facultyId]
    );

    // Delete file from uploads folder if it exists
    if (coursePlan.courseMaterialFile) {
      const filePath = path.join(__dirname, '..', coursePlan.courseMaterialFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Course material file deleted from uploads folder:', filePath);
        
        // Delete user folder if empty
        const userFolder = path.dirname(filePath);
        if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
          fs.rmdirSync(userFolder);
          console.log('Empty user folder deleted:', userFolder);
        }
      }
    }

    res.json({ message: 'Course plan deleted successfully' });
  } catch (error) {
    console.error('Delete course plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getMyTimetable,
  uploadTimetable,
  deleteTimetable,
  getMyCoursePlans,
  addCoursePlan,
  updateCoursePlan,
  deleteCoursePlan
}; 