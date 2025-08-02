const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Checking faculty_timetables table...');
    try {
      const [columns] = await connection.execute("DESCRIBE faculty_timetables");
      console.log('faculty_timetables columns:');
      columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
    } catch (e) {
      console.log('faculty_timetables table does not exist');
    }

    console.log('\nChecking product_requests table...');
    const [productColumns] = await connection.execute("DESCRIBE product_requests");
    console.log('product_requests columns:');
    productColumns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    await connection.end();
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkTables();