const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Database connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Naveenaa@0205',
      database: 'faculty_management_system'
    });

    console.log('Connected to database');

    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'simple-migration.sql'), 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          console.log('Statement already executed or error:', error.message);
        }
      }
    }

    console.log('Migration completed successfully');
    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();