const express = require('express');
const router = express.Router();
const enhancedAutoFillController = require('../controllers/enhancedAutoFill.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Enhanced auto-fill with validation
router.post('/auto-fill-with-validation', enhancedAutoFillController.autoFillWithValidation);

// Auto-fill with current user and validation
router.post('/auto-fill-current-user', authenticateToken, enhancedAutoFillController.autoFillCurrentUserWithValidation);

// Auto-fill from leave application ID
router.post('/auto-fill-from-leave', enhancedAutoFillController.autoFillFromLeaveId);

// Validate form data without filling
router.post('/validate-form-data', enhancedAutoFillController.validateFormData);

// Get validation report
router.get('/validation-report', enhancedAutoFillController.getValidationReport);

// Batch auto-fill with validation
router.post('/batch-auto-fill', enhancedAutoFillController.batchAutoFillWithValidation);

module.exports = router;