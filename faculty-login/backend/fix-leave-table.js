const mysql = require('mysql2/promise');

async function fixLeaveTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Add missing columns to leave_requests table
    try {
      await connection.execute("ALTER TABLE leave_requests ADD COLUMN proofFile VARCHAR(500) NULL");
      console.log('Added proofFile column');
    } catch (e) { console.log('proofFile column exists or error:', e.message); }

    try {
      await connection.execute("ALTER TABLE leave_requests ADD COLUMN proofFileName VARCHAR(255) NULL");
      console.log('Added proofFileName column');
    } catch (e) { console.log('proofFileName column exists or error:', e.message); }

    try {
      await connection.execute("ALTER TABLE leave_requests ADD COLUMN rejectionReason TEXT NULL");
      console.log('Added rejectionReason column');
    } catch (e) { console.log('rejectionReason column exists or error:', e.message); }

    console.log('Leave table fixes completed');
    await connection.end();
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixLeaveTable();