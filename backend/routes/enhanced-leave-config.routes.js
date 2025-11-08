const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Get enhanced leave configuration for a faculty member
router.get('/faculty/:facultyId/leave-config', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const currentYear = new Date().getFullYear();

    // Get faculty information
    const [faculty] = await pool.execute(
      'SELECT facultyType, joiningDate FROM faculty WHERE id = ?',
      [facultyId]
    );

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const facultyType = faculty[0].facultyType;
    const joiningDate = new Date(faculty[0].joiningDate);
    const serviceMonths = Math.floor((new Date() - joiningDate) / (1000 * 60 * 60 * 24 * 30.44));

    // Get enhanced leave types with faculty-specific entitlements
    const [leaveTypes] = await pool.execute(`
      SELECT 
        ltc.*,
        fle.max_days,
        fle.is_applicable,
        fle.accrual_frequency,
        fle.accrual_start_month,
        fle.probation_entitlement,
        fle.carry_forward_limit,
        fle.carry_forward_expiry_months,
        fle.encashment_percentage,
        fle.min_service_months,
        fle.gender_restriction,
        fle.marital_status_restriction,
        fle.age_restriction_min,
        fle.age_restriction_max,
        fle.performance_rating_required,
        fle.custom_rules
      FROM leave_types_config ltc
      LEFT JOIN faculty_leave_entitlements fle ON ltc.leave_type_id = fle.leave_type_id
      LEFT JOIN faculty_types_config ftc ON fle.faculty_type_id = ftc.type_id
      WHERE ltc.is_active = TRUE 
        AND (fle.faculty_type_id = ? OR fle.faculty_type_id IS NULL)
        AND (fle.min_service_months <= ? OR fle.min_service_months IS NULL)
      ORDER BY ltc.name
    `, [facultyType, serviceMonths]);

    // Get current leave balances
    const [balances] = await pool.execute(`
      SELECT 
        leave_type_id,
        current_balance,
        accrued_balance,
        used_balance,
        carried_forward,
        encashed_balance,
        last_accrual_date,
        next_reset_date
      FROM leave_balance_tracking
      WHERE faculty_id = ? AND balance_year = ? AND is_active = TRUE
    `, [facultyId, currentYear]);

    // Get leave calendar restrictions
    const [restrictions] = await pool.execute(`
      SELECT 
        leave_type_id,
        blackout_start_date,
        blackout_end_date,
        blackout_reason,
        blackout_type,
        max_applications_allowed
      FROM leave_calendar
      WHERE (leave_type_id IS NULL OR leave_type_id IN (
        SELECT leave_type_id FROM faculty_leave_entitlements 
        WHERE faculty_type_id = ? AND is_applicable = TRUE
      ))
      AND calendar_year = ?
      AND is_active = TRUE
      AND blackout_start_date >= CURDATE()
      ORDER BY blackout_start_date
    `, [facultyType, currentYear]);

    // Get policy exceptions
    const [exceptions] = await pool.execute(`
      SELECT 
        leave_type_id,
        exception_field,
        exception_value,
        effective_from,
        effective_to,
        reason
      FROM leave_policy_exceptions
      WHERE (faculty_id = ? OR faculty_type_id = ?)
        AND is_active = TRUE
        AND effective_from <= CURDATE()
        AND (effective_to IS NULL OR effective_to >= CURDATE())
    `, [facultyId, facultyType]);

    // Process and format the data
    const enhancedLeaveConfig = leaveTypes.map(lt => {
      const balance = balances.find(b => b.leave_type_id === lt.leave_type_id) || {
        current_balance: 0,
        accrued_balance: 0,
        used_balance: 0,
        carried_forward: 0,
        encashed_balance: 0
      };

      const typeRestrictions = restrictions.filter(r => 
        r.leave_type_id === lt.leave_type_id || r.leave_type_id === null
      );

      const typeExceptions = exceptions.filter(e => e.leave_type_id === lt.leave_type_id);

      return {
        ...lt,
        // Parse JSON fields safely
        approval_hierarchy: Array.isArray(lt.approval_hierarchy) ? lt.approval_hierarchy : JSON.parse(lt.approval_hierarchy || '[]'),
        blackout_periods: Array.isArray(lt.blackout_periods) ? lt.blackout_periods : JSON.parse(lt.blackout_periods || '[]'),
        eligibility_criteria: typeof lt.eligibility_criteria === 'object' ? lt.eligibility_criteria : JSON.parse(lt.eligibility_criteria || '{}'),
        encashment_rules: typeof lt.encashment_rules === 'object' ? lt.encashment_rules : JSON.parse(lt.encashment_rules || '{}'),
        transfer_rules: typeof lt.transfer_rules === 'object' ? lt.transfer_rules : JSON.parse(lt.transfer_rules || '{}'),
        notification_settings: typeof lt.notification_settings === 'object' ? lt.notification_settings : JSON.parse(lt.notification_settings || '{}'),
        integration_settings: typeof lt.integration_settings === 'object' ? lt.integration_settings : JSON.parse(lt.integration_settings || '{}'),
        custom_rules: typeof lt.custom_rules === 'object' ? lt.custom_rules : JSON.parse(lt.custom_rules || '{}'),
        
        // Current balance information
        balance: {
          current: parseFloat(balance.current_balance || 0),
          accrued: parseFloat(balance.accrued_balance || 0),
          used: parseFloat(balance.used_balance || 0),
          carriedForward: parseFloat(balance.carried_forward || 0),
          encashed: parseFloat(balance.encashed_balance || 0),
          lastAccrualDate: balance.last_accrual_date,
          nextResetDate: balance.next_reset_date
        },

        // Calendar restrictions
        restrictions: typeRestrictions.map(r => ({
          startDate: r.blackout_start_date,
          endDate: r.blackout_end_date,
          reason: r.blackout_reason,
          type: r.blackout_type,
          maxApplications: r.max_applications_allowed
        })),

        // Policy exceptions
        exceptions: typeExceptions.map(e => ({
          field: e.exception_field,
          value: e.exception_value,
          effectiveFrom: e.effective_from,
          effectiveTo: e.effective_to,
          reason: e.reason
        })),

        // Calculated fields
        isEligible: serviceMonths >= (lt.min_service_months || 0),
        serviceMonthsRequired: lt.min_service_months || 0,
        currentServiceMonths: serviceMonths,
        
        // Enhanced policy information
        policies: {
          annualReset: lt.annual_reset,
          resetDate: lt.reset_date,
          resetFrequency: lt.reset_frequency,
          accrualCap: lt.accrual_cap,
          weekendCount: lt.weekend_count,
          holidayCount: lt.holiday_count,
          halfDayAllowed: lt.half_day_allowed,
          consecutiveLimit: lt.consecutive_limit,
          monthlyLimit: lt.monthly_limit,
          quarterlyLimit: lt.quarterly_limit,
          autoApprovalLimit: lt.auto_approval_limit,
          leaveCategory: lt.leave_category,
          prorationRule: lt.proration_rule,
          negativeBalanceAllowed: lt.negative_balance_allowed,
          maxNegativeDays: lt.max_negative_days
        }
      };
    });

    res.json({
      success: true,
      data: {
        facultyInfo: {
          id: facultyId,
          type: facultyType,
          joiningDate: faculty[0].joiningDate,
          serviceMonths: serviceMonths
        },
        leaveTypes: enhancedLeaveConfig,
        currentYear: currentYear,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching enhanced leave configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enhanced leave configuration',
      error: error.message
    });
  }
});

// Get leave balance summary for a faculty member
router.get('/faculty/:facultyId/balance-summary', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const [balances] = await pool.execute(`
      SELECT 
        lbt.*,
        ltc.name as leave_type_name,
        ltc.leave_category,
        ltc.encashment_allowed,
        ltc.carry_forward,
        ltc.annual_reset,
        ltc.reset_date
      FROM leave_balance_tracking lbt
      JOIN leave_types_config ltc ON lbt.leave_type_id = ltc.leave_type_id
      WHERE lbt.faculty_id = ? AND lbt.balance_year = ? AND lbt.is_active = TRUE
      ORDER BY ltc.name
    `, [facultyId, year]);

    const summary = {
      year: parseInt(year),
      totalBalance: 0,
      totalUsed: 0,
      totalCarriedForward: 0,
      totalEncashed: 0,
      leaveTypes: balances.map(balance => ({
        leaveTypeId: balance.leave_type_id,
        leaveTypeName: balance.leave_type_name,
        category: balance.leave_category,
        openingBalance: parseFloat(balance.opening_balance),
        accruedBalance: parseFloat(balance.accrued_balance),
        usedBalance: parseFloat(balance.used_balance),
        currentBalance: parseFloat(balance.current_balance),
        carriedForward: parseFloat(balance.carried_forward),
        encashedBalance: parseFloat(balance.encashed_balance),
        expiredBalance: parseFloat(balance.expired_balance),
        adjustedBalance: parseFloat(balance.adjusted_balance),
        lastAccrualDate: balance.last_accrual_date,
        lastResetDate: balance.last_reset_date,
        nextResetDate: balance.next_reset_date,
        canCarryForward: balance.carry_forward,
        canEncash: balance.encashment_allowed,
        willReset: balance.annual_reset,
        resetDate: balance.reset_date
      }))
    };

    // Calculate totals
    summary.totalBalance = summary.leaveTypes.reduce((sum, lt) => sum + lt.currentBalance, 0);
    summary.totalUsed = summary.leaveTypes.reduce((sum, lt) => sum + lt.usedBalance, 0);
    summary.totalCarriedForward = summary.leaveTypes.reduce((sum, lt) => sum + lt.carriedForward, 0);
    summary.totalEncashed = summary.leaveTypes.reduce((sum, lt) => sum + lt.encashedBalance, 0);

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching leave balance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance summary',
      error: error.message
    });
  }
});

// Get leave accrual history
router.get('/faculty/:facultyId/accrual-history', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { leaveTypeId, year, limit = 50 } = req.query;

    let query = `
      SELECT 
        lah.*,
        ltc.name as leave_type_name
      FROM leave_accrual_history lah
      JOIN leave_types_config ltc ON lah.leave_type_id = ltc.leave_type_id
      WHERE lah.faculty_id = ?
    `;
    const params = [facultyId];

    if (leaveTypeId) {
      query += ' AND lah.leave_type_id = ?';
      params.push(leaveTypeId);
    }

    if (year) {
      query += ' AND YEAR(lah.accrual_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY lah.accrual_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [history] = await pool.execute(query, params);

    res.json({
      success: true,
      data: history.map(record => ({
        id: record.id,
        leaveTypeId: record.leave_type_id,
        leaveTypeName: record.leave_type_name,
        accrualDate: record.accrual_date,
        accrualAmount: parseFloat(record.accrual_amount),
        accrualType: record.accrual_type,
        balanceBefore: parseFloat(record.balance_before),
        balanceAfter: parseFloat(record.balance_after),
        remarks: record.remarks,
        processedBy: record.processed_by,
        createdAt: record.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching accrual history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accrual history',
      error: error.message
    });
  }
});

// Admin: Process annual leave reset
router.post('/admin/annual-reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year, leaveTypeIds, facultyIds } = req.body;
    const resetYear = year || new Date().getFullYear();
    const resetDate = new Date(`${resetYear}-01-01`);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get all leave types that have annual reset enabled
      let leaveTypeQuery = `
        SELECT leave_type_id, reset_date, carry_forward, max_carry_forward_days
        FROM leave_types_config 
        WHERE annual_reset = TRUE AND is_active = TRUE
      `;
      const leaveTypeParams = [];

      if (leaveTypeIds && leaveTypeIds.length > 0) {
        leaveTypeQuery += ` AND leave_type_id IN (${leaveTypeIds.map(() => '?').join(',')})`;
        leaveTypeParams.push(...leaveTypeIds);
      }

      const [leaveTypesToReset] = await connection.execute(leaveTypeQuery, leaveTypeParams);

      // Get all faculty or specific faculty
      let facultyQuery = 'SELECT id, facultyType FROM faculty WHERE isActive = TRUE';
      const facultyParams = [];

      if (facultyIds && facultyIds.length > 0) {
        facultyQuery += ` AND id IN (${facultyIds.map(() => '?').join(',')})`;
        facultyParams.push(...facultyIds);
      }

      const [facultyList] = await connection.execute(facultyQuery, facultyParams);

      let processedCount = 0;

      for (const faculty of facultyList) {
        for (const leaveType of leaveTypesToReset) {
          // Get current balance
          const [currentBalance] = await connection.execute(`
            SELECT * FROM leave_balance_tracking 
            WHERE faculty_id = ? AND leave_type_id = ? AND balance_year = ?
          `, [faculty.id, leaveType.leave_type_id, resetYear - 1]);

          if (currentBalance.length > 0) {
            const balance = currentBalance[0];
            const carriedForward = leaveType.carry_forward ? 
              Math.min(parseFloat(balance.current_balance), leaveType.max_carry_forward_days || 0) : 0;

            // Create new year balance record
            await connection.execute(`
              INSERT INTO leave_balance_tracking 
              (faculty_id, leave_type_id, balance_year, opening_balance, carried_forward, 
               current_balance, last_reset_date, next_reset_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
              opening_balance = VALUES(opening_balance),
              carried_forward = VALUES(carried_forward),
              current_balance = VALUES(current_balance),
              last_reset_date = VALUES(last_reset_date),
              next_reset_date = VALUES(next_reset_date)
            `, [
              faculty.id, 
              leaveType.leave_type_id, 
              resetYear,
              0, // opening_balance will be set by accrual process
              carriedForward,
              carriedForward,
              resetDate,
              new Date(`${resetYear + 1}-01-01`)
            ]);

            // Record the reset in accrual history
            await connection.execute(`
              INSERT INTO leave_accrual_history 
              (faculty_id, leave_type_id, accrual_date, accrual_amount, accrual_type, 
               balance_before, balance_after, remarks)
              VALUES (?, ?, ?, ?, 'adjustment', ?, ?, ?)
            `, [
              faculty.id,
              leaveType.leave_type_id,
              resetDate,
              carriedForward,
              parseFloat(balance.current_balance),
              carriedForward,
              `Annual reset for ${resetYear} - Carried forward: ${carriedForward} days`
            ]);

            processedCount++;
          }
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Annual reset processed successfully for ${processedCount} leave accounts`,
        data: {
          year: resetYear,
          processedAccounts: processedCount,
          facultyCount: facultyList.length,
          leaveTypesCount: leaveTypesToReset.length
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error processing annual reset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process annual reset',
      error: error.message
    });
  }
});

module.exports = router;