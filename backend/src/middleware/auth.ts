import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const [users]: any = await pool.execute(
      'SELECT id, active, deleted, approved FROM faculty WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0 || !users[0].active || users[0].deleted || !users[0].approved) {
      console.log('❌ User account inactive, deleted, or not approved');
      return res.status(401).json({ error: 'Account deactivated or removed' });
    }
    
    req.user = decoded;
    console.log('✅ User authenticated:', decoded.email, 'Role:', decoded.role);
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log('❌ Unauthorized: No user in request');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!roles.includes(req.user.role)) {
      console.log(`❌ Forbidden: User role '${req.user.role}' not in allowed roles:`, roles);
      return res.status(403).json({ error: 'Access denied' });
    }
    console.log(`✅ Authorization passed for role: ${req.user.role}`);
    next();
  };
};
