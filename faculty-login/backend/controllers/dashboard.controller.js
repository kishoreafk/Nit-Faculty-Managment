const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Admin dashboard stats
      const [totalUsers] = await pool.execute(
        'SELECT COUNT(*) as count FROM faculty WHERE role = "faculty"'
      );
      
      const [pendingUsers] = await pool.execute(
        'SELECT COUNT(*) as count FROM faculty WHERE is_approved = 0'
      );
      
      const [totalLeaves] = await pool.execute(
        'SELECT COUNT(*) as count FROM leave_requests'
      );
      
      const [pendingLeaves] = await pool.execute(
        'SELECT COUNT(*) as count FROM leave_requests WHERE status = "Pending"'
      );
      
      const [totalProducts] = await pool.execute(
        'SELECT COUNT(*) as count FROM product_requests'
      );
      
      const [pendingProducts] = await pool.execute(
        'SELECT COUNT(*) as count FROM product_requests WHERE status = "Pending"'
      );

      res.json({
        totalUsers: totalUsers[0].count,
        pendingUsers: pendingUsers[0].count,
        totalLeaves: totalLeaves[0].count,
        pendingLeaves: pendingLeaves[0].count,
        totalProducts: totalProducts[0].count,
        pendingProducts: pendingProducts[0].count
      });
    } else {
      // Faculty dashboard stats
      const [leaveStats] = await pool.execute(
        `SELECT 
          COUNT(*) as totalLeaves,
          SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pendingLeaves,
          SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approvedLeaves,
          SUM(CASE WHEN status = "Rejected" THEN 1 ELSE 0 END) as rejectedLeaves
         FROM leave_requests WHERE facultyId = ?`,
        [facultyId]
      );

      const [productStats] = await pool.execute(
        `SELECT 
          COUNT(*) as totalRequests,
          SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) as pendingRequests,
          SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END) as approvedRequests
         FROM product_requests WHERE facultyId = ?`,
        [facultyId]
      );

      const [fileStats] = await pool.execute(
        'SELECT COUNT(*) as totalFiles FROM files WHERE facultyId = ?',
        [facultyId]
      );

      res.json({
        leaves: leaveStats[0],
        products: productStats[0],
        files: fileStats[0]
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Admin recent activity
      const [recentLeaves] = await pool.execute(
        `SELECT lr.*, CONCAT(f.firstName, ' ', f.lastName) as facultyName
         FROM leave_requests lr
         JOIN faculty f ON lr.facultyId = f.id
         ORDER BY lr.createdAt DESC LIMIT 5`
      );

      const [recentProducts] = await pool.execute(
        `SELECT pr.*, CONCAT(f.firstName, ' ', f.lastName) as facultyName
         FROM product_requests pr
         JOIN faculty f ON pr.facultyId = f.id
         ORDER BY pr.createdAt DESC LIMIT 5`
      );

      res.json({
        recentLeaves,
        recentProducts
      });
    } else {
      // Faculty recent activity
      const [recentLeaves] = await pool.execute(
        'SELECT * FROM leave_requests WHERE facultyId = ? ORDER BY createdAt DESC LIMIT 3',
        [facultyId]
      );

      const [recentProducts] = await pool.execute(
        'SELECT * FROM product_requests WHERE facultyId = ? ORDER BY createdAt DESC LIMIT 3',
        [facultyId]
      );

      const [recentFiles] = await pool.execute(
        'SELECT * FROM files WHERE facultyId = ? ORDER BY createdAt DESC LIMIT 3',
        [facultyId]
      );

      res.json({
        recentLeaves,
        recentProducts,
        recentFiles
      });
    }
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity
};