const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Apply for leave with proof upload
const applyLeave = async (req, res) => {
  try {
    const { facultyId } = req.user;
    const { leaveType, startDate, endDate, reason } = req.body;
    
    console.log('Apply leave request received:');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    console.log('User:', req.user);
    
    // Handle file upload if provided
    let proofFile = null;
    let proofFileName = null;
    
    if (req.file) {
      const faculty = req.user;
      const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      proofFile = `/uploads/${folderName}/${req.file.filename}`;
      proofFileName = req.file.originalname;
      console.log('Leave proof file uploaded:', proofFile);
      console.log('Original filename:', proofFileName);
    } else {
      console.log('No file uploaded for leave request');
    }

    const [result] = await pool.execute(
      `INSERT INTO leave_requests (facultyId, leaveType, startDate, endDate, reason, proofFile, proofFileName) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [facultyId, leaveType, startDate, endDate, reason, proofFile, proofFileName]
    );

    console.log('Leave request inserted with ID:', result.insertId);
    console.log('Proof file saved to DB:', proofFile);

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveId: result.insertId
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get faculty's own leave requests
const getMyLeaves = async (req, res) => {
  try {
    const { facultyId } = req.user;

    const [leaves] = await pool.execute(
      `SELECT lr.*, f.firstName as approvedByFirstName, f.lastName as approvedByLastName
       FROM leave_requests lr 
       LEFT JOIN faculty f ON lr.approvedBy = f.id 
       WHERE lr.facultyId = ? 
       ORDER BY lr.createdAt DESC`,
      [facultyId]
    );

    res.json(leaves);
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all leave requests (for admin/HOD)
const getAllLeaves = async (req, res) => {
  try {
    const [leaves] = await pool.execute(
      `SELECT lr.*, f.firstName, f.lastName, f.department, f.employeeId,
              a.firstName as approvedByFirstName, a.lastName as approvedByLastName
       FROM leave_requests lr 
       JOIN faculty f ON lr.facultyId = f.id 
       LEFT JOIN faculty a ON lr.approvedBy = a.id
       ORDER BY lr.createdAt DESC`
    );

    res.json(leaves);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Review leave request (for admin/HOD)
const reviewLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, rejectionReason } = req.body;
    const { facultyId } = req.user;

    // Get leave request details for logging
    const [leaveData] = await pool.execute(
      'SELECT facultyId FROM leave_requests WHERE id = ?',
      [leaveId]
    );

    let query, params;
    
    if (status === 'Rejected') {
      query = `UPDATE leave_requests 
               SET status = ?, approvedBy = ?, approvedAt = CURRENT_TIMESTAMP, rejectionReason = ? 
               WHERE id = ?`;
      params = [status, facultyId, rejectionReason, leaveId];
    } else {
      query = `UPDATE leave_requests 
               SET status = ?, approvedBy = ?, approvedAt = CURRENT_TIMESTAMP, rejectionReason = NULL 
               WHERE id = ?`;
      params = [status, facultyId, leaveId];
    }

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Log admin action
    if (leaveData.length > 0) {
      await pool.execute(
        `INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_item_id, details) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          facultyId,
          status === 'Approved' ? 'leave_approved' : 'leave_rejected',
          leaveData[0].facultyId,
          leaveId,
          rejectionReason || `Leave ${status.toLowerCase()}`
        ]
      );
    }

    res.json({ message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('Review leave error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get leave statistics
const getLeaveStats = async (req, res) => {
  try {
    const { facultyId } = req.user;

    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as totalLeaves,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingLeaves,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approvedLeaves,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejectedLeaves
       FROM leave_requests 
       WHERE facultyId = ?`,
      [facultyId]
    );

    res.json(stats[0]);
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateLeaveRequest = async (req, res) => {
  try {
    const { facultyId } = req.user;
    const { leaveId } = req.params;
    const { leaveType, startDate, endDate, reason } = req.body;

    // Get the old leave request to find existing file path
    const [oldRows] = await pool.execute(
      `SELECT * FROM leave_requests 
       WHERE id = ? AND facultyId = ?`,
      [leaveId, facultyId]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found or access denied' });
    }

    const oldRequest = oldRows[0];
    let oldFilePath = null;

    // Handle new file upload
    let proofFile = oldRequest.proofFile;
    let proofFileName = oldRequest.proofFileName;

    if (req.file) {
      if (oldRequest.proofFile) {
        oldFilePath = path.join(__dirname, '..', oldRequest.proofFile);
      }
      const faculty = req.user;
      const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      proofFile = `/uploads/${folderName}/${req.file.filename}`;
      proofFileName = req.file.originalname;
      console.log('Leave proof file updated:', proofFile);
    } else {
      console.log('No new file uploaded for leave update');
    }

    // Update database
    const [result] = await pool.execute(
      `UPDATE leave_requests 
       SET leaveType = ?, startDate = ?, endDate = ?, reason = ?, proofFile = ?, proofFileName = ? 
       WHERE id = ? AND facultyId = ?`,
      [leaveType, startDate, endDate, reason, proofFile, proofFileName, leaveId, facultyId]
    );

    // Delete old file if a new one was uploaded
    if (oldFilePath && fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log('Old proof file deleted from uploads folder:', oldFilePath);
      
      // Delete user folder if empty
      const userFolder = path.dirname(oldFilePath);
      if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
        fs.rmdirSync(userFolder);
        console.log('Empty user folder deleted:', userFolder);
      }
    }

    res.json({ message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    const { facultyId } = req.user;
    const { leaveId } = req.params;

    // First, get the leave request to find the file path
    const [rows] = await pool.execute(
      `SELECT * FROM leave_requests 
       WHERE id = ? AND facultyId = ?`,
      [leaveId, facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found or access denied' });
    }

    const leaveRequest = rows[0];

    // Delete from database
    const [result] = await pool.execute(
      `DELETE FROM leave_requests 
       WHERE id = ? AND facultyId = ?`,
      [leaveId, facultyId]
    );

    // Delete proof file from uploads folder if it exists
    if (leaveRequest.proofFile) {
      const filePath = path.join(__dirname, '..', leaveRequest.proofFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Proof file deleted from uploads folder:', filePath);
        
        // Delete user folder if empty
        const userFolder = path.dirname(filePath);
        if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
          fs.rmdirSync(userFolder);
          console.log('Empty user folder deleted:', userFolder);
        }
      }
    }

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const assignTimetable = async (req, res) => {
  try {
    const { facultyId: targetFacultyId } = req.params;
    const adminId = req.user.facultyId;
    const { semester } = req.body;
    
    const timetable_image_url = req.file ? `/uploads/Admin_User/${req.file.filename}` : null;

    if (!timetable_image_url) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const [result] = await pool.execute(
      `INSERT INTO faculty_timetables (faculty_id, timetable_image_url, semester) 
       VALUES (?, ?, ?)`,
      [targetFacultyId, timetable_image_url, semester]
    );

    // Log admin action
    await pool.execute(
      `INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_item_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, 'timetable_assigned', targetFacultyId, result.insertId, `Timetable assigned for semester ${semester}`]
    );

    res.status(201).json({ message: 'Timetable assigned successfully' });
  } catch (error) {
    console.error('Assign timetable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  getLeaveStats,
  updateLeaveRequest,
  deleteLeaveRequest,
  assignTimetable
}; 