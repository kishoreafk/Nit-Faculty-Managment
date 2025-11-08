const db = require('../config/db');
const leaveBalanceService = require('./leaveBalanceService');

class LeaveConfigSyncService {
  /**
   * Sync leave balances when faculty types or leave types are removed from system config
   */
  async syncLeaveBalancesWithConfig() {
    try {
      console.log('Starting leave balance sync with system config...');
      
      // Get current leave types from config
      const config = await leaveBalanceService.loadLeaveTypesConfig();
      const validLeaveTypes = Object.keys(config.leaveTypes);
      const validFacultyTypes = ['teaching', 'non_teaching', 'contract', 'visiting'];
      
      // Remove leave balances for invalid leave types
      const [deletedLeaveTypes] = await db.execute(`
        DELETE FROM leave_balances 
        WHERE leave_type_id NOT IN (${validLeaveTypes.map(() => '?').join(',')})
      `, validLeaveTypes);
      
      if (deletedLeaveTypes.affectedRows > 0) {
        console.log(`Removed ${deletedLeaveTypes.affectedRows} invalid leave type balances`);
      }
      
      // Update faculty with invalid types to default 'teaching'
      const [updatedFaculty] = await db.execute(`
        UPDATE faculty 
        SET facultyType = 'Teaching' 
        WHERE facultyType NOT IN ('Teaching', 'Non-Teaching', 'Contract', 'Visiting Faculty')
      `);
      
      if (updatedFaculty.affectedRows > 0) {
        console.log(`Updated ${updatedFaculty.affectedRows} faculty with invalid types to Teaching`);
      }
      
      // Recalculate balances for all faculty
      const [allFaculty] = await db.execute(`
        SELECT id, facultyType, joiningDate 
        FROM faculty 
        WHERE is_approved = TRUE
      `);
      
      for (const faculty of allFaculty) {
        await this.recalculateFacultyBalance(faculty);
      }
      
      console.log('Leave balance sync completed successfully');
      return { success: true, message: 'Leave balances synced with system config' };
      
    } catch (error) {
      console.error('Error syncing leave balances:', error);
      return { success: false, message: 'Failed to sync leave balances' };
    }
  }
  
  /**
   * Recalculate balance for a specific faculty member
   */
  async recalculateFacultyBalance(faculty) {
    try {
      const facultyTypeMap = {
        'Teaching': 'teaching',
        'Non-Teaching': 'non_teaching',
        'Contract': 'contract',
        'Visiting Faculty': 'visiting'
      };
      
      const facultyType = facultyTypeMap[faculty.facultyType] || 'teaching';
      const currentYear = new Date().getFullYear();
      
      // Calculate new balances
      const newBalances = await leaveBalanceService.calculateLeaveBalance(
        facultyType,
        faculty.joiningDate || new Date(),
        new Date(),
        currentYear
      );
      
      // Update or insert balances
      for (const [leaveTypeId, balance] of Object.entries(newBalances)) {
        // Get current used days to preserve them
        const [currentBalance] = await db.execute(`
          SELECT used_days FROM leave_balances 
          WHERE faculty_id = ? AND leave_type_id = ? AND year = ?
        `, [faculty.id, leaveTypeId, currentYear]);
        
        const usedDays = currentBalance.length > 0 ? currentBalance[0].used_days : 0;
        const newBalance = Math.max(0, balance.allocated - usedDays);
        
        await db.execute(`
          INSERT INTO leave_balances 
          (faculty_id, leave_type_id, year, allocated_days, used_days, balance_days)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          allocated_days = VALUES(allocated_days),
          balance_days = VALUES(balance_days),
          updated_at = CURRENT_TIMESTAMP
        `, [faculty.id, leaveTypeId, currentYear, balance.allocated, usedDays, newBalance]);
      }
      
    } catch (error) {
      console.error(`Error recalculating balance for faculty ${faculty.id}:`, error);
    }
  }
}

module.exports = new LeaveConfigSyncService();