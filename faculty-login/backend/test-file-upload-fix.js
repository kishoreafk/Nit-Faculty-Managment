const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function testFileUploadFix() {
  try {
    console.log('Testing file upload fix...\n');

    // Check if uploads directory exists and has proper structure
    const uploadsPath = path.join(__dirname, 'uploads');
    console.log('Uploads directory path:', uploadsPath);
    console.log('Uploads directory exists:', fs.existsSync(uploadsPath));
    
    if (fs.existsSync(uploadsPath)) {
      const folders = fs.readdirSync(uploadsPath);
      console.log('User folders found:', folders);
      
      folders.forEach(folder => {
        const folderPath = path.join(uploadsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const files = fs.readdirSync(folderPath);
          console.log(`  ${folder}: ${files.length} files`);
          files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            console.log(`    - ${file} (${Math.round(stats.size / 1024)}KB)`);
          });
        }
      });
    }

    // Check recent database entries
    console.log('\nChecking recent database entries...');
    
    const [products] = await pool.execute(`
      SELECT id, productName, product_image_url, bill_image_url, createdAt
      FROM product_requests 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    console.log('\nRecent Product Requests:');
    products.forEach(product => {
      console.log(`- ID: ${product.id}, Name: ${product.productName}`);
      console.log(`  Product Image: ${product.product_image_url || 'None'}`);
      console.log(`  Bill Image: ${product.bill_image_url || 'None'}`);
      console.log(`  Created: ${product.createdAt}`);
      
      // Check if files actually exist
      if (product.product_image_url) {
        const filePath = path.join(__dirname, product.product_image_url);
        console.log(`  Product image file exists: ${fs.existsSync(filePath)}`);
      }
      if (product.bill_image_url) {
        const filePath = path.join(__dirname, product.bill_image_url);
        console.log(`  Bill image file exists: ${fs.existsSync(filePath)}`);
      }
      console.log('');
    });

    const [leaves] = await pool.execute(`
      SELECT id, leaveType, proofFile, proofFileName, createdAt
      FROM leave_requests 
      ORDER BY createdAt DESC 
      LIMIT 3
    `);
    
    console.log('Recent Leave Requests:');
    leaves.forEach(leave => {
      console.log(`- ID: ${leave.id}, Type: ${leave.leaveType}`);
      console.log(`  Proof File: ${leave.proofFile || 'None'}`);
      console.log(`  Proof File Name: ${leave.proofFileName || 'None'}`);
      console.log(`  Created: ${leave.createdAt}`);
      
      // Check if file actually exists
      if (leave.proofFile) {
        const filePath = path.join(__dirname, leave.proofFile);
        console.log(`  Proof file exists: ${fs.existsSync(filePath)}`);
      }
      console.log('');
    });

    console.log('Test completed!');
    console.log('\nTo fix the issue:');
    console.log('1. Restart the backend server');
    console.log('2. Try uploading new files');
    console.log('3. Check that the console logs show the correct file paths');
    console.log('4. Verify that files appear in the admin and faculty pages');
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing file upload fix:', error);
    process.exit(1);
  }
}

testFileUploadFix();