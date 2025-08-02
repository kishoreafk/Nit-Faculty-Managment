const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, firstName, lastName, email, department, employeeId, designation, role, is_approved, 
              createdAt FROM faculty ORDER BY createdAt DESC`
    );
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Approve/Decline user
const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved } = req.body;
    const adminId = req.user.facultyId;

    const [result] = await pool.execute(
      `UPDATE faculty SET is_approved = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
      [approved, adminId, approved ? new Date() : null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `User ${approved ? 'approved' : 'declined'} successfully` });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add new user
const addUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, department, employeeId, designation, role } = req.body;

    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id FROM faculty WHERE email = ? OR employeeId = ?',
      [email, employeeId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'User with this email or employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_by, approved_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())`,
      [firstName, lastName, email, hashedPassword, department, employeeId, designation, role, req.user.facultyId]
    );

    res.status(201).json({ message: 'User added successfully', userId: result.insertId });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove user
const removeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [result] = await pool.execute('DELETE FROM faculty WHERE id = ? AND role != "admin"', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found or cannot delete admin' });
    }

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await pool.execute(
      'UPDATE faculty SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await pool.execute(
      `SELECT id, firstName, lastName, email, department, employeeId, designation, role, is_approved 
       FROM faculty WHERE id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's requests and data
    const [leaves] = await pool.execute(
      'SELECT * FROM leave_requests WHERE facultyId = ? ORDER BY createdAt DESC LIMIT 10',
      [userId]
    );

    const [products] = await pool.execute(
      'SELECT * FROM product_requests WHERE facultyId = ? ORDER BY createdAt DESC LIMIT 10',
      [userId]
    );

    const [timetable] = await pool.execute(
      'SELECT * FROM faculty_timetables WHERE faculty_id = ? ORDER BY uploaded_at DESC LIMIT 1',
      [userId]
    );

    res.json({
      user: user[0],
      leaves,
      products,
      timetable: timetable[0] || null
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getLogs = async (req, res) => {
  try {
    const [logs] = await pool.execute(
      `SELECT al.*, 
              a.firstName as admin_name, a.lastName as admin_lastname,
              u.firstName as target_name, u.lastName as target_lastname
       FROM admin_logs al
       JOIN faculty a ON al.admin_id = a.id
       JOIN faculty u ON al.target_user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  approveUser,
  addUser,
  removeUser,
  resetPassword,
  getUserDetails,
  getLogs
};