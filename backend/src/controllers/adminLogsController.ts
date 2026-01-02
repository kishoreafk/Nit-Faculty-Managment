import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { parsePagination } from '../utils/pagination.js';
import { formatDateTime } from '../utils/timeFormat.js';

export const getAdminLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { adminId, action_type, resource_type, from, to } = req.query;
    const { page, pageSize, limit, offset } = parsePagination(req.query.page, req.query.pageSize, {
      defaultPageSize: 50,
      maxPageSize: 100
    });

    const params: any[] = [];
    let where = 'WHERE 1=1';

    const asScalar = (v: unknown): string | undefined => {
      if (Array.isArray(v)) return v[0] != null ? String(v[0]) : undefined;
      if (v === undefined || v === null) return undefined;
      return String(v);
    };

    const adminIdValue = asScalar(adminId);
    const resourceTypeValue = asScalar(resource_type);
    const actionTypeValue = asScalar(action_type);
    const fromValue = asScalar(from);
    const toValue = asScalar(to);

    if (adminIdValue) {
      where += ' AND al.admin_id = ?';
      params.push(adminIdValue);
    }

    if (resourceTypeValue) {
      where += ' AND al.resource_type = ?';
      params.push(resourceTypeValue);
    }

    if (actionTypeValue) {
      where += ' AND al.action_type LIKE ?';
      params.push(`%${actionTypeValue}%`);
    }

    if (fromValue) {
      where += ' AND al.created_at >= ?';
      params.push(fromValue);
    }

    if (toValue) {
      where += ' AND al.created_at <= ?';
      params.push(toValue);
    }

    const fromJoin = `FROM admin_logs al
                      LEFT JOIN faculty f ON f.id = al.admin_id
                      ${where}`;

    const countSql = `SELECT COUNT(*) as total ${fromJoin}`;
    const [[countRow]] = (await pool.execute(countSql, params)) as any;
    const total = Number(countRow?.total ?? 0);

    const itemsSql = `SELECT al.*, f.name as admin_name, f.email as admin_email
                      ${fromJoin}
                      ORDER BY al.created_at DESC
                      LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    const [items]: any = await pool.execute(itemsSql, params);
    
    items.forEach((item: any) => {
      if (item.created_at) item.created_at = formatDateTime(item.created_at);
    });
    
    res.json({
      total,
      page,
      pageSize,
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
    
    if (logs[0].created_at) logs[0].created_at = formatDateTime(logs[0].created_at);
    res.json(logs[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
