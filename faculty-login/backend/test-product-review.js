const axios = require('axios');

async function testProductReview() {
  try {
    // First login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'adminlogin@collage.edu',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Get all product requests
    console.log('Fetching product requests...');
    const requestsResponse = await axios.get('http://localhost:5000/api/product/all', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const requests = requestsResponse.data;
    console.log(`✅ Found ${requests.length} product requests`);

    if (requests.length > 0) {
      const pendingRequest = requests.find(r => r.status === 'Pending' || r.status === 'pending');
      
      if (pendingRequest) {
        console.log(`Testing approval for request ID: ${pendingRequest.id}`);
        
        // Test approval
        const approveResponse = await axios.put(
          `http://localhost:5000/api/product/review/${pendingRequest.id}`,
          { status: 'Approved' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Product request approved successfully');
        console.log('Response:', approveResponse.data);
      } else {
        console.log('No pending requests found to test');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProductReview();