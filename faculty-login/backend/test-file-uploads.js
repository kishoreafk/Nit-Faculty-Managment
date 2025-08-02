const pool = require('./config/db');

async function testFileUploads() {
  try {
    console.log('Testing file upload functionality...');
    
    const connection = await pool.getConnection();
    
    // Test 1: Check if product_requests table has the new columns
    console.log('\n1. Checking product_requests table structure...');
    const [structure] = await connection.execute('DESCRIBE product_requests');
    const columns = structure.map(col => col.Field);
    
    const requiredColumns = ['product_image_url', 'bill_image_url', 'decision_note'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist in product_requests table');
    } else {
      console.log('❌ Missing columns:', missingColumns);
    }
    
    // Test 2: Check leave_requests table structure
    console.log('\n2. Checking leave_requests table structure...');
    const [leaveStructure] = await connection.execute('DESCRIBE leave_requests');
    const leaveColumns = leaveStructure.map(col => col.Field);
    
    const requiredLeaveColumns = ['proofFile', 'proofFileName'];
    const missingLeaveColumns = requiredLeaveColumns.filter(col => !leaveColumns.includes(col));
    
    if (missingLeaveColumns.length === 0) {
      console.log('✅ All required columns exist in leave_requests table');
    } else {
      console.log('❌ Missing columns in leave_requests:', missingLeaveColumns);
    }
    
    // Test 3: Check if uploads directory exists
    const fs = require('fs');
    const uploadsPath = './uploads';
    
    console.log('\n3. Checking uploads directory...');
    if (fs.existsSync(uploadsPath)) {
      console.log('✅ Uploads directory exists');
      const uploadContents = fs.readdirSync(uploadsPath);
      console.log('📁 Upload directory contents:', uploadContents);
    } else {
      console.log('❌ Uploads directory does not exist');
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('✅ Uploads directory created');
    }
    
    // Test 4: Check recent product requests with file data
    console.log('\n4. Checking recent product requests...');
    const [productRequests] = await connection.execute(`
      SELECT id, productName, product_image_url, bill_image_url, decision_note, status, createdAt 
      FROM product_requests 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    console.log('Recent product requests:');
    productRequests.forEach(req => {
      console.log(`  - ID: ${req.id}, Product: ${req.productName}`);
      console.log(`    Product Image: ${req.product_image_url || 'None'}`);
      console.log(`    Bill Image: ${req.bill_image_url || 'None'}`);
      console.log(`    Status: ${req.status}`);
      console.log(`    Decision Note: ${req.decision_note || 'None'}`);
      console.log('');
    });
    
    // Test 5: Check recent leave requests with proof files
    console.log('\n5. Checking recent leave requests...');
    const [leaveRequests] = await connection.execute(`
      SELECT id, leaveType, proofFile, proofFileName, status, createdAt 
      FROM leave_requests 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    console.log('Recent leave requests:');
    leaveRequests.forEach(req => {
      console.log(`  - ID: ${req.id}, Type: ${req.leaveType}`);
      console.log(`    Proof File: ${req.proofFile || 'None'}`);
      console.log(`    Proof File Name: ${req.proofFileName || 'None'}`);
      console.log(`    Status: ${req.status}`);
      console.log('');
    });
    
    connection.release();
    console.log('🎉 File upload test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFileUploads();