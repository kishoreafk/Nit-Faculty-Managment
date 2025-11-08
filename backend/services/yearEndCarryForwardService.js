const db = require('../config/db');
const leaveBalanceService = require('./leaveBalanceService');

class YearEndCarryForwardService {
  /**
   * Process year-end carry forward for all faculty members
   * @param {number} fromYear - Year to carry forward from
   * @param {number} toYear - Year to carry forward to
   * @returns {Object} Processing results
   */
  async processYearEndCarryForward(fromYear, toYear = fromYear + 1) {
    const results = {
      processed: 0,
      errors: 0,
      details: []
    };

    try {
      // Get all faculty members
      const [facultyRows] = await db.execute(
        'SELECT id, role as facultyType, joiningDate FROM faculty WHERE role = "faculty"'
      );

      for (const faculty of facultyRows) {
        try {
          await this.processFacultyCarryForward(faculty, fromYear, toYear);
          results.processed++;
          results.details.push({
            facultyId: faculty.id,
            status: 'success',
            message: 'Carry forward processed successfully'
          });
        } catch (error) {
          results.errors++;
          results.details.push({
            facultyId: faculty.id,
            status: 'error',
            message: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Year-end carry forward failed: ${error.message}`);
    }
  }

  /**
   * Process carry forward for a single faculty member
   * @param {Object} faculty - Faculty details
   * @param {number} fromYear - Year to carry forward from
   * @param {number} toYear - Year to carry forward to
   */
  async processFacultyCarryForward(faculty, fromYear, toYear) {
    const facultyType = faculty.facultyType === 'faculty' ? 'teaching' : 'non_teaching';

    // Get current year balances
    const [currentBalances] = await db.execute(
      'SELECT * FROM leave_balances WHERE faculty_id = ? AND year = ?',
      [faculty.id, fromYear]
    );

    // Calculate new year allocations
    const newYearBalances = await leaveBalanceService.calculateLeaveBalance(
      facultyType,
      faculty.joiningDate,
      new Date(`${toYear}-01-01`),
      toYear
    );

    // Process each leave type
    for (const currentBalance of currentBalances) {
      const leaveTypeId = currentBalance.leave_type_id;
      
      // Only process carry forward for eligible leave types
      if (this.isCarryForwardEligible(leaveTypeId)) {
        const carryForwardDays = await this.calculateCarryForwardDays(
          currentBalance,
          leaveTypeId,
          facultyType
        );

        if (carryForwardDays > 0) {
          // Update new year allocation with carry forward
          if (newYearBalances[leaveTypeId]) {
            newYearBalances[leaveTypeId].allocated += carryForwardDays;
            newYearBalances[leaveTypeId].balance += carryForwardDays;
          }

          // Insert/Update new year balance with carry forward
          await db.execute(`
            INSERT INTO leave_balances 
            (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days, carry_forward_days)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            ON DUPLICATE KEY UPDATE
            allocated_days = VALUES(allocated_days),
            balance_days = VALUES(balance_days),
            carry_forward_days = VALUES(carry_forward_days),
            updated_at = CURRENT_TIMESTAMP
          `, [
            faculty.id,
            leaveTypeId,
            toYear,
            newYearBalances[leaveTypeId]?.allocated || 0,
            newYearBalances[leaveTypeId]?.balance || 0,
            carryForwardDays
          ]);

          // Log carry forward transaction
          await db.execute(`
            INSERT INTO leave_balance_history 
            (faculty_id, leave_type_id, year, transaction_type, days_changed, balance_before, balance_after, description)
            VALUES (?, ?, ?, 'carry_forward', ?, 0, ?, ?)
          `, [
            faculty.id,
            leaveTypeId,
            toYear,
            carryForwardDays,
            carryForwardDays,
            `Carry forward from ${fromYear} to ${toYear}`
          ]);
        }
      }

      // Initialize new year balance for non-carry forward types
      if (newYearBalances[leaveTypeId] && !this.isCarryForwardEligible(leaveTypeId)) {
        await db.execute(`
          INSERT INTO leave_balances 
          (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days, carry_forward_days)
          VALUES (?, ?, ?, ?, 0, ?, 0)
          ON DUPLICATE KEY UPDATE
          allocated_days = VALUES(allocated_days),
          balance_days = VALUES(balance_days),
          updated_at = CURRENT_TIMESTAMP
        `, [
          faculty.id,
          leaveTypeId,
          toYear,
          newYearBalances[leaveTypeId].allocated,
          newYearBalances[leaveTypeId].balance
        ]);
      }
    }
  }

  /**
   * Calculate carry forward days for a leave type
   * @param {Object} currentBalance - Current year balance
   * @param {string} leaveTypeId - Leave type ID
   * @param {string} facultyType - Faculty type
   * @returns {number} Days to carry forward
   */
  async calculateCarryForwardDays(currentBalance, leaveTypeId, facultyType) {
    const config = await leaveBalanceService.loadLeaveTypesConfig();
    const leaveType = config.leaveTypes[leaveTypeId];

    if (!leaveType || !leaveType.carryForward) {
      return 0;
    }

    const maxCarryForward = typeof leaveType.maxCarryForward === 'object' 
      ? leaveType.maxCarryForward[facultyType] 
      : leaveType.maxCarryForward || 0;

    const unusedDays = parseFloat(currentBalance.balance_days);
    return Math.min(Math.max(unusedDays, 0), maxCarryForward);
  }

  /**
   * Check if a leave type is eligible for carry forward
   * @param {string} leaveTypeId - Leave type ID
   * @returns {boolean} True if eligible for carry forward
   */
  isCarryForwardEligible(leaveTypeId) {
    // Only earned leave is typically eligible for carry forward
    return leaveTypeId === 'earned';
  }

  /**
   * Get carry forward summary for a faculty member
   * @param {number} facultyId - Faculty ID
   * @param {number} fromYear - Year carried forward from
   * @param {number} toYear - Year carried forward to
   * @returns {Object} Carry forward summary
   */
  async getCarryForwardSummary(facultyId, fromYear, toYear) {
    const [carryForwardRows] = await db.execute(`
      SELECT 
        leave_type_id,
        carry_forward_days,
        allocated_days,
        balance_days
      FROM leave_balances 
      WHERE faculty_id = ? AND year = ? AND carry_forward_days > 0
    `, [facultyId, toYear]);

    const [historyRows] = await db.execute(`
      SELECT 
        leave_type_id,
        days_changed,
        description,
        created_at
      FROM leave_balance_history 
      WHERE faculty_id = ? AND year = ? AND transaction_type = 'carry_forward'
      ORDER BY created_at DESC
    `, [facultyId, toYear]);

    return {
      facultyId,
      fromYear,
      toYear,
      carryForwardBalances: carryForwardRows,
      carryForwardHistory: historyRows
    };
  }

  /**
   * Manual carry forward for specific faculty and leave type
   * @param {number} facultyId - Faculty ID
   * @param {string} leaveTypeId - Leave type ID
   * @param {number} fromYear - Year to carry forward from
   * @param {number} toYear - Year to carry forward to
   * @param {number} daysToCarryForward - Specific days to carry forward
   */
  async manualCarryForward(facultyId, leaveTypeId, fromYear, toYear, daysToCarryForward) {
    // Validate carry forward eligibility
    if (!this.isCarryForwardEligible(leaveTypeId)) {
      throw new Error(`Leave type ${leaveTypeId} is not eligible for carry forward`);
    }

    // Get current balance
    const [currentBalanceRows] = await db.execute(
      'SELECT * FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND year = ?',
      [facultyId, leaveTypeId, fromYear]
    );

    if (currentBalanceRows.length === 0) {
      throw new Error('Current year balance not found');
    }

    const currentBalance = currentBalanceRows[0];
    const availableForCarryForward = parseFloat(currentBalance.balance_days);

    if (daysToCarryForward > availableForCarryForward) {
      throw new Error(`Cannot carry forward ${daysToCarryForward} days. Only ${availableForCarryForward} days available.`);
    }

    // Get or create next year balance
    const [nextYearRows] = await db.execute(
      'SELECT * FROM leave_balances WHERE faculty_id = ? AND leave_type_id = ? AND year = ?',
      [facultyId, leaveTypeId, toYear]
    );

    if (nextYearRows.length === 0) {
      // Create new year balance
      await db.execute(`
        INSERT INTO leave_balances 
        (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days, carry_forward_days)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `, [facultyId, leaveTypeId, toYear, daysToCarryForward, daysToCarryForward, daysToCarryForward]);
    } else {
      // Update existing balance
      const nextYearBalance = nextYearRows[0];
      const newAllocated = parseFloat(nextYearBalance.allocated_days) + daysToCarryForward;
      const newBalance = parseFloat(nextYearBalance.balance_days) + daysToCarryForward;
      const newCarryForward = parseFloat(nextYearBalance.carry_forward_days) + daysToCarryForward;

      await db.execute(`
        UPDATE leave_balances 
        SET allocated_days = ?, balance_days = ?, carry_forward_days = ?, updated_at = CURRENT_TIMESTAMP
        WHERE faculty_id = ? AND leave_type_id = ? AND year = ?
      `, [newAllocated, newBalance, newCarryForward, facultyId, leaveTypeId, toYear]);
    }

    // Log the manual carry forward
    await db.execute(`
      INSERT INTO leave_balance_history 
      (faculty_id, leave_type_id, year, transaction_type, days_changed, balance_before, balance_after, description)
      VALUES (?, ?, ?, 'carry_forward', ?, 0, ?, ?)
    `, [
      facultyId,
      leaveTypeId,
      toYear,
      daysToCarryForward,
      daysToCarryForward,
      `Manual carry forward from ${fromYear} to ${toYear}`
    ]);

    return {
      success: true,
      message: `Successfully carried forward ${daysToCarryForward} days from ${fromYear} to ${toYear}`,
      daysCarriedForward: daysToCarryForward
    };
  }
}

module.exports = new YearEndCarryForwardService();