const leaveBalanceService = require('../services/leaveBalanceService');

class EnhancedLeaveCalculationController {
  /**
   * Calculate leave balance for a faculty member
   */
  async calculateLeaveBalance(req, res) {
    try {
      const { facultyType, joiningDate, currentYear, previousYearBalance } = req.body;

      // Validate required fields
      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      // Parse dates
      const joinDate = new Date(joiningDate);
      const currentDate = new Date();
      const year = currentYear || currentDate.getFullYear();

      // Validate joining date
      if (isNaN(joinDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid joining date format'
        });
      }

      // Calculate leave balance
      const balance = await leaveBalanceService.calculateLeaveBalance(
        facultyType,
        joinDate,
        currentDate,
        year,
        previousYearBalance || {}
      );

      res.json({
        success: true,
        data: {
          facultyType,
          joiningDate,
          currentYear: year,
          balance,
          calculatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error calculating leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate leave balance',
        error: error.message
      });
    }
  }

  /**
   * Get leave calculation rules for a faculty type
   */
  async getLeaveCalculationRules(req, res) {
    try {
      const { facultyType } = req.params;

      const rules = await leaveBalanceService.loadLeaveCalculationRules();
      
      if (!rules.facultyLeaveRules[facultyType]) {
        return res.status(404).json({
          success: false,
          message: `No rules found for faculty type: ${facultyType}`
        });
      }

      res.json({
        success: true,
        data: {
          facultyType,
          rules: rules.facultyLeaveRules[facultyType],
          calculationSettings: rules.calculationSettings
        }
      });

    } catch (error) {
      console.error('Error fetching leave calculation rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave calculation rules',
        error: error.message
      });
    }
  }

  /**
   * Process year-end carry forward
   */
  async processYearEndCarryForward(req, res) {
    try {
      const { facultyType, currentYearBalance } = req.body;

      if (!facultyType || !currentYearBalance) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and current year balance are required'
        });
      }

      const nextYearBalance = await leaveBalanceService.processYearEndCarryForward(
        currentYearBalance,
        facultyType
      );

      res.json({
        success: true,
        data: {
          facultyType,
          nextYearBalance,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error processing year-end carry forward:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process year-end carry forward',
        error: error.message
      });
    }
  }

  /**
   * Calculate earned leave accrual for a specific period
   */
  async calculateEarnedLeaveAccrual(req, res) {
    try {
      const { facultyType, joiningDate, fromDate, toDate } = req.body;

      if (!facultyType || !joiningDate || !fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type, joining date, from date, and to date are required'
        });
      }

      const rules = await leaveBalanceService.loadLeaveCalculationRules();
      const facultyRules = rules.facultyLeaveRules[facultyType];

      if (!facultyRules || !facultyRules.earnedLeave) {
        return res.status(404).json({
          success: false,
          message: `No earned leave rules found for faculty type: ${facultyType}`
        });
      }

      const joinDate = new Date(joiningDate);
      const from = new Date(fromDate);
      const to = new Date(toDate);

      // Calculate months between from and to date
      const monthsDiff = (to.getFullYear() - from.getFullYear()) * 12 + 
                        (to.getMonth() - from.getMonth()) + 1;

      const monthlyAccrual = facultyRules.earnedLeave.monthlyAccrual;
      const accruedLeave = monthsDiff * monthlyAccrual;
      const maxAnnualDays = facultyRules.earnedLeave.maxAnnualDays;

      res.json({
        success: true,
        data: {
          facultyType,
          period: { fromDate, toDate },
          monthsInPeriod: monthsDiff,
          monthlyAccrual,
          accruedLeave: Math.min(accruedLeave, maxAnnualDays),
          maxAnnualDays,
          calculatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error calculating earned leave accrual:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate earned leave accrual',
        error: error.message
      });
    }
  }

  /**
   * Validate leave application against balance
   */
  async validateLeaveApplication(req, res) {
    try {
      const { facultyType, joiningDate, leaveType, requestedDays, currentBalance } = req.body;

      if (!facultyType || !leaveType || !requestedDays) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type, leave type, and requested days are required'
        });
      }

      // If current balance is not provided, calculate it
      let balance = currentBalance;
      if (!balance && joiningDate) {
        balance = await leaveBalanceService.calculateLeaveBalance(
          facultyType,
          new Date(joiningDate)
        );
      }

      if (!balance) {
        return res.status(400).json({
          success: false,
          message: 'Current balance or joining date is required'
        });
      }

      const validation = leaveBalanceService.validateLeaveApplication(
        balance,
        leaveType,
        requestedDays
      );

      res.json({
        success: true,
        data: {
          validation,
          leaveType,
          requestedDays,
          validatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error validating leave application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate leave application',
        error: error.message
      });
    }
  }

  /**
   * Get all faculty types and their leave entitlements
   */
  async getFacultyLeaveEntitlements(req, res) {
    try {
      const rules = await leaveBalanceService.loadLeaveCalculationRules();
      const leaveTypes = await leaveBalanceService.loadLeaveTypesConfig();

      const entitlements = {};

      for (const [facultyType, facultyRules] of Object.entries(rules.facultyLeaveRules)) {
        entitlements[facultyType] = {
          facultyType,
          leaveTypes: {}
        };

        // Process each leave type for this faculty type
        for (const [leaveTypeId, leaveTypeConfig] of Object.entries(leaveTypes.leaveTypes)) {
          if (leaveTypeConfig.applicableFor && leaveTypeConfig.applicableFor.includes(facultyType)) {
            const leaveRule = leaveBalanceService.getLeaveRuleByType(facultyRules, leaveTypeId);
            
            entitlements[facultyType].leaveTypes[leaveTypeId] = {
              name: leaveTypeConfig.name,
              description: leaveTypeConfig.description,
              maxDays: leaveTypeConfig.maxDays[facultyType] || 0,
              rule: leaveRule,
              carryForwardAllowed: leaveRule?.carryForwardAllowed || false,
              requiresApproval: leaveTypeConfig.requiresApproval,
              advanceNotice: leaveTypeConfig.advanceNotice
            };
          }
        }
      }

      res.json({
        success: true,
        data: entitlements
      });

    } catch (error) {
      console.error('Error fetching faculty leave entitlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch faculty leave entitlements',
        error: error.message
      });
    }
  }
}

module.exports = new EnhancedLeaveCalculationController();