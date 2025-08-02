const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function fixAdmin() {
  try {
    // Delete existing admin if exists
    await pool.execute("DELETE FROM faculty WHERE email = 'adminlogin@collage.edu' OR employeeId = 'ADMIN001'");
    
    // Hash password properly
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Insert admin user
    await pool.execute(
      `INSERT INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      ['Admin', 'User', 'adminlogin@collage.edu', hashedPassword, 'Administration', 'ADMIN001', 'Administrator', 'admin', true]
    );
    
    console.log('Admin user created successfully!');
    console.log('Email: adminlogin@collage.edu');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdmin();