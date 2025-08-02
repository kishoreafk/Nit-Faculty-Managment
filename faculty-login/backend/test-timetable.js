const pool = require('./config/db');

async function testTimetableTable() {
  try {
    console.log('Testing timetable table...');
    
    const connection = await pool.getConnection();
    
    // Test table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'faculty_timetables'
    `);
    
    if (tables.length === 0) {
      console.error('❌ faculty_timetables table does not exist!');
      return;
    }
    
    console.log('✅ faculty_timetables table exists');
    
    // Test table structure
    const [structure] = await connection.execute('DESCRIBE faculty_timetables');
    console.log('✅ Table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Test insert (simulate what the controller does)
    console.log('\nTesting insert operation...');
    const testFacultyId = 1; // Assuming faculty with ID 1 exists
    const testImageUrl = '/uploads/test-timetable.pdf';
    const testSemester = 'Fall 2024';
    
    const [insertResult] = await connection.execute(
      `INSERT INTO faculty_timetables (faculty_id, timetable_image_url, semester) 
       VALUES (?, ?, ?)`,
      [testFacultyId, testImageUrl, testSemester]
    );
    
    console.log('✅ Insert successful, ID:', insertResult.insertId);
    
    // Test select (simulate what the controller does)
    console.log('\nTesting select operation...');
    const [selectResult] = await connection.execute(
      `SELECT * FROM faculty_timetables 
       WHERE faculty_id = ? 
       ORDER BY uploaded_at DESC 
       LIMIT 1`,
      [testFacultyId]
    );
    
    console.log('✅ Select successful, result:', selectResult[0]);
    
    // Clean up test data
    await connection.execute('DELETE FROM faculty_timetables WHERE id = ?', [insertResult.insertId]);
    console.log('✅ Test data cleaned up');
    
    connection.release();
    console.log('✅ All timetable tests passed!');
    
  } catch (error) {
    console.error('❌ Timetable test failed:', error.message);
    console.error('Full error:', error);
  }
}

testTimetableTable();