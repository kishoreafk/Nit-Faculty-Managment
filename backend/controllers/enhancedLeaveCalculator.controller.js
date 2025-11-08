const enhancedLeaveCalculator = require('../services/enhancedLeaveCalculator');

class EnhancedLeaveCalculatorController {
  /**
   * Calculate comprehensive leave balance for a faculty member
   */
  async calculateComprehensiveBalance(req, res) {
    try {
      const { 
        facultyType, 
        joiningDate, 
        calculationDate, 
        previousYearBalance, 
        usedLeaveThisYear 
      } = req.body;

      // Validate required fields
      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      // Validate faculty type
      const validFacultyTypes = ['teaching', 'non_teaching', 'contract', 'visiting'];
      if (!validFacultyTypes.includes(facultyType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid faculty type. Must be one of: ${validFacultyTypes.join(', ')}`
        });
      }

      // Parse dates
      const joinDate = new Date(joiningDate);
      const calcDate = calculationDate ? new Date(calculationDate) : new Date();

      // Validate dates
      if (isNaN(joinDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid joining date format'
        });
      }

      if (calculationDate && isNaN(calcDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid calculation date format'
        });
      }

      // Calculate comprehensive leave balance
      const balance = await enhancedLeaveCalculator.calculateComprehensiveLeaveBalance(
        facultyType,
        joinDate,
        calcDate,
        previousYearBalance || {},
        usedLeaveThisYear || {}
      );

      res.json({
        success: true,
        data: balance,
        message: 'Leave balance calculated successfully'
      });

    } catch (error) {
      console.error('Error calculating comprehensive leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate leave balance',
        error: error.message
      });
    }
  }

  /**
   * Calculate earned leave accrual details
   */
  async calculateEarnedLeaveAccrual(req, res) {
    try {
      const { facultyType, joiningDate, calculationDate } = req.body;

      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      const joinDate = new Date(joiningDate);
      const calcDate = calculationDate ? new Date(calculationDate) : new Date();

      if (isNaN(joinDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid joining date format'
        });
      }

      // Get faculty rules to determine monthly accrual
      const rules = await enhancedLeaveCalculator.loadLeaveCalculationRules();
      const facultyRules = rules.facultyLeaveRules[facultyType];

      if (!facultyRules || !facultyRules.earnedLeave) {
        return res.status(404).json({
          success: false,
          message: `No earned leave rules found for faculty type: ${facultyType}`
        });
      }

      const accrualDetails = enhancedLeaveCalculator.calculateEarnedLeaveAccrual(
        joinDate,
        calcDate,
        facultyRules.earnedLeave.monthlyAccrual,
        facultyRules.earnedLeave.maxAnnualDays
      );

      res.json({
        success: true,
        data: {
          facultyType,
          joiningDate: joinDate.toISOString().split('T')[0],
          calculationDate: calcDate.toISOString().split('T')[0],
          accrualDetails,
          rules: facultyRules.earnedLeave
        },
        message: 'Earned leave accrual calculated successfully'
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
   * Process year-end carry forward
   */
  async processYearEndCarryForward(req, res) {
    try {
      const { currentYearBalance, facultyType } = req.body;

      if (!currentYearBalance || !facultyType) {
        return res.status(400).json({
          success: false,
          message: 'Current year balance and faculty type are required'
        });
      }

      const carryForwardResult = await enhancedLeaveCalculator.processYearEndCarryForward(
        currentYearBalance,
        facultyType
      );

      res.json({
        success: true,
        data: carryForwardResult,
        message: 'Year-end carry forward processed successfully'
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
   * Validate leave application
   */
  async validateLeaveApplication(req, res) {
    try {
      const { 
        leaveBalance, 
        leaveType, 
        requestedDays, 
        startDate, 
        endDate 
      } = req.body;

      if (!leaveBalance || !leaveType || !requestedDays) {
        return res.status(400).json({
          success: false,
          message: 'Leave balance, leave type, and requested days are required'
        });
      }

      const validation = enhancedLeaveCalculator.validateLeaveApplication(
        leaveBalance,
        leaveType,
        requestedDays,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          validation,
          leaveType,
          requestedDays,
          validatedAt: new Date().toISOString()
        },
        message: validation.valid ? 'Leave application is valid' : 'Leave application validation failed'
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
   * Get faculty leave entitlements
   */
  async getFacultyLeaveEntitlements(req, res) {
    try {
      const { facultyType } = req.params;

      if (!facultyType) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type is required'
        });
      }

      const entitlements = await enhancedLeaveCalculator.getFacultyLeaveEntitlements(facultyType);

      res.json({
        success: true,
        data: entitlements,
        message: 'Faculty leave entitlements retrieved successfully'
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
   * Generate comprehensive leave balance report
   */
  async generateLeaveBalanceReport(req, res) {
    try {
      const { 
        facultyType, 
        joiningDate, 
        calculationDate, 
        previousYearBalance, 
        usedLeaveThisYear 
      } = req.body;

      if (!facultyType || !joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Faculty type and joining date are required'
        });
      }

      const joinDate = new Date(joiningDate);
      const calcDate = calculationDate ? new Date(calculationDate) : new Date();

      if (isNaN(joinDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid joining date format'
        });
      }

      const report = await enhancedLeaveCalculator.generateLeaveBalanceReport(
        facultyType,
        joinDate,
        calcDate,
        previousYearBalance || {},
        usedLeaveThisYear || {}
      );

      res.json({
        success: true,
        data: report,
        message: 'Leave balance report generated successfully'
      });

    } catch (error) {
      console.error('Error generating leave balance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate leave balance report',
        error: error.message
      });
    }
  }

  /**
   * Update leave balance after leave is taken
   */
  async updateBalanceAfterLeave(req, res) {
    try {
      const { leaveBalance, leaveType, daysUsed } = req.body;

      if (!leaveBalance || !leaveType || daysUsed === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Leave balance, leave type, and days used are required'
        });
      }

      if (daysUsed < 0) {
        return res.status(400).json({
          success: false,
          message: 'Days used cannot be negative'
        });
      }

      const updatedBalance = enhancedLeaveCalculator.updateBalanceAfterLeave(
        leaveBalance,
        leaveType,
        daysUsed
      );

      res.json({
        success: true,
        data: {
          updatedBalance,
          leaveType,
          daysUsed,
          updatedAt: new Date().toISOString()
        },
        message: 'Leave balance updated successfully'
      });

    } catch (error) {
      console.error('Error updating leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update leave balance',
        error: error.message
      });
    }
  }

  /**
   * Get all available faculty types and their basic info
   */
  async getFacultyTypes(req, res) {
    try {
      const rules = await enhancedLeaveCalculator.loadLeaveCalculationRules();
      
      const facultyTypes = Object.keys(rules.facultyLeaveRules).map(type => ({
        type,
        name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        probationPeriod: rules.calculationSettings.probationPeriod[type] || 0,
        earnedLeaveEligibility: rules.calculationSettings.earnedLeaveEligibility.minimumServiceMonths
      }));

      res.json({
        success: true,
        data: {
          facultyTypes,
          calculationSettings: rules.calculationSettings
        },
        message: 'Faculty types retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting faculty types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get faculty types',
        error: error.message
      });
    }
  }

  /**
   * Calculate leave balance for multiple faculty members (bulk operation)
   */
  async calculateBulkLeaveBalance(req, res) {
    try {
      const { facultyList } = req.body;

      if (!facultyList || !Array.isArray(facultyList) || facultyList.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Faculty list is required and must be a non-empty array'
        });
      }

      const results = [];
      const errors = [];

      for (const faculty of facultyList) {
        try {
          const { facultyId, facultyType, joiningDate, calculationDate, previousYearBalance, usedLeaveThisYear } = faculty;
          
          if (!facultyType || !joiningDate) {
            errors.push({
              facultyId: facultyId || 'unknown',
              error: 'Faculty type and joining date are required'
            });
            continue;
          }

          const joinDate = new Date(joiningDate);
          const calcDate = calculationDate ? new Date(calculationDate) : new Date();

          const balance = await enhancedLeaveCalculator.calculateComprehensiveLeaveBalance(
            facultyType,
            joinDate,
            calcDate,
            previousYearBalance || {},
            usedLeaveThisYear || {}
          );

          results.push({
            facultyId: facultyId || `${facultyType}_${joinDate.getTime()}`,
            balance
          });

        } catch (error) {
          errors.push({
            facultyId: faculty.facultyId || 'unknown',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            total: facultyList.length,
            successful: results.length,
            failed: errors.length
          }
        },
        message: `Bulk leave balance calculation completed. ${results.length} successful, ${errors.length} failed.`
      });

    } catch (error) {
      console.error('Error calculating bulk leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate bulk leave balance',
        error: error.message
      });
    }
  }
}

module.exports = new EnhancedLeaveCalculatorController();