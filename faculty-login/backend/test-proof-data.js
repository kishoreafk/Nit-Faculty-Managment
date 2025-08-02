const pool = require('./config/db');

async function testProofData() {
  try {
    console.log('Testing proof data in database...\n');

    // Check product requests with proofs
    const [products] = await pool.execute(`
      SELECT pr.*, CONCAT(f.firstName, ' ', f.lastName) as faculty_name, f.department, f.employeeId
      FROM product_requests pr 
      JOIN faculty f ON pr.facultyId = f.id 
      ORDER BY pr.createdAt DESC
      LIMIT 5
    `);

    console.log('Recent Product Requests:');
    products.forEach(product => {
      console.log(`- ID: ${product.id}, Name: ${product.productName}, Faculty: ${product.faculty_name}`);
      console.log(`  Product Image: ${product.product_image_url || 'None'}`);
      console.log(`  Bill Image: ${product.bill_image_url || 'None'}`);
      console.log(`  Status: ${product.status}\n`);
    });

    // Check leave requests with proofs
    const [leaves] = await pool.execute(`
      SELECT lr.*, CONCAT(f.firstName, ' ', f.lastName) as faculty_name, f.department, f.employeeId
      FROM leave_requests lr 
      JOIN faculty f ON lr.facultyId = f.id 
      ORDER BY lr.createdAt DESC
      LIMIT 5
    `);

    console.log('Recent Leave Requests:');
    leaves.forEach(leave => {
      console.log(`- ID: ${leave.id}, Type: ${leave.leaveType}, Faculty: ${leave.faculty_name}`);
      console.log(`  Proof File: ${leave.proofFile || 'None'}`);
      console.log(`  Proof File Name: ${leave.proofFileName || 'None'}`);
      console.log(`  Status: ${leave.status}\n`);
    });

    // Check if files exist in uploads directory
    const fs = require('fs');
    const path = require('path');
    
    console.log('Checking uploads directory...');
    const uploadsPath = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      const folders = fs.readdirSync(uploadsPath);
      console.log(`Found ${folders.length} user folders:`);
      folders.forEach(folder => {
        const folderPath = path.join(uploadsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const files = fs.readdirSync(folderPath);
          console.log(`  ${folder}: ${files.length} files`);
          files.forEach(file => {
            console.log(`    - ${file}`);
          });
        }
      });
    } else {
      console.log('Uploads directory does not exist!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error testing proof data:', error);
    process.exit(1);
  }
}

testProofData();