const pool = require('./config/db');
const fs = require('fs');

async function runMigration() {
  try {
    // Read the migration file
    const migration = fs.readFileSync('./admin-migration.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migration.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();