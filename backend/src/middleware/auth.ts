import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { getJwtConfig, isProduction } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
  authz?: { requiredRoles: string[] };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    if (!isProduction) console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwtConfig = getJwtConfig();
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm]
    }) as any;
    
    const [users]: any = await pool.execute(
      'SELECT id, active, deleted, approved FROM faculty WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0 || !users[0].active || users[0].deleted || !users[0].approved) {
      if (!isProduction) console.log('❌ User account inactive, deleted, or not approved');
      return res.status(401).json({ error: 'Account deactivated or removed' });
    }
    
    req.user = decoded;
    if (!isProduction) console.log('✅ User authenticated');
    next();
  } catch (error) {
    if (!isProduction) console.error('❌ Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      if (!isProduction) console.log('❌ Unauthorized: No user in request');
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!roles.includes(req.user.role)) {
      if (!isProduction) console.log('❌ Forbidden');
      return res.status(403).json({ error: 'Access denied' });
    }
    req.authz = { requiredRoles: roles };
    if (!isProduction) console.log('✅ Authorization passed');
    next();
  };
};
