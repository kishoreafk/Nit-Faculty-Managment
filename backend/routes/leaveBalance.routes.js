const express = require('express');
const router = express.Router();
const leaveBalanceService = require('../services/leaveBalanceService');
const yearEndCarryForwardService = require('../services/yearEndCarryForwardService');
const db = require('../config/db');

// Get leave balance for a faculty member
router.get('/balance/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Get faculty details
    const [facultyRows] = await db.execute(
      'SELECT role as facultyType, joiningDate, facultyType as type FROM faculty WHERE id = ?',
      [facultyId]
    );

    if (facultyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const faculty = facultyRows[0];
    const facultyType = (faculty.facultyType === 'faculty' || faculty.type === 'Teaching') ? 'teaching' : 
                       (faculty.type === 'Non-Teaching') ? 'non_teaching' :
                       (faculty.type === 'Contract') ? 'contract' :
                       (faculty.type === 'Visiting Faculty') ? 'visiting' :
                       'teaching'; // Default fallback

    // Calculate leave balance - simplified
    const balance = await leaveBalanceService.calculateLeaveBalance(
      facultyType,
      faculty.joiningDate || new Date(), // Default to current date if no joining date
      new Date(),
      parseInt(year)
    );

    // Get used leave from database
    const [usedLeaveRows] = await db.execute(`
      SELECT 
        leave_type_id,
        SUM(used_days) as total_used
      FROM leave_balances 
      WHERE faculty_id = ? AND year = ?
      GROUP BY leave_type_id
    `, [facultyId, year]);

    // Update balance with used leave
    usedLeaveRows.forEach(row => {
      if (balance[row.leave_type_id]) {
        balance[row.leave_type_id].used = parseFloat(row.total_used) || 0;
        balance[row.leave_type_id].balance = Math.max(0, balance[row.leave_type_id].allocated - balance[row.leave_type_id].used);
      }
    });

    res.json({
      success: true,
      data: {
        facultyId: parseInt(facultyId),
        year: parseInt(year),
        facultyType,
        balances: balance
      }
    });

  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message
    });
  }
});

// Initialize leave balance for a faculty member
router.post('/initialize/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { year = new Date().getFullYear() } = req.body;

    // Get faculty details
    const [facultyRows] = await db.execute(
      'SELECT role as facultyType, joiningDate, facultyType as type FROM faculty WHERE id = ?',
      [facultyId]
    );

    if (facultyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const faculty = facultyRows[0];
    const facultyType = (faculty.facultyType === 'faculty' || faculty.type === 'Teaching') ? 'teaching' : 
                       (faculty.type === 'Non-Teaching') ? 'non_teaching' :
                       (faculty.type === 'Contract') ? 'contract' :
                       (faculty.type === 'Visiting Faculty') ? 'visiting' :
                       'teaching'; // Default fallback

    // Calculate leave balance - simplified
    const balance = await leaveBalanceService.calculateLeaveBalance(
      facultyType,
      faculty.joiningDate || new Date(), // Default to current date if no joining date
      new Date(),
      parseInt(year)
    );

    // Insert/Update leave balances in database
    for (const [leaveTypeId, leaveBalance] of Object.entries(balance)) {
      await db.execute(`
        INSERT INTO leave_balances 
        (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days, carry_forward_days)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        allocated_days = VALUES(allocated_days),
        balance_days = allocated_days - used_days,
        updated_at = CURRENT_TIMESTAMP
      `, [
        facultyId,
        leaveTypeId,
        year,
        leaveBalance.allocated,
        0, // used_days starts at 0
        leaveBalance.allocated, // balance_days = allocated - used
        0 // carry_forward_days starts at 0
      ]);

      // Log the allocation in history
      await db.execute(`
        INSERT INTO leave_balance_history 
        (faculty_id, leave_type_id, year, transaction_type, days_changed, balance_before, balance_after, description)
        VALUES (?, ?, ?, 'allocation', ?, 0, ?, ?)
      `, [
        facultyId,
        leaveTypeId,
        year,
        leaveBalance.allocated,
        leaveBalance.allocated,
        `Initial allocation for ${year}`
      ]);
    }

    res.json({
      success: true,
      message: 'Leave balance initialized successfully',
      data: {
        facultyId: parseInt(facultyId),
        year: parseInt(year),
        balances: balance
      }
    });

  } catch (error) {
    console.error('Error initializing leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize leave balance',
      error: error.message
    });
  }
});

// Update leave balance after leave application
router.post('/update-balance', async (req, res) => {
  try {
    const { facultyId, leaveTypeId, daysUsed, leaveApplicationId, year = new Date().getFullYear() } = req.body;

    // Get current balance
    const [balanceRows] = await db.execute(
      'SELECT * FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND year = ?',
      [facultyId, leaveTypeId, year]
    );

    if (balanceRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found. Please initialize balance first.'
      });
    }

    const currentBalance = balanceRows[0];
    const newUsedDays = parseFloat(currentBalance.used_days) + parseFloat(daysUsed);
    const newBalanceDays = parseFloat(currentBalance.allocated_days) - newUsedDays;

    if (newBalanceDays < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient leave balance'
      });
    }

    // Update balance
    await db.execute(`
      UPDATE leave_balances 
      SET used_days = ?, balance_days = ?, updated_at = CURRENT_TIMESTAMP
      WHERE faculty_id = ? AND leave_type_id = ? AND year = ?
    `, [newUsedDays, newBalanceDays, facultyId, leaveTypeId, year]);

    // Log the transaction
    await db.execute(`
      INSERT INTO leave_balance_history 
      (faculty_id, leave_type_id, year, transaction_type, days_changed, balance_before, balance_after, reference_id, reference_type, description)
      VALUES (?, ?, ?, 'usage', ?, ?, ?, ?, 'leave_application', ?)
    `, [
      facultyId,
      leaveTypeId,
      year,
      daysUsed,
      currentBalance.balance_days,
      newBalanceDays,
      leaveApplicationId,
      `Leave application #${leaveApplicationId}`
    ]);

    res.json({
      success: true,
      message: 'Leave balance updated successfully',
      data: {
        previousBalance: parseFloat(currentBalance.balance_days),
        newBalance: newBalanceDays,
        daysUsed: parseFloat(daysUsed)
      }
    });

  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave balance',
      error: error.message
    });
  }
});

// Get leave balance history
router.get('/history/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { year = new Date().getFullYear(), leaveTypeId } = req.query;

    let query = `
      SELECT 
        lbh.*
      FROM leave_balance_history lbh
      WHERE lbh.faculty_id = ? AND lbh.year = ?
    `;
    const params = [facultyId, year];

    if (leaveTypeId) {
      query += ' AND lbh.leave_type_id = ?';
      params.push(leaveTypeId);
    }

    query += ' ORDER BY lbh.created_at DESC';

    const [historyRows] = await db.execute(query, params);

    res.json({
      success: true,
      data: historyRows
    });

  } catch (error) {
    console.error('Error fetching leave balance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance history',
      error: error.message
    });
  }
});

// Year-end carry forward routes

// Process year-end carry forward for all faculty
router.post('/carry-forward/process', async (req, res) => {
  try {
    const { fromYear, toYear } = req.body;
    
    if (!fromYear || !toYear) {
      return res.status(400).json({
        success: false,
        message: 'Both fromYear and toYear are required'
      });
    }

    const results = await yearEndCarryForwardService.processYearEndCarryForward(
      parseInt(fromYear),
      parseInt(toYear)
    );

    res.json({
      success: true,
      message: 'Year-end carry forward processing completed',
      data: results
    });

  } catch (error) {
    console.error('Error processing year-end carry forward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process year-end carry forward',
      error: error.message
    });
  }
});

// Get carry forward summary for a faculty member
router.get('/carry-forward/summary/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { fromYear, toYear } = req.query;

    if (!fromYear || !toYear) {
      return res.status(400).json({
        success: false,
        message: 'Both fromYear and toYear query parameters are required'
      });
    }

    const summary = await yearEndCarryForwardService.getCarryForwardSummary(
      parseInt(facultyId),
      parseInt(fromYear),
      parseInt(toYear)
    );

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching carry forward summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carry forward summary',
      error: error.message
    });
  }
});

// Manual carry forward for specific faculty and leave type
router.post('/carry-forward/manual', async (req, res) => {
  try {
    const { facultyId, leaveTypeId, fromYear, toYear, daysToCarryForward } = req.body;

    if (!facultyId || !leaveTypeId || !fromYear || !toYear || !daysToCarryForward) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: facultyId, leaveTypeId, fromYear, toYear, daysToCarryForward'
      });
    }

    const result = await yearEndCarryForwardService.manualCarryForward(
      parseInt(facultyId),
      leaveTypeId,
      parseInt(fromYear),
      parseInt(toYear),
      parseFloat(daysToCarryForward)
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing manual carry forward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process manual carry forward',
      error: error.message
    });
  }
});

module.exports = router;