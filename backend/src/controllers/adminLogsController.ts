import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getAdminLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { adminId, action_type, resource_type, from, to, page = '1', pageSize = '50' } = req.query;
    
    let query = `SELECT al.*, f.name as admin_name, f.email as admin_email
                 FROM admin_logs al
                 LEFT JOIN faculty f ON f.id = al.admin_id
                 WHERE 1=1`;
    const params: any[] = [];
    
    if (adminId) {
      query += ` AND al.admin_id = ?`;
      params.push(adminId);
    }
    
    if (resource_type) {
      query += ` AND al.resource_type = ?`;
      params.push(resource_type);
    }
    
    if (action_type) {
      query += ` AND al.action_type LIKE ?`;
      params.push(`%${action_type}%`);
    }
    
    if (from) {
      query += ` AND al.created_at >= ?`;
      params.push(from);
    }
    
    if (to) {
      query += ` AND al.created_at <= ?`;
      params.push(to);
    }
    
    const [[{ total }]] = await pool.execute(
      query.replace('al.*, f.name as admin_name, f.email as admin_email', 'COUNT(*) as total'),
      params
    ) as any;
    
    const limit = parseInt(pageSize as string, 10);
    const offset = (parseInt(page as string, 10) - 1) * limit;
    query += ` ORDER BY al.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const [items] = await pool.execute(query, params);
    
    res.json({
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      items
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLogById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const [logs]: any = await pool.execute(
      `SELECT al.*, f.name as admin_name, f.email as admin_email
       FROM admin_logs al
       LEFT JOIN faculty f ON f.id = al.admin_id
       WHERE al.id = ?`,
      [id]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    res.json(logs[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
