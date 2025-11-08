const pool = require('../config/db');

const getFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    const [rows] = await pool.execute(
      `SELECT id, name, email, department, designation, faculty_type, teacher_id, 
       photo_url, dob, joining_date, phone, address, role, created_at 
       FROM faculty WHERE id = ?`,
      [facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get faculty profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const {
      name,
      phone,
      address,
      photo_url
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE faculty SET name = ?, phone = ?, address = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, phone, address, photo_url, facultyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update faculty profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getFacultyProfile,
  updateFacultyProfile
}; 