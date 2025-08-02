const axios = require('axios');

async function testAdminDetails() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'adminlogin@collage.edu',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Get all users
    const usersResponse = await axios.get('http://localhost:5000/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = usersResponse.data;
    console.log(`✅ Found ${users.length} users`);

    if (users.length > 0) {
      const facultyUser = users.find(u => u.role === 'faculty');
      
      if (facultyUser) {
        console.log(`Testing user details for: ${facultyUser.firstName} ${facultyUser.lastName}`);
        
        // Get user details
        const detailsResponse = await axios.get(`http://localhost:5000/api/admin/users/${facultyUser.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ User details retrieved successfully');
        console.log('User:', detailsResponse.data.user.firstName, detailsResponse.data.user.lastName);
        console.log('Leaves:', detailsResponse.data.leaves.length);
        console.log('Products:', detailsResponse.data.products.length);
        console.log('Timetable:', detailsResponse.data.timetable ? 'Yes' : 'No');
      } else {
        console.log('No faculty users found to test');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAdminDetails();