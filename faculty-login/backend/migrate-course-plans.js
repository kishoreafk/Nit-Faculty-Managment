const pool = require('./config/db');

async function migrateCourseePlans() {
  try {
    console.log('🔄 Starting course plans table migration...');

    // Check if the new columns already exist
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'course_plans'
    `);

    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Add new columns if they don't exist
    if (!columnNames.includes('description')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        ADD COLUMN description TEXT AFTER academicYear
      `);
      console.log('✅ Added description column');
    }

    if (!columnNames.includes('objectives')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        ADD COLUMN objectives TEXT AFTER description
      `);
      console.log('✅ Added objectives column');
    }

    if (!columnNames.includes('syllabus')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        ADD COLUMN syllabus TEXT AFTER objectives
      `);
      console.log('✅ Added syllabus column');
    }

    if (!columnNames.includes('courseMaterialFile')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        ADD COLUMN courseMaterialFile VARCHAR(500) NULL AFTER syllabus
      `);
      console.log('✅ Added courseMaterialFile column');
    }

    if (!columnNames.includes('courseMaterialFileName')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        ADD COLUMN courseMaterialFileName VARCHAR(255) NULL AFTER courseMaterialFile
      `);
      console.log('✅ Added courseMaterialFileName column');
    }

    // Remove old planDetails column if it exists
    if (columnNames.includes('planDetails')) {
      await pool.execute(`
        ALTER TABLE course_plans 
        DROP COLUMN planDetails
      `);
      console.log('✅ Removed old planDetails column');
    }

    console.log('🎉 Course plans table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCourseePlans()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCourseePlans };