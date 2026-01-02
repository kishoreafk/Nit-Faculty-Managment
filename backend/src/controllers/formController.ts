import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { formatRowDateTimes } from '../utils/timeFormat.js';

export const getFormDefinition = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;
    
    const [forms]: any = await pool.execute(
      `SELECT * FROM form_definitions WHERE category = ? AND active = TRUE ORDER BY version DESC LIMIT 1`,
      [category]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const [fields] = await pool.execute(
      `SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index`,
      [forms[0].id]
    );
    
    res.json({ ...forms[0], fields });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const submitForm = async (req: AuthRequest, res: Response) => {
  try {
    const { form_id, category, payload } = req.body;
    
    await pool.execute(
      `INSERT INTO form_submissions (form_id, faculty_id, category, payload) VALUES (?, ?, ?, ?)`,
      [form_id, req.user!.id, category, JSON.stringify(payload)]
    );
    
    res.json({ message: 'Form submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.execute(
      `SELECT fs.*, fd.name as form_name, f.name as reviewer_name 
       FROM form_submissions fs 
       JOIN form_definitions fd ON fs.form_id = fd.id 
       LEFT JOIN faculty f ON fs.reviewer_id = f.id 
       WHERE fs.faculty_id = ? 
       ORDER BY fs.created_at DESC`,
      [req.user!.id]
    );
    rows.forEach((row: any) => formatRowDateTimes(row, ['created_at', 'reviewed_at']));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
