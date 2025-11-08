const fs = require('fs').promises;
const path = require('path');

class MonthlyLeaveCalculationService {
  constructor() {
    this.leaveTypesConfig = null;
    this.leaveCalculationRules = null;
    this.facultyTypesConfig = null;
  }

  async loadConfigs() {
    if (!this.leaveTypesConfig) {
      const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
      const leaveTypesData = await fs.readFile(leaveTypesPath, 'utf8');
      this.leaveTypesConfig = JSON.parse(leaveTypesData);
    }

    if (!this.leaveCalculationRules) {
      const rulesPath = path.join(__dirname, '../config/leave-calculation-rules.json');
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      this.leaveCalculationRules = JSON.parse(rulesData);
    }

    if (!this.facultyTypesConfig) {
      const facultyTypesPath = path.join(__dirname, '../config/faculty-types.json');
      const facultyTypesData = await fs.readFile(facultyTypesPath, 'utf8');
      this.facultyTypesConfig = JSON.parse(facultyTypesData);
    }
  }

  /**
   * Calculate monthly leave breakdown for a faculty member
   */
  async calculateMonthlyLeaveBreakdown(facultyType, joiningDate, year = new Date().getFullYear()) {
    await this.loadConfigs();
    
    const joinDate = new Date(joiningDate);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth();
    
    const monthlyBreakdown = [];
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules[facultyType];
    
    if (!facultyRules) {
      throw new Error(`No rules found for faculty type: ${facultyType}`);
    }

    // Calculate for each month
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const isEligible = monthDate >= joinDate;
      
      let monthsInService = 0;
      let earnedLeaveData = { monthlyAccrual: 0, cumulativeAccrual: 0, maxAnnual: 0 };
      let applicableLeaves = [];

      if (isEligible) {
        monthsInService = this.calculateServiceMonths(joinDate, monthDate);
        earnedLeaveData = this.calculateEarnedLeaveForMonth(facultyType, monthsInService);
        applicableLeaves = this.getApplicableLeaves(facultyType, monthsInService);
      }

      monthlyBreakdown.push({
        month: month + 1,
        monthName: this.getMonthName(month),
        year,
        monthsInService,
        isEligible,
        earnedLeave: earnedLeaveData,
        applicableLeaves,
        leaveIncrement: this.calculateMonthlyIncrement(facultyType, monthsInService, month)
      });
    }

    return {
      facultyType,
      joiningDate,
      year,
      monthlyBreakdown,
      annualSummary: this.calculateAnnualSummary(monthlyBreakdown, facultyType)
    };
  }

  /**
   * Calculate earned leave for a specific month
   */
  calculateEarnedLeaveForMonth(facultyType, monthsInService) {
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules[facultyType];
    const earnedLeaveRule = facultyRules.earnedLeave;
    
    if (!earnedLeaveRule) {
      return { monthlyAccrual: 0, cumulativeAccrual: 0, maxAnnual: 0 };
    }

    const monthlyAccrual = earnedLeaveRule.monthlyAccrual;
    const maxAnnual = earnedLeaveRule.maxAnnualDays;
    const cumulativeAccrual = Math.min(monthsInService * monthlyAccrual, maxAnnual);

    return {
      monthlyAccrual,
      cumulativeAccrual: parseFloat(cumulativeAccrual.toFixed(2)),
      maxAnnual,
      eligibleFromMonth: monthsInService >= 6 ? 6 : null
    };
  }

  /**
   * Get applicable leave types for faculty based on service months
   */
  getApplicableLeaves(facultyType, monthsInService) {
    const leaveTypes = this.leaveTypesConfig.leaveTypes;
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules[facultyType];
    const applicableLeaves = [];

    Object.entries(leaveTypes).forEach(([leaveId, leaveType]) => {
      if (leaveType.applicableFor && leaveType.applicableFor.includes(facultyType)) {
        const leaveRule = this.getLeaveRuleByType(facultyRules, leaveId);
        
        // Check eligibility based on service months
        let isEligible = true;
        if (leaveId === 'earned') {
          isEligible = monthsInService >= 6; // 6 months minimum service for earned leave
        }

        if (isEligible) {
          applicableLeaves.push({
            id: leaveId,
            name: leaveType.name,
            description: leaveType.description,
            maxDays: leaveType.maxDays[facultyType] || 0,
            carryForwardAllowed: leaveRule?.carryForwardAllowed || false,
            requiresApproval: leaveType.requiresApproval,
            advanceNotice: leaveType.advanceNotice,
            rule: leaveRule
          });
        }
      }
    });

    return applicableLeaves;
  }

  /**
   * Calculate monthly increment for different leave types
   */
  calculateMonthlyIncrement(facultyType, monthsInService, monthIndex) {
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules[facultyType];
    const increments = {};

    // Earned Leave increment
    if (facultyRules.earnedLeave && monthsInService >= 6) {
      increments.earnedLeave = facultyRules.earnedLeave.monthlyAccrual;
    }

    // Annual leave allocations (allocated at year start)
    if (monthIndex === 0) { // January
      if (facultyRules.casualLeave) {
        increments.casualLeave = facultyRules.casualLeave.annualAllocation;
      }
      if (facultyRules.specialCasualLeave) {
        increments.specialCasualLeave = facultyRules.specialCasualLeave.annualAllocation;
      }
      if (facultyRules.restrictedHoliday) {
        increments.restrictedHoliday = facultyRules.restrictedHoliday.annualAllocation;
      }
      if (facultyRules.halfPayLeave) {
        increments.halfPayLeave = facultyRules.halfPayLeave.annualAllocation;
      }
      if (facultyRules.hospitalAttendanceLeave) {
        increments.hospitalAttendanceLeave = facultyRules.hospitalAttendanceLeave.annualAllocation;
      }
    }

    return increments;
  }

  /**
   * Calculate annual summary
   */
  calculateAnnualSummary(monthlyBreakdown, facultyType) {
    const lastMonth = monthlyBreakdown[monthlyBreakdown.length - 1];
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules[facultyType];
    
    const summary = {
      totalServiceMonths: lastMonth.monthsInService,
      earnedLeave: {
        totalAccrued: lastMonth.earnedLeave.cumulativeAccrual,
        maxAnnual: lastMonth.earnedLeave.maxAnnual,
        monthlyRate: lastMonth.earnedLeave.monthlyAccrual
      },
      otherLeaves: {}
    };

    // Add other leave types
    Object.entries(facultyRules).forEach(([ruleKey, rule]) => {
      if (ruleKey !== 'earnedLeave' && rule.annualAllocation) {
        const leaveTypeId = this.getRuleKeyToLeaveTypeId(ruleKey);
        summary.otherLeaves[leaveTypeId] = {
          name: this.getLeaveTypeName(leaveTypeId),
          annualAllocation: rule.annualAllocation,
          carryForwardAllowed: rule.carryForwardAllowed || false
        };
      }
    });

    return summary;
  }

  /**
   * Get faculty leave entitlements with detailed rules
   */
  async getFacultyLeaveEntitlements() {
    await this.loadConfigs();
    
    const entitlements = {};
    const leaveTypes = this.leaveTypesConfig.leaveTypes;
    const facultyRules = this.leaveCalculationRules.facultyLeaveRules;

    Object.entries(facultyRules).forEach(([facultyType, rules]) => {
      entitlements[facultyType] = {
        facultyType,
        description: this.getFacultyTypeDescription(facultyType),
        leaveTypes: {}
      };

      Object.entries(leaveTypes).forEach(([leaveId, leaveType]) => {
        if (leaveType.applicableFor && leaveType.applicableFor.includes(facultyType)) {
          const leaveRule = this.getLeaveRuleByType(rules, leaveId);
          
          entitlements[facultyType].leaveTypes[leaveId] = {
            name: leaveType.name,
            description: leaveType.description,
            maxDays: leaveType.maxDays[facultyType] || 0,
            rule: leaveRule,
            carryForwardAllowed: leaveRule?.carryForwardAllowed || false,
            requiresApproval: leaveType.requiresApproval,
            advanceNotice: leaveType.advanceNotice,
            medicalCertificateRequired: leaveType.medicalCertificateRequired || false,
            adjustmentRequired: leaveType.adjustmentRequired || false
          };
        }
      });
    });

    return entitlements;
  }

  /**
   * Calculate leave balance at any point in time
   */
  async calculateLeaveBalanceAtDate(facultyType, joiningDate, calculationDate, usedLeave = {}) {
    const monthlyData = await this.calculateMonthlyLeaveBreakdown(
      facultyType, 
      joiningDate, 
      calculationDate.getFullYear()
    );

    const monthIndex = calculationDate.getMonth();
    const monthData = monthlyData.monthlyBreakdown[monthIndex];
    
    const balance = {};
    
    // Calculate earned leave balance
    if (monthData.earnedLeave.cumulativeAccrual > 0) {
      balance.earned = {
        allocated: monthData.earnedLeave.cumulativeAccrual,
        used: usedLeave.earned || 0,
        balance: monthData.earnedLeave.cumulativeAccrual - (usedLeave.earned || 0)
      };
    }

    // Calculate other leave balances
    monthData.applicableLeaves.forEach(leave => {
      if (leave.id !== 'earned') {
        balance[leave.id] = {
          allocated: leave.maxDays,
          used: usedLeave[leave.id] || 0,
          balance: leave.maxDays - (usedLeave[leave.id] || 0)
        };
      }
    });

    return {
      facultyType,
      calculationDate: calculationDate.toISOString(),
      monthsInService: monthData.monthsInService,
      balance
    };
  }

  // Helper methods
  calculateServiceMonths(joinDate, currentDate) {
    const yearDiff = currentDate.getFullYear() - joinDate.getFullYear();
    const monthDiff = currentDate.getMonth() - joinDate.getMonth();
    return Math.max(0, yearDiff * 12 + monthDiff + 1);
  }

  getMonthName(monthIndex) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  }

  getLeaveRuleByType(facultyRules, leaveTypeId) {
    const ruleMap = {
      'casual': 'casualLeave',
      'special_casual': 'specialCasualLeave',
      'earned': 'earnedLeave',
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

  getRuleKeyToLeaveTypeId(ruleKey) {
    const reverseMap = {
      'casualLeave': 'casual',
      'specialCasualLeave': 'special_casual',
      'earnedLeave': 'earned',
      'restrictedHoliday': 'rh',
      'halfPayLeave': 'hpl',
      'hospitalAttendanceLeave': 'hapl',
      'medicalLeave': 'medical',
      'maternityLeave': 'maternity',
      'studyLeave': 'study'
    };
    return reverseMap[ruleKey] || ruleKey;
  }

  getLeaveTypeName(leaveTypeId) {
    const nameMap = {
      'casual': 'Casual Leave',
      'special_casual': 'Special Casual Leave',
      'earned': 'Earned Leave',
      'rh': 'Restricted Holiday',
      'hpl': 'Half Pay Leave',
      'hapl': 'Hospital Attendance Leave',
      'medical': 'Medical Leave',
      'maternity': 'Maternity Leave',
      'study': 'Study Leave'
    };
    return nameMap[leaveTypeId] || leaveTypeId;
  }

  getFacultyTypeDescription(facultyType) {
    const descriptions = {
      'teaching': 'Teaching Faculty Members',
      'non_teaching': 'Non-Teaching Staff Members',
      'contract': 'Contract-based Faculty',
      'visiting': 'Visiting Faculty Members'
    };
    return descriptions[facultyType] || facultyType;
  }
}

module.exports = new MonthlyLeaveCalculationService();