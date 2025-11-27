import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';

export const verifyTables = async () => {
  const requiredTables = [
    'vault_files',
    'vault_categories',
    'vault_access_logs',
    'timetable_files',
    'timetable_access_logs'
  ];

  try {
    for (const table of requiredTables) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SHOW TABLES LIKE '${table}'`
      );
      
      if (rows.length === 0) {
        console.warn(`⚠️  Table '${table}' does not exist`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
  } catch (error) {
    console.error('❌ Error verifying tables:', error);
  }
};
