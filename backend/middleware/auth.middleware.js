const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
    
    // Get faculty data from database
    const [faculty] = await pool.execute(
      'SELECT id, firstName, lastName, email, department, employeeId, designation, role, is_approved FROM faculty WHERE id = ?',
      [decoded.facultyId]
    );

    if (faculty.length === 0 || !faculty[0].is_approved) {
      return res.status(401).json({ message: 'Account not approved or invalid token' });
    }

    req.user = {
      facultyId: faculty[0].id,
      firstName: faculty[0].firstName,
      lastName: faculty[0].lastName,
      email: faculty[0].email,
      department: faculty[0].department,
      employeeId: faculty[0].employeeId,
      designation: faculty[0].designation,
      role: faculty[0].role,
      is_approved: faculty[0].is_approved
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', expired: true });
    }
    
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
}; 