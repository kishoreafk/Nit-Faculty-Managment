const fs = require('fs').promises;
const path = require('path');

class LeaveBalanceService {
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
   * Calculate leave balance for a faculty member with enhanced logic
   * @param {string} facultyType - Type of faculty (teaching, non_teaching, etc.)
   * @param {Date} joiningDate - Date when faculty joined
   * @param {Date} currentDate - Current date (default: today)
   * @param {number} currentYear - Current year for calculation
   * @param {Object} previousYearBalance - Previous year's unused leave balance
   * @returns {Object} Leave balances for all applicable leave types
   */
  async calculateLeaveBalance(facultyType, joiningDate, currentDate = new Date(), currentYear = new Date().getFullYear(), previousYearBalance = {}) {
    try {
      const config = await this.loadLeaveTypesConfig();
      const rules = await this.loadLeaveCalculationRules();
      const leaveTypes = config.leaveTypes;
      const facultyRules = rules.facultyLeaveRules[facultyType];
      const balances = {};

      // Validate facultyType exists
      const validFacultyTypes = ['teaching', 'non_teaching', 'contract', 'visiting'];
      if (!validFacultyTypes.includes(facultyType)) {
        console.warn(`Invalid faculty type: ${facultyType}, defaulting to teaching`);
        facultyType = 'teaching';
      }

      if (!facultyRules) {
        throw new Error(`No calculation rules found for faculty type: ${facultyType}`);
      }

      // Calculate service months from joining date
      const serviceMonths = this.calculateServiceMonths(joiningDate, currentDate);
      const isEligibleForEarnedLeave = serviceMonths >= rules.calculationSettings.earnedLeaveEligibility.minimumServiceMonths;

      for (const [leaveTypeId, leaveType] of Object.entries(leaveTypes)) {
        if (!leaveType.applicableFor || !leaveType.applicableFor.includes(facultyType)) {
          continue;
        }

        let allocatedDays = 0;
        let carryForwardDays = 0;
        let maxCarryForward = 0;
        let canCarryForward = false;

        // Handle earned leave with monthly accrual
        if (leaveTypeId === 'earned' && facultyRules.earnedLeave) {
          if (isEligibleForEarnedLeave) {
            allocatedDays = this.calculateEarnedLeaveAllocation(
              joiningDate, 
              currentDate, 
              currentYear, 
              facultyRules.earnedLeave.monthlyAccrual,
              facultyRules.earnedLeave.maxAnnualDays
            );
            
            // Handle carry forward for earned leave
            if (facultyRules.earnedLeave.carryForwardAllowed && previousYearBalance.earned) {
              carryForwardDays = Math.min(
                previousYearBalance.earned.balance || 0,
                facultyRules.earnedLeave.maxCarryForward
              );
              canCarryForward = true;
              maxCarryForward = facultyRules.earnedLeave.maxCarryForward;
            }
          }
        }
        // Handle other leave types with annual allocation
        else {
          const leaveRule = this.getLeaveRuleByType(facultyRules, leaveTypeId);
          if (leaveRule) {
            allocatedDays = leaveRule.annualAllocation || leaveRule.maxDays || 0;
            
            // Handle carry forward for other leave types if allowed
            if (leaveRule.carryForwardAllowed && previousYearBalance[leaveTypeId]) {
              carryForwardDays = previousYearBalance[leaveTypeId].balance || 0;
              canCarryForward = true;
            }
          }
        }

        if (allocatedDays > 0 || carryForwardDays > 0) {
          const totalAllocated = allocatedDays + carryForwardDays;
          
          balances[leaveTypeId] = {
            leaveType: leaveType.name,
            allocated: allocatedDays,
            carryForward: carryForwardDays,
            totalAllocated: totalAllocated,
            used: 0,
            balance: totalAllocated,
            maxDays: allocatedDays,
            canCarryForward: canCarryForward,
            maxCarryForward: maxCarryForward,
            serviceMonths: serviceMonths,
            eligibleFromJoining: isEligibleForEarnedLeave || leaveTypeId !== 'earned'
          };
        }
      }

      return balances;
    } catch (error) {
      console.error('Error calculating leave balance:', error);
      return {};
    }
  }

  /**
   * Calculate earned leave allocation based on joining date and monthly accrual
   * @param {Date} joinDate - Joining date
   * @param {Date} currentDate - Current date
   * @param {number} currentYear - Current year
   * @param {number} monthlyAccrual - Monthly accrual rate
   * @param {number} maxAnnualDays - Maximum annual days
   * @returns {number} Allocated earned leave days
   */
  calculateEarnedLeaveAllocation(joinDate, currentDate, currentYear, monthlyAccrual = 2.5, maxAnnualDays = 30) {
    const joinYear = joinDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const joinMonth = joinDate.getMonth() + 1;
    
    let monthsInService = 0;
    
    if (joinYear === currentYear) {
      // Joined in current year - calculate from joining month to current month
      monthsInService = Math.max(0, currentMonth - joinMonth + 1);
    } else if (joinYear < currentYear) {
      // Joined in previous years - full year allocation
      monthsInService = 12;
    }
    
    // Calculate accrued leave
    const accruedLeave = monthsInService * monthlyAccrual;
    
    // Cap at maximum annual days
    return Math.min(Math.floor(accruedLeave), maxAnnualDays);
  }

  /**
   * Calculate service months from joining date
   * @param {Date} joinDate - Joining date
   * @param {Date} currentDate - Current date
   * @returns {number} Number of months in service
   */
  calculateServiceMonths(joinDate, currentDate) {
    const yearDiff = currentDate.getFullYear() - joinDate.getFullYear();
    const monthDiff = currentDate.getMonth() - joinDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Get leave rule by leave type ID
   * @param {Object} facultyRules - Faculty-specific rules
   * @param {string} leaveTypeId - Leave type ID
   * @returns {Object|null} Leave rule or null
   */
  getLeaveRuleByType(facultyRules, leaveTypeId) {
    const ruleMap = {
      'casual': 'casualLeave',
      'special_casual': 'specialCasualLeave',
      'rh': 'restrictedHoliday',
      'hpl': 'halfPayLeave',
      'hapl': 'hospitalAttendanceLeave',
      'medical': 'medicalLeave',
      'maternity': 'maternityLeave',
      'study': 'studyLeave'
    };
    
    const ruleName = ruleMap[leaveTypeId];
    return ruleName ? facultyRules[ruleName] : null;
  }

  /**
   * Calculate carry forward leave from previous year
   * @param {Object} previousYearBalance - Previous year's leave balance
   * @param {string} leaveTypeId - Leave type ID
   * @param {string} facultyType - Faculty type
   * @returns {number} Carry forward days
   */
  async calculateCarryForward(previousYearBalance, leaveTypeId, facultyType) {
    try {
      const rules = await this.loadLeaveCalculationRules();
      const facultyRules = rules.facultyLeaveRules[facultyType];
      
      if (!facultyRules || !previousYearBalance || !previousYearBalance[leaveTypeId]) {
        return 0;
      }
      
      const leaveRule = this.getLeaveRuleByType(facultyRules, leaveTypeId);
      
      // Special handling for earned leave
      if (leaveTypeId === 'earned' && facultyRules.earnedLeave) {
        if (facultyRules.earnedLeave.carryForwardAllowed) {
          const unusedDays = previousYearBalance[leaveTypeId].balance || 0;
          return Math.min(unusedDays, facultyRules.earnedLeave.maxCarryForward);
        }
      }
      // Handle other leave types
      else if (leaveRule && leaveRule.carryForwardAllowed) {
        return previousYearBalance[leaveTypeId].balance || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating carry forward:', error);
      return 0;
    }
  }

  /**
   * Process year-end carry forward and reset
   * @param {Object} currentYearBalance - Current year's leave balance
   * @param {string} facultyType - Faculty type
   * @returns {Object} Next year's opening balance
   */
  async processYearEndCarryForward(currentYearBalance, facultyType) {
    try {
      const rules = await this.loadLeaveCalculationRules();
      const facultyRules = rules.facultyLeaveRules[facultyType];
      const nextYearBalance = {};
      
      for (const [leaveTypeId, balance] of Object.entries(currentYearBalance)) {
        const leaveRule = this.getLeaveRuleByType(facultyRules, leaveTypeId);
        
        // Handle earned leave carry forward
        if (leaveTypeId === 'earned' && facultyRules.earnedLeave && facultyRules.earnedLeave.carryForwardAllowed) {
          const carryForward = Math.min(balance.balance || 0, facultyRules.earnedLeave.maxCarryForward);
          if (carryForward > 0) {
            nextYearBalance[leaveTypeId] = {
              balance: carryForward,
              carryForward: true
            };
          }
        }
        // Handle other leave types
        else if (leaveRule && leaveRule.carryForwardAllowed) {
          const carryForward = balance.balance || 0;
          if (carryForward > 0) {
            nextYearBalance[leaveTypeId] = {
              balance: carryForward,
              carryForward: true
            };
          }
        }
        // Leave types that don't carry forward are reset to 0
      }
      
      return nextYearBalance;
    } catch (error) {
      console.error('Error processing year-end carry forward:', error);
      return {};
    }
  }

  /**
   * Update leave balance after leave application
   * @param {Object} currentBalance - Current leave balance
   * @param {string} leaveTypeId - Leave type ID
   * @param {number} daysUsed - Number of days used
   * @returns {Object} Updated balance
   */
  updateBalanceAfterLeave(currentBalance, leaveTypeId, daysUsed) {
    if (!currentBalance[leaveTypeId]) {
      throw new Error(`Leave type ${leaveTypeId} not found in balance`);
    }

    const balance = { ...currentBalance[leaveTypeId] };
    balance.used += daysUsed;
    balance.balance = balance.allocated - balance.used;

    return {
      ...currentBalance,
      [leaveTypeId]: balance
    };
  }

  /**
   * Check if leave application is valid based on available balance
   * @param {Object} leaveBalance - Current leave balance
   * @param {string} leaveTypeId - Leave type ID
   * @param {number} requestedDays - Requested leave days
   * @returns {Object} Validation result
   */
  validateLeaveApplication(leaveBalance, leaveTypeId, requestedDays) {
    if (!leaveBalance[leaveTypeId]) {
      return {
        valid: false,
        message: `Leave type ${leaveTypeId} not available for this faculty type`
      };
    }

    const balance = leaveBalance[leaveTypeId];
    
    if (requestedDays > balance.balance) {
      return {
        valid: false,
        message: `Insufficient leave balance. Available: ${balance.balance} days, Requested: ${requestedDays} days`
      };
    }

    return {
      valid: true,
      message: 'Leave application is valid',
      remainingBalance: balance.balance - requestedDays
    };
  }

  /**
   * Get leave summary for a faculty member
   * @param {string} facultyId - Faculty ID
   * @param {number} year - Year for summary
   * @returns {Object} Leave summary
   */
  async getLeaveSummary(facultyId, year = new Date().getFullYear()) {
    // This would typically fetch from database
    // For now, returning a template structure
    return {
      facultyId,
      year,
      summary: {
        totalAllocated: 0,
        totalUsed: 0,
        totalBalance: 0,
        byLeaveType: {}
      }
    };
  }
}

module.exports = new LeaveBalanceService();