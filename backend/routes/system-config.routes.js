const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Get all faculty types
router.get('/faculty-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [facultyTypes] = await pool.execute(`
      SELECT 
        id,
        type_id,
        name,
        description,
        permissions,
        benefits,
        probation_period,
        contract_specific,
        contract_duration,
        temporary,
        max_tenure,
        is_active,
        created_at,
        updated_at
      FROM faculty_types_config 
      WHERE is_active = TRUE
      ORDER BY name
    `);

    // Parse JSON fields
    const parsedFacultyTypes = facultyTypes.map(type => ({
      ...type,
      permissions: Array.isArray(type.permissions) ? type.permissions : JSON.parse(type.permissions || '[]'),
      benefits: Array.isArray(type.benefits) ? type.benefits : JSON.parse(type.benefits || '[]')
    }));

    res.json({
      success: true,
      data: parsedFacultyTypes
    });
  } catch (error) {
    console.error('Error fetching faculty types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty types',
      error: error.message
    });
  }
});

// Get all leave types with faculty entitlements
router.get('/leave-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [leaveTypes] = await pool.execute(`
      SELECT 
        lt.*,
        GROUP_CONCAT(
          CONCAT(fle.faculty_type_id, ':', fle.max_days, ':', fle.is_applicable)
          SEPARATOR '|'
        ) as faculty_entitlements
      FROM leave_types_config lt
      LEFT JOIN faculty_leave_entitlements fle ON lt.leave_type_id = fle.leave_type_id
      WHERE lt.is_active = TRUE
      GROUP BY lt.id
      ORDER BY lt.name
    `);

    // Parse JSON fields and entitlements
    const parsedLeaveTypes = leaveTypes.map(type => {
      const entitlements = {};
      if (type.faculty_entitlements) {
        type.faculty_entitlements.split('|').forEach(entitlement => {
          const [facultyType, maxDays, isApplicable] = entitlement.split(':');
          entitlements[facultyType] = {
            maxDays: parseInt(maxDays),
            isApplicable: isApplicable === '1'
          };
        });
      }

      return {
        ...type,
        approval_hierarchy: Array.isArray(type.approval_hierarchy) ? type.approval_hierarchy : JSON.parse(type.approval_hierarchy || '[]'),
        faculty_entitlements: entitlements
      };
    });

    res.json({
      success: true,
      data: parsedLeaveTypes
    });
  } catch (error) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave types',
      error: error.message
    });
  }
});

// Create new faculty type
router.post('/faculty-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      type_id,
      name,
      description,
      permissions = [],
      benefits = [],
      probation_period = 6,
      contract_specific = false,
      contract_duration,
      temporary = false,
      max_tenure
    } = req.body;

    if (!type_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Type ID and name are required'
      });
    }

    const [result] = await pool.execute(`
      INSERT INTO faculty_types_config 
      (type_id, name, description, permissions, benefits, probation_period, 
       contract_specific, contract_duration, temporary, max_tenure)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type_id,
      name,
      description,
      JSON.stringify(permissions),
      JSON.stringify(benefits),
      probation_period,
      contract_specific,
      contract_duration,
      temporary,
      max_tenure
    ]);

    res.json({
      success: true,
      message: 'Faculty type created successfully',
      data: { id: result.insertId, type_id }
    });
  } catch (error) {
    console.error('Error creating faculty type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create faculty type',
      error: error.message
    });
  }
});

// Update faculty type
router.put('/faculty-types/:typeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typeId } = req.params;
    const {
      name,
      description,
      permissions = [],
      benefits = [],
      probation_period,
      contract_specific,
      contract_duration,
      temporary,
      max_tenure
    } = req.body;

    const [result] = await pool.execute(`
      UPDATE faculty_types_config 
      SET name = ?, description = ?, permissions = ?, benefits = ?, 
          probation_period = ?, contract_specific = ?, contract_duration = ?,
          temporary = ?, max_tenure = ?, updated_at = CURRENT_TIMESTAMP
      WHERE type_id = ?
    `, [
      name,
      description,
      JSON.stringify(permissions),
      JSON.stringify(benefits),
      probation_period,
      contract_specific,
      contract_duration,
      temporary,
      max_tenure,
      typeId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty type not found'
      });
    }

    res.json({
      success: true,
      message: 'Faculty type updated successfully'
    });
  } catch (error) {
    console.error('Error updating faculty type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update faculty type',
      error: error.message
    });
  }
});

// Create new leave type
router.post('/leave-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      leave_type_id,
      name,
      description,
      requires_approval = true,
      requires_medical_certificate = false,
      advance_notice_days = 1,
      carry_forward = false,
      max_carry_forward_days = 0,
      encashment_allowed = false,
      accrual_rate = 0,
      accrual_period = 'monthly',
      approval_hierarchy = [],
      special_conditions,
      gender_specific,
      bond_required = false,
      bond_period,
      partial_salary = false,
      salary_deduction_percent = 0,
      extendable = false,
      max_extension_days = 0,
      conversion_rule,
      faculty_entitlements = {}
    } = req.body;

    if (!leave_type_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Leave type ID and name are required'
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert leave type
      const [leaveResult] = await connection.execute(`
        INSERT INTO leave_types_config 
        (leave_type_id, name, description, requires_approval, requires_medical_certificate,
         advance_notice_days, carry_forward, max_carry_forward_days, encashment_allowed,
         accrual_rate, accrual_period, approval_hierarchy, special_conditions,
         gender_specific, bond_required, bond_period, partial_salary,
         salary_deduction_percent, extendable, max_extension_days, conversion_rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        leave_type_id, name, description, requires_approval, requires_medical_certificate,
        advance_notice_days, carry_forward, max_carry_forward_days, encashment_allowed,
        accrual_rate, accrual_period, JSON.stringify(approval_hierarchy), special_conditions,
        gender_specific, bond_required, bond_period, partial_salary,
        salary_deduction_percent, extendable, max_extension_days, conversion_rule
      ]);

      // Insert faculty entitlements
      for (const [facultyType, entitlement] of Object.entries(faculty_entitlements)) {
        await connection.execute(`
          INSERT INTO faculty_leave_entitlements (faculty_type_id, leave_type_id, max_days, is_applicable)
          VALUES (?, ?, ?, ?)
        `, [facultyType, leave_type_id, entitlement.maxDays, entitlement.isApplicable]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Leave type created successfully',
        data: { id: leaveResult.insertId, leave_type_id }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating leave type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave type',
      error: error.message
    });
  }
});

// Update leave type
router.put('/leave-types/:leaveTypeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leaveTypeId } = req.params;
    const {
      name,
      description,
      requires_approval,
      requires_medical_certificate,
      advance_notice_days,
      carry_forward,
      max_carry_forward_days,
      encashment_allowed,
      accrual_rate,
      accrual_period,
      approval_hierarchy,
      special_conditions,
      gender_specific,
      bond_required,
      bond_period,
      partial_salary,
      salary_deduction_percent,
      extendable,
      max_extension_days,
      conversion_rule,
      faculty_entitlements = {}
    } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update leave type
      const [result] = await connection.execute(`
        UPDATE leave_types_config 
        SET name = ?, description = ?, requires_approval = ?, requires_medical_certificate = ?,
            advance_notice_days = ?, carry_forward = ?, max_carry_forward_days = ?,
            encashment_allowed = ?, accrual_rate = ?, accrual_period = ?,
            approval_hierarchy = ?, special_conditions = ?, gender_specific = ?,
            bond_required = ?, bond_period = ?, partial_salary = ?,
            salary_deduction_percent = ?, extendable = ?, max_extension_days = ?,
            conversion_rule = ?, updated_at = CURRENT_TIMESTAMP
        WHERE leave_type_id = ?
      `, [
        name, description, requires_approval, requires_medical_certificate,
        advance_notice_days, carry_forward, max_carry_forward_days,
        encashment_allowed, accrual_rate, accrual_period,
        JSON.stringify(approval_hierarchy), special_conditions, gender_specific,
        bond_required, bond_period, partial_salary,
        salary_deduction_percent, extendable, max_extension_days,
        conversion_rule, leaveTypeId
      ]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Leave type not found'
        });
      }

      // Update faculty entitlements
      await connection.execute(`
        DELETE FROM faculty_leave_entitlements WHERE leave_type_id = ?
      `, [leaveTypeId]);

      for (const [facultyType, entitlement] of Object.entries(faculty_entitlements)) {
        await connection.execute(`
          INSERT INTO faculty_leave_entitlements (faculty_type_id, leave_type_id, max_days, is_applicable)
          VALUES (?, ?, ?, ?)
        `, [facultyType, leaveTypeId, entitlement.maxDays, entitlement.isApplicable]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Leave type updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating leave type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave type',
      error: error.message
    });
  }
});

// Delete faculty type
router.delete('/faculty-types/:typeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typeId } = req.params;

    const [result] = await pool.execute(`
      UPDATE faculty_types_config 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE type_id = ?
    `, [typeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty type not found'
      });
    }

    res.json({
      success: true,
      message: 'Faculty type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting faculty type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete faculty type',
      error: error.message
    });
  }
});

// Delete leave type
router.delete('/leave-types/:leaveTypeId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leaveTypeId } = req.params;

    const [result] = await pool.execute(`
      UPDATE leave_types_config 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE leave_type_id = ?
    `, [leaveTypeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave type',
      error: error.message
    });
  }
});


// Get basic leave configuration for faculty (no admin required)
router.get('/leave-config', authenticateToken, async (req, res) => {
  try {
    // Get leave types with entitlements
    const [leaveTypes] = await pool.execute(`
      SELECT 
        lt.*,
        GROUP_CONCAT(
          CONCAT(fle.faculty_type_id, ':', fle.max_days, ':', fle.is_applicable)
          SEPARATOR '|'
        ) as faculty_entitlements
      FROM leave_types_config lt
      LEFT JOIN faculty_leave_entitlements fle ON lt.leave_type_id = fle.leave_type_id
      WHERE lt.is_active = TRUE
      GROUP BY lt.id
      ORDER BY lt.name
    `);

    // Parse data
    const parsedLeaveTypes = leaveTypes.map(type => {
      const entitlements = {};
      if (type.faculty_entitlements) {
        type.faculty_entitlements.split('|').forEach(entitlement => {
          const [facultyType, maxDays, isApplicable] = entitlement.split(':');
          entitlements[facultyType] = {
            maxDays: parseInt(maxDays),
            isApplicable: isApplicable === '1'
          };
        });
      }

      return {
        ...type,
        approval_hierarchy: Array.isArray(type.approval_hierarchy) ? type.approval_hierarchy : JSON.parse(type.approval_hierarchy || '[]'),
        faculty_entitlements: entitlements
      };
    });

    res.json({
      success: true,
      data: {
        leaveTypes: parsedLeaveTypes
      }
    });
  } catch (error) {
    console.error('Error fetching leave configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave configuration',
      error: error.message
    });
  }
});

// Get complete system configuration
router.get('/complete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get faculty types
    const [facultyTypes] = await pool.execute(`
      SELECT * FROM faculty_types_config WHERE is_active = TRUE ORDER BY name
    `);

    // Get leave types with entitlements
    const [leaveTypes] = await pool.execute(`
      SELECT 
        lt.*,
        GROUP_CONCAT(
          CONCAT(fle.faculty_type_id, ':', fle.max_days, ':', fle.is_applicable)
          SEPARATOR '|'
        ) as faculty_entitlements
      FROM leave_types_config lt
      LEFT JOIN faculty_leave_entitlements fle ON lt.leave_type_id = fle.leave_type_id
      WHERE lt.is_active = TRUE
      GROUP BY lt.id
      ORDER BY lt.name
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
          const [facultyType, maxDays, isApplicable] = entitlement.split(':');
          entitlements[facultyType] = {
            maxDays: parseInt(maxDays),
            isApplicable: isApplicable === '1'
          };
        });
      }

      return {
        ...type,
        approval_hierarchy: Array.isArray(type.approval_hierarchy) ? type.approval_hierarchy : JSON.parse(type.approval_hierarchy || '[]'),
        faculty_entitlements: entitlements
      };
    });

    res.json({
      success: true,
      data: {
        facultyTypes: parsedFacultyTypes,
        leaveTypes: parsedLeaveTypes
      }
    });
  } catch (error) {
    console.error('Error fetching complete configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system configuration',
      error: error.message
    });
  }
});

module.exports = router;