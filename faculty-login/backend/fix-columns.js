const mysql = require('mysql2/promise');

async function fixColumns() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Add columns to faculty table one by one
    try {
      await connection.execute("ALTER TABLE faculty ADD COLUMN role ENUM('admin', 'faculty') DEFAULT 'faculty'");
      console.log('Added role column');
    } catch (e) { console.log('Role column exists or error:', e.message); }

    try {
      await connection.execute("ALTER TABLE faculty ADD COLUMN is_approved BOOLEAN DEFAULT TRUE");
      console.log('Added is_approved column');
    } catch (e) { console.log('is_approved column exists or error:', e.message); }

    try {
      await connection.execute("ALTER TABLE faculty ADD COLUMN approved_by INT NULL");
      console.log('Added approved_by column');
    } catch (e) { console.log('approved_by column exists or error:', e.message); }

    try {
      await connection.execute("ALTER TABLE faculty ADD COLUMN approved_at TIMESTAMP NULL");
      console.log('Added approved_at column');
    } catch (e) { console.log('approved_at column exists or error:', e.message); }

    // Create admin user
    try {
      await connection.execute(`INSERT IGNORE INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
        VALUES ('Admin', 'User', 'adminlogin@collage.edu', '$2b$10$8K1p/a0dqFNH7Aa1ibinsuXioZeo.WdfiTqUEgYpjVE4Q0VdRw1Lu', 'Administration', 'ADMIN001', 'Administrator', 'admin', TRUE, NOW())`);
      console.log('Created admin user');
    } catch (e) { console.log('Admin user exists or error:', e.message); }

    // Update existing users
    await connection.execute("UPDATE faculty SET is_approved = TRUE WHERE is_approved IS NULL");
    console.log('Updated existing users');

    console.log('Column fixes completed');
    await connection.end();
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixColumns();