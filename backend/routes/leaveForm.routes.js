const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const {
  getLeaveFormTemplates,
  getFormFields,
  submitLeaveApplication,
  getMyLeaveApplications,
  getAllLeaveApplications,
  reviewLeaveApplication
} = require('../controllers/leaveForm.controller');

// Get available leave form templates
router.get('/templates', authenticateToken, getLeaveFormTemplates);

// Get form fields for specific leave category
router.get('/fields', authenticateToken, getFormFields);

// Submit leave application
router.post('/submit', authenticateToken, submitLeaveApplication);

// Get faculty's own leave applications
router.get('/my-applications', authenticateToken, getMyLeaveApplications);

// Get all leave applications (admin only)
router.get('/all-applications', authenticateToken, requireAdmin, getAllLeaveApplications);

// Review leave application (admin only)
router.put('/review/:applicationId', authenticateToken, requireAdmin, reviewLeaveApplication);

// Delete leave application
router.delete('/delete/:applicationId', authenticateToken, async (req, res) => {
  const { deleteLeaveApplication } = require('../controllers/leaveForm.controller');
  return deleteLeaveApplication(req, res);
});

// Generate PDF form for leave application
router.get('/:applicationId/generate-pdf', authenticateToken, async (req, res) => {
  const { generatePDFForm } = require('../controllers/leave.controller');
  return generatePDFForm(req, res);
});

// View generated PDF form
router.get('/:applicationId/view-form', authenticateToken, async (req, res) => {
  const { viewGeneratedForm } = require('../controllers/leave.controller');
  return viewGeneratedForm(req, res);
});

// Download generated PDF form
router.get('/:applicationId/download-form', authenticateToken, async (req, res) => {
  const { downloadGeneratedForm } = require('../controllers/leave.controller');
  return downloadGeneratedForm(req, res);
});

module.exports = router;