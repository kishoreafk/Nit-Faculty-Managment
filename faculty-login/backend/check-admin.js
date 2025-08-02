const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Check if admin user exists
    const [admin] = await connection.execute(
      "SELECT * FROM faculty WHERE email = 'adminlogin@collage.edu'"
    );

    if (admin.length > 0) {
      console.log('Admin user found:');
      console.log('- Email:', admin[0].email);
      console.log('- Role:', admin[0].role);
      console.log('- Is Approved:', admin[0].is_approved);
      console.log('- Password hash:', admin[0].password.substring(0, 20) + '...');
      
      // Test password
      const isValid = await bcrypt.compare('admin123', admin[0].password);
      console.log('- Password test:', isValid ? 'VALID' : 'INVALID');
    } else {
      console.log('Admin user NOT found');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(`
        INSERT INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
        VALUES ('Admin', 'User', 'adminlogin@collage.edu', ?, 'Administration', 'ADMIN001', 'Administrator', 'admin', TRUE, NOW())
      `, [hashedPassword]);
      console.log('Created admin user with fresh password hash');
    }

    await connection.end();
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkAdmin();