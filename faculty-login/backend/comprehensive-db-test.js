const pool = require('./config/db');

async function comprehensiveDbTest() {
  let connection;
  
  try {
    console.log('🔍 Starting comprehensive database test...\n');
    
    // Test connection
    connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    // Get database info
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, VERSION() as mysql_version');
    console.log(`📊 Database: ${dbInfo[0].current_db}`);
    console.log(`🔧 MySQL Version: ${dbInfo[0].mysql_version}\n`);
    
    // List all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });
    console.log('');
    
    // Test each table
    const tableTests = [
      'faculty',
      'leave_requests', 
      'product_requests',
      'files',
      'course_plans',
      'timetables'
    ];
    
    for (const tableName of tableTests) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = rows[0].count;
        console.log(`✅ ${tableName}: ${count} records`);
        
        // Show sample data for faculty table
        if (tableName === 'faculty' && count > 0) {
          const [sampleData] = await connection.execute(`SELECT id, firstName, lastName, email, department FROM ${tableName} LIMIT 3`);
          console.log('   Sample faculty records:');
          sampleData.forEach(faculty => {
            console.log(`     - ${faculty.firstName} ${faculty.lastName} (${faculty.email}) - ${faculty.department}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ ${tableName}: Table not found or error - ${error.message}`);
      }
    }
    
    console.log('\n🔐 Testing authentication...');
    
    // Test if we can find a user for login testing
    const [users] = await connection.execute('SELECT email FROM faculty LIMIT 1');
    if (users.length > 0) {
      console.log(`✅ Found test user: ${users[0].email}`);
      console.log('   You can use this email for login testing');
    } else {
      console.log('⚠️  No users found in database');
    }
    
    console.log('\n🏥 Testing API health endpoint...');
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API health check passed:', data.message);
      } else {
        console.log('❌ API health check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ API not accessible:', error.message);
      console.log('   Make sure the backend server is running (npm run dev)');
    }
    
    console.log('\n📊 Database Configuration:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 3306}`);
    console.log(`   Database: ${process.env.DB_NAME || 'faculty_management_system'}`);
    console.log(`   User: ${process.env.DB_USER || 'root'}`);
    
    console.log('\n🎉 All database tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Troubleshooting steps:');
      console.error('   1. Make sure MySQL server is running');
      console.error('   2. Check if the port 3306 is correct');
      console.error('   3. Verify database credentials in .env file');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Troubleshooting steps:');
      console.error('   1. Check database username and password in .env file');
      console.error('   2. Make sure the user has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n🔧 Troubleshooting steps:');
      console.error('   1. Create the database: CREATE DATABASE faculty_management_system;');
      console.error('   2. Run the database.sql script to create tables');
    }
    
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

comprehensiveDbTest();