const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testAdminLogin() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Testing admin login process...');

    // Step 1: Find admin by email
    const [faculty] = await connection.execute(
      'SELECT * FROM faculty WHERE email = ?',
      ['adminlogin@collage.edu']
    );

    if (faculty.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found');
    const facultyData = faculty[0];
    console.log('- ID:', facultyData.id);
    console.log('- Email:', facultyData.email);
    console.log('- Role:', facultyData.role);
    console.log('- Is Approved:', facultyData.is_approved);

    // Step 2: Check if account is approved
    if (!facultyData.is_approved) {
      console.log('❌ Account not approved');
      return;
    }
    console.log('✅ Account is approved');

    // Step 3: Check password
    const isValidPassword = await bcrypt.compare('admin123', facultyData.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return;
    }
    console.log('✅ Password is valid');

    // Step 4: Generate JWT token
    const token = jwt.sign(
      { facultyId: facultyData.id },
      'your_jwt_secret_key_here_change_in_production',
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated');

    console.log('\n🎉 Admin login should work successfully!');
    console.log('Credentials: adminlogin@collage.edu / admin123');

    await connection.end();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdminLogin();