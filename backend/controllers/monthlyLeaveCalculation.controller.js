const monthlyLeaveCalculationService = require('../services/monthlyLeaveCalculationService');

class MonthlyLeaveCalculationController {
  /**
   * Get monthly leave breakdown for a faculty member
   */
  async getMonthlyLeaveBreakdown(req, res) {
    try {
      const { facultyType, joiningDate, year } = req.query;

      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      const calculationYear = year ? parseInt(year) : new Date().getFullYear();
      
      const breakdown = await monthlyLeaveCalculationService.calculateMonthlyLeaveBreakdown(
        facultyType,
        joiningDate,
        calculationYear
      );

      res.json({
        success: true,
        data: breakdown
      });

    } catch (error) {
      console.error('Error getting monthly leave breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate monthly leave breakdown',
        error: error.message
      });
    }
  }

  /**
   * Get faculty leave entitlements with detailed rules
   */
  async getFacultyLeaveEntitlements(req, res) {
    try {
      const entitlements = await monthlyLeaveCalculationService.getFacultyLeaveEntitlements();

      res.json({
        success: true,
        data: entitlements
      });

    } catch (error) {
      console.error('Error getting faculty leave entitlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get faculty leave entitlements',
        error: error.message
      });
    }
  }

  /**
   * Calculate leave balance at a specific date
   */
  async calculateLeaveBalanceAtDate(req, res) {
    try {
      const { facultyType, joiningDate, calculationDate, usedLeave } = req.body;

      if (!facultyType || !joiningDate || !calculationDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type, joining date, and calculation date are required'
        });
      }

      const balance = await monthlyLeaveCalculationService.calculateLeaveBalanceAtDate(
        facultyType,
        joiningDate,
        new Date(calculationDate),
        usedLeave || {}
      );

      res.json({
        success: true,
        data: balance
      });

    } catch (error) {
      console.error('Error calculating leave balance at date:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate leave balance',
        error: error.message
      });
    }
  }

  /**
   * Get leave increment schedule for a faculty member
   */
  async getLeaveIncrementSchedule(req, res) {
    try {
      const { facultyType, joiningDate, year } = req.query;

      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      const calculationYear = year ? parseInt(year) : new Date().getFullYear();
      
      const breakdown = await monthlyLeaveCalculationService.calculateMonthlyLeaveBreakdown(
        facultyType,
        joiningDate,
        calculationYear
      );

      // Extract increment schedule
      const incrementSchedule = breakdown.monthlyBreakdown.map(month => ({
        month: month.monthName,
        monthNumber: month.month,
        year: month.year,
        monthsInService: month.monthsInService,
        increments: month.leaveIncrement,
        earnedLeaveAccrual: month.earnedLeave.monthlyAccrual,
        cumulativeEarnedLeave: month.earnedLeave.cumulativeAccrual,
        isEligible: month.isEligible
      }));

      res.json({
        success: true,
        data: {
          facultyType,
          joiningDate,
          year: calculationYear,
          incrementSchedule,
          summary: breakdown.annualSummary
        }
      });

    } catch (error) {
      console.error('Error getting leave increment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get leave increment schedule',
        error: error.message
      });
    }
  }

  /**
   * Compare leave entitlements across faculty types
   */
  async compareLeaveEntitlements(req, res) {
    try {
      const entitlements = await monthlyLeaveCalculationService.getFacultyLeaveEntitlements();
      
      // Create comparison matrix
      const comparison = {};
      const allLeaveTypes = new Set();

      // Collect all leave types
      Object.values(entitlements).forEach(faculty => {
        Object.keys(faculty.leaveTypes).forEach(leaveType => {
          allLeaveTypes.add(leaveType);
        });
      });

      // Build comparison matrix
      Array.from(allLeaveTypes).forEach(leaveType => {
        comparison[leaveType] = {};
        Object.entries(entitlements).forEach(([facultyType, faculty]) => {
          const leave = faculty.leaveTypes[leaveType];
          comparison[leaveType][facultyType] = leave ? {
            maxDays: leave.maxDays,
            carryForward: leave.carryForwardAllowed,
            requiresApproval: leave.requiresApproval,
            advanceNotice: leave.advanceNotice
          } : null;
        });
      });

      res.json({
        success: true,
        data: {
          comparison,
          facultyTypes: Object.keys(entitlements),
          leaveTypes: Array.from(allLeaveTypes)
        }
      });

    } catch (error) {
      console.error('Error comparing leave entitlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare leave entitlements',
        error: error.message
      });
    }
  }

  /**
   * Get leave calculation rules summary
   */
  async getLeaveCalculationRulesSummary(req, res) {
    try {
      const entitlements = await monthlyLeaveCalculationService.getFacultyLeaveEntitlements();
      
      const summary = {
        facultyTypes: {},
        leaveTypes: {},
        generalRules: {
          earnedLeaveEligibility: '6 months minimum service',
          yearStartMonth: 'January',
          yearEndMonth: 'December',
          carryForwardDeadline: 'March 31'
        }
      };

      // Summarize by faculty type
      Object.entries(entitlements).forEach(([facultyType, faculty]) => {
        summary.facultyTypes[facultyType] = {
          description: faculty.description,
          totalLeaveTypes: Object.keys(faculty.leaveTypes).length,
          leaveTypes: Object.keys(faculty.leaveTypes)
        };
      });

      // Summarize by leave type
      const allLeaveTypes = new Set();
      Object.values(entitlements).forEach(faculty => {
        Object.entries(faculty.leaveTypes).forEach(([leaveId, leave]) => {
          allLeaveTypes.add(leaveId);
          if (!summary.leaveTypes[leaveId]) {
            summary.leaveTypes[leaveId] = {
              name: leave.name,
              description: leave.description,
              applicableFor: [],
              requiresApproval: leave.requiresApproval,
              advanceNotice: leave.advanceNotice
            };
          }
          summary.leaveTypes[leaveId].applicableFor.push(facultyType);
        });
      });

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Error getting leave calculation rules summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get leave calculation rules summary',
        error: error.message
      });
    }
  }
}

module.exports = new MonthlyLeaveCalculationController();