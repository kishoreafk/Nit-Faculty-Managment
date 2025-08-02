const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const applyProductRequest = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const {
      product_name,
      purchase_date
    } = req.body;

    // Handle file uploads
    const faculty = req.user;
    const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const product_image_url = req.files?.productImage ? `/uploads/${folderName}/${req.files.productImage[0].filename}` : null;
    const bill_image_url = req.files?.billImage ? `/uploads/${folderName}/${req.files.billImage[0].filename}` : null;
    
    console.log('Apply product request received:');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    console.log('User:', req.user);
    
    console.log('Product files uploaded:');
    console.log('Product image:', product_image_url);
    console.log('Bill image:', bill_image_url);

    const [result] = await pool.execute(
      `INSERT INTO product_requests (facultyId, productName, quantity, description, priority, status, product_image_url, bill_image_url) 
       VALUES (?, ?, 1, ?, 'Medium', 'Pending', ?, ?)`,
      [facultyId, product_name, purchase_date, product_image_url, bill_image_url]
    );

    console.log('Product request inserted with ID:', result.insertId);
    console.log('Product image saved to DB:', product_image_url);
    console.log('Bill image saved to DB:', bill_image_url);

    res.status(201).json({
      message: 'Product request submitted successfully',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('Apply product request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyProductRequests = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    const [rows] = await pool.execute(
      `SELECT pr.*, CONCAT(f.firstName, ' ', f.lastName) as reviewer_name 
       FROM product_requests pr 
       LEFT JOIN faculty f ON pr.approvedBy = f.id 
       WHERE pr.facultyId = ? 
       ORDER BY pr.createdAt DESC`,
      [facultyId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Get my product requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllProductRequests = async (req, res) => {
  try {
    // Only admin can access all product requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [rows] = await pool.execute(
      `SELECT pr.*, CONCAT(f.firstName, ' ', f.lastName) as faculty_name, f.department, f.employeeId, 
              CONCAT(r.firstName, ' ', r.lastName) as reviewer_name 
       FROM product_requests pr 
       JOIN faculty f ON pr.facultyId = f.id 
       LEFT JOIN faculty r ON pr.approvedBy = r.id 
       ORDER BY pr.createdAt DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Get all product requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const reviewProductRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, decision_note, bill_number } = req.body;
    const reviewerId = req.user.facultyId;

    // Get product request details for logging
    const [productData] = await pool.execute(
      'SELECT facultyId FROM product_requests WHERE id = ?',
      [requestId]
    );

    const [result] = await pool.execute(
      `UPDATE product_requests 
       SET status = ?, approvedBy = ?, approvedAt = CURRENT_TIMESTAMP, decision_note = ? 
       WHERE id = ?`,
      [status, reviewerId, decision_note, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product request not found' });
    }

    // Log admin action
    if (productData.length > 0) {
      await pool.execute(
        `INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_item_id, details) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          reviewerId,
          status === 'Approved' ? 'product_approved' : 'product_rejected',
          productData[0].facultyId,
          requestId,
          decision_note || `Product request ${status}`
        ]
      );
    }

    res.json({ message: 'Product request reviewed successfully' });
  } catch (error) {
    console.error('Review product request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProductRequest = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { requestId } = req.params;
    const {
      product_name,
      purchase_date
    } = req.body;

    // Get the old product request to find existing file paths
    const [oldRows] = await pool.execute(
      `SELECT * FROM product_requests 
       WHERE id = ? AND facultyId = ?`,
      [requestId, facultyId]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ message: 'Product request not found or access denied' });
    }

    const oldRequest = oldRows[0];
    let oldProductImagePath = null;
    let oldBillImagePath = null;

    // Handle new file uploads
    let product_image_url = oldRequest.product_image_url;
    let bill_image_url = oldRequest.bill_image_url;

    if (req.files?.productImage) {
      if (oldRequest.product_image_url) {
        oldProductImagePath = path.join(__dirname, '..', oldRequest.product_image_url);
      }
      const faculty = req.user;
      const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      product_image_url = `/uploads/${folderName}/${req.files.productImage[0].filename}`;
      console.log('Product image updated:', product_image_url);
    }

    if (req.files?.billImage) {
      if (oldRequest.bill_image_url) {
        oldBillImagePath = path.join(__dirname, '..', oldRequest.bill_image_url);
      }
      const faculty = req.user;
      const folderName = `${faculty.firstName}_${faculty.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      bill_image_url = `/uploads/${folderName}/${req.files.billImage[0].filename}`;
      console.log('Bill image updated:', bill_image_url);
    }

    // Update database
    const [result] = await pool.execute(
      `UPDATE product_requests 
       SET productName = ?, description = ?, product_image_url = ?, bill_image_url = ? 
       WHERE id = ? AND facultyId = ?`,
      [product_name, purchase_date, product_image_url, bill_image_url, requestId, facultyId]
    );

    // Delete old files if new ones were uploaded
    if (oldProductImagePath && fs.existsSync(oldProductImagePath)) {
      fs.unlinkSync(oldProductImagePath);
      console.log('Old product image deleted from uploads folder:', oldProductImagePath);
      
      // Delete user folder if empty
      const userFolder = path.dirname(oldProductImagePath);
      if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
        fs.rmdirSync(userFolder);
        console.log('Empty user folder deleted:', userFolder);
      }
    }

    if (oldBillImagePath && fs.existsSync(oldBillImagePath)) {
      fs.unlinkSync(oldBillImagePath);
      console.log('Old bill image deleted from uploads folder:', oldBillImagePath);
      
      // Delete user folder if empty
      const userFolder = path.dirname(oldBillImagePath);
      if (fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
        fs.rmdirSync(userFolder);
        console.log('Empty user folder deleted:', userFolder);
      }
    }

    res.json({ message: 'Product request updated successfully' });
  } catch (error) {
    console.error('Update product request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteProductRequest = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;
    const { requestId } = req.params;

    // First, get the product request to find the file paths
    const [rows] = await pool.execute(
      `SELECT * FROM product_requests 
       WHERE id = ? AND facultyId = ?`,
      [requestId, facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product request not found or access denied' });
    }

    const productRequest = rows[0];

    // Delete from database
    const [result] = await pool.execute(
      `DELETE FROM product_requests 
       WHERE id = ? AND facultyId = ?`,
      [requestId, facultyId]
    );

    // Delete files from uploads folder if they exist
    let userFolder = null;
    if (productRequest.product_image_url) {
      const productImagePath = path.join(__dirname, '..', productRequest.product_image_url);
      if (fs.existsSync(productImagePath)) {
        userFolder = path.dirname(productImagePath);
        fs.unlinkSync(productImagePath);
        console.log('Product image deleted from uploads folder:', productImagePath);
      }
    }

    if (productRequest.bill_image_url) {
      const billImagePath = path.join(__dirname, '..', productRequest.bill_image_url);
      if (fs.existsSync(billImagePath)) {
        userFolder = path.dirname(billImagePath);
        fs.unlinkSync(billImagePath);
        console.log('Bill image deleted from uploads folder:', billImagePath);
      }
    }
    
    // Delete user folder if empty
    if (userFolder && fs.existsSync(userFolder) && fs.readdirSync(userFolder).length === 0) {
      fs.rmdirSync(userFolder);
      console.log('Empty user folder deleted:', userFolder);
    }

    res.json({ message: 'Product request deleted successfully' });
  } catch (error) {
    console.error('Delete product request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  applyProductRequest,
  getMyProductRequests,
  getAllProductRequests,
  reviewProductRequest,
  updateProductRequest,
  deleteProductRequest
}; 