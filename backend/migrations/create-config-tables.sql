-- Create Faculty Types Configuration Table
CREATE TABLE IF NOT EXISTS faculty_types_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON,
    benefits JSON,
    probation_period INT DEFAULT 6,
    contract_specific BOOLEAN DEFAULT FALSE,
    contract_duration VARCHAR(50),
    temporary BOOLEAN DEFAULT FALSE,
    max_tenure VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Leave Types Configuration Table
CREATE TABLE IF NOT EXISTS leave_types_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_type_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_approval BOOLEAN DEFAULT TRUE,
    requires_medical_certificate BOOLEAN DEFAULT FALSE,
    advance_notice_days INT DEFAULT 1,
    carry_forward BOOLEAN DEFAULT FALSE,
    max_carry_forward_days INT DEFAULT 0,
    encashment_allowed BOOLEAN DEFAULT FALSE,
    accrual_rate DECIMAL(5,2) DEFAULT 0,
    accrual_period VARCHAR(20) DEFAULT 'monthly',
    approval_hierarchy JSON,
    special_conditions TEXT,
    gender_specific VARCHAR(20),
    bond_required BOOLEAN DEFAULT FALSE,
    bond_period VARCHAR(50),
    partial_salary BOOLEAN DEFAULT FALSE,
    salary_deduction_percent INT DEFAULT 0,
    extendable BOOLEAN DEFAULT FALSE,
    max_extension_days INT DEFAULT 0,
    conversion_rule TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Faculty Leave Entitlements Table (Junction table for faculty types and leave types)
CREATE TABLE IF NOT EXISTS faculty_leave_entitlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_type_id VARCHAR(50) NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    max_days INT NOT NULL,
    is_applicable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    UNIQUE KEY unique_faculty_leave (faculty_type_id, leave_type_id)
);

-- Insert default faculty types
INSERT INTO faculty_types_config (type_id, name, description, permissions, benefits, probation_period, contract_specific, temporary) VALUES
('teaching', 'Teaching Faculty', 'Full-time teaching faculty members', 
 JSON_ARRAY('teach', 'research', 'leave_apply', 'grade_students', 'curriculum_development'),
 JSON_ARRAY('medical_insurance', 'provident_fund', 'gratuity', 'research_allowance'),
 6, FALSE, FALSE),
('non_teaching', 'Non-Teaching Staff', 'Administrative and support staff members',
 JSON_ARRAY('administrative', 'leave_apply', 'office_management', 'student_support'),
 JSON_ARRAY('medical_insurance', 'provident_fund', 'gratuity'),
 3, FALSE, FALSE),
('contract', 'Contract Faculty', 'Contract-based teaching faculty',
 JSON_ARRAY('teach', 'leave_apply', 'limited_research'),
 JSON_ARRAY('basic_medical', 'contract_allowance'),
 0, TRUE, FALSE),
('visiting', 'Visiting Faculty', 'Temporary visiting faculty members',
 JSON_ARRAY('teach', 'leave_apply', 'guest_research', 'collaboration'),
 JSON_ARRAY('basic_medical', 'guest_allowance'),
 0, FALSE, TRUE);

-- Insert default leave types
INSERT INTO leave_types_config (
    leave_type_id, name, description, requires_approval, requires_medical_certificate,
    advance_notice_days, carry_forward, max_carry_forward_days, encashment_allowed,
    accrual_rate, accrual_period, approval_hierarchy, special_conditions
) VALUES
('casual', 'Casual Leave', 'Short-term leave for personal reasons', TRUE, FALSE, 1, FALSE, 0, FALSE, 0, 'monthly', 
 JSON_ARRAY('hod', 'principal'), NULL),
('special_casual', 'Special Casual Leave', 'Special casual leave for urgent personal matters', TRUE, FALSE, 0, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod', 'principal'), 'For emergency situations only'),
('earned', 'Earned Leave', 'Annual earned leave for vacation and personal purposes', TRUE, FALSE, 7, TRUE, 40, TRUE, 2.5, 'monthly',
 JSON_ARRAY('hod', 'principal'), NULL),
('rh', 'Restricted Holiday', 'Leave for restricted holidays', TRUE, FALSE, 1, FALSE, 0, FALSE, 0, 'yearly',
 JSON_ARRAY('hod'), NULL),
('hpl', 'Half Pay Leave', 'Half pay leave for extended absence', TRUE, FALSE, 7, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod', 'principal'), NULL),
('hapl', 'Hospital Attendance Leave', 'Leave for hospital attendance (2 HAPL = 1 ML)', TRUE, TRUE, 0, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod'), '2 HAPL = 1 ML'),
('medical', 'Medical Leave', 'Leave for medical treatment and recovery', TRUE, TRUE, 0, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod', 'principal', 'medical_officer'), NULL),
('maternity', 'Maternity Leave', 'Maternity leave for female employees', TRUE, TRUE, 30, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod', 'principal', 'medical_officer'), NULL),
('study', 'Study Leave', 'Leave for higher studies, research, or professional development', TRUE, FALSE, 60, FALSE, 0, FALSE, 0, 'monthly',
 JSON_ARRAY('hod', 'principal', 'academic_council'), NULL);

-- Insert faculty leave entitlements
INSERT INTO faculty_leave_entitlements (faculty_type_id, leave_type_id, max_days, is_applicable) VALUES
-- Teaching Faculty
('teaching', 'casual', 8, TRUE),
('teaching', 'special_casual', 2, TRUE),
('teaching', 'earned', 80, TRUE),
('teaching', 'rh', 0, FALSE),
('teaching', 'hpl', 0, FALSE),
('teaching', 'hapl', 0, FALSE),
('teaching', 'medical', 90, TRUE),
('teaching', 'maternity', 180, TRUE),
('teaching', 'study', 365, TRUE),

-- Non-Teaching Staff
('non_teaching', 'casual', 8, TRUE),
('non_teaching', 'special_casual', 0, FALSE),
('non_teaching', 'earned', 30, TRUE),
('non_teaching', 'rh', 2, TRUE),
('non_teaching', 'hpl', 15, TRUE),
('non_teaching', 'hapl', 2, TRUE),
('non_teaching', 'medical', 90, TRUE),
('non_teaching', 'maternity', 180, TRUE),
('non_teaching', 'study', 0, FALSE),

-- Contract Faculty
('contract', 'casual', 6, TRUE),
('contract', 'special_casual', 0, FALSE),
('contract', 'earned', 0, FALSE),
('contract', 'rh', 0, FALSE),
('contract', 'hpl', 0, FALSE),
('contract', 'hapl', 0, FALSE),
('contract', 'medical', 90, TRUE),
('contract', 'maternity', 0, FALSE),
('contract', 'study', 0, FALSE),

-- Visiting Faculty
('visiting', 'casual', 3, TRUE),
('visiting', 'special_casual', 0, FALSE),
('visiting', 'earned', 0, FALSE),
('visiting', 'rh', 0, FALSE),
('visiting', 'hpl', 0, FALSE),
('visiting', 'hapl', 0, FALSE),
('visiting', 'medical', 90, TRUE),
('visiting', 'maternity', 0, FALSE),
('visiting', 'study', 0, FALSE);