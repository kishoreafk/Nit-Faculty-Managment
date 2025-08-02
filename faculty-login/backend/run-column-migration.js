const pool = require('./config/db');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to product_requests table...');
    
    const connection = await pool.getConnection();
    
    // Check if columns already exist
    const [structure] = await connection.execute('DESCRIBE product_requests');
    const existingColumns = structure.map(col => col.Field);
    
    console.log('Current columns:', existingColumns);
    
    // Add product_image_url if it doesn't exist
    if (!existingColumns.includes('product_image_url')) {
      await connection.execute(`
        ALTER TABLE product_requests 
        ADD COLUMN product_image_url VARCHAR(500) NULL AFTER description
      `);
      console.log('✅ Added product_image_url column');
    } else {
      console.log('✅ product_image_url column already exists');
    }
    
    // Add bill_image_url if it doesn't exist
    if (!existingColumns.includes('bill_image_url')) {
      await connection.execute(`
        ALTER TABLE product_requests 
        ADD COLUMN bill_image_url VARCHAR(500) NULL AFTER product_image_url
      `);
      console.log('✅ Added bill_image_url column');
    } else {
      console.log('✅ bill_image_url column already exists');
    }
    
    // Add decision_note if it doesn't exist
    if (!existingColumns.includes('decision_note')) {
      await connection.execute(`
        ALTER TABLE product_requests 
        ADD COLUMN decision_note TEXT NULL AFTER approvedAt
      `);
      console.log('✅ Added decision_note column');
    } else {
      console.log('✅ decision_note column already exists');
    }
    
    // Verify the changes
    const [newStructure] = await connection.execute('DESCRIBE product_requests');
    console.log('\n✅ Updated table structure:');
    newStructure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    connection.release();
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

addMissingColumns();