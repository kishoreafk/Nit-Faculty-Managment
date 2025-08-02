const pool = require('./config/db');

async function checkProductTable() {
  try {
    console.log('Checking product_requests table structure...');
    
    const connection = await pool.getConnection();
    
    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'product_requests'
    `);
    
    if (tables.length === 0) {
      console.log('❌ product_requests table does not exist!');
      return;
    }
    
    console.log('✅ product_requests table exists');
    
    // Check table structure
    const [structure] = await connection.execute('DESCRIBE product_requests');
    console.log('✅ Table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check sample data
    const [data] = await connection.execute('SELECT * FROM product_requests LIMIT 3');
    console.log(`✅ Sample data (${data.length} records):`);
    data.forEach(record => {
      console.log('  -', record);
    });
    
    connection.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProductTable();