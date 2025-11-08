const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// Get signup configuration (departments and faculty types)
router.get('/signup', async (req, res) => {
  try {
    // Read main config file
    const configPath = path.join(__dirname, '../config/signup-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Read departments from separate file
    const departmentsPath = path.join(__dirname, '../config/departments.json');
    const departmentsData = await fs.readFile(departmentsPath, 'utf8');
    const departments = JSON.parse(departmentsData);
    
    // Read faculty types from separate file
    const facultyTypesPath = path.join(__dirname, '../config/faculty-types.json');
    const facultyTypesData = await fs.readFile(facultyTypesPath, 'utf8');
    const facultyTypes = JSON.parse(facultyTypesData);
    
    res.json({
      success: true,
      data: {
        ...config,
        departments: departments.departments,
        facultyTypes: facultyTypes.facultyTypes
      }
    });
  } catch (error) {
    console.error('Error reading signup config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load signup configuration',
      error: error.message
    });
  }
});

// Get leave application configuration
router.get('/leave-applications', async (req, res) => {
  try {
    // Read main config file
    const configPath = path.join(__dirname, '../config/leave-application-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Read leave types from separate file
    const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
    const leaveTypesData = await fs.readFile(leaveTypesPath, 'utf8');
    const leaveTypes = JSON.parse(leaveTypesData);
    
    // Read form templates from separate file
    const formTemplatesPath = path.join(__dirname, '../config/leave-form-templates.json');
    const formTemplatesData = await fs.readFile(formTemplatesPath, 'utf8');
    const formTemplates = JSON.parse(formTemplatesData);
    
    res.json({
      success: true,
      data: {
        ...config,
        leaveTypes: leaveTypes.leaveTypes,
        formTemplates: formTemplates.formTemplates
      }
    });
  } catch (error) {
    console.error('Error reading leave application config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load leave application configuration',
      error: error.message
    });
  }
});

// Get all leave types
router.get('/leave-types', async (req, res) => {
  try {
    const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
    const leaveTypesData = await fs.readFile(leaveTypesPath, 'utf8');
    const leaveTypesConfig = JSON.parse(leaveTypesData);
    
    res.json({
      success: true,
      data: {
        leaveTypes: leaveTypesConfig.leaveTypes
      }
    });
  } catch (error) {
    console.error('Error reading leave types config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load leave types configuration',
      error: error.message
    });
  }
});

// Get leave types for specific faculty type
router.get('/leave-types/:facultyType', async (req, res) => {
  try {
    const { facultyType } = req.params;
    
    // Read leave types from separate file
    const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
    const leaveTypesData = await fs.readFile(leaveTypesPath, 'utf8');
    const leaveTypesConfig = JSON.parse(leaveTypesData);
    
    // Read form templates from separate file
    const formTemplatesPath = path.join(__dirname, '../config/leave-form-templates.json');
    const formTemplatesData = await fs.readFile(formTemplatesPath, 'utf8');
    const formTemplatesConfig = JSON.parse(formTemplatesData);
    
    // Filter leave types applicable for the faculty type
    const applicableLeaveTypes = {};
    Object.keys(leaveTypesConfig.leaveTypes).forEach(leaveTypeId => {
      const leaveType = leaveTypesConfig.leaveTypes[leaveTypeId];
      if (leaveType.applicableFor.includes(facultyType)) {
        applicableLeaveTypes[leaveTypeId] = leaveType;
      }
    });
    
    res.json({
      success: true,
      data: {
        leaveTypes: applicableLeaveTypes,
        formTemplates: formTemplatesConfig.formTemplates[facultyType] || {}
      }
    });
  } catch (error) {
    console.error('Error reading leave types config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load leave types configuration',
      error: error.message
    });
  }
});

// Get form template for specific faculty type and leave type
router.get('/form-template/:facultyType/:leaveType', async (req, res) => {
  try {
    const { facultyType, leaveType } = req.params;
    
    // Read form templates from separate file
    const formTemplatesPath = path.join(__dirname, '../config/leave-form-templates.json');
    const formTemplatesData = await fs.readFile(formTemplatesPath, 'utf8');
    const formTemplatesConfig = JSON.parse(formTemplatesData);
    
    // Read leave types from separate file
    const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
    const leaveTypesData = await fs.readFile(leaveTypesPath, 'utf8');
    const leaveTypesConfig = JSON.parse(leaveTypesData);
    
    const template = formTemplatesConfig.formTemplates[facultyType]?.[leaveType];
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Form template not found for ${facultyType} - ${leaveType}`
      });
    }
    
    res.json({
      success: true,
      data: {
        template,
        leaveTypeInfo: leaveTypesConfig.leaveTypes[leaveType]
      }
    });
  } catch (error) {
    console.error('Error reading form template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load form template',
      error: error.message
    });
  }
});

// Update signup configuration (admin only)
router.put('/signup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Add authentication middleware check here if needed
    const updatedConfig = req.body;
    
    // Validate the configuration structure
    if (!updatedConfig.departments || !updatedConfig.facultyTypes) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration structure'
      });
    }
    
    // Update departments file
    const departmentsPath = path.join(__dirname, '../config/departments.json');
    await fs.writeFile(departmentsPath, JSON.stringify({ departments: updatedConfig.departments }, null, 2));
    
    // Update faculty types file
    const facultyTypesPath = path.join(__dirname, '../config/faculty-types.json');
    await fs.writeFile(facultyTypesPath, JSON.stringify({ facultyTypes: updatedConfig.facultyTypes }, null, 2));
    
    // Update main config file (excluding departments and facultyTypes as they're in separate files)
    const configPath = path.join(__dirname, '../config/signup-config.json');
    const mainConfig = { ...updatedConfig };
    delete mainConfig.departments;
    delete mainConfig.facultyTypes;
    await fs.writeFile(configPath, JSON.stringify(mainConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Signup configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating signup config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update signup configuration',
      error: error.message
    });
  }
});

// Update leave application configuration (admin only)
router.put('/leave-applications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Add authentication middleware check here if needed
    const updatedConfig = req.body;
    
    // Validate the configuration structure
    if (!updatedConfig.leaveTypes || !updatedConfig.formTemplates) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration structure'
      });
    }
    
    // Update leave types file
    const leaveTypesPath = path.join(__dirname, '../config/leave-types.json');
    await fs.writeFile(leaveTypesPath, JSON.stringify({ leaveTypes: updatedConfig.leaveTypes }, null, 2));
    
    // Update form templates file
    const formTemplatesPath = path.join(__dirname, '../config/leave-form-templates.json');
    await fs.writeFile(formTemplatesPath, JSON.stringify({ formTemplates: updatedConfig.formTemplates }, null, 2));
    
    // Update main config file (excluding leaveTypes and formTemplates as they're in separate files)
    const configPath = path.join(__dirname, '../config/leave-application-config.json');
    const mainConfig = { ...updatedConfig };
    delete mainConfig.leaveTypes;
    delete mainConfig.formTemplates;
    await fs.writeFile(configPath, JSON.stringify(mainConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Leave application configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating leave application config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave application configuration',
      error: error.message
    });
  }
});

module.exports = router;