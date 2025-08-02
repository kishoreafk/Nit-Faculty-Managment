const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function fixProofUpload() {
  try {
    console.log('Fixing proof upload issues...\n');

    // Check current database structure
    console.log('Checking database structure...');
    
    // Check if columns exist
    const [productColumns] = await pool.execute(`
      SHOW COLUMNS FROM product_requests LIKE '%image%'
    `);
    
    const [leaveColumns] = await pool.execute(`
      SHOW COLUMNS FROM leave_requests LIKE 'proofFile'
    `);
    
    console.log('Product request image columns:', productColumns.map(col => col.Field));
    console.log('Leave request proof columns:', leaveColumns.map(col => col.Field));
    
    // Ensure uploads directory structure is correct
    const uploadsPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('Created uploads directory');
    }
    
    console.log('\nFix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart the backend server');
    console.log('2. Try uploading new files to test the fix');
    console.log('3. Check that file paths are properly stored in database');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing proof upload:', error);
    process.exit(1);
  }
}

fixProofUpload();