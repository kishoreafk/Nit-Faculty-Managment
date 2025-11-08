const express = require('express');
const router = express.Router();
const enhancedLeaveCalculationController = require('../controllers/enhancedLeaveCalculation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/leave/calculate-balance
 * @desc Calculate leave balance for a faculty member
 * @access Private
 */
router.post('/calculate-balance', enhancedLeaveCalculationController.calculateLeaveBalance);

/**
 * @route GET /api/leave/calculation-rules/:facultyType
 * @desc Get leave calculation rules for a specific faculty type
 * @access Private
 */
router.get('/calculation-rules/:facultyType', enhancedLeaveCalculationController.getLeaveCalculationRules);

/**
 * @route POST /api/leave/year-end-carry-forward
 * @desc Process year-end carry forward for leave balance
 * @access Private
 */
router.post('/year-end-carry-forward', enhancedLeaveCalculationController.processYearEndCarryForward);

/**
 * @route POST /api/leave/calculate-earned-accrual
 * @desc Calculate earned leave accrual for a specific period
 * @access Private
 */
router.post('/calculate-earned-accrual', enhancedLeaveCalculationController.calculateEarnedLeaveAccrual);

/**
 * @route POST /api/leave/validate-application
 * @desc Validate leave application against current balance
 * @access Private
 */
router.post('/validate-application', enhancedLeaveCalculationController.validateLeaveApplication);

/**
 * @route GET /api/leave/faculty-entitlements
 * @desc Get all faculty types and their leave entitlements
 * @access Private
 */
router.get('/faculty-entitlements', enhancedLeaveCalculationController.getFacultyLeaveEntitlements);

module.exports = router;