const fs = require('fs').promises;
const path = require('path');

class EnhancedLeaveCalculator {
  constructor() {
    this.leaveTypesConfig = null;
    this.leaveCalculationRules = null;
  }

  async loadLeaveTypesConfig() {
    if (!this.leaveTypesConfig) {
      const configPath = path.join(__dirname, '../config/leave-types.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.leaveTypesConfig = JSON.parse(configData);
    }
    return this.leaveTypesConfig;
  }

  async loadLeaveCalculationRules() {
    if (!this.leaveCalculationRules) {
      const configPath = path.join(__dirname, '../config/leave-calculation-rules.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.leaveCalculationRules = JSON.parse(configData);
    }
    return this.leaveCalculationRules;
  }

  /**
   * Calculate comprehensive leave balance for a faculty member
   * @param {string} facultyType - Type of faculty (teaching, non_teaching, contract, visiting)
   * @param {Date} joiningDate - Date when faculty joined
   * @param {Date} calculationDate - Date for which to calculate (default: today)
   * @param {Object} previousYearBalance - Previous year's unused leave balance
   * @param {Object} usedLeaveThisYear - Leave used in current year
   * @returns {Object} Complete leave balance breakdown
   */
  async calculateComprehensiveLeaveBalance(
    facultyType, 
    joiningDate, 
    calculationDate = new Date(), 
    previousYearBalance = {}, 
    usedLeaveThisYear = {}
  ) {
    try {
      const rules = await this.loadLeaveCalculationRules();
      const leaveTypes = await this.loadLeaveTypesConfig();
      
      const facultyRules = rules.facultyLeaveRules[facultyType];
      if (!facultyRules) {
        throw new Error(`No rules found for faculty type: ${facultyType}`);
      }

      const result = {
        facultyType,
        joiningDate: joiningDate.toISOString().split('T')[0],
        calculationDate: calculationDate.toISOString().split('T')[0],
        serviceMonths: this.calculateServiceMonths(joiningDate, calculationDate),
        leaveBalances: {},
        summary: {
          totalAllocated: 0,
          totalCarryForward: 0,
          totalAvailable: 0,
          totalUsed: 0,
          totalBalance: 0
        }
      };

      // Calculate each leave type
      for (const [leaveTypeKey, leaveTypeConfig] of Object.entries(leaveTypes.leaveTypes)) {
        if (!leaveTypeConfig.applicableFor.includes(facultyType)) {
          continue;
        }

        const leaveBalance = await this.calculateLeaveTypeBalance(
          leaveTypeKey,
          leaveTypeConfig,
          facultyRules,
          joiningDate,
          calculationDate,
          previousYearBalance[leaveTypeKey] || {},
          usedLeaveThisYear[leaveTypeKey] || 0,
          rules.calculationSettings
        );

        if (leaveBalance.allocated > 0 || leaveBalance.carryForward > 0) {
          result.leaveBalances[leaveTypeKey] = leaveBalance;
          
          // Update summary
          result.summary.totalAllocated += leaveBalance.allocated;
          result.summary.totalCarryForward += leaveBalance.carryForward;
          result.summary.totalAvailable += leaveBalance.totalAvailable;
          result.summary.totalUsed += leaveBalance.used;
          result.summary.totalBalance += leaveBalance.balance;
        }
      }

      return result;
    } catch (error) {
      console.error('Error calculating comprehensive leave balance:', error);
      throw error;
    }
  }

  /**
   * Calculate balance for a specific leave type
   */
  async calculateLeaveTypeBalance(
    leaveTypeKey, 
    leaveTypeConfig, 
    facultyRules, 
    joiningDate, 
    calculationDate, 
    previousBalance, 
    usedThisYear,
    calculationSettings
  ) {
    const balance = {
      leaveType: leaveTypeConfig.name,
      leaveTypeId: leaveTypeKey,
      allocated: 0,
      carryForward: 0,
      totalAvailable: 0,
      used: usedThisYear,
      balance: 0,
      maxDays: leaveTypeConfig.maxDays[facultyRules] || 0,
      canCarryForward: false,
      maxCarryForward: 0,
      accrualDetails: null
    };

    // Handle Earned Leave with monthly accrual
    if (leaveTypeKey === 'earned' && facultyRules.earnedLeave) {
      const serviceMonths = this.calculateServiceMonths(joiningDate, calculationDate);
      const isEligible = serviceMonths >= calculationSettings.earnedLeaveEligibility.minimumServiceMonths;
      
      if (isEligible) {
        const accrualDetails = this.calculateEarnedLeaveAccrual(
          joiningDate,
          calculationDate,
          facultyRules.earnedLeave.monthlyAccrual,
          facultyRules.earnedLeave.maxAnnualDays
        );
        
        balance.allocated = accrualDetails.totalAccrued;
        balance.accrualDetails = accrualDetails;
        balance.canCarryForward = facultyRules.earnedLeave.carryForwardAllowed;
        balance.maxCarryForward = facultyRules.earnedLeave.maxCarryForward;
        
        // Handle carry forward from previous year
        if (facultyRules.earnedLeave.carryForwardAllowed && previousBalance.balance > 0) {
          balance.carryForward = Math.min(
            previousBalance.balance,
            facultyRules.earnedLeave.maxCarryForward
          );
        }
      }
    }
    // Handle Casual Leave
    else if (leaveTypeKey === 'casual' && facultyRules.casualLeave) {
      balance.allocated = facultyRules.casualLeave.annualAllocation;
      balance.canCarryForward = facultyRules.casualLeave.carryForwardAllowed;
      
      // Casual leave typically doesn't carry forward
      if (facultyRules.casualLeave.carryForwardAllowed && previousBalance.balance > 0) {
        balance.carryForward = previousBalance.balance;
      }
    }
    // Handle Special Casual Leave (for teaching faculty)
    else if (leaveTypeKey === 'special_casual' && facultyRules.specialCasualLeave) {
      balance.allocated = facultyRules.specialCasualLeave.annualAllocation;
      balance.canCarryForward = facultyRules.specialCasualLeave.carryForwardAllowed;
    }
    // Handle Restricted Holiday (for non-teaching faculty)
    else if (leaveTypeKey === 'rh' && facultyRules.restrictedHoliday) {
      balance.allocated = facultyRules.restrictedHoliday.annualAllocation;
      balance.canCarryForward = facultyRules.restrictedHoliday.carryForwardAllowed;
    }
    // Handle Half Pay Leave (for non-teaching faculty)
    else if (leaveTypeKey === 'hpl' && facultyRules.halfPayLeave) {
      balance.allocated = facultyRules.halfPayLeave.annualAllocation;
      balance.canCarryForward = facultyRules.halfPayLeave.carryForwardAllowed;
    }
    // Handle Hospital Attendance Leave (for non-teaching faculty)
    else if (leaveTypeKey === 'hapl' && facultyRules.hospitalAttendanceLeave) {
      balance.allocated = facultyRules.hospitalAttendanceLeave.annualAllocation;
      balance.canCarryForward = facultyRules.hospitalAttendanceLeave.carryForwardAllowed;
    }
    // Handle Medical Leave
    else if (leaveTypeKey === 'medical' && facultyRules.medicalLeave) {
      balance.allocated = facultyRules.medicalLeave.maxDays;
      balance.canCarryForward = facultyRules.medicalLeave.carryForwardAllowed;
    }
    // Handle Maternity Leave
    else if (leaveTypeKey === 'maternity' && facultyRules.maternityLeave) {
      balance.allocated = facultyRules.maternityLeave.maxDays;
      balance.canCarryForward = facultyRules.maternityLeave.carryForwardAllowed;
    }
    // Handle Study Leave
    else if (leaveTypeKey === 'study' && facultyRules.studyLeave) {
      balance.allocated = facultyRules.studyLeave.maxDays;
      balance.canCarryForward = facultyRules.studyLeave.carryForwardAllowed;
    }

    // Calculate totals
    balance.totalAvailable = balance.allocated + balance.carryForward;
    balance.balance = balance.totalAvailable - balance.used;

    return balance;
  }

  /**
   * Calculate earned leave accrual with detailed breakdown
   */
  calculateEarnedLeaveAccrual(joiningDate, calculationDate, monthlyAccrual, maxAnnualDays) {
    const joinYear = joiningDate.getFullYear();
    const joinMonth = joiningDate.getMonth() + 1;
    const calcYear = calculationDate.getFullYear();
    const calcMonth = calculationDate.getMonth() + 1;
    
    let totalMonths = 0;
    let accrualBreakdown = [];

    if (joinYear === calcYear) {
      // Same year - calculate from joining month to current month
      totalMonths = Math.max(0, calcMonth - joinMonth + 1);
      accrualBreakdown.push({
        year: calcYear,
        fromMonth: joinMonth,
        toMonth: calcMonth,
        months: totalMonths,
        accrued: totalMonths * monthlyAccrual
      });
    } else {
      // Different years - calculate year by year
      // First year (from joining month to December)
      const firstYearMonths = 12 - joinMonth + 1;
      totalMonths += firstYearMonths;
      accrualBreakdown.push({
        year: joinYear,
        fromMonth: joinMonth,
        toMonth: 12,
        months: firstYearMonths,
        accrued: firstYearMonths * monthlyAccrual
      });

      // Full years in between
      for (let year = joinYear + 1; year < calcYear; year++) {
        totalMonths += 12;
        accrualBreakdown.push({
          year: year,
          fromMonth: 1,
          toMonth: 12,
          months: 12,
          accrued: 12 * monthlyAccrual
        });
      }

      // Current year (from January to current month)
      if (calcYear > joinYear) {
        totalMonths += calcMonth;
        accrualBreakdown.push({
          year: calcYear,
          fromMonth: 1,
          toMonth: calcMonth,
          months: calcMonth,
          accrued: calcMonth * monthlyAccrual
        });
      }
    }

    const totalAccrued = Math.min(totalMonths * monthlyAccrual, maxAnnualDays);

    return {
      totalMonths,
      monthlyAccrual,
      totalAccrued: Math.floor(totalAccrued),
      maxAnnualDays,
      accrualBreakdown,
      cappedAtMax: (totalMonths * monthlyAccrual) > maxAnnualDays
    };
  }

  /**
   * Calculate service months between two dates
   */
  calculateServiceMonths(startDate, endDate) {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Process year-end carry forward for all leave types
   */
  async processYearEndCarryForward(currentYearBalance, facultyType) {
    try {
      const rules = await this.loadLeaveCalculationRules();
      const facultyRules = rules.facultyLeaveRules[facultyType];
      const nextYearBalance = {};

      for (const [leaveTypeKey, balance] of Object.entries(currentYearBalance.leaveBalances || {})) {
        if (balance.canCarryForward && balance.balance > 0) {
          let carryForwardAmount = balance.balance;

          // Apply carry forward limits for earned leave
          if (leaveTypeKey === 'earned' && facultyRules.earnedLeave) {
            carryForwardAmount = Math.min(balance.balance, facultyRules.earnedLeave.maxCarryForward);
          }

          nextYearBalance[leaveTypeKey] = {
            balance: carryForwardAmount,
            carryForward: true,
            source: 'previous_year'
          };
        }
      }

      return {
        facultyType,
        nextYearBalance,
        processedAt: new Date().toISOString(),
        carryForwardRules: rules.calculationSettings.carryForwardRules
      };
    } catch (error) {
      console.error('Error processing year-end carry forward:', error);
      throw error;
    }
  }

  /**
   * Validate leave application against available balance
   */
  validateLeaveApplication(leaveBalance, leaveTypeKey, requestedDays, startDate, endDate) {
    const balance = leaveBalance.leaveBalances[leaveTypeKey];
    
    if (!balance) {
      return {
        valid: false,
        message: `Leave type '${leaveTypeKey}' is not available for this faculty type`,
        details: null
      };
    }

    if (requestedDays > balance.balance) {
      return {
        valid: false,
        message: `Insufficient leave balance. Available: ${balance.balance} days, Requested: ${requestedDays} days`,
        details: {
          available: balance.balance,
          requested: requestedDays,
          shortfall: requestedDays - balance.balance
        }
      };
    }

    // Additional validations can be added here (e.g., advance notice, medical certificate requirements)

    return {
      valid: true,
      message: 'Leave application is valid',
      details: {
        available: balance.balance,
        requested: requestedDays,
        remainingAfterLeave: balance.balance - requestedDays
      }
    };
  }

  /**
   * Update leave balance after leave is taken
   */
  updateBalanceAfterLeave(leaveBalance, leaveTypeKey, daysUsed) {
    if (!leaveBalance.leaveBalances[leaveTypeKey]) {
      throw new Error(`Leave type '${leaveTypeKey}' not found in balance`);
    }

    const updatedBalance = { ...leaveBalance };
    const leaveType = updatedBalance.leaveBalances[leaveTypeKey];
    
    leaveType.used += daysUsed;
    leaveType.balance = leaveType.totalAvailable - leaveType.used;
    
    // Update summary
    updatedBalance.summary.totalUsed += daysUsed;
    updatedBalance.summary.totalBalance -= daysUsed;

    return updatedBalance;
  }

  /**
   * Get leave entitlements for a faculty type
   */
  async getFacultyLeaveEntitlements(facultyType) {
    try {
      const rules = await this.loadLeaveCalculationRules();
      const leaveTypes = await this.loadLeaveTypesConfig();
      
      const facultyRules = rules.facultyLeaveRules[facultyType];
      if (!facultyRules) {
        throw new Error(`No rules found for faculty type: ${facultyType}`);
      }

      const entitlements = {
        facultyType,
        leaveTypes: {},
        calculationSettings: rules.calculationSettings
      };

      for (const [leaveTypeKey, leaveTypeConfig] of Object.entries(leaveTypes.leaveTypes)) {
        if (leaveTypeConfig.applicableFor.includes(facultyType)) {
          entitlements.leaveTypes[leaveTypeKey] = {
            name: leaveTypeConfig.name,
            description: leaveTypeConfig.description,
            maxDays: leaveTypeConfig.maxDays[facultyType] || leaveTypeConfig.maxDays,
            requiresApproval: leaveTypeConfig.requiresApproval,
            advanceNotice: leaveTypeConfig.advanceNotice,
            carryForward: leaveTypeConfig.carryForward,
            rules: this.getLeaveRuleByType(facultyRules, leaveTypeKey)
          };
        }
      }

      return entitlements;
    } catch (error) {
      console.error('Error getting faculty leave entitlements:', error);
      throw error;
    }
  }

  /**
   * Get specific leave rule by type
   */
  getLeaveRuleByType(facultyRules, leaveTypeKey) {
    const ruleMap = {
      'earned': 'earnedLeave',
      'casual': 'casualLeave',
      'special_casual': 'specialCasualLeave',
      'rh': 'restrictedHoliday',
      'hpl': 'halfPayLeave',
      'hapl': 'hospitalAttendanceLeave',
      'medical': 'medicalLeave',
      'maternity': 'maternityLeave',
      'study': 'studyLeave'
    };
    
    const ruleName = ruleMap[leaveTypeKey];
    return ruleName ? facultyRules[ruleName] : null;
  }

  /**
   * Generate leave balance report
   */
  async generateLeaveBalanceReport(facultyType, joiningDate, calculationDate, previousYearBalance, usedLeaveThisYear) {
    const balance = await this.calculateComprehensiveLeaveBalance(
      facultyType,
      joiningDate,
      calculationDate,
      previousYearBalance,
      usedLeaveThisYear
    );

    const report = {
      ...balance,
      reportGenerated: new Date().toISOString(),
      recommendations: [],
      alerts: []
    };

    // Add recommendations and alerts
    for (const [leaveTypeKey, leaveBalance] of Object.entries(balance.leaveBalances)) {
      // Alert for low balance
      if (leaveBalance.balance < 5 && leaveBalance.allocated > 10) {
        report.alerts.push({
          type: 'low_balance',
          leaveType: leaveBalance.leaveType,
          message: `Low balance for ${leaveBalance.leaveType}: ${leaveBalance.balance} days remaining`
        });
      }

      // Recommendation for carry forward
      if (leaveBalance.canCarryForward && leaveBalance.balance > leaveBalance.maxCarryForward) {
        const excessDays = leaveBalance.balance - leaveBalance.maxCarryForward;
        report.recommendations.push({
          type: 'use_excess_leave',
          leaveType: leaveBalance.leaveType,
          message: `Consider using ${excessDays} days of ${leaveBalance.leaveType} before year-end to avoid loss`
        });
      }

      // Alert for unused earned leave near year-end
      if (leaveTypeKey === 'earned' && leaveBalance.balance > 20) {
        const currentMonth = calculationDate.getMonth() + 1;
        if (currentMonth >= 10) { // October onwards
          report.recommendations.push({
            type: 'plan_earned_leave',
            leaveType: leaveBalance.leaveType,
            message: `Plan to use ${leaveBalance.balance} days of earned leave before year-end`
          });
        }
      }
    }

    return report;
  }
}

module.exports = new EnhancedLeaveCalculator();