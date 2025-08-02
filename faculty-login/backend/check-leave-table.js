const mysql = require('mysql2/promise');

async function checkLeaveTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Check leave_requests table structure
    const [columns] = await connection.execute("DESCRIBE leave_requests");
    console.log('leave_requests table columns:');
    columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    await connection.end();
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkLeaveTable();