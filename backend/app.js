const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const facultyRoutes = require('./routes/faculty.routes');
const leaveRoutes = require('./routes/leave.routes');
const leaveFormRoutes = require('./routes/leaveForm.routes');
const productRoutes = require('./routes/product.routes');
const fileRoutes = require('./routes/file.routes');
const courseRoutes = require('./routes/course.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const configRoutes = require('./routes/config.routes');
const systemConfigRoutes = require('./routes/system-config.routes');
const leaveBalanceRoutes = require('./routes/leaveBalance.routes');
const adminLeaveBalanceRoutes = require('./routes/admin-leave-balance.routes');
const enhancedLeaveCalculationRoutes = require('./routes/enhanced-leave-calculation.routes');
const enhancedLeaveCalculatorRoutes = require('./routes/enhancedLeaveCalculator.routes');
const monthlyLeaveCalculationRoutes = require('./routes/monthly-leave-calculation.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-domain.com'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests for all routes
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/leave-forms', leaveFormRoutes);
app.use('/api/product', productRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/enhanced-system-config', require('./routes/enhanced-system-config.routes'));
app.use('/api/enhanced-leave', require('./routes/enhanced-leave-config.routes'));
app.use('/api/leave-balance', leaveBalanceRoutes);
app.use('/api/admin', adminLeaveBalanceRoutes);
app.use('/api/leave', enhancedLeaveCalculationRoutes);
app.use('/api/enhanced-leave-calculator', enhancedLeaveCalculatorRoutes);
app.use('/api/monthly-leave-calculation', monthlyLeaveCalculationRoutes);
app.use('/api/enhanced-leave-accrual', require('./routes/enhanced-leave-accrual.routes'));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Faculty Management System API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app; 