const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      department,
      employeeId
    } = req.body;

    // Check if faculty already exists
    const [existingFaculty] = await pool.execute(
      'SELECT id FROM faculty WHERE email = ? OR employeeId = ?',
      [email, employeeId]
    );

    if (existingFaculty.length > 0) {
      return res.status(400).json({ message: 'Faculty with this email or employee ID already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new faculty (pending approval)
    const [result] = await pool.execute(
      `INSERT INTO faculty (firstName, lastName, email, password, phone, department, employeeId, role, is_approved) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'faculty', FALSE)`,
      [firstName, lastName, email, hashedPassword, phone, department, employeeId]
    );

    res.status(201).json({
      message: 'Registration submitted. Awaiting admin approval.',
      facultyId: result.insertId
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find faculty by email
    const [faculty] = await pool.execute(
      'SELECT * FROM faculty WHERE email = ?',
      [email]
    );

    if (faculty.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const facultyData = faculty[0];

    // Check if account is approved
    if (!facultyData.is_approved) {
      return res.status(401).json({ message: 'Account pending approval' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, facultyData.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { facultyId: facultyData.id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      faculty: {
        id: facultyData.id,
        firstName: facultyData.firstName,
        lastName: facultyData.lastName,
        email: facultyData.email,
        department: facultyData.department,
        employeeId: facultyData.employeeId,
        phone: facultyData.phone,
        designation: facultyData.designation,
        role: facultyData.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login
}; 