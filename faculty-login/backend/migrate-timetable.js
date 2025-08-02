const pool = require('./config/db');

async function migrateTimetableTable() {
  try {
    console.log('Starting timetable table migration...');
    
    const connection = await pool.getConnection();
    
    // Check if faculty_timetables table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'faculty_timetables'
    `);
    
    if (tables.length === 0) {
      console.log('Creating faculty_timetables table...');
      await connection.execute(`
        CREATE TABLE faculty_timetables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          faculty_id INT NOT NULL,
          timetable_image_url VARCHAR(500) NOT NULL,
          semester VARCHAR(20),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ faculty_timetables table created successfully!');
    } else {
      console.log('✅ faculty_timetables table already exists');
    }
    
    // Check if old timetables table exists and migrate data if needed
    const [oldTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'timetables'
    `);
    
    if (oldTables.length > 0) {
      console.log('Found old timetables table, checking for data to migrate...');
      
      const [oldData] = await connection.execute('SELECT * FROM timetables');
      
      if (oldData.length > 0) {
        console.log(`Migrating ${oldData.length} records from old timetables table...`);
        
        for (const record of oldData) {
          await connection.execute(`
            INSERT INTO faculty_timetables (faculty_id, timetable_image_url, semester, uploaded_at)
            VALUES (?, ?, ?, ?)
          `, [record.facultyId, record.filePath, record.semester, record.createdAt]);
        }
        
        console.log('✅ Data migration completed!');
      }
      
      // Drop old table
      console.log('Dropping old timetables table...');
      await connection.execute('DROP TABLE timetables');
      console.log('✅ Old timetables table dropped!');
    }
    
    // Test the new structure
    const [tableStructure] = await connection.execute('DESCRIBE faculty_timetables');
    console.log('✅ faculty_timetables table structure:');
    tableStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    const [timetableData] = await connection.execute('SELECT * FROM faculty_timetables');
    console.log(`✅ faculty_timetables contains ${timetableData.length} records`);
    
    connection.release();
    console.log('✅ Timetable table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Timetable migration failed:', error.message);
    console.error('Full error:', error);
  }
}

migrateTimetableTable();