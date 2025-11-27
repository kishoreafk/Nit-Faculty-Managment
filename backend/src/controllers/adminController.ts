import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getPendingFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, ft.name as faculty_type_name 
       FROM faculty f 
       JOIN faculty_types ft ON f.faculty_type_id = ft.id 
       WHERE f.approved = FALSE AND f.active = TRUE 
       ORDER BY f.created_at ASC`
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const approveFaculty = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    await connection.beginTransaction();
    
    let role_id = 4; // Default to FACULTY
    if (role) {
      const [roleResult]: any = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (roleResult.length > 0) {
        role_id = roleResult[0].id;
      }
    }
    
    await connection.execute(`UPDATE faculty SET approved = TRUE, role_id = ? WHERE id = ?`, [role_id, id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, payload, ip_address)
       VALUES (?, 'FACULTY_APPROVE', 'faculty', ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ approved: true, role_id }), req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'Faculty approved and leave balances initialized' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const rejectFaculty = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await connection.beginTransaction();
    
    await connection.execute(`UPDATE faculty SET active = FALSE WHERE id = ?`, [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, payload, reason, ip_address)
       VALUES (?, 'FACULTY_REJECT', 'faculty', ?, ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ approved: false }), reason || 'Registration rejected', req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'Faculty registration rejected' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const getAllFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, ft.name as faculty_type_name, r.name as role_name 
       FROM faculty f 
       JOIN faculty_types ft ON f.faculty_type_id = ft.id 
       JOIN roles r ON f.role_id = r.id 
       WHERE f.active = TRUE 
       ORDER BY f.name`
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFacultyTypes = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM faculty_types WHERE active = TRUE`);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
