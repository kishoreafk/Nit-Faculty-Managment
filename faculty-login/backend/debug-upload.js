const pool = require('./config/db');

async function debugUpload() {
  try {
    console.log('Debugging upload issue...\n');

    // Check the most recent product request
    const [products] = await pool.execute(`
      SELECT * FROM product_requests 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);

    if (products.length > 0) {
      const product = products[0];
      console.log('Most recent product request:');
      console.log('ID:', product.id);
      console.log('Product Name:', product.productName);
      console.log('Description:', product.description);
      console.log('Product Image URL:', product.product_image_url);
      console.log('Bill Image URL:', product.bill_image_url);
      console.log('Created At:', product.createdAt);
      console.log('Faculty ID:', product.facultyId);
    }

    // Check the most recent leave request
    const [leaves] = await pool.execute(`
      SELECT * FROM leave_requests 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);

    if (leaves.length > 0) {
      const leave = leaves[0];
      console.log('\\nMost recent leave request:');
      console.log('ID:', leave.id);
      console.log('Leave Type:', leave.leaveType);
      console.log('Reason:', leave.reason);
      console.log('Proof File:', leave.proofFile);
      console.log('Proof File Name:', leave.proofFileName);
      console.log('Created At:', leave.createdAt);
      console.log('Faculty ID:', leave.facultyId);
    }

    // Let's manually update one record to test if the display works
    if (products.length > 0) {
      await pool.execute(`
        UPDATE product_requests 
        SET bill_image_url = '/uploads/kishore_s/billImage-1754074856615-166644053.pdf'
        WHERE id = ?
      `, [products[0].id]);
      console.log('\\n✓ Updated product request with bill image URL for testing');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error debugging upload:', error);
    process.exit(1);
  }
}

debugUpload();