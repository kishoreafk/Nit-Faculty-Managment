const express = require('express');
const router = express.Router();
const monthlyLeaveCalculationController = require('../controllers/monthlyLeaveCalculation.controller');

// Get monthly leave breakdown for a faculty member
router.get('/monthly-breakdown', monthlyLeaveCalculationController.getMonthlyLeaveBreakdown);

// Get faculty leave entitlements with detailed rules
router.get('/faculty-entitlements', monthlyLeaveCalculationController.getFacultyLeaveEntitlements);

// Calculate leave balance at a specific date
router.post('/balance-at-date', monthlyLeaveCalculationController.calculateLeaveBalanceAtDate);

// Get leave increment schedule for a faculty member
router.get('/increment-schedule', monthlyLeaveCalculationController.getLeaveIncrementSchedule);

// Compare leave entitlements across faculty types
router.get('/compare-entitlements', monthlyLeaveCalculationController.compareLeaveEntitlements);

// Get leave calculation rules summary
router.get('/rules-summary', monthlyLeaveCalculationController.getLeaveCalculationRulesSummary);

module.exports = router;