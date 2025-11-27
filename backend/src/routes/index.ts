import { Router } from 'express';
import multer from 'multer';
import { register, login, getProfile, getFacultyTypes } from '../controllers/authController.js';
import { getLeaveBalance, applyLeave, getLeaveApplications, updateLeaveStatus, getPendingLeaves, getLeaveHistory, getLeaveEligibility, triggerMonthlyAccrual, triggerYearlyAccrual, triggerCarryForward, getAlternateFaculty, confirmAdjustment, getMyAdjustments, getLeaveDetails, deleteLeaveApplication, updateFacultyLeaveBalance, getFacultyLeaveBalance } from '../controllers/leaveController.js';
import { getFormDefinition, submitForm, getSubmissions } from '../controllers/formController.js';
import { getPendingFaculty, approveFaculty, rejectFaculty, getAllFaculty } from '../controllers/adminController.js';
import { getDashboardSummary, getNotificationCount, getNotifications } from '../controllers/dashboardController.js';
import { createProductRequest, getMyProductRequests, getAllProductRequests, reviewProductRequest, deleteProductRequest, getProductRequestDetails } from '../controllers/productController.js';
import { createTimetableEntry, getMyTimetable, updateTimetableEntry, deleteTimetableEntry } from '../controllers/timetableController.js';
import { uploadFile, getMyFiles, downloadFile, previewFile, getCategories, adminGetAllFiles, deleteFile } from '../controllers/vaultifyController.js';
import { uploadTimetable, getMyTimetables, downloadTimetable, previewTimetable, adminGetAllTimetables, assignTimetable, unassignTimetable, getAssignedTimetable, deleteTimetableFile } from '../controllers/timetableFileController.js';
import { getAdminLogs, getLogById } from '../controllers/adminLogsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import adminUserRoutes from './adminUserRoutes.js';

const upload = multer({ dest: 'uploads/temp/' });

const router = Router();

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticate, getProfile);
router.get('/auth/faculty-types', getFacultyTypes);

// Dashboard
router.get('/dashboard/summary', authenticate, getDashboardSummary);
router.get('/dashboard/notifications', authenticate, getNotificationCount);
router.get('/dashboard/notifications/list', authenticate, getNotifications);

// Admin routes
router.get('/admin/pending-faculty', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getPendingFaculty);
router.put('/admin/faculty/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), approveFaculty);
router.put('/admin/faculty/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), rejectFaculty);
router.get('/admin/faculty', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAllFaculty);
router.get('/admin/logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAdminLogs);
router.get('/admin/logs/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getLogById);

// Leave routes
router.get('/leave/balance', authenticate, getLeaveBalance);
router.get('/leave/eligibility', authenticate, getLeaveEligibility);
router.get('/leave/history', authenticate, getLeaveHistory);
router.get('/leave/pending', authenticate, authorize('ADMIN', 'HOD', 'SUPER_ADMIN'), getPendingLeaves);
router.get('/leave/alternate-faculty', authenticate, getAlternateFaculty);
router.get('/leave/adjustments/my', authenticate, getMyAdjustments);
router.post('/leave/apply', authenticate, applyLeave);
router.get('/leave/applications', authenticate, getLeaveApplications);
router.get('/leave/:id', authenticate, getLeaveDetails);
router.delete('/leave/:id', authenticate, deleteLeaveApplication);
router.put('/leave/:id/status', authenticate, authorize('ADMIN', 'HOD', 'SUPER_ADMIN'), updateLeaveStatus);
router.put('/leave/adjustments/:id/confirm', authenticate, confirmAdjustment);

// Leave accrual admin routes
router.post('/admin/leave/accrual/monthly', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), triggerMonthlyAccrual);
router.post('/admin/leave/accrual/yearly', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), triggerYearlyAccrual);
router.post('/admin/leave/carry-forward', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), triggerCarryForward);
router.get('/admin/leave/balance/:facultyId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getFacultyLeaveBalance);
router.put('/admin/leave/balance', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateFacultyLeaveBalance);

// Product requests
router.post('/product-requests', authenticate, createProductRequest);
router.get('/product-requests/my', authenticate, getMyProductRequests);
router.get('/product-requests/:id', authenticate, getProductRequestDetails);
router.delete('/product-requests/:id', authenticate, deleteProductRequest);
router.get('/admin/product-requests', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAllProductRequests);
router.put('/admin/product-requests/:id/review', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), reviewProductRequest);

// Timetable
router.post('/timetable', authenticate, createTimetableEntry);
router.get('/timetable/my', authenticate, getMyTimetable);
router.put('/timetable/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateTimetableEntry);
router.delete('/timetable/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteTimetableEntry);

// Form routes
router.get('/forms/:category', authenticate, getFormDefinition);
router.post('/forms/submit', authenticate, submitForm);
router.get('/forms/submissions', authenticate, getSubmissions);

// Admin user management routes
router.use('/admin', adminUserRoutes);

// Vaultify routes
router.post('/vaultify/upload', authenticate, upload.single('file'), uploadFile);
router.get('/vaultify/my', authenticate, getMyFiles);
router.get('/vaultify/files/:id/download', authenticate, downloadFile);
router.get('/vaultify/files/:id/preview', authenticate, previewFile);
router.delete('/vaultify/files/:id', authenticate, deleteFile);
router.get('/vaultify/categories', authenticate, getCategories);
router.get('/admin/vaultify/files', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminGetAllFiles);

// Timetable file routes
router.post('/timetables/upload', authenticate, upload.single('file'), uploadTimetable);
router.get('/timetables/my', authenticate, getMyTimetables);
router.get('/timetables/:id/download', authenticate, downloadTimetable);
router.get('/timetables/:id/preview', authenticate, previewTimetable);
router.delete('/timetables/:id', authenticate, deleteTimetableFile);
router.get('/timetables/assigned/me', authenticate, getAssignedTimetable);
router.get('/admin/timetables', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminGetAllTimetables);
router.post('/admin/timetables/assign', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), assignTimetable);
router.post('/admin/timetables/unassign', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), unassignTimetable);

export default router;
