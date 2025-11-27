import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 getAllUsers called with query:', req.query);
    const { query = '', status = 'active', role = '', page = '1', pageSize = '25', department = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (status === 'active') whereClause += ' AND f.deleted = FALSE AND f.active = TRUE';
    else if (status === 'deleted') whereClause += ' AND f.deleted = TRUE';
    else if (status === 'inactive') whereClause += ' AND f.active = FALSE AND f.deleted = FALSE';
    
    if (query) {
      whereClause += ' AND (f.name LIKE ? OR f.email LIKE ? OR f.employee_id LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    if (role) {
      whereClause += ' AND r.name = ?';
      params.push(role);
    }
    
    if (department) {
      whereClause += ' AND f.department = ?';
      params.push(department);
    }
    
    console.log('🔍 Count query:', `SELECT COUNT(*) as total FROM faculty f JOIN roles r ON f.role_id = r.id ${whereClause}`);
    console.log('🔍 Params:', params);
    
    const [countResult]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM faculty f JOIN roles r ON f.role_id = r.id ${whereClause}`,
      params
    );
    
    console.log('✅ Count result:', countResult[0].total);
    
    const limit = parseInt(pageSize as string, 10);
    const offsetInt = parseInt(page as string, 10) > 0 ? (parseInt(page as string, 10) - 1) * limit : 0;
    
    const mainQuery = `SELECT f.*, r.name as role_name, ft.name as faculty_type_name,
        (SELECT COUNT(*) FROM leave_applications la WHERE la.faculty_id = f.id AND la.status = 'PENDING') as pending_leave_count,
        (SELECT COUNT(*) FROM product_requests pr WHERE pr.faculty_id = f.id AND pr.status = 'PENDING') as pending_product_count
       FROM faculty f
       JOIN roles r ON f.role_id = r.id
       JOIN faculty_types ft ON f.faculty_type_id = ft.id
       ${whereClause}
       ORDER BY f.approved ASC, f.name
       LIMIT ${limit} OFFSET ${offsetInt}`;
    
    console.log('🔍 Main query:', mainQuery);
    console.log('🔍 Main params:', params);
    
    const [rows] = await pool.execute(mainQuery, params);
    
    console.log('✅ Rows fetched:', Array.isArray(rows) ? rows.length : 0);
    
    res.json({
      total: countResult[0].total,
      page: Number(page),
      pageSize: Number(pageSize),
      items: rows
    });
  } catch (error: any) {
    console.error('❌ getAllUsers error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📥 getUserById called for id:', id);
    
    const [users]: any = await pool.execute(
      `SELECT f.*, r.name as role_name, ft.name as faculty_type_name
       FROM faculty f
       JOIN roles r ON f.role_id = r.id
       JOIN faculty_types ft ON f.faculty_type_id = ft.id
       WHERE f.id = ?`,
      [id]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found:', id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const [balances] = await pool.execute(
      `SELECT lb.*, lt.name, lt.code FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.faculty_id = ? AND lb.year = YEAR(CURDATE())`,
      [id]
    );
    
    const [pendingLeave] = await pool.execute(
      `SELECT la.*, lt.name as leave_type FROM leave_applications la
       JOIN leave_types lt ON la.leave_type_id = lt.id
       WHERE la.faculty_id = ? AND la.status = 'PENDING'`,
      [id]
    );
    
    const [pendingProducts] = await pool.execute(
      `SELECT * FROM product_requests WHERE faculty_id = ? AND status = 'PENDING'`,
      [id]
    );
    
    console.log('✅ User data fetched successfully');
    
    res.json({
      ...users[0],
      leave_balances: balances,
      pending_leave: pendingLeave,
      pending_products: pendingProducts
    });
  } catch (error: any) {
    console.error('❌ getUserById error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('📥 createUser called with body:', { ...req.body, password: '***' });
    const { employee_id, name, email, password, department, designation, joining_date, faculty_type_id, role, gender } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await connection.beginTransaction();
    
    const [roleResult]: any = await connection.execute('SELECT id FROM roles WHERE name = ?', [role || 'FACULTY']);
    const role_id = roleResult[0].id;
    
    const [result]: any = await connection.execute(
      `INSERT INTO faculty (employee_id, name, email, password_hash, role_id, faculty_type_id, department, designation, doj, gender, approved, created_by_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [employee_id, name, email, hashedPassword, role_id, faculty_type_id, department, designation, joining_date, gender || null, req.user!.id]
    );
    
    const newUserId = result.insertId;
    console.log('✅ User created with id:', newUserId);
    
    await connection.execute('CALL sp_assign_default_leaves(?)', [newUserId]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, ip_address)
       VALUES (?, 'CREATE_USER', 'faculty', ?, ?, ?)`,
      [req.user!.id, newUserId, JSON.stringify({ email, role }), req.ip]
    );
    
    await connection.commit();
    
    res.status(201).json({ message: 'User created successfully', id: newUserId });
  } catch (error: any) {
    console.error('❌ createUser error:', error);
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { department, designation, faculty_type_id, role } = req.body;
    
    await connection.beginTransaction();
    
    const [oldData]: any = await connection.execute('SELECT * FROM faculty WHERE id = ?', [id]);
    
    if (oldData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    let role_id = oldData[0].role_id;
    if (role) {
      const [roleResult]: any = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      role_id = roleResult[0].id;
    }
    
    await connection.execute(
      `UPDATE faculty SET department = ?, designation = ?, faculty_type_id = ?, role_id = ? WHERE id = ?`,
      [department, designation, faculty_type_id, role_id, id]
    );
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, before_state, after_state, ip_address)
       VALUES (?, 'UPDATE_USER', 'faculty', ?, ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ department: oldData[0].department, designation: oldData[0].designation }), 
       JSON.stringify({ department, designation }), req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const updateCredentials = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { password, forceReset, reason } = req.body;
    
    await connection.beginTransaction();
    
    const [users]: any = await connection.execute('SELECT email FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        'UPDATE faculty SET password_hash = ?, force_password_reset = ? WHERE id = ?',
        [hashedPassword, forceReset || false, id]
      );
    } else if (forceReset) {
      await connection.execute('UPDATE faculty SET force_password_reset = TRUE WHERE id = ?', [id]);
    }
    
    await connection.execute(
      'UPDATE auth_tokens SET revoked = TRUE, revoked_at = NOW() WHERE faculty_id = ?',
      [id]
    );
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, reason, ip_address)
       VALUES (?, 'CHANGE_CREDENTIALS', 'faculty', ?, ?, ?)`,
      [req.user!.id, id, reason || 'Password reset by admin', req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'Credentials updated and user logged out' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log('📥 deleteUser called for id:', id, 'reason:', reason);
    
    await connection.beginTransaction();
    
    const [users]: any = await connection.execute('SELECT deleted, email, name FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    if (users.length === 0) {
      console.log('❌ User not found:', id);
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await connection.execute('UPDATE faculty SET deleted = TRUE, deleted_at = NOW() WHERE id = ?', [id]);
    await connection.execute('UPDATE auth_tokens SET revoked = TRUE, revoked_at = NOW() WHERE faculty_id = ?', [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, before_state, after_state, reason, ip_address)
       VALUES (?, 'DELETE_USER', 'faculty', ?, ?, ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ deleted: false }), JSON.stringify({ deleted: true }), reason || 'Deleted by admin', req.ip]
    );
    
    await connection.commit();
    console.log('✅ User deleted successfully:', id);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('❌ deleteUser error:', error);
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const restoreUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    await connection.execute('UPDATE faculty SET deleted = FALSE, deleted_at = NULL WHERE id = ?', [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, ip_address)
       VALUES (?, 'RESTORE_USER', 'faculty', ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ deleted: false }), req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'User restored successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const promoteUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    await connection.beginTransaction();
    
    const [roleResult]: any = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
    
    if (roleResult.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const [oldData]: any = await connection.execute('SELECT role_id FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    await connection.execute('UPDATE faculty SET role_id = ? WHERE id = ?', [roleResult[0].id, id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, before_state, after_state, ip_address)
       VALUES (?, 'PROMOTE_USER', 'faculty', ?, ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ role_id: oldData[0].role_id }), JSON.stringify({ role_id: roleResult[0].id }), req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'User role updated successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const forceLogout = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    await connection.execute('UPDATE auth_tokens SET revoked = TRUE, revoked_at = NOW() WHERE faculty_id = ?', [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, ip_address)
       VALUES (?, 'FORCE_LOGOUT', 'faculty', ?, ?)`,
      [req.user!.id, id, req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'User sessions revoked successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const bulkDelete = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { ids, reason } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    await connection.beginTransaction();
    
    let succeeded = 0;
    let failed = 0;
    
    for (const id of ids) {
      try {
        await connection.execute('UPDATE faculty SET deleted = TRUE, deleted_at = NOW() WHERE id = ?', [id]);
        await connection.execute('UPDATE auth_tokens SET revoked = TRUE, revoked_at = NOW() WHERE faculty_id = ?', [id]);
        await connection.execute(
          `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, reason, ip_address)
           VALUES (?, 'BULK_DELETE_USER', 'faculty', ?, ?, ?)`,
          [req.user!.id, id, reason || 'Bulk delete', req.ip]
        );
        succeeded++;
      } catch {
        failed++;
      }
    }
    
    await connection.commit();
    res.json({ message: 'Bulk delete completed', succeeded, failed });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const getPendingLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { department = '', page = '1', pageSize = '25' } = req.query;
    
    let whereClause = "WHERE la.status = 'PENDING'";
    const params: any[] = [];
    
    if (department) {
      whereClause += ' AND f.department = ?';
      params.push(department);
    }
    
    const limit = parseInt(pageSize as string, 10);
    const offset = (parseInt(page as string, 10) - 1) * limit;
    
    const [rows] = await pool.execute(
      `SELECT la.*, f.name as faculty_name, f.department, f.email, lt.name as leave_type, lt.code
       FROM leave_applications la
       JOIN faculty f ON la.faculty_id = f.id
       JOIN leave_types lt ON la.leave_type_id = lt.id
       ${whereClause}
       ORDER BY la.created_at ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { department = '', page = '1', pageSize = '25' } = req.query;
    
    let whereClause = "WHERE pr.status = 'PENDING'";
    const params: any[] = [];
    
    if (department) {
      whereClause += ' AND f.department = ?';
      params.push(department);
    }
    
    const limit = parseInt(pageSize as string, 10);
    const offset = (parseInt(page as string, 10) - 1) * limit;
    
    const [rows] = await pool.execute(
      `SELECT pr.*, f.name as faculty_name, f.department, f.email
       FROM product_requests pr
       JOIN faculty f ON pr.faculty_id = f.id
       ${whereClause}
       ORDER BY pr.created_at ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const reviewLeave = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    await connection.beginTransaction();
    
    await connection.execute('CALL sp_update_leave_status(?, ?, ?, ?)', [id, req.user!.id, action, reason || '']);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, reason, ip_address)
       VALUES (?, ?, 'leave_application', ?, ?, ?, ?)`,
      [req.user!.id, action === 'APPROVED' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT', id, JSON.stringify({ status: action }), reason, req.ip]
    );
    
    await connection.commit();
    res.json({ message: `Leave ${action.toLowerCase()} successfully` });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const reviewProduct = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    await connection.beginTransaction();
    
    await connection.execute(
      'UPDATE product_requests SET status = ?, admin_id = ?, admin_reason = ? WHERE id = ?',
      [action, req.user!.id, reason || '', id]
    );
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, reason, ip_address)
       VALUES (?, ?, 'product_request', ?, ?, ?, ?)`,
      [req.user!.id, action === 'APPROVED' ? 'PRODUCT_APPROVE' : 'PRODUCT_REJECT', id, JSON.stringify({ status: action }), reason, req.ip]
    );
    
    await connection.commit();
    res.json({ message: `Product request ${action.toLowerCase()} successfully` });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const approveUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    const [users]: any = await connection.execute('SELECT approved FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (users[0].approved) {
      await connection.rollback();
      return res.status(400).json({ error: 'User already approved' });
    }
    
    await connection.execute('UPDATE faculty SET approved = TRUE WHERE id = ?', [id]);
    
    await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, ip_address)
       VALUES (?, 'APPROVE_USER', 'faculty', ?, ?, ?)`,
      [req.user!.id, id, JSON.stringify({ approved: true }), req.ip]
    );
    
    await connection.commit();
    res.json({ message: 'User approved successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const rejectUser = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await connection.beginTransaction();
    
    const [users]: any = await connection.execute('SELECT approved, email, name FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (users[0].approved) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot reject already approved user' });
    }
    
    await connection.execute('CALL sp_permanent_delete_user(?, ?, ?)', [id, req.user!.id, reason || 'Registration rejected']);
    
    await connection.commit();
    res.json({ message: 'User registration rejected and removed' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const permanentDelete = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await connection.beginTransaction();
    
    const [users]: any = await connection.execute('SELECT name, email FROM faculty WHERE id = ? FOR UPDATE', [id]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    await connection.execute('CALL sp_permanent_delete_user(?, ?, ?)', [id, req.user!.id, reason]);
    
    await connection.commit();
    res.json({ message: 'User permanently deleted from database', user: users[0] });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const bulkPermanentDelete = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { ids, reason } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    await connection.beginTransaction();
    
    let succeeded = 0;
    let failed = 0;
    const deletedUsers = [];
    
    for (const id of ids) {
      try {
        const [users]: any = await connection.execute('SELECT name, email FROM faculty WHERE id = ?', [id]);
        if (users.length > 0) {
          await connection.execute('CALL sp_permanent_delete_user(?, ?, ?)', [id, req.user!.id, reason]);
          deletedUsers.push(users[0]);
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    await connection.commit();
    res.json({ message: 'Bulk permanent delete completed', succeeded, failed, deletedUsers });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const bulkApprove = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }
    
    await connection.beginTransaction();
    
    let succeeded = 0;
    let failed = 0;
    
    for (const id of ids) {
      try {
        const [users]: any = await connection.execute('SELECT approved FROM faculty WHERE id = ?', [id]);
        if (users.length > 0 && !users[0].approved) {
          await connection.execute('UPDATE faculty SET approved = TRUE WHERE id = ?', [id]);
          await connection.execute(
            `INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state, ip_address)
             VALUES (?, 'BULK_APPROVE_USER', 'faculty', ?, ?, ?)`,
            [req.user!.id, id, JSON.stringify({ approved: true }), req.ip]
          );
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    await connection.commit();
    res.json({ message: 'Bulk approval completed', succeeded, failed });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
