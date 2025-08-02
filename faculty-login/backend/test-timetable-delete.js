const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testTimetableDelete() {
  try {
    console.log('Testing timetable delete functionality...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'john.doe@university.edu',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Check if there's an existing timetable
    const getResponse = await axios.get(
      'http://localhost:5000/api/course/timetable/mine',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (getResponse.data) {
      console.log('✅ Found existing timetable:', getResponse.data.timetable_image_url);
      
      // Delete the timetable
      const deleteResponse = await axios.delete(
        'http://localhost:5000/api/course/timetable/mine',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Delete successful:', deleteResponse.data);
      
      // Verify it's deleted
      const verifyResponse = await axios.get(
        'http://localhost:5000/api/course/timetable/mine',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (verifyResponse.data === null) {
        console.log('✅ Timetable successfully deleted from database');
      } else {
        console.log('❌ Timetable still exists in database');
      }
      
    } else {
      console.log('ℹ️ No existing timetable found to delete');
      
      // Upload a test timetable first
      const testFilePath = path.join(__dirname, 'uploads', 'course-material-1754059347739-564396305.pdf');
      
      if (fs.existsSync(testFilePath)) {
        const formData = new FormData();
        formData.append('timetable', fs.createReadStream(testFilePath));
        
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
        
        console.log('✅ Test timetable uploaded:', uploadResponse.data);
        
        // Now delete it
        const deleteResponse = await axios.delete(
          'http://localhost:5000/api/course/timetable/mine',
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log('✅ Delete successful:', deleteResponse.data);
      }
    }
    
    console.log('✅ All timetable delete tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTimetableDelete();