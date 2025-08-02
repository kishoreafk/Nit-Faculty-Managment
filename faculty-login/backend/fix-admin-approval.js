const mysql = require('mysql2/promise');

async function fixAdminApproval() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Update admin user to be approved
    await connection.execute(
      "UPDATE faculty SET is_approved = TRUE WHERE email = 'adminlogin@collage.edu'"
    );
    console.log('Updated admin user approval status');

    // Check admin user again
    const [admin] = await connection.execute(
      "SELECT email, role, is_approved FROM faculty WHERE email = 'adminlogin@collage.edu'"
    );
    
    if (admin.length > 0) {
      console.log('Admin user status:');
      console.log('- Email:', admin[0].email);
      console.log('- Role:', admin[0].role);
      console.log('- Is Approved:', admin[0].is_approved);
    }

    await connection.end();
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixAdminApproval();