const express = require('express');
const router = express.Router();
const autoFillPDFController = require('../controllers/autoFillPDF.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Auto-fill PDF form with provided data
router.post('/auto-fill', authenticateToken, autoFillPDFController.autoFillForm);

// Smart auto-fill with automatic detection
router.post('/smart-auto-fill', authenticateToken, autoFillPDFController.smartAutoFill);

// Auto-fill with current user data
router.post('/auto-fill-current-user', authenticateToken, autoFillPDFController.autoFillWithCurrentUser);

// Get available forms for auto-fill
router.get('/available-forms', authenticateToken, autoFillPDFController.getAvailableForms);

// Preview form structure
router.get('/form-structure', authenticateToken, autoFillPDFController.previewFormStructure);

// Auto-detect form type for leave
router.post('/detect-form-type', authenticateToken, autoFillPDFController.autoDetectFormType);

// Bulk auto-fill for multiple leave applications
router.post('/bulk-auto-fill', authenticateToken, autoFillPDFController.bulkAutoFill);

module.exports = router;