const axios = require('axios');

async function testLoginAPI() {
  try {
    console.log('Testing admin login API...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'adminlogin@collage.edu',
      password: 'admin123'
    });

    console.log('✅ Login successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Login failed');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testLoginAPI();