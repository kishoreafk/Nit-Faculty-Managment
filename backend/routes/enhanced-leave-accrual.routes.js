const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Get all accrual rules with enhanced configuration
router.get('/accrual-rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rules] = await pool.execute(`
      SELECT 
        lar.*,
        ftc.name as faculty_type_name,
        ltc.name as leave_type_name
      FROM leave_accrual_rules lar
      LEFT JOIN faculty_types_config ftc ON lar.faculty_type_id = ftc.type_id
      LEFT JOIN leave_types_config ltc ON lar.leave_type_id = ltc.leave_type_id
      WHERE lar.is_active = TRUE
      ORDER BY lar.faculty_type_id, lar.leave_type_id, lar.service_months_from
    `);

    const parsedRules = rules.map(rule => ({
      ...rule,
      progressive_rates: typeof rule.progressive_rates === 'object' ? 
        rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}'),
      accrual_settings: typeof rule.accrual_settings === 'object' ? 
        rule.accrual_settings : JSON.parse(rule.accrual_settings || '{}')
    }));

    res.json({
      success: true,
      data: parsedRules
    });
  } catch (error) {
    console.error('Error fetching accrual rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accrual rules',
      error: error.message
    });
  }
});

// Create new accrual rule
router.post('/accrual-rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      ruleName,
      facultyTypeId,
      leaveTypeId,
      accrualPeriod,
      accrualAmount,
      maxCarryOver,
      unlimitedLeave,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      effectiveFrom,
      effectiveTo,
      isActive,
      accrualSettings
    } = req.body;

    // Validate required fields
    if (!ruleName || !facultyTypeId || !leaveTypeId || !accrualAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ruleName, facultyTypeId, leaveTypeId, accrualAmount'
      });
    }

    const [result] = await pool.execute(`
      INSERT INTO leave_accrual_rules 
      (rule_name, faculty_type_id, leave_type_id, accrual_period, accrual_amount, 
       max_carry_over, unlimited_leave, service_months_from, service_months_to,
       calculation_method, effective_from, effective_to, is_active, accrual_settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ruleName,
      facultyTypeId,
      leaveTypeId,
      accrualPeriod || 'monthly',
      accrualAmount,
      unlimitedLeave ? null : (maxCarryOver || 0),
      unlimitedLeave || false,
      serviceMonthsFrom || 0,
      serviceMonthsTo || 999,
      calculationMethod || 'fixed',
      effectiveFrom,
      effectiveTo || null,
      isActive !== false,
      JSON.stringify(accrualSettings || {})
    ]);

    res.json({
      success: true,
      message: 'Accrual rule created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating accrual rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create accrual rule',
      error: error.message
    });
  }
});

// Update accrual rule
router.put('/accrual-rules/:ruleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const {
      ruleName,
      facultyTypeId,
      leaveTypeId,
      accrualPeriod,
      accrualAmount,
      maxCarryOver,
      unlimitedLeave,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      effectiveFrom,
      effectiveTo,
      isActive,
      accrualSettings
    } = req.body;

    const [result] = await pool.execute(`
      UPDATE leave_accrual_rules 
      SET rule_name = ?, faculty_type_id = ?, leave_type_id = ?, 
          accrual_period = ?, accrual_amount = ?, max_carry_over = ?,
          unlimited_leave = ?, service_months_from = ?, service_months_to = ?,
          calculation_method = ?, effective_from = ?, effective_to = ?,
          is_active = ?, accrual_settings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      ruleName,
      facultyTypeId,
      leaveTypeId,
      accrualPeriod,
      accrualAmount,
      unlimitedLeave ? null : maxCarryOver,
      unlimitedLeave,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      effectiveFrom,
      effectiveTo,
      isActive,
      JSON.stringify(accrualSettings || {}),
      ruleId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accrual rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Accrual rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating accrual rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update accrual rule',
      error: error.message
    });
  }
});

// Delete accrual rule (soft delete)
router.delete('/accrual-rules/:ruleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const [result] = await pool.execute(`
      UPDATE leave_accrual_rules 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [ruleId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Accrual rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Accrual rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting accrual rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete accrual rule',
      error: error.message
    });
  }
});

// Calculate leave accrual for specific parameters
router.post('/calculate-accrual', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { facultyType, leaveTypeId, serviceMonths, calculationDate } = req.body;

    if (!facultyType || !leaveTypeId || serviceMonths === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: facultyType, leaveTypeId, serviceMonths'
      });
    }

    // Get applicable accrual rule
    const [rules] = await pool.execute(`
      SELECT * FROM leave_accrual_rules 
      WHERE faculty_type_id = ? AND leave_type_id = ? 
        AND service_months_from <= ? AND service_months_to >= ?
        AND is_active = TRUE
        AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY service_months_from DESC
      LIMIT 1
    `, [
      facultyType, 
      leaveTypeId, 
      serviceMonths, 
      serviceMonths, 
      calculationDate || new Date().toISOString().split('T')[0],
      calculationDate || new Date().toISOString().split('T')[0]
    ]);

    if (rules.length === 0) {
      return res.json({
        success: true,
        data: {
          monthlyAccrual: 0,
          yearlyAccrual: 0,
          appliedRule: 'No applicable rule found',
          calculationMethod: 'none',
          unlimited: false
        }
      });
    }

    const rule = rules[0];
    let monthlyAccrual = 0;
    let yearlyAccrual = 0;

    // Calculate based on accrual period and method
    switch (rule.accrual_period) {
      case 'monthly':
        monthlyAccrual = parseFloat(rule.accrual_amount);
        yearlyAccrual = monthlyAccrual * 12;
        break;
      case 'quarterly':
        monthlyAccrual = parseFloat(rule.accrual_amount) / 3;
        yearlyAccrual = parseFloat(rule.accrual_amount) * 4;
        break;
      case 'yearly':
        monthlyAccrual = parseFloat(rule.accrual_amount) / 12;
        yearlyAccrual = parseFloat(rule.accrual_amount);
        break;
      case 'daily':
        // Assuming 22 working days per month
        monthlyAccrual = parseFloat(rule.accrual_amount) * 22;
        yearlyAccrual = monthlyAccrual * 12;
        break;
      default:
        monthlyAccrual = parseFloat(rule.accrual_amount);
        yearlyAccrual = monthlyAccrual * 12;
    }

    // Apply progressive rates if applicable
    if (rule.calculation_method === 'progressive' && rule.progressive_rates) {
      const progressiveRates = typeof rule.progressive_rates === 'object' ? 
        rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}');
      
      // Find applicable rate based on service months
      for (const [range, multiplier] of Object.entries(progressiveRates)) {
        if (range.includes('-')) {
          const [min, max] = range.split('-').map(Number);
          if (serviceMonths >= min && serviceMonths <= max) {
            monthlyAccrual *= parseFloat(multiplier);
            yearlyAccrual *= parseFloat(multiplier);
            break;
          }
        } else if (range.includes('+')) {
          const min = parseInt(range.replace('+', ''));
          if (serviceMonths >= min) {
            monthlyAccrual *= parseFloat(multiplier);
            yearlyAccrual *= parseFloat(multiplier);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        monthlyAccrual: Math.round(monthlyAccrual * 100) / 100,
        yearlyAccrual: Math.round(yearlyAccrual * 100) / 100,
        appliedRule: rule.rule_name,
        calculationMethod: rule.calculation_method,
        accrualPeriod: rule.accrual_period,
        unlimited: rule.unlimited_leave,
        maxCarryOver: rule.max_carry_over,
        serviceRange: `${rule.service_months_from}-${rule.service_months_to} months`
      }
    });
  } catch (error) {
    console.error('Error calculating accrual:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate accrual',
      error: error.message
    });
  }
});

// Get faculty leave entitlements with accrual details
router.get('/faculty-entitlements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [entitlements] = await pool.execute(`
      SELECT 
        fle.*,
        ftc.name as faculty_type_name,
        ltc.name as leave_type_name,
        ltc.description as leave_type_description
      FROM faculty_leave_entitlements fle
      JOIN faculty_types_config ftc ON fle.faculty_type_id = ftc.type_id
      JOIN leave_types_config ltc ON fle.leave_type_id = ltc.leave_type_id
      WHERE fle.is_applicable = TRUE
      ORDER BY ftc.name, ltc.name
    `);

    res.json({
      success: true,
      data: entitlements
    });
  } catch (error) {
    console.error('Error fetching faculty entitlements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty entitlements',
      error: error.message
    });
  }
});

// Update faculty leave entitlement
router.put('/faculty-entitlements/:facultyTypeId/:leaveTypeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { facultyTypeId, leaveTypeId } = req.params;
    const {
      maxDays,
      isApplicable,
      monthlyAccrualRate,
      yearlyAccrualRate,
      calculationMethod,
      workingDaysPerMonth,
      prorationMethod,
      minServiceMonths,
      accrualStartFrom,
      unlimitedLeave,
      maxCarryOver
    } = req.body;

    const [result] = await pool.execute(`
      UPDATE faculty_leave_entitlements 
      SET 
        max_days = ?,
        is_applicable = ?,
        monthly_accrual_rate = ?,
        yearly_accrual_rate = ?,
        accrual_calculation_method = ?,
        working_days_per_month = ?,
        proration_method = ?,
        min_service_months = ?,
        accrual_start_from = ?,
        unlimited_leave = ?,
        max_carry_over = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE faculty_type_id = ? AND leave_type_id = ?
    `, [
      unlimitedLeave ? null : maxDays,
      isApplicable,
      monthlyAccrualRate,
      yearlyAccrualRate,
      calculationMethod,
      workingDaysPerMonth,
      prorationMethod,
      minServiceMonths,
      accrualStartFrom,
      unlimitedLeave || false,
      unlimitedLeave ? null : maxCarryOver,
      facultyTypeId,
      leaveTypeId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty leave entitlement not found'
      });
    }

    res.json({
      success: true,
      message: 'Faculty leave entitlement updated successfully'
    });
  } catch (error) {
    console.error('Error updating faculty leave entitlement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update faculty leave entitlement',
      error: error.message
    });
  }
});

// Bulk update leave balances based on accrual rules
router.post('/update-leave-balances', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { facultyIds, effectiveDate } = req.body;
    const updateDate = effectiveDate || new Date().toISOString().split('T')[0];
    
    let updatedCount = 0;
    const errors = [];

    // Get all faculty members to update
    let facultyQuery = 'SELECT id, facultyType, joiningDate FROM faculty WHERE 1=1';
    let queryParams = [];
    
    if (facultyIds && facultyIds.length > 0) {
      facultyQuery += ` AND id IN (${facultyIds.map(() => '?').join(',')})`;
      queryParams = facultyIds;
    }

    const [faculty] = await pool.execute(facultyQuery, queryParams);

    for (const facultyMember of faculty) {
      try {
        // Calculate service months
        const joiningDate = new Date(facultyMember.joiningDate);
        const currentDate = new Date(updateDate);
        const serviceMonths = Math.floor((currentDate - joiningDate) / (1000 * 60 * 60 * 24 * 30.44));

        // Get applicable accrual rules for this faculty member
        const [rules] = await pool.execute(`
          SELECT * FROM leave_accrual_rules 
          WHERE faculty_type_id = ? 
            AND service_months_from <= ? AND service_months_to >= ?
            AND is_active = TRUE
            AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
          ORDER BY leave_type_id, service_months_from DESC
        `, [
          facultyMember.facultyType,
          serviceMonths,
          serviceMonths,
          updateDate,
          updateDate
        ]);

        // Update leave balances for each applicable rule
        for (const rule of rules) {
          let monthlyAccrual = parseFloat(rule.accrual_amount);
          
          // Apply progressive rates if applicable
          if (rule.calculation_method === 'progressive' && rule.progressive_rates) {
            const progressiveRates = typeof rule.progressive_rates === 'object' ? 
              rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}');
            
            for (const [range, multiplier] of Object.entries(progressiveRates)) {
              if (range.includes('-')) {
                const [min, max] = range.split('-').map(Number);
                if (serviceMonths >= min && serviceMonths <= max) {
                  monthlyAccrual *= parseFloat(multiplier);
                  break;
                }
              } else if (range.includes('+')) {
                const min = parseInt(range.replace('+', ''));
                if (serviceMonths >= min) {
                  monthlyAccrual *= parseFloat(multiplier);
                }
              }
            }
          }

          // Update or insert leave balance
          await pool.execute(`
            INSERT INTO leave_balances 
            (faculty_id, leave_type_id, accrued_days, used_days, balance_days, 
             last_accrual_date, accrual_rate, unlimited_leave)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            accrued_days = accrued_days + ?,
            balance_days = accrued_days + ? - used_days,
            last_accrual_date = ?,
            accrual_rate = ?,
            unlimited_leave = ?
          `, [
            facultyMember.id,
            rule.leave_type_id,
            monthlyAccrual,
            monthlyAccrual,
            updateDate,
            monthlyAccrual,
            rule.unlimited_leave,
            monthlyAccrual,
            monthlyAccrual,
            updateDate,
            monthlyAccrual,
            rule.unlimited_leave
          ]);
        }

        updatedCount++;
      } catch (error) {
        errors.push({
          facultyId: facultyMember.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Leave balances updated for ${updatedCount} faculty members`,
      data: {
        updatedCount,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error('Error updating leave balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave balances',
      error: error.message
    });
  }
});

// Get leave accrual summary for a faculty member
router.get('/faculty/:facultyId/accrual-summary', authenticateToken, async (req, res) => {
  try {
    const { facultyId } = req.params;

    // Get faculty details
    const [faculty] = await pool.execute(
      'SELECT id, facultyType, joiningDate FROM faculty WHERE id = ?',
      [facultyId]
    );

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const facultyMember = faculty[0];
    const joiningDate = new Date(facultyMember.joiningDate);
    const currentDate = new Date();
    const serviceMonths = Math.floor((currentDate - joiningDate) / (1000 * 60 * 60 * 24 * 30.44));

    // Get applicable accrual rules
    const [rules] = await pool.execute(`
      SELECT 
        lar.*,
        ltc.name as leave_type_name,
        ltc.description as leave_type_description
      FROM leave_accrual_rules lar
      JOIN leave_types_config ltc ON lar.leave_type_id = ltc.leave_type_id
      WHERE lar.faculty_type_id = ? 
        AND lar.service_months_from <= ? AND lar.service_months_to >= ?
        AND lar.is_active = TRUE
        AND lar.effective_from <= CURDATE() 
        AND (lar.effective_to IS NULL OR lar.effective_to >= CURDATE())
      ORDER BY ltc.name
    `, [facultyMember.facultyType, serviceMonths, serviceMonths]);

    // Get current leave balances
    const [balances] = await pool.execute(`
      SELECT 
        lb.*,
        ltc.name as leave_type_name
      FROM leave_balances lb
      JOIN leave_types_config ltc ON lb.leave_type_id = ltc.leave_type_id
      WHERE lb.faculty_id = ?
      ORDER BY ltc.name
    `, [facultyId]);

    const accrualSummary = rules.map(rule => {
      const balance = balances.find(b => b.leave_type_id === rule.leave_type_id);
      
      let monthlyAccrual = parseFloat(rule.accrual_amount);
      
      // Apply progressive rates if applicable
      if (rule.calculation_method === 'progressive' && rule.progressive_rates) {
        const progressiveRates = typeof rule.progressive_rates === 'object' ? 
          rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}');
        
        for (const [range, multiplier] of Object.entries(progressiveRates)) {
          if (range.includes('-')) {
            const [min, max] = range.split('-').map(Number);
            if (serviceMonths >= min && serviceMonths <= max) {
              monthlyAccrual *= parseFloat(multiplier);
              break;
            }
          } else if (range.includes('+')) {
            const min = parseInt(range.replace('+', ''));
            if (serviceMonths >= min) {
              monthlyAccrual *= parseFloat(multiplier);
            }
          }
        }
      }

      return {
        leaveTypeId: rule.leave_type_id,
        leaveTypeName: rule.leave_type_name,
        leaveTypeDescription: rule.leave_type_description,
        ruleName: rule.rule_name,
        accrualPeriod: rule.accrual_period,
        monthlyAccrual: Math.round(monthlyAccrual * 100) / 100,
        yearlyAccrual: Math.round(monthlyAccrual * 12 * 100) / 100,
        unlimitedLeave: rule.unlimited_leave,
        maxCarryOver: rule.max_carry_over,
        currentBalance: balance ? balance.balance_days : 0,
        accruedDays: balance ? balance.accrued_days : 0,
        usedDays: balance ? balance.used_days : 0,
        lastAccrualDate: balance ? balance.last_accrual_date : null
      };
    });

    res.json({
      success: true,
      data: {
        facultyId: facultyMember.id,
        facultyType: facultyMember.facultyType,
        joiningDate: facultyMember.joiningDate,
        serviceMonths,
        accrualSummary
      }
    });
  } catch (error) {
    console.error('Error fetching accrual summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accrual summary',
      error: error.message
    });
  }
});

// Clean up records with unknown faculty types
router.delete('/cleanup-unknown-faculty', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Start transaction
    await pool.execute('START TRANSACTION');

    try {
      // Find records with unknown faculty types
      const [unknownRecords] = await pool.execute(`
        SELECT lar.id, lar.faculty_type_id, lar.leave_type_id, lar.rule_name
        FROM leave_accrual_rules lar
        LEFT JOIN faculty_types_config ftc ON lar.faculty_type_id = ftc.type_id
        WHERE ftc.type_id IS NULL 
        OR lar.faculty_type_id = 'unknown' 
        OR lar.faculty_type_id LIKE '%unknown%'
      `);

      if (unknownRecords.length === 0) {
        await pool.execute('ROLLBACK');
        return res.json({
          success: true,
          message: 'No records with unknown faculty types found',
          data: { deleted_count: 0, records: [] }
        });
      }

      // Delete the unknown records
      const recordIds = unknownRecords.map(record => record.id);
      const placeholders = recordIds.map(() => '?').join(',');
      
      const [deleteResult] = await pool.execute(`
        DELETE FROM leave_accrual_rules 
        WHERE id IN (${placeholders})
      `, recordIds);

      await pool.execute('COMMIT');

      res.json({
        success: true,
        message: `Successfully deleted ${deleteResult.affectedRows} records with unknown faculty types`,
        data: {
          deleted_count: deleteResult.affectedRows,
          records: unknownRecords.map(record => ({
            id: record.id,
            faculty_type_id: record.faculty_type_id,
            leave_type_id: record.leave_type_id,
            rule_name: record.rule_name
          }))
        }
      });
    } catch (error) {
      await pool.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error cleaning up unknown faculty records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up unknown faculty records',
      error: error.message
    });
  }
});

module.exports = router;