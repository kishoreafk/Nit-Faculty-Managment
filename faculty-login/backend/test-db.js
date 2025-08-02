const pool = require('./config/db');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    // Test faculty table
    const [facultyRows] = await connection.execute('SELECT COUNT(*) as count FROM faculty');
    console.log(`✅ Faculty table exists with ${facultyRows[0].count} records`);
    
    // Test leave_requests table
    const [leaveRows] = await connection.execute('SELECT COUNT(*) as count FROM leave_requests');
    console.log(`✅ Leave requests table exists with ${leaveRows[0].count} records`);
    
    // Test table structure
    const [facultyStructure] = await connection.execute('DESCRIBE faculty');
    console.log('✅ Faculty table structure:');
    facultyStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    const [leaveStructure] = await connection.execute('DESCRIBE leave_requests');
    console.log('✅ Leave requests table structure:');
    leaveStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    connection.release();
    console.log('✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table does not exist. Please run the database.sql script first.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Database connection refused. Please check if MySQL is running.');
    }
  }
}

testDatabase(); 