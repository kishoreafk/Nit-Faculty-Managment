const express = require('express');
const router = express.Router();
const autoFillController = require('../controllers/autoFill.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get available forms for faculty
router.get('/forms', autoFillController.getAvailableForms);

// Get form structure with auto-filled data
router.get('/forms/:staffType/:formType/structure', autoFillController.getFormStructure);

// Preview form with current data
router.post('/forms/:staffType/:formType/preview', autoFillController.previewForm);

// Submit form with auto-filled data
router.post('/forms/:staffType/:formType/submit', autoFillController.submitForm);

// Download filled form
router.post('/forms/:staffType/:formType/download', autoFillController.downloadForm);

// Validate form data
router.post('/forms/:staffType/:formType/validate', autoFillController.validateForm);

// Calculate leave days
router.post('/calculate-leave-days', autoFillController.calculateLeaveDays);

// Get faculty profile data
router.get('/faculty-profile', autoFillController.getFacultyProfile);

// Get field options
router.get('/field-options/:fieldName', autoFillController.getFieldOptions);

module.exports = router;