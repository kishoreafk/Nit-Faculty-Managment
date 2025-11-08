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
    const { approved, reason } = req.body;
    const adminId = req.user.facultyId;

    const [result] = await pool.execute(
      `UPDATE faculty SET is_approved = ?, approved_by = ?, approved_at = ?, approval_reason = ? WHERE id = ?`,
      [approved, adminId, approved ? new Date() : null, reason || null, userId]
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
    const { firstName, lastName, email, password, department, employeeId, designation, facultyType, joiningDate, role } = req.body;

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
      `INSERT INTO faculty (firstName, lastName, email, password, department, employeeId, designation, facultyType, joiningDate, role, is_approved, approved_by, approved_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())`,
      [firstName, lastName, email, hashedPassword, department, employeeId, designation, facultyType || 'Teaching', joiningDate, role, req.user.facultyId]
    );

    res.status(201).json({ message: 'User added successfully', userId: result.insertId });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove user
const removeUser = async (req, res) => {
  // Get a connection from the pool for transaction
  let connection;
  
  try {
    const { userId } = req.params;
    const adminId = req.user.facultyId;

    // Prevent admin from deleting themselves
    if (userId == adminId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    // Check if user exists before deletion
    const [userCheck] = await pool.execute('SELECT id, role FROM faculty WHERE id = ?', [userId]);
    
    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get a connection from the pool
    connection = await pool.getConnection();
    
    // Begin transaction
    await connection.beginTransaction();

    try {
      // First, delete all admin_logs entries that reference this user
      // This is necessary because admin_logs has foreign key constraints without ON DELETE clauses
      await connection.execute('DELETE FROM admin_logs WHERE admin_id = ? OR target_user_id = ?', [userId, userId]);
      
      // Delete related records from all tables that reference faculty.id
      // These tables have ON DELETE CASCADE, but we'll delete them explicitly to be safe
      
      // Delete leave requests
      await connection.execute('DELETE FROM leave_requests WHERE faculty_id = ?', [userId]);
      
      // Delete product requests
      await connection.execute('DELETE FROM product_requests WHERE faculty_id = ?', [userId]);
      
      // Delete files
      await connection.execute('DELETE FROM files WHERE faculty_id = ?', [userId]);
      
      // Delete course plans
      await connection.execute('DELETE FROM course_plans WHERE faculty_id = ?', [userId]);
      
      // Delete timetables
      await connection.execute('DELETE FROM faculty_timetables WHERE faculty_id = ?', [userId]);
      
      // Set NULL for approved_by references in faculty table
      await connection.execute('UPDATE faculty SET approved_by = NULL WHERE approved_by = ?', [userId]);
      
      // Set NULL for approvedBy references in leave_requests
      await connection.execute('UPDATE leave_requests SET approvedBy = NULL WHERE approvedBy = ?', [userId]);
      
      // Set NULL for approvedBy references in product_requests
      await connection.execute('UPDATE product_requests SET approvedBy = NULL WHERE approvedBy = ?', [userId]);
      
      // Finally, delete the user
      await connection.execute('DELETE FROM faculty WHERE id = ?', [userId]);
      
      // Log the admin action (after deleting the user)
      await connection.execute(
        `INSERT INTO admin_logs (admin_id, action_type, details) 
         VALUES (?, ?, ?)`,
        [adminId, 'user_deleted', `User ID ${userId} deleted (role: ${userCheck[0].role})`]
      );
      
      // Commit the transaction
      await connection.commit();
      
      res.json({ message: 'User removed successfully' });
    } catch (transactionError) {
      // If any error occurs, rollback the transaction
      if (connection) await connection.rollback();
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    // Release the connection back to the pool
    if (connection) connection.release();
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

    // Get user's leave requests
    let leaves = [];
    try {
      const [leaveRequests] = await pool.execute(
        'SELECT * FROM leave_requests WHERE faculty_id = ? ORDER BY createdAt DESC LIMIT 10',
        [userId]
      );
      leaves = [...leaves, ...leaveRequests];
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }

    // Get user's leave applications
    try {
      const [leaveApplications] = await pool.execute(
        'SELECT *, leave_category as leaveType, created_at as createdAt FROM leave_applications WHERE faculty_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId]
      );
      leaves = [...leaves, ...leaveApplications];
    } catch (err) {
      console.error('Error fetching leave applications:', err);
    }

    // Sort and limit leaves
    leaves.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    leaves = leaves.slice(0, 10);

    // Get user's product requests
    const [products] = await pool.execute(
      'SELECT * FROM product_requests WHERE faculty_id = ? ORDER BY createdAt DESC LIMIT 10',
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
       LEFT JOIN faculty u ON al.target_user_id = u.id
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