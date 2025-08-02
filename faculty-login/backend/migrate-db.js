const pool = require('./config/db');

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    const connection = await pool.getConnection();
    
    // Check if firstName and lastName columns exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'faculty' 
      AND COLUMN_NAME IN ('firstName', 'lastName')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    if (!existingColumns.includes('firstName')) {
      console.log('Adding firstName column...');
      await connection.execute('ALTER TABLE faculty ADD COLUMN firstName VARCHAR(50) NOT NULL AFTER id');
    }
    
    if (!existingColumns.includes('lastName')) {
      console.log('Adding lastName column...');
      await connection.execute('ALTER TABLE faculty ADD COLUMN lastName VARCHAR(50) NOT NULL AFTER firstName');
    }
    
    // Update existing records with sample data
    console.log('Updating existing records...');
    await connection.execute(`
      UPDATE faculty 
      SET firstName = 'John', lastName = 'Doe' 
      WHERE id = 1 AND (firstName IS NULL OR lastName IS NULL)
    `);
    
    await connection.execute(`
      UPDATE faculty 
      SET firstName = 'Jane', lastName = 'Smith' 
      WHERE id = 2 AND (firstName IS NULL OR lastName IS NULL)
    `);
    
    // Test the updated structure
    const [facultyStructure] = await connection.execute('DESCRIBE faculty');
    console.log('✅ Updated Faculty table structure:');
    facultyStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    const [facultyData] = await connection.execute('SELECT id, firstName, lastName, email FROM faculty');
    console.log('✅ Faculty data:');
    facultyData.forEach(faculty => {
      console.log(`  - ${faculty.firstName} ${faculty.lastName} (${faculty.email})`);
    });
    
    connection.release();
    console.log('✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrateDatabase(); 