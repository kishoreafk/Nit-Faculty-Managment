const express = require('express');
const router = express.Router();
const db = require('../config/db');
const leaveConfigSyncService = require('../services/leaveConfigSyncService');
const { authenticateToken } = require('../middleware/auth.middleware');

// Get all faculty with their leave balances
router.get('/faculty-balances', authenticateToken, async (req, res) => {
  try {
    const [faculty] = await db.execute(`
      SELECT f.id, f.firstName, f.lastName, f.employeeId, f.department, f.facultyType
      FROM faculty f 
      WHERE f.is_approved = TRUE
      ORDER BY f.firstName, f.lastName
    `);

    const facultyWithBalances = [];
    
    for (const fac of faculty) {
      const [balances] = await db.execute(`
        SELECT leave_type_id, allocated_days, used_days, balance_days
        FROM leave_balances 
        WHERE faculty_id = ? AND year = ?
      `, [fac.id, new Date().getFullYear()]);
      
      facultyWithBalances.push({
        ...fac,
        balances: balances.reduce((acc, bal) => {
          acc[bal.leave_type_id] = {
            allocated: bal.allocated_days,
            used: bal.used_days,
            balance: bal.balance_days
          };
          return acc;
        }, {})
      });
    }

    res.json({ success: true, data: facultyWithBalances });
  } catch (error) {
    console.error('Error fetching faculty balances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty balances' });
  }
});

// Update individual faculty leave balance
router.put('/faculty/:facultyId/balance/:leaveTypeId', authenticateToken, async (req, res) => {
  try {
    const { facultyId, leaveTypeId } = req.params;
    const { allocated, used } = req.body;
    const year = new Date().getFullYear();
    
    const balance = allocated - used;
    
    await db.execute(`
      INSERT INTO leave_balances (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      allocated_days = VALUES(allocated_days),
      used_days = VALUES(used_days),
      balance_days = VALUES(balance_days),
      updated_at = CURRENT_TIMESTAMP
    `, [facultyId, leaveTypeId, year, allocated, used, balance]);

    res.json({ success: true, message: 'Leave balance updated successfully' });
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ success: false, message: 'Failed to update leave balance' });
  }
});

// Sync leave balances with system config
router.post('/sync-leave-config', authenticateToken, async (req, res) => {
  try {
    const result = await leaveConfigSyncService.syncLeaveBalancesWithConfig();
    res.json(result);
  } catch (error) {
    console.error('Error syncing leave config:', error);
    res.status(500).json({ success: false, message: 'Failed to sync leave configuration' });
  }
});

module.exports = router;