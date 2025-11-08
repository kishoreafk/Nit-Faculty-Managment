-- Faculty Management System Database Setup - MySQL Version
-- =================================================================
-- This file contains all SQL commands to create the complete nit_faculty database
-- Run with: mysql -u root -p"Naveenaa@0205" < database.sql

CREATE DATABASE IF NOT EXISTS nit_faculty;
USE nit_faculty;

-- Faculty Types Configuration Table
CREATE TABLE IF NOT EXISTS faculty_types_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT,
    benefits TEXT,
    probation_period INT DEFAULT 6,
    contract_specific TINYINT DEFAULT 0,
    contract_duration VARCHAR(255),
    temporary TINYINT DEFAULT 0,
    max_tenure VARCHAR(255),
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Leave Types Configuration Table
CREATE TABLE IF NOT EXISTS leave_types_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_type_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_approval TINYINT DEFAULT 1,
    requires_medical_certificate TINYINT DEFAULT 0,
    advance_notice_days INT DEFAULT 1,
    carry_forward TINYINT DEFAULT 0,
    max_carry_forward_days INT DEFAULT 0,
    encashment_allowed TINYINT DEFAULT 0,
    accrual_rate DECIMAL(5,2) DEFAULT 0,
    accrual_period VARCHAR(20) DEFAULT 'monthly',
    approval_hierarchy TEXT,
    special_conditions TEXT,
    gender_specific VARCHAR(20),
    bond_required TINYINT DEFAULT 0,
    bond_period VARCHAR(50),
    partial_salary TINYINT DEFAULT 0,
    salary_deduction_percent INT DEFAULT 0,
    extendable TINYINT DEFAULT 0,
    max_extension_days INT DEFAULT 0,
    conversion_rule TEXT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Faculty Leave Entitlements Table (Junction table for faculty types and leave types)
CREATE TABLE IF NOT EXISTS faculty_leave_entitlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_type_id VARCHAR(50) NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    max_days INT NOT NULL,
    is_applicable TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    UNIQUE KEY unique_faculty_leave (faculty_type_id, leave_type_id)
);

-- Main Faculty Table
CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    employeeId VARCHAR(50) UNIQUE,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    role ENUM('faculty', 'admin') DEFAULT 'faculty',
    is_approved TINYINT DEFAULT 1,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    joiningDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    faculty_type_id VARCHAR(50) DEFAULT 'teaching',
    gender VARCHAR(20),
    date_of_birth DATE,
    join_quarter VARCHAR(10),
    is_active TINYINT DEFAULT 1,
    FOREIGN KEY (approved_by) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Leave Balance Tables
-- =================================================================

-- Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    allocated_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    balance_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    carry_forward_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    UNIQUE KEY unique_faculty_leave_year (faculty_id, leave_type_id, year)
);

-- Leave Balance History Table
CREATE TABLE IF NOT EXISTS leave_balance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    transaction_type ENUM('allocation', 'usage', 'carry_forward', 'adjustment', 'encashment') NOT NULL,
    days_changed DECIMAL(5,2) NOT NULL,
    balance_before DECIMAL(5,2) NOT NULL,
    balance_after DECIMAL(5,2) NOT NULL,
    reference_id INT,
    reference_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Leave Accrual Rules Table
CREATE TABLE IF NOT EXISTS leave_accrual_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    faculty_type_id VARCHAR(50) NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    accrual_period ENUM('monthly', 'quarterly', 'yearly', 'daily') DEFAULT 'monthly',
    accrual_amount DECIMAL(8,2) NOT NULL,
    max_carry_over INT,
    unlimited_leave TINYINT DEFAULT 0,
    service_months_from INT DEFAULT 0,
    service_months_to INT DEFAULT 999,
    calculation_method ENUM('fixed', 'progressive', 'formula_based', 'custom') DEFAULT 'fixed',
    progressive_rates TEXT,
    calculation_formula TEXT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    accrual_settings TEXT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Application and Request Tables
-- =================================================================

-- Leave Form Templates Table
CREATE TABLE IF NOT EXISTS leave_form_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_name VARCHAR(255) NOT NULL,
    staff_type ENUM('Teaching', 'Non-Teaching') NOT NULL,
    leave_categories TEXT NOT NULL,
    form_fields JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Leave Applications Table
CREATE TABLE IF NOT EXISTS leave_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    template_id INT NOT NULL,
    leave_category VARCHAR(100) NOT NULL,
    form_data JSON NOT NULL,
    calculated_days INT DEFAULT 0,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    generated_pdf_path VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES leave_form_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Leave Requests Table (Legacy)
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leaveType ENUM('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave',
                    'Activity Leave', 'Conference Leave', 'Compensatory Leave', 'RH Leave', 'Special Leave',
                    'Commuted Leave', 'Half Pay Leave', 'General Leave', 'Medical Leave') NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    reason TEXT NOT NULL,
    alternativeArrangement TEXT,
    contactDuringLeave VARCHAR(255) NULL,
    medicalCertificate TINYINT DEFAULT 0,
    proofFile VARCHAR(500) NULL,
    proofFileName VARCHAR(255) NULL,
    generated_form_path VARCHAR(500) NULL,
    template_used VARCHAR(255) NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approvedBy INT NULL,
    approvedAt TIMESTAMP NULL,
    rejectionReason TEXT NULL,
    illnessNature TEXT NULL,
    expectedDeliveryDate DATE NULL,
    leavePurpose VARCHAR(255) NULL,
    activityDetails TEXT NULL,
    activityVenue VARCHAR(255) NULL,
    staff_type VARCHAR(50) DEFAULT 'Teaching',
    form_field_data JSON NULL,
    pdf_field_mapping JSON NULL,
    adjustmentStaffName VARCHAR(255) NULL,
    adjustmentDate DATE NULL,
    adjustmentTime TIME NULL,
    adjustmentNameAndDepartment VARCHAR(255) NULL,
    address TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Adjustment Duties Table
CREATE TABLE IF NOT EXISTS leave_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_application_id INT NOT NULL,
    adjustment_faculty_id INT,
    adjustment_faculty_name VARCHAR(255),
    subject_code VARCHAR(20),
    subject_name VARCHAR(255),
    class_section VARCHAR(50),
    date DATE NOT NULL,
    time_from TIME,
    time_to TIME,
    period_number INT,
    adjustment_type ENUM('class', 'duty', 'exam', 'other') DEFAULT 'class',
    status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (adjustment_faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Administrative Tables
-- =================================================================

-- Product Requests Table
CREATE TABLE IF NOT EXISTS product_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    productName VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    status ENUM('Pending', 'Approved', 'Rejected', 'Delivered') DEFAULT 'Pending',
    approvedBy INT,
    approvedAt TIMESTAMP NULL,
    product_image_url VARCHAR(500) NULL,
    bill_image_url VARCHAR(500) NULL,
    decision_note TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    originalName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT,
    fileType VARCHAR(100),
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Teaching Related Tables
-- =================================================================

-- Course Plans Table
CREATE TABLE IF NOT EXISTS course_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    courseName VARCHAR(100) NOT NULL,
    courseCode VARCHAR(20) NOT NULL,
    semester VARCHAR(20),
    academicYear VARCHAR(20),
    description TEXT,
    objectives TEXT,
    syllabus TEXT,
    courseMaterialFile VARCHAR(500) NULL,
    courseMaterialFileName VARCHAR(255) NULL,
    status ENUM('Draft', 'Submitted', 'Approved') DEFAULT 'Draft',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Faculty Timetables Table
CREATE TABLE IF NOT EXISTS faculty_timetables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    timetable_image_url VARCHAR(500) NOT NULL,
    semester VARCHAR(20),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id INT,
    target_item_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Indexes for Performance
-- =================================================================

CREATE INDEX idx_faculty_email ON faculty(email);
CREATE INDEX idx_faculty_employeeId ON faculty(employeeId);
CREATE INDEX idx_faculty_department ON faculty(department);
CREATE INDEX idx_faculty_role ON faculty(role);
CREATE INDEX idx_faculty_faculty_type ON faculty(faculty_type_id);

CREATE INDEX idx_leave_applications_faculty_id ON leave_applications(faculty_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_leave_applications_created_at ON leave_applications(created_at);

CREATE INDEX idx_leave_form_templates_staff_type ON leave_form_templates(staff_type);

CREATE INDEX idx_leave_requests_faculty_id ON leave_requests(faculty_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_leave_type ON leave_requests(leaveType);
CREATE INDEX idx_leave_requests_created_at ON leave_requests(createdAt);

CREATE INDEX idx_leave_balances_faculty_year ON leave_balances(faculty_id, year);
CREATE INDEX idx_leave_balances_leave_type ON leave_balances(leave_type_id);

CREATE INDEX idx_accrual_rules_faculty_leave ON leave_accrual_rules(faculty_type_id, leave_type_id, service_months_from, service_months_to);
CREATE INDEX idx_accrual_rules_effective_dates ON leave_accrual_rules(effective_from, effective_to, is_active);
CREATE INDEX idx_accrual_rules_lookup ON leave_accrual_rules(faculty_type_id, leave_type_id, is_active);

CREATE INDEX idx_balance_history_faculty_year ON leave_balance_history(faculty_id, year);
CREATE INDEX idx_balance_history_transaction ON leave_balance_history(transaction_type);
CREATE INDEX idx_balance_history_reference ON leave_balance_history(reference_type, reference_id);

CREATE INDEX idx_adjustments_leave_application ON leave_adjustments(leave_application_id);
CREATE INDEX idx_adjustments_faculty ON leave_adjustments(adjustment_faculty_id);
CREATE INDEX idx_adjustments_date ON leave_adjustments(date);

-- Sample Data Insertion
-- =================================================================

INSERT IGNORE INTO faculty_types_config (type_id, name, description, permissions, benefits, probation_period, contract_specific, temporary) VALUES
('teaching', 'Teaching Faculty', 'Full-time teaching faculty members',
 '{"teach": "true", "research": "true", "leave_apply": "true", "curriculum_development": "true", "grade_students": "true"}',
 '{"medical_insurance": "true", "provident_fund": "true", "gratuity": "true", "research_allowance": "true"}',
 6, 0, 0),
('non_teaching', 'Non-Teaching Staff', 'Administrative and support staff members',
 '{"administrative": "true", "leave_apply": "true", "office_management": "true", "student_support": "true"}',
 '{"medical_insurance": "true", "provident_fund": "true", "gratuity": "true"}',
 3, 0, 0),
('contract', 'Contract Faculty', 'Contract-based teaching faculty',
 '{"teach": "true", "leave_apply": "true", "limited_research": "true"}',
 '{"basic_medical": "true", "contract_allowance": "true"}',
 0, 1, 0),
('visiting', 'Visiting Faculty', 'Temporary visiting faculty members',
 '{"teach": "true", "leave_apply": "true", "guest_research": "true", "collaboration": "true"}',
 '{"basic_medical": "true", "guest_allowance": "true"}',
 0, 0, 1);

INSERT IGNORE INTO leave_types_config (
    leave_type_id, name, description, requires_approval, requires_medical_certificate,
    advance_notice_days, carry_forward, max_carry_forward_days, encashment_allowed,
    accrual_rate, accrual_period, approval_hierarchy, special_conditions
) VALUES
('casual', 'Casual Leave', 'Short-term leave for personal reasons', 1, 0, 1, 0, 0, 0, 0, 'monthly',
 '["hod", "principal"]', NULL),
('special_casual', 'Special Casual Leave', 'Special casual leave for urgent personal matters', 1, 0, 0, 0, 0, 0, 0, 'monthly',
 '["hod", "principal"]', 'For emergency situations only'),
('earned', 'Earned Leave', 'Annual earned leave for vacation and personal purposes', 1, 0, 7, 1, 40, 1, 2.5, 'monthly',
 '["hod", "principal"]', NULL),
('rh', 'Restricted Holiday', 'Leave for restricted holidays', 1, 0, 1, 0, 0, 0, 0, 'yearly',
 '["hod"]', NULL),
('hpl', 'Half Pay Leave', 'Half pay leave for extended absence', 1, 0, 7, 0, 0, 0, 0, 'monthly',
 '["hod", "principal"]', NULL),
('hapl', 'Hospital Attendance Leave', 'Leave for hospital attendance (2 HAPL = 1 ML)', 1, 1, 0, 0, 0, 0, 0, 'monthly',
 '["hod"]', '2 HAPL = 1 ML'),
('medical', 'Medical Leave', 'Leave for medical treatment and recovery', 1, 1, 0, 0, 0, 0, 0, 'monthly',
 '["hod", "principal", "medical_officer"]', NULL),
('maternity', 'Maternity Leave', 'Maternity leave for female employees', 1, 1, 30, 0, 0, 0, 0, 'monthly',
 '["hod", "principal", "medical_officer"]', NULL),
('study', 'Study Leave', 'Leave for higher studies, research, or professional development', 1, 0, 60, 0, 0, 0, 0, 'monthly',
 '["hod", "principal", "academic_council"]', NULL);

INSERT IGNORE INTO faculty_leave_entitlements (faculty_type_id, leave_type_id, max_days, is_applicable) VALUES
('teaching', 'casual', 8, 1),
('teaching', 'special_casual', 2, 1),
('teaching', 'earned', 80, 1),
('teaching', 'rh', 0, 0),
('teaching', 'hpl', 0, 0),
('teaching', 'hapl', 0, 0),
('teaching', 'medical', 90, 1),
('teaching', 'maternity', 180, 1),
('teaching', 'study', 365, 1),

('non_teaching', 'casual', 8, 1),
('non_teaching', 'special_casual', 0, 0),
('non_teaching', 'earned', 30, 1),
('non_teaching', 'rh', 2, 1),
('non_teaching', 'hpl', 15, 1),
('non_teaching', 'hapl', 2, 1),
('non_teaching', 'medical', 90, 1),
('non_teaching', 'maternity', 180, 1),
('non_teaching', 'study', 0, 0),

('contract', 'casual', 6, 1),
('contract', 'special_casual', 0, 0),
('contract', 'earned', 0, 0),
('contract', 'rh', 0, 0),
('contract', 'hpl', 0, 0),
('contract', 'hapl', 0, 0),
('contract', 'medical', 90, 1),
('contract', 'maternity', 0, 0),
('contract', 'study', 0, 0),

('visiting', 'casual', 3, 1),
('visiting', 'special_casual', 0, 0),
('visiting', 'earned', 0, 0),
('visiting', 'rh', 0, 0),
('visiting', 'hpl', 0, 0),
('visiting', 'hapl', 0, 0),
('visiting', 'medical', 90, 1),
('visiting', 'maternity', 0, 0),
('visiting', 'study', 0, 0);

INSERT IGNORE INTO faculty (firstName, lastName, email, password, phone, department, employeeId, designation, role, is_approved, faculty_type_id, gender) VALUES
('John', 'Doe', 'john.doe@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567890', 'Computer Science', 'EMP001', 'Assistant Professor', 'faculty', 1, 'teaching', 'Male'),
('Jane', 'Smith', 'jane.smith@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567891', 'Mathematics', 'EMP002', 'Associate Professor', 'faculty', 1, 'teaching', 'Female'),
('Raj', 'Kumar', 'raj.kumar@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567892', 'Physics', 'EMP003', 'Professor', 'faculty', 1, 'teaching', 'Male'),
('Priya', 'Sharma', 'priya.sharma@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567893', 'Chemistry', 'EMP004', 'Assistant Professor', 'faculty', 1, 'teaching', 'Female'),
('Admin', 'User', 'admin@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567894', 'Administration', 'ADMIN001', 'Admin', 'admin', 1, 'teaching', 'Male'),
('Sarah', 'Wilson', 'sarah.wilson@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567895', 'Library', 'LIB001', 'Librarian', 'faculty', 1, 'non_teaching', 'Female'),
('Mike', 'Johnson', 'mike.johnson@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567896', 'Accounts', 'ACC001', 'Accountant', 'faculty', 1, 'non_teaching', 'Male');

INSERT IGNORE INTO leave_form_templates (form_name, staff_type, leave_categories, form_fields) VALUES
('CL Form - Faculty Regular', 'Teaching',
 '["Casual Leave", "Compensatory Leave", "RH Leave", "Special Leave"]',
 '{"name": "leave_type", "label": "Leave Type", "type": "select", "required": true, "options": ["Casual Leave", "Compensatory Leave", "RH Leave", "Special Leave"], "name2": "name", "label2": "Name", "type2": "text", "required2": true, "auto_fill2": "faculty_name", "name3": "designation", "label3": "Designation", "type3": "text", "required3": true, "auto_fill3": "faculty_designation"}'),

('EL Form - Faculty Regular', 'Teaching',
 '["Earned Leave", "Commuted Leave", "Half Pay Leave"]',
 '{"name": "leave_type", "label": "Leave Type", "type": "select", "required": true, "options": ["Earned Leave", "Commuted Leave", "Half Pay Leave"], "name2": "name", "label2": "Name", "type2": "text", "required2": true, "auto_fill2": "faculty_name", "name3": "designation", "label3": "Designation", "type3": "text", "required3": true, "auto_fill3": "faculty_designation"}'),

('CL Form - Non Teaching Staff Regular', 'Non-Teaching',
 '["Casual Leave", "Compensatory Leave", "RH Leave"]',
 '{"name": "leave_type", "label": "Leave Type", "type": "select", "required": true, "options": ["Casual Leave", "Compensatory Leave", "RH Leave"], "name2": "name", "label2": "Name", "type2": "text", "required2": true, "auto_fill2": "faculty_name", "name3": "designation", "label3": "Designation", "type3": "text", "required3": true, "auto_fill3": "faculty_designation"}'),

('EL Form - Non Teaching Staff Regular', 'Non-Teaching',
 '["Earned Leave", "Commuted Leave", "Half Pay Leave"]',
 '{"name": "leave_type", "label": "Leave Type", "type": "select", "required": true, "options": ["Earned Leave", "Commuted Leave", "Half Pay Leave"], "name2": "name", "label2": "Name", "type2": "text", "required2": true, "auto_fill2": "faculty_name", "name3": "designation", "label3": "Designation", "type3": "text", "required3": true, "auto_fill3": "faculty_designation"}');

INSERT IGNORE INTO leave_accrual_rules (
    rule_name, faculty_type_id, leave_type_id, accrual_period, accrual_amount,
    max_carry_over, unlimited_leave, service_months_from, service_months_to,
    calculation_method, progressive_rates, effective_from, accrual_settings
) VALUES
('Teaching EL Progressive', 'teaching', 'earned', 'monthly', 2.50, 15, 0, 0, 999, 'progressive',
 '{"0-24": 1.0, "24-60": 1.2, "60-120": 1.4, "120+": 1.6}', '2024-01-01',
 '{"proration": true, "accrual_timing": "start_of_month"}'),

('Teaching CL Fixed', 'teaching', 'casual', 'monthly', 1.00, 0, 0, 0, 999, 'fixed',
 NULL, '2024-01-01',
 '{"proration": false, "reset_yearly": true}'),

('Non-Teaching EL Standard', 'non_teaching', 'earned', 'monthly', 2.50, 15, 0, 0, 999, 'progressive',
 '{"0-24": 1.0, "24-60": 1.1, "60+": 1.3}', '2024-01-01',
 '{"proration": true, "accrual_timing": "start_of_month"}'),

('Non-Teaching CL Fixed', 'non_teaching', 'casual', 'monthly', 1.00, 0, 0, 0, 999, 'fixed',
 NULL, '2024-01-01',
 '{"proration": false, "reset_yearly": true}'),

('Medical Leave Teaching', 'teaching', 'medical', 'yearly', 90.00, NULL, 1, 0, 999, 'fixed',
 NULL, '2024-01-01',
 '{"unlimited": true, "medical_certificate_required": true}'),

('Medical Leave Non-Teaching', 'non_teaching', 'medical', 'yearly', 90.00, NULL, 1, 0, 999, 'fixed',
 NULL, '2024-01-01',
 '{"unlimited": true, "medical_certificate_required": true}');

COMMIT;
