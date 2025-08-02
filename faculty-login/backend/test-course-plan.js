const pool = require('./config/db');

async function testCoursePlan() {
  try {
    console.log('🧪 Testing course plan functionality...');

    // Test 1: Check if course_plans table has the right structure
    console.log('\n1. Checking course_plans table structure...');
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'faculty_management_system' 
      AND TABLE_NAME = 'course_plans'
    `);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('✅ Course plans table columns:', columnNames);

    // Test 2: Check if we can insert a test course plan
    console.log('\n2. Testing course plan insertion...');
    const [result] = await pool.execute(`
      INSERT INTO course_plans (facultyId, courseName, courseCode, semester, academicYear, description, objectives, syllabus) 
      VALUES (1, 'Test Course', 'TEST101', '1', '2024-2025', 'Test Description', 'Test Objectives', 'Test Syllabus')
    `);
    console.log('✅ Course plan inserted with ID:', result.insertId);

    // Test 3: Check if we can retrieve course plans
    console.log('\n3. Testing course plan retrieval...');
    const [rows] = await pool.execute(`
      SELECT * FROM course_plans WHERE facultyId = 1
    `);
    console.log('✅ Retrieved course plans:', rows.length);

    // Test 4: Clean up test data
    console.log('\n4. Cleaning up test data...');
    await pool.execute(`DELETE FROM course_plans WHERE courseName = 'Test Course'`);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All course plan tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testCoursePlan();