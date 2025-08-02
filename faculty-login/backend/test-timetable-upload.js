const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testTimetableUpload() {
  try {
    console.log('Testing timetable upload...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'john.doe@university.edu',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Use an existing PDF file for testing
    const testFilePath = path.join(__dirname, 'uploads', 'course-material-1754059347739-564396305.pdf');
    
    if (!fs.existsSync(testFilePath)) {
      throw new Error('Test PDF file not found');
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('timetable', fs.createReadStream(testFilePath));
    
    // Upload timetable
    const uploadResponse = await axios.post(
      'http://localhost:5000/api/course/timetable/upload',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Upload successful:', uploadResponse.data);
    
    // Get timetable
    const getResponse = await axios.get(
      'http://localhost:5000/api/course/timetable/mine',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Get timetable successful:', getResponse.data);
    
    // No need to clean up since we're using an existing file
    console.log('✅ Test completed');
    
    console.log('✅ All timetable upload tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTimetableUpload();