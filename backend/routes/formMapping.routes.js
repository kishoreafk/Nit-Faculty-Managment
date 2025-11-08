const express = require('express');
const router = express.Router();
const formMappingController = require('../controllers/formMapping.controller');

// Get form structure for user input
router.get('/structure', formMappingController.getFormStructure);

// Get field mapping
router.get('/mapping', formMappingController.getFieldMapping);

// Process form input and generate PDF
router.post('/process', formMappingController.processFormInput);

// Submit leave request with form data
router.post('/submit', formMappingController.submitLeaveWithFormData);

module.exports = router;