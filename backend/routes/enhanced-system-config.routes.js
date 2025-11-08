const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Get enhanced complete system configuration with calculation details
router.get('/complete-enhanced', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get faculty types
    const [facultyTypes] = await pool.execute(`
      SELECT * FROM faculty_types_config WHERE is_active = TRUE ORDER BY name
    `);

    // Get leave types with enhanced entitlements including calculation details
    const [leaveTypes] = await pool.execute(`
      SELECT 
        lt.*,
        GROUP_CONCAT(
          CONCAT(fle.faculty_type_id, ':', fle.max_days, ':', fle.is_applicable, ':', 
                 COALESCE(fle.monthly_accrual_rate, 0), ':', COALESCE(fle.yearly_accrual_rate, 0), ':', 
                 COALESCE(fle.accrual_calculation_method, 'monthly'), ':', 
                 COALESCE(fle.working_days_per_month, 22), ':', COALESCE(fle.proration_method, 'monthly'))
          SEPARATOR '|'
        ) as faculty_entitlements
      FROM leave_types_config lt
      LEFT JOIN faculty_leave_entitlements fle ON lt.leave_type_id = fle.leave_type_id
      WHERE lt.is_active = TRUE
      GROUP BY lt.id
      ORDER BY lt.name
    `);

    // Get calculation rules
    const [calculationRules] = await pool.execute(`
      SELECT * FROM leave_calculation_rules WHERE is_active = TRUE ORDER BY faculty_type_id, leave_type_id
    `);

    // Get calculation functions
    const [calculationFunctions] = await pool.execute(`
      SELECT * FROM leave_calculation_functions WHERE is_active = TRUE ORDER BY function_name
    `);

    // Parse data
    const parsedFacultyTypes = facultyTypes.map(type => ({
      ...type,
      permissions: Array.isArray(type.permissions) ? type.permissions : JSON.parse(type.permissions || '[]'),
      benefits: Array.isArray(type.benefits) ? type.benefits : JSON.parse(type.benefits || '[]')
    }));

    const parsedLeaveTypes = leaveTypes.map(type => {
      const entitlements = {};
      if (type.faculty_entitlements) {
        type.faculty_entitlements.split('|').forEach(entitlement => {
          const [facultyType, maxDays, isApplicable, monthlyRate, yearlyRate, calculationMethod, workingDays, prorationMethod] = entitlement.split(':');
          entitlements[facultyType] = {
            maxDays: parseInt(maxDays),
            isApplicable: isApplicable === '1',
            monthlyAccrualRate: parseFloat(monthlyRate || 0),
            yearlyAccrualRate: parseFloat(yearlyRate || 0),
            calculationMethod: calculationMethod || 'monthly',
            workingDaysPerMonth: parseInt(workingDays || 22),
            prorationMethod: prorationMethod || 'monthly'
          };
        });
      }

      return {
        ...type,
        approval_hierarchy: Array.isArray(type.approval_hierarchy) ? type.approval_hierarchy : JSON.parse(type.approval_hierarchy || '[]'),
        blackout_periods: Array.isArray(type.blackout_periods) ? type.blackout_periods : JSON.parse(type.blackout_periods || '[]'),
        eligibility_criteria: typeof type.eligibility_criteria === 'object' ? type.eligibility_criteria : JSON.parse(type.eligibility_criteria || '{}'),
        encashment_rules: typeof type.encashment_rules === 'object' ? type.encashment_rules : JSON.parse(type.encashment_rules || '{}'),
        transfer_rules: typeof type.transfer_rules === 'object' ? type.transfer_rules : JSON.parse(type.transfer_rules || '{}'),
        notification_settings: typeof type.notification_settings === 'object' ? type.notification_settings : JSON.parse(type.notification_settings || '{}'),
        faculty_entitlements: entitlements
      };
    });

    // Parse calculation rules
    const parsedCalculationRules = calculationRules.map(rule => ({
      ...rule,
      progressive_rates: typeof rule.progressive_rates === 'object' ? rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}')
    }));

    // Parse calculation functions
    const parsedCalculationFunctions = calculationFunctions.map(func => ({
      ...func,
      parameters: typeof func.parameters === 'object' ? func.parameters : JSON.parse(func.parameters || '{}')
    }));

    res.json({
      success: true,
      data: {
        facultyTypes: parsedFacultyTypes,
        leaveTypes: parsedLeaveTypes,
        calculationRules: parsedCalculationRules,
        calculationFunctions: parsedCalculationFunctions
      }
    });
  } catch (error) {
    console.error('Error fetching enhanced complete configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enhanced system configuration',
      error: error.message
    });
  }
});

// Update faculty leave entitlement with calculation details
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
      minServiceMonths
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
        updated_at = CURRENT_TIMESTAMP
      WHERE faculty_type_id = ? AND leave_type_id = ?
    `, [
      maxDays,
      isApplicable,
      monthlyAccrualRate,
      yearlyAccrualRate,
      calculationMethod,
      workingDaysPerMonth,
      prorationMethod,
      minServiceMonths,
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

// Create or update calculation rule
router.post('/calculation-rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      ruleName,
      facultyTypeId,
      leaveTypeId,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      baseRate,
      progressiveRates,
      calculationFormula,
      effectiveFrom,
      effectiveTo
    } = req.body;

    const [result] = await pool.execute(`
      INSERT INTO leave_calculation_rules 
      (rule_name, faculty_type_id, leave_type_id, service_months_from, service_months_to,
       calculation_method, base_rate, progressive_rates, calculation_formula, 
       effective_from, effective_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ruleName,
      facultyTypeId,
      leaveTypeId,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      baseRate,
      JSON.stringify(progressiveRates || {}),
      calculationFormula,
      effectiveFrom,
      effectiveTo
    ]);

    res.json({
      success: true,
      message: 'Calculation rule created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating calculation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create calculation rule',
      error: error.message
    });
  }
});

// Update calculation rule
router.put('/calculation-rules/:ruleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const {
      ruleName,
      facultyTypeId,
      leaveTypeId,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      baseRate,
      progressiveRates,
      calculationFormula,
      effectiveFrom,
      effectiveTo,
      isActive
    } = req.body;

    const [result] = await pool.execute(`
      UPDATE leave_calculation_rules 
      SET rule_name = ?, faculty_type_id = ?, leave_type_id = ?, 
          service_months_from = ?, service_months_to = ?, calculation_method = ?,
          base_rate = ?, progressive_rates = ?, calculation_formula = ?,
          effective_from = ?, effective_to = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      ruleName,
      facultyTypeId,
      leaveTypeId,
      serviceMonthsFrom,
      serviceMonthsTo,
      calculationMethod,
      baseRate,
      JSON.stringify(progressiveRates || {}),
      calculationFormula,
      effectiveFrom,
      effectiveTo,
      isActive,
      ruleId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calculation rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Calculation rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating calculation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calculation rule',
      error: error.message
    });
  }
});

// Delete calculation rule
router.delete('/calculation-rules/:ruleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const [result] = await pool.execute(`
      UPDATE leave_calculation_rules 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [ruleId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calculation rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Calculation rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calculation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calculation rule',
      error: error.message
    });
  }
});

// Calculate leave accrual for a faculty member
router.post('/calculate-accrual', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { facultyId, leaveTypeId, calculationDate, serviceMonths } = req.body;

    // Get faculty type
    const [faculty] = await pool.execute(
      'SELECT facultyType FROM faculty WHERE id = ?',
      [facultyId]
    );

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const facultyType = faculty[0].facultyType;

    // Get applicable calculation rule
    const [rules] = await pool.execute(`
      SELECT * FROM leave_calculation_rules 
      WHERE faculty_type_id = ? AND leave_type_id = ? 
        AND service_months_from <= ? AND service_months_to >= ?
        AND is_active = TRUE
        AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY service_months_from DESC
      LIMIT 1
    `, [facultyType, leaveTypeId, serviceMonths, serviceMonths, calculationDate, calculationDate]);

    let calculatedAccrual = 0;

    if (rules.length > 0) {
      const rule = rules[0];
      
      switch (rule.calculation_method) {
        case 'fixed_monthly':
          calculatedAccrual = parseFloat(rule.base_rate);
          break;
          
        case 'fixed_yearly':
          calculatedAccrual = parseFloat(rule.base_rate) / 12;
          break;
          
        case 'progressive':
          const progressiveRates = typeof rule.progressive_rates === 'object' ? 
            rule.progressive_rates : JSON.parse(rule.progressive_rates || '{}');
          
          // Find applicable rate based on service months
          const serviceYears = Math.floor(serviceMonths / 12);
          let applicableRate = rule.base_rate;
          
          for (const [range, rate] of Object.entries(progressiveRates)) {
            if (range.includes('-')) {
              const [min, max] = range.split('-').map(Number);
              if (serviceMonths >= min && serviceMonths <= max) {
                applicableRate = rate;
                break;
              }
            } else if (range.includes('+')) {
              const min = parseInt(range.replace('+', ''));
              if (serviceMonths >= min) {
                applicableRate = rate;
              }
            }
          }
          
          calculatedAccrual = parseFloat(applicableRate);
          break;
          
        case 'formula_based':
          // Simple formula evaluation (in production, use a proper expression evaluator)
          let formula = rule.calculation_formula;
          formula = formula.replace('{service_months}', serviceMonths);
          formula = formula.replace('{service_years}', Math.floor(serviceMonths / 12));
          formula = formula.replace('{base_rate}', rule.base_rate);
          
          try {
            // Note: In production, use a safe expression evaluator
            calculatedAccrual = eval(formula);
          } catch (error) {
            console.error('Formula evaluation error:', error);
            calculatedAccrual = rule.base_rate;
          }
          break;
          
        default:
          calculatedAccrual = rule.base_rate;
      }
    } else {
      // Fallback to entitlement table
      const [entitlements] = await pool.execute(`
        SELECT monthly_accrual_rate FROM faculty_leave_entitlements 
        WHERE faculty_type_id = ? AND leave_type_id = ? AND is_applicable = TRUE
      `, [facultyType, leaveTypeId]);
      
      if (entitlements.length > 0) {
        calculatedAccrual = parseFloat(entitlements[0].monthly_accrual_rate);
      }
    }

    res.json({
      success: true,
      data: {
        facultyId,
        facultyType,
        leaveTypeId,
        serviceMonths,
        calculationDate,
        calculatedAccrual: Math.round(calculatedAccrual * 100) / 100,
        ruleUsed: rules.length > 0 ? rules[0].rule_name : 'Default entitlement'
      }
    });
  } catch (error) {
    console.error('Error calculating leave accrual:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate leave accrual',
      error: error.message
    });
  }
});

module.exports = router;