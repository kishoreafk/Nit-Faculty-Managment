const pool = require('./config/db');

async function checkLeaveTable() {
  try {
    console.log('Checking leave_requests table structure...');
    
    const connection = await pool.getConnection();
    
    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'leave_requests'
    `);
    
    if (tables.length === 0) {
      console.log('❌ leave_requests table does not exist!');
      return;
    }
    
    console.log('✅ leave_requests table exists');
    
    // Check table structure
    const [structure] = await connection.execute('DESCRIBE leave_requests');
    console.log('✅ Table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check sample data
    const [data] = await connection.execute('SELECT * FROM leave_requests LIMIT 3');
    console.log(`✅ Sample data (${data.length} records):`);
    data.forEach(record => {
      console.log('  -', record);
    });
    
    connection.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLeaveTable();