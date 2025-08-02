const mysql = require('mysql2/promise');

async function fixAdminFields() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Fixing admin user fields...');

    // Update admin user with all required fields
    await connection.execute(`
      UPDATE faculty 
      SET phone = '+1234567890',
          joiningDate = CURDATE(),
          is_approved = TRUE,
          approved_at = NOW()
      WHERE email = 'adminlogin@collage.edu'
    `);

    console.log('✅ Updated admin user fields');

    // Check final admin user data
    const [admin] = await connection.execute(
      'SELECT * FROM faculty WHERE email = ?',
      ['adminlogin@collage.edu']
    );

    if (admin.length > 0) {
      const adminData = admin[0];
      console.log('\nAdmin user data:');
      console.log('- ID:', adminData.id);
      console.log('- Name:', adminData.firstName, adminData.lastName);
      console.log('- Email:', adminData.email);
      console.log('- Phone:', adminData.phone);
      console.log('- Department:', adminData.department);
      console.log('- Employee ID:', adminData.employeeId);
      console.log('- Designation:', adminData.designation);
      console.log('- Role:', adminData.role);
      console.log('- Is Approved:', adminData.is_approved);
      console.log('- Joining Date:', adminData.joiningDate);
    }

    await connection.end();
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixAdminFields();