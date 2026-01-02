import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { formatRowTimes } from '../utils/timeFormat.js';
import { isPrivilegedActor, logAdminActionFromReq } from '../utils/adminLog.js';

export const createTimetableEntry = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode } = req.body;
    
    await connection.beginTransaction();
    
    const [result] = await connection.execute(
      `INSERT INTO timetable (course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode, req.user!.id]
    );
    
    const ttId = (result as any).insertId;
    
    if (isPrivilegedActor(req.user?.role)) {
      await logAdminActionFromReq(
        req,
        {
          actionType: 'TIMETABLE_ASSIGN',
          resourceType: 'timetable',
          resourceId: ttId,
          payload: { faculty_id, day_of_week, start_time, end_time, room_no }
        },
        { connection }
      );
    }
    
    await connection.commit();
    res.status(201).json({ message: 'Timetable entry created', id: ttId });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const getMyTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, c.code as course_code, c.title as course_title,
              fn_format_time_12hr(t.start_time) as start_time_formatted,
              fn_format_time_12hr(t.end_time) as end_time_formatted
       FROM timetable t
       LEFT JOIN courses c ON t.course_id = c.id
       WHERE t.faculty_id = ?
       ORDER BY FIELD(t.day_of_week, 'MON','TUE','WED','THU','FRI','SAT'), t.start_time`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTimetableEntry = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode } = req.body;
    
    await connection.beginTransaction();
    
    const [[old]] = await connection.execute(`SELECT * FROM timetable WHERE id = ?`, [id]) as any;
    
    await connection.execute(
      `UPDATE timetable SET course_id = ?, faculty_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room_no = ?, mode = ?
       WHERE id = ?`,
      [course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode, id]
    );
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, payload)
       VALUES (?, 'TIMETABLE_EDIT', 'timetable', ?, ?)`,
      [req.user!.id, id, JSON.stringify({ before: old, after: req.body })]
    );
    
    await connection.commit();
    res.json({ message: 'Timetable updated' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const deleteTimetableEntry = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    const [[entry]] = await connection.execute(`SELECT * FROM timetable WHERE id = ?`, [id]) as any;
    
    await connection.execute(`DELETE FROM timetable WHERE id = ?`, [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, payload)
       VALUES (?, 'TIMETABLE_DELETE', 'timetable', ?, ?)`,
      [req.user!.id, id, JSON.stringify({ deleted: entry })]
    );
    
    await connection.commit();
    res.json({ message: 'Timetable entry deleted' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
