const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      // Admin dashboard stats - Use IFNULL to handle NULL values and ensure counts are always numbers
      const [totalUsers] = await pool.execute(
        'SELECT IFNULL(COUNT(*), 0) as count FROM faculty'
      );
      
      const [totalFaculty] = await pool.execute(
        'SELECT IFNULL(COUNT(*), 0) as count FROM faculty WHERE role = "faculty"'
      );
      
      const [totalAdmins] = await pool.execute(
        'SELECT IFNULL(COUNT(*), 0) as count FROM faculty WHERE role = "admin"'
      );
      
      const [pendingUsers] = await pool.execute(
        'SELECT IFNULL(COUNT(*), 0) as count FROM faculty WHERE is_approved = 0'
      );
      
      const [approvedUsers] = await pool.execute(
        'SELECT IFNULL(COUNT(*), 0) as count FROM faculty WHERE is_approved = 1'
      );
      
      // Check if tables exist before querying them
      const [checkLeaveTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'leave_requests'"
      );
      
      const [checkLeaveAppTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'leave_applications'"
      );
      
      const [checkProductTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product_requests'"
      );
      
      let totalLeaves = 0;
      let pendingLeaves = 0;
      let approvedLeaves = 0;
      let rejectedLeaves = 0;
      let totalProducts = [{ count: 0 }];
      let pendingProducts = [{ count: 0 }];
      
      // Count leave_requests if table exists
      if (checkLeaveTable[0].tableExists > 0) {
        const [totalLeavesResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_requests lr 
           JOIN faculty f ON lr.faculty_id = f.id WHERE f.is_approved = TRUE`
        );
        
        const [pendingLeavesResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_requests lr 
           JOIN faculty f ON lr.faculty_id = f.id WHERE lr.status = "Pending" AND f.is_approved = TRUE`
        );
        
        const [approvedLeavesResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_requests lr 
           JOIN faculty f ON lr.faculty_id = f.id WHERE lr.status = "Approved" AND f.is_approved = TRUE`
        );
        
        const [rejectedLeavesResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_requests lr 
           JOIN faculty f ON lr.faculty_id = f.id WHERE lr.status = "Rejected" AND f.is_approved = TRUE`
        );
        
        totalLeaves += parseInt(totalLeavesResult[0].count) || 0;
        pendingLeaves += parseInt(pendingLeavesResult[0].count) || 0;
        approvedLeaves += parseInt(approvedLeavesResult[0].count) || 0;
        rejectedLeaves += parseInt(rejectedLeavesResult[0].count) || 0;
      }
      
      // Count leave_applications if table exists
      if (checkLeaveAppTable[0].tableExists > 0) {
        const [totalLeaveAppsResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_applications la 
           JOIN faculty f ON la.faculty_id = f.id WHERE f.is_approved = TRUE`
        );
        
        const [pendingLeaveAppsResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_applications la 
           JOIN faculty f ON la.faculty_id = f.id WHERE la.status = "Pending" AND f.is_approved = TRUE`
        );
        
        const [approvedLeaveAppsResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_applications la 
           JOIN faculty f ON la.faculty_id = f.id WHERE la.status = "Approved" AND f.is_approved = TRUE`
        );
        
        const [rejectedLeaveAppsResult] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM leave_applications la 
           JOIN faculty f ON la.faculty_id = f.id WHERE la.status = "Rejected" AND f.is_approved = TRUE`
        );
        
        totalLeaves += parseInt(totalLeaveAppsResult[0].count) || 0;
        pendingLeaves += parseInt(pendingLeaveAppsResult[0].count) || 0;
        approvedLeaves += parseInt(approvedLeaveAppsResult[0].count) || 0;
        rejectedLeaves += parseInt(rejectedLeaveAppsResult[0].count) || 0;
      }
      
      if (checkProductTable[0].tableExists > 0) {
        [totalProducts] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM product_requests pr 
           JOIN faculty f ON pr.faculty_id = f.id WHERE f.is_approved = TRUE`
        );
        
        [pendingProducts] = await pool.execute(
          `SELECT IFNULL(COUNT(*), 0) as count FROM product_requests pr 
           JOIN faculty f ON pr.faculty_id = f.id WHERE pr.status = "Pending" AND f.is_approved = TRUE`
        );
      }

      res.json({
        totalUsers: parseInt(totalUsers[0].count) || 0,
        totalFaculty: parseInt(totalFaculty[0].count) || 0,
        totalAdmins: parseInt(totalAdmins[0].count) || 0,
        pendingUsers: parseInt(pendingUsers[0].count) || 0,
        approvedUsers: parseInt(approvedUsers[0].count) || 0,
        totalLeaves: totalLeaves,
        pendingLeaves: pendingLeaves,
        approvedLeaves: approvedLeaves,
        rejectedLeaves: rejectedLeaves,
        totalProducts: parseInt(totalProducts[0].count) || 0,
        pendingProducts: parseInt(pendingProducts[0].count) || 0
      });
    } else {
      // Faculty dashboard stats - Use IFNULL and COALESCE to handle NULL values
      // Check if tables exist before querying them
      const [checkLeaveTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'leave_requests'"
      );
      
      const [checkLeaveAppTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'leave_applications'"
      );
      
      const [checkProductTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product_requests'"
      );
      
      const [checkFileTable] = await pool.execute(
        "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'files'"
      );
      
      let totalLeaves = 0;
      let pendingLeaves = 0;
      let approvedLeaves = 0;
      let rejectedLeaves = 0;
      
      let productStats = [{ 
        totalRequests: 0, 
        pendingRequests: 0, 
        approvedRequests: 0 
      }];
      
      let fileStats = [{ totalFiles: 0 }];
      
      // Count leave_requests if table exists
      if (checkLeaveTable[0].tableExists > 0) {
        const [leaveRequestStats] = await pool.execute(
          `SELECT 
            IFNULL(COUNT(*), 0) as totalLeaves,
            IFNULL(SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END), 0) as pendingLeaves,
            IFNULL(SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END), 0) as approvedLeaves,
            IFNULL(SUM(CASE WHEN status = "Rejected" THEN 1 ELSE 0 END), 0) as rejectedLeaves
           FROM leave_requests WHERE faculty_id = ?`,
          [facultyId]
        );
        
        totalLeaves += parseInt(leaveRequestStats[0].totalLeaves) || 0;
        pendingLeaves += parseInt(leaveRequestStats[0].pendingLeaves) || 0;
        approvedLeaves += parseInt(leaveRequestStats[0].approvedLeaves) || 0;
        rejectedLeaves += parseInt(leaveRequestStats[0].rejectedLeaves) || 0;
      }
      
      // Count leave_applications if table exists
      if (checkLeaveAppTable[0].tableExists > 0) {
        const [leaveAppStats] = await pool.execute(
          `SELECT 
            IFNULL(COUNT(*), 0) as totalLeaves,
            IFNULL(SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END), 0) as pendingLeaves,
            IFNULL(SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END), 0) as approvedLeaves,
            IFNULL(SUM(CASE WHEN status = "Rejected" THEN 1 ELSE 0 END), 0) as rejectedLeaves
           FROM leave_applications WHERE faculty_id = ?`,
          [facultyId]
        );
        
        totalLeaves += parseInt(leaveAppStats[0].totalLeaves) || 0;
        pendingLeaves += parseInt(leaveAppStats[0].pendingLeaves) || 0;
        approvedLeaves += parseInt(leaveAppStats[0].approvedLeaves) || 0;
        rejectedLeaves += parseInt(leaveAppStats[0].rejectedLeaves) || 0;
      }
      
      if (checkProductTable[0].tableExists > 0) {
        [productStats] = await pool.execute(
          `SELECT 
            IFNULL(COUNT(*), 0) as totalRequests,
            IFNULL(SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END), 0) as pendingRequests,
            IFNULL(SUM(CASE WHEN status = "Approved" THEN 1 ELSE 0 END), 0) as approvedRequests
           FROM product_requests WHERE faculty_id = ?`,
          [facultyId]
        );
      }
      
      if (checkFileTable[0].tableExists > 0) {
        [fileStats] = await pool.execute(
          'SELECT IFNULL(COUNT(*), 0) as totalFiles FROM files WHERE faculty_id = ?',
          [facultyId]
        );
      }

      // Ensure all values are numbers
      const leaves = {
        totalLeaves: totalLeaves,
        pendingLeaves: pendingLeaves,
        approvedLeaves: approvedLeaves,
        rejectedLeaves: rejectedLeaves
      };
      
      const products = {
        totalRequests: parseInt(productStats[0].totalRequests) || 0,
        pendingRequests: parseInt(productStats[0].pendingRequests) || 0,
        approvedRequests: parseInt(productStats[0].approvedRequests) || 0
      };
      
      const files = {
        totalFiles: parseInt(fileStats[0].totalFiles) || 0
      };

      res.json({
        leaves,
        products,
        files
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const isAdmin = req.user.role === 'admin';

    // Check if tables exist before querying them
    const [checkLeaveTable] = await pool.execute(
      "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'leave_requests'"
    );
    
    const [checkProductTable] = await pool.execute(
      "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product_requests'"
    );
    
    const [checkFileTable] = await pool.execute(
      "SELECT COUNT(*) as tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'files'"
    );

    let recentLeaves = [];
    let recentProducts = [];
    let recentFiles = [];

    if (isAdmin) {
      // Admin recent activity
      if (checkLeaveTable[0].tableExists > 0) {
        try {
          [recentLeaves] = await pool.execute(
            `SELECT lr.*, CONCAT(f.firstName, ' ', f.lastName) as facultyName,
                    CASE 
                      WHEN lr.approvedAt IS NOT NULL THEN lr.approvedAt
                      ELSE lr.createdAt
                    END as activityDate,
                    CASE 
                      WHEN lr.status = 'Approved' THEN CONCAT('✅ ', lr.leaveType, ' approved for ', f.firstName, ' ', f.lastName)
                      WHEN lr.status = 'Rejected' THEN CONCAT('❌ ', lr.leaveType, ' rejected for ', f.firstName, ' ', f.lastName)
                      ELSE CONCAT('📝 ', lr.leaveType, ' submitted by ', f.firstName, ' ', f.lastName)
                    END as activityType,
                    lr.status as actionStatus
             FROM leave_requests lr
             JOIN faculty f ON lr.faculty_id = f.id
             WHERE f.is_approved = TRUE
             ORDER BY activityDate DESC LIMIT 10`
          );
        } catch (err) {
          console.error('Error fetching recent leaves:', err);
          recentLeaves = [];
        }
        
        // Also get leave applications
        try {
          const [recentLeaveApps] = await pool.execute(
            `SELECT la.*, CONCAT(f.firstName, ' ', f.lastName) as facultyName, la.leave_category as leaveType,
                    CASE 
                      WHEN la.approved_at IS NOT NULL THEN la.approved_at
                      ELSE la.created_at
                    END as activityDate,
                    CASE 
                      WHEN la.status = 'Approved' THEN CONCAT('✅ ', la.leave_category, ' approved for ', f.firstName, ' ', f.lastName)
                      WHEN la.status = 'Rejected' THEN CONCAT('❌ ', la.leave_category, ' rejected for ', f.firstName, ' ', f.lastName)
                      ELSE CONCAT('📝 ', la.leave_category, ' submitted by ', f.firstName, ' ', f.lastName)
                    END as activityType,
                    la.created_at as createdAt,
                    la.status as actionStatus
             FROM leave_applications la
             JOIN faculty f ON la.faculty_id = f.id
             WHERE f.is_approved = TRUE
             ORDER BY activityDate DESC LIMIT 10`
          );
          recentLeaves = [...recentLeaves, ...recentLeaveApps];
          recentLeaves.sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate));
          recentLeaves = recentLeaves.slice(0, 10);
        } catch (err) {
          console.error('Error fetching recent leave applications:', err);
        }
      }

      if (checkProductTable[0].tableExists > 0) {
        try {
          [recentProducts] = await pool.execute(
            `SELECT pr.*, CONCAT(f.firstName, ' ', f.lastName) as facultyName,
                    CASE 
                      WHEN pr.approvedAt IS NOT NULL THEN pr.approvedAt
                      ELSE pr.createdAt
                    END as activityDate,
                    CASE 
                      WHEN pr.status = 'Approved' THEN CONCAT('✅ Product "', pr.productName, '" approved for ', f.firstName, ' ', f.lastName)
                      WHEN pr.status = 'Rejected' THEN CONCAT('❌ Product "', pr.productName, '" rejected for ', f.firstName, ' ', f.lastName)
                      ELSE CONCAT('📝 Product "', pr.productName, '" requested by ', f.firstName, ' ', f.lastName)
                    END as activityType,
                    pr.status as actionStatus
             FROM product_requests pr
             JOIN faculty f ON pr.faculty_id = f.id
             WHERE f.is_approved = TRUE
             ORDER BY activityDate DESC LIMIT 10`
          );
        } catch (err) {
          console.error('Error fetching recent products:', err);
          recentProducts = [];
        }
      }

      res.json({
        recentLeaves,
        recentProducts
      });
    } else {
      // Faculty recent activity
      if (checkLeaveTable[0].tableExists > 0) {
        try {
          [recentLeaves] = await pool.execute(
            'SELECT * FROM leave_requests WHERE faculty_id = ? ORDER BY createdAt DESC LIMIT 3',
            [facultyId]
          );
        } catch (err) {
          console.error('Error fetching faculty recent leaves:', err);
          recentLeaves = [];
        }
        
        // Also get leave applications
        try {
          const [recentLeaveApps] = await pool.execute(
            'SELECT *, leave_category as leaveType FROM leave_applications WHERE faculty_id = ? ORDER BY created_at DESC LIMIT 3',
            [facultyId]
          );
          recentLeaves = [...recentLeaves, ...recentLeaveApps];
          recentLeaves.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
          recentLeaves = recentLeaves.slice(0, 3);
        } catch (err) {
          console.error('Error fetching faculty recent leave applications:', err);
        }
      }

      if (checkProductTable[0].tableExists > 0) {
        try {
          [recentProducts] = await pool.execute(
            'SELECT * FROM product_requests WHERE faculty_id = ? ORDER BY createdAt DESC LIMIT 3',
            [facultyId]
          );
        } catch (err) {
          console.error('Error fetching faculty recent products:', err);
          recentProducts = [];
        }
      }

      if (checkFileTable[0].tableExists > 0) {
        try {
          [recentFiles] = await pool.execute(
            'SELECT * FROM files WHERE faculty_id = ? ORDER BY createdAt DESC LIMIT 3',
            [facultyId]
          );
        } catch (err) {
          console.error('Error fetching faculty recent files:', err);
          recentFiles = [];
        }
      }

      res.json({
        recentLeaves,
        recentProducts,
        recentFiles
      });
    }
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity
};