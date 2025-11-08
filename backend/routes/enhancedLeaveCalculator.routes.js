const express = require('express');
const router = express.Router();
const enhancedLeaveCalculatorController = require('../controllers/enhancedLeaveCalculator.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/enhanced-leave-calculator/calculate-comprehensive-balance
 * @desc Calculate comprehensive leave balance for a faculty member
 * @access Private
 * @body {
 *   facultyType: string,
 *   joiningDate: string (ISO date),
 *   calculationDate?: string (ISO date),
 *   previousYearBalance?: object,
 *   usedLeaveThisYear?: object
 * }
 */
router.post('/calculate-comprehensive-balance', enhancedLeaveCalculatorController.calculateComprehensiveBalance);

/**
 * @route POST /api/enhanced-leave-calculator/calculate-earned-leave-accrual
 * @desc Calculate detailed earned leave accrual
 * @access Private
 * @body {
 *   facultyType: string,
 *   joiningDate: string (ISO date),
 *   calculationDate?: string (ISO date)
 * }
 */
router.post('/calculate-earned-leave-accrual', enhancedLeaveCalculatorController.calculateEarnedLeaveAccrual);

/**
 * @route POST /api/enhanced-leave-calculator/process-year-end-carry-forward
 * @desc Process year-end carry forward for leave balance
 * @access Private
 * @body {
 *   currentYearBalance: object,
 *   facultyType: string
 * }
 */
router.post('/process-year-end-carry-forward', enhancedLeaveCalculatorController.processYearEndCarryForward);

/**
 * @route POST /api/enhanced-leave-calculator/validate-leave-application
 * @desc Validate leave application against current balance
 * @access Private
 * @body {
 *   leaveBalance: object,
 *   leaveType: string,
 *   requestedDays: number,
 *   startDate?: string,
 *   endDate?: string
 * }
 */
router.post('/validate-leave-application', enhancedLeaveCalculatorController.validateLeaveApplication);

/**
 * @route GET /api/enhanced-leave-calculator/faculty-entitlements/:facultyType
 * @desc Get leave entitlements for a specific faculty type
 * @access Private
 */
router.get('/faculty-entitlements/:facultyType', enhancedLeaveCalculatorController.getFacultyLeaveEntitlements);

/**
 * @route POST /api/enhanced-leave-calculator/generate-report
 * @desc Generate comprehensive leave balance report
 * @access Private
 * @body {
 *   facultyType: string,
 *   joiningDate: string (ISO date),
 *   calculationDate?: string (ISO date),
 *   previousYearBalance?: object,
 *   usedLeaveThisYear?: object
 * }
 */
router.post('/generate-report', enhancedLeaveCalculatorController.generateLeaveBalanceReport);

/**
 * @route POST /api/enhanced-leave-calculator/update-balance-after-leave
 * @desc Update leave balance after leave is taken
 * @access Private
 * @body {
 *   leaveBalance: object,
 *   leaveType: string,
 *   daysUsed: number
 * }
 */
router.post('/update-balance-after-leave', enhancedLeaveCalculatorController.updateBalanceAfterLeave);

/**
 * @route GET /api/enhanced-leave-calculator/faculty-types
 * @desc Get all available faculty types and their basic information
 * @access Private
 */
router.get('/faculty-types', enhancedLeaveCalculatorController.getFacultyTypes);

/**
 * @route POST /api/enhanced-leave-calculator/calculate-bulk-balance
 * @desc Calculate leave balance for multiple faculty members
 * @access Private
 * @body {
 *   facultyList: Array<{
 *     facultyId?: string,
 *     facultyType: string,
 *     joiningDate: string,
 *     calculationDate?: string,
 *     previousYearBalance?: object,
 *     usedLeaveThisYear?: object
 *   }>
 * }
 */
router.post('/calculate-bulk-balance', enhancedLeaveCalculatorController.calculateBulkLeaveBalance);

module.exports = router;