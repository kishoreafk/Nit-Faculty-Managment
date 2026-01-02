import cron from 'node-cron';
import { pool } from '../config/database.js';
import { isProduction } from '../config/env.js';

export const initializeCronJobs = () => {
  // Monthly leave accrual - Runs on 1st of every month at 2:00 AM
  cron.schedule('0 2 1 * *', async () => {
    try {
      if (!isProduction) console.log('🔄 Running monthly leave accrual...');
      await pool.execute('CALL sp_monthly_leave_accrual()');
      if (!isProduction) console.log('✅ Monthly leave accrual completed successfully');
    } catch (error) {
      if (!isProduction) console.error('❌ Monthly leave accrual failed:', error);
    }
  });

  // Yearly leave accrual - Runs on January 1st at 3:00 AM
  cron.schedule('0 3 1 1 *', async () => {
    try {
      if (!isProduction) console.log('🔄 Running yearly leave accrual...');
      await pool.execute('CALL sp_yearly_leave_accrual()');
      if (!isProduction) console.log('✅ Yearly leave accrual completed successfully');
    } catch (error) {
      if (!isProduction) console.error('❌ Yearly leave accrual failed:', error);
    }
  });

  // Carry forward leaves - Runs on January 1st at 1:00 AM (before yearly accrual)
  cron.schedule('0 1 1 1 *', async () => {
    try {
      if (!isProduction) console.log('🔄 Running leave carry forward...');
      await pool.execute('CALL sp_carry_forward_leaves()');
      if (!isProduction) console.log('✅ Leave carry forward completed successfully');
    } catch (error) {
      if (!isProduction) console.error('❌ Leave carry forward failed:', error);
    }
  });

  if (!isProduction) {
    console.log('⏰ Cron jobs initialized:');
    console.log('   - Monthly accrual: 1st of every month at 2:00 AM');
    console.log('   - Yearly accrual: January 1st at 3:00 AM');
    console.log('   - Carry forward: January 1st at 1:00 AM');
  }
};
