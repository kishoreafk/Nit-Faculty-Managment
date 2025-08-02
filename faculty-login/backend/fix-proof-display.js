const pool = require('./config/db');

async function fixProofDisplay() {
  try {
    console.log('Starting database fix for proof display...');

    // Check and add missing columns to product_requests table
    const [productCols] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'product_requests' AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingCols = productCols.map(col => col.COLUMN_NAME);
    
    if (!existingCols.includes('product_image_url')) {
      await pool.execute(`ALTER TABLE product_requests ADD COLUMN product_image_url VARCHAR(500) NULL`);
      console.log('✓ Added product_image_url column');
    } else {
      console.log('✓ product_image_url column already exists');
    }

    if (!existingCols.includes('bill_image_url')) {
      await pool.execute(`ALTER TABLE product_requests ADD COLUMN bill_image_url VARCHAR(500) NULL`);
      console.log('✓ Added bill_image_url column');
    } else {
      console.log('✓ bill_image_url column already exists');
    }

    if (!existingCols.includes('decision_note')) {
      await pool.execute(`ALTER TABLE product_requests ADD COLUMN decision_note TEXT NULL`);
      console.log('✓ Added decision_note column');
    } else {
      console.log('✓ decision_note column already exists');
    }

    // Ensure proofFile column in leave_requests is long enough
    try {
      await pool.execute(`ALTER TABLE leave_requests MODIFY COLUMN proofFile VARCHAR(500) NULL`);
      console.log('✓ Updated proofFile column length');
    } catch (error) {
      console.log('✓ proofFile column already correct length');
    }

    // Check current structure
    const [productColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'product_requests' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nCurrent product_requests table structure:');
    productColumns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE})`);
    });

    const [leaveColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'leave_requests' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('proofFile', 'proofFileName')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nLeave requests proof columns:');
    leaveColumns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE})`);
    });

    console.log('\n✅ Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

fixProofDisplay();