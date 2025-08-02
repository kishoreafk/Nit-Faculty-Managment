const pool = require('./config/db');

async function checkUsers() {
  try {
    console.log('Checking existing users...');
    
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute('SELECT id, firstName, lastName, email FROM faculty');
    
    console.log('✅ Existing users:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Name: ${user.firstName} ${user.lastName}, Email: ${user.email}`);
    });
    
    connection.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();