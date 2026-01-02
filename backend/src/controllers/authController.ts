import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { getJwtConfig } from '../config/env.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { employee_id, name, email, password, faculty_type_id, department, designation, doj } = req.body;
    
    const [existing]: any = await pool.execute(`SELECT id FROM faculty WHERE email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.execute(
      `INSERT INTO faculty (employee_id, name, email, password_hash, role_id, faculty_type_id, department, designation, doj, approved) 
       VALUES (?, ?, ?, ?, 4, ?, ?, ?, ?, FALSE)`,
      [employee_id, name, email, hashedPassword, faculty_type_id, department, designation, doj]
    );
    
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const [rows]: any = await pool.execute(
      `SELECT f.*, r.name as role_name FROM faculty f 
       JOIN roles r ON f.role_id = r.id 
       WHERE f.email = ? AND f.active = TRUE AND f.deleted = FALSE`,
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or account deactivated' });
    }
    
    const user = rows[0];
    
    if (!user.approved) {
      return res.status(403).json({ error: 'Account pending approval' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwtConfig = getJwtConfig();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role_name },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.expiresIn,
        algorithm: jwtConfig.algorithm
      } satisfies SignOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        algorithm: jwtConfig.algorithm
      } satisfies SignOptions
    );
    
    await pool.execute(
      `INSERT INTO auth_tokens (faculty_id, refresh_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [user.id, refreshToken]
    );
    
    await pool.execute(`UPDATE faculty SET last_login = NOW() WHERE id = ?`, [user.id]);
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        department: user.department
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.execute(
      `SELECT f.*, r.name as role_name, ft.name as faculty_type 
       FROM faculty f 
       JOIN roles r ON f.role_id = r.id 
       JOIN faculty_types ft ON f.faculty_type_id = ft.id 
       WHERE f.id = ? AND f.active = TRUE AND f.deleted = FALSE`,
      [req.user!.id]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Account deactivated or removed' });
    }
    
    const user = rows[0];
    delete user.password_hash;
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFacultyTypes = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM faculty_types WHERE active = TRUE`);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
