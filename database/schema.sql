CREATE DATABASE IF NOT EXISTS faculty_management;
USE faculty_management;
-- ============================================
-- FACULTY MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- ============================================

-- Drop existing tables
DROP TABLE IF EXISTS vaultify_access_logs;
DROP TABLE IF EXISTS vaultify_files;
DROP TABLE IF EXISTS product_requests;
DROP TABLE IF EXISTS course_plans;
DROP TABLE IF EXISTS timetable;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS leave_applications;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS leave_rules;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS form_submissions;
DROP TABLE IF EXISTS form_fields;
DROP TABLE IF EXISTS form_definitions;
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS faculty_activity_logs;
DROP TABLE IF EXISTS faculty_history;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS faculty_types;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS research_projects;

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name ENUM('FACULTY','ADMIN','HOD','SUPER_ADMIN') NOT NULL UNIQUE,
  permissions JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, permissions) VALUES
('SUPER_ADMIN', '["all"]'),
('ADMIN', '["manage_users","approve_leave","approve_products","view_all"]'),
('HOD', '["approve_leave", "view_department", "manage_timetable"]'),
('FACULTY', '["apply_leave", "view_own", "upload_documents"]');

-- Ensure FACULTY role is id=4 for new registrations
-- If roles are already created, this comment serves as documentation

-- ============================================
-- FACULTY TYPES & FACULTY
-- ============================================
CREATE TABLE faculty_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category ENUM('Teaching','NonTeaching','Contract','Visiting') NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO faculty_types (name, category, description) VALUES
('Assistant Professor', 'Teaching', 'Regular teaching faculty'),
('Associate Professor', 'Teaching', 'Senior teaching faculty'),
('Professor', 'Teaching', 'Senior-most teaching faculty'),
('Lab Assistant', 'NonTeaching', 'Laboratory support staff'),
('Visiting Faculty', 'Visiting', 'Part-time visiting faculty'),
('Contract Faculty', 'Contract', 'Contract-based faculty');

CREATE TABLE faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  faculty_type_id INT NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  doj DATE,
  gender ENUM('MALE','FEMALE','OTHER') DEFAULT NULL,
  experience_years INT DEFAULT 0,
  qualification VARCHAR(255),
  profile_image VARCHAR(255),
  approved BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  created_by_admin INT NULL,
  force_password_reset BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (faculty_type_id) REFERENCES faculty_types(id),
  FOREIGN KEY (created_by_admin) REFERENCES faculty(id),
  INDEX idx_email (email),
  INDEX idx_employee_id (employee_id),
  INDEX idx_department (department),
  INDEX idx_deleted (deleted)
);

CREATE TABLE faculty_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);

CREATE TABLE faculty_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  action VARCHAR(100),
  module VARCHAR(50),
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  INDEX idx_faculty_action (faculty_id, action)
);

-- ============================================
-- AUTHENTICATION
-- ============================================
CREATE TABLE auth_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  refresh_token VARCHAR(512) NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  INDEX idx_token (refresh_token(255)),
  INDEX idx_faculty_revoked (faculty_id, revoked)
);

-- ============================================
-- DYNAMIC FORM ENGINE
-- ============================================
CREATE TABLE form_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category ENUM('LEAVE','COURSE','PRODUCT','PROFILE','RESEARCH','PERFORMANCE') NOT NULL,
  faculty_type_id INT NULL,
  version INT DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_type_id) REFERENCES faculty_types(id),
  INDEX idx_category (category, active)
);

CREATE TABLE form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,
  type ENUM('text','number','textarea','select','date','checkbox','file','signature') NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  options_json JSON,
  validation_json JSON,
  autofill_key VARCHAR(100),
  visible_if JSON,
  default_value VARCHAR(255),
  FOREIGN KEY (form_id) REFERENCES form_definitions(id) ON DELETE CASCADE,
  INDEX idx_form_order (form_id, order_index)
);

CREATE TABLE form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  faculty_id INT NOT NULL,
  category ENUM('LEAVE','PRODUCT','COURSE','VAULTIFY','RESEARCH','PERFORMANCE') NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','IN_PROGRESS') DEFAULT 'PENDING',
  reviewer_id INT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES form_definitions(id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (reviewer_id) REFERENCES faculty(id),
  INDEX idx_faculty_status (faculty_id, status),
  INDEX idx_category (category, status)
);

-- ============================================
-- LEAVE MANAGEMENT SYSTEM
-- ============================================
CREATE TABLE leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  max_balance FLOAT DEFAULT NULL,
  accrual_rate FLOAT DEFAULT NULL,
  accrual_period ENUM('DAILY','MONTHLY','YEARLY','ONE_TIME') DEFAULT 'MONTHLY',
  carry_forward BOOLEAN DEFAULT TRUE,
  probation_excluded BOOLEAN DEFAULT FALSE,
  min_service_months INT DEFAULT 0,
  gender_restriction ENUM('ALL','MALE','FEMALE') DEFAULT 'ALL',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leave_types (name, code, description, accrual_rate, accrual_period, max_balance, carry_forward, probation_excluded, min_service_months, gender_restriction) VALUES
('Casual Leave', 'CL', 'Short-term casual leave', 1.0, 'MONTHLY', 12, FALSE, FALSE, 0, 'ALL'),
('Earned Leave', 'EL', 'Earned leave for long service', 2.5, 'MONTHLY', 300, TRUE, FALSE, 0, 'ALL'),
('Medical Leave', 'ML', 'Medical emergency leave', 1.66, 'MONTHLY', 20, TRUE, FALSE, 0, 'ALL'),
('Maternity Leave', 'MAT', 'Maternity leave for female faculty', 180, 'ONE_TIME', 180, FALSE, FALSE, 12, 'FEMALE'),
('Paternity Leave', 'PAT', 'Paternity leave', 15, 'ONE_TIME', 15, FALSE, FALSE, 6, 'MALE'),
('Academic Leave', 'AL', 'Academic development leave', 1.25, 'MONTHLY', 15, FALSE, TRUE, 6, 'ALL'),
('Restricted Holiday', 'RH', 'Restricted holiday leave', 0.16, 'MONTHLY', 2, FALSE, FALSE, 0, 'ALL'),
('On Duty', 'OD', 'Official duty leave', NULL, 'ONE_TIME', NULL, FALSE, FALSE, 0, 'ALL');

CREATE TABLE leave_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_type_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  accrual_rate FLOAT NOT NULL,
  accrual_period ENUM('MONTHLY','YEARLY','DAILY','ONE_TIME') DEFAULT 'MONTHLY',
  max_balance FLOAT,
  carry_forward BOOLEAN DEFAULT TRUE,
  probation_excluded BOOLEAN DEFAULT FALSE,
  min_service_months INT DEFAULT 0,
  progressive_json JSON DEFAULT NULL,
  effective_from DATE DEFAULT NULL,
  effective_to DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_type_id) REFERENCES faculty_types(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  UNIQUE KEY unique_rule (faculty_type_id, leave_type_id)
);

INSERT INTO leave_rules (faculty_type_id, leave_type_id, accrual_rate, accrual_period, max_balance, carry_forward, probation_excluded, min_service_months) VALUES
(1, 1, 1.0, 'MONTHLY', 12, FALSE, FALSE, 0),
(1, 2, 2.5, 'MONTHLY', 300, TRUE, FALSE, 0),
(1, 3, 1.66, 'MONTHLY', 20, TRUE, FALSE, 0),
(1, 6, 1.25, 'MONTHLY', 15, FALSE, TRUE, 6),
(2, 1, 1.0, 'MONTHLY', 12, FALSE, FALSE, 0),
(2, 2, 2.0, 'MONTHLY', 240, TRUE, FALSE, 0),
(2, 3, 1.66, 'MONTHLY', 20, TRUE, FALSE, 0);

CREATE TABLE leave_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  year INT NOT NULL,
  balance FLOAT DEFAULT 0,
  reserved FLOAT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_balance (faculty_id, leave_type_id, year),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  INDEX idx_faculty_year (faculty_id, year)
);

CREATE TABLE leave_accrual_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  accrual_date DATE NOT NULL,
  accrual_amount FLOAT NOT NULL,
  total_balance_after FLOAT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  INDEX idx_faculty_date (faculty_id, accrual_date)
);

CREATE TABLE leave_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  form_id INT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days FLOAT NOT NULL,
  leave_category ENUM('FULL_DAY','HALF_DAY','HOURLY') DEFAULT 'FULL_DAY',
  reason TEXT NOT NULL,
  is_during_exam BOOLEAN DEFAULT FALSE,
  contact_during_leave VARCHAR(100),
  remarks TEXT,
  attachments JSON,
  payload JSON,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED','DELETED') DEFAULT 'PENDING',
  reviewer_id INT,
  review_reason TEXT,
  reviewed_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  FOREIGN KEY (form_id) REFERENCES form_definitions(id),
  FOREIGN KEY (reviewer_id) REFERENCES faculty(id),
  INDEX idx_faculty_dates (faculty_id, start_date, end_date),
  INDEX idx_status (status)
);

CREATE TABLE leave_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_application_id INT NOT NULL,
  adjustment_date DATE NOT NULL,
  period VARCHAR(20) NOT NULL,
  subject_code VARCHAR(100) NOT NULL,
  class_section VARCHAR(100) NOT NULL,
  room_no VARCHAR(20),
  alternate_faculty_id INT NOT NULL,
  confirmation_status ENUM('PENDING','CONFIRMED','DECLINED') DEFAULT 'PENDING',
  remarks TEXT,
  confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (alternate_faculty_id) REFERENCES faculty(id),
  INDEX idx_leave_app (leave_application_id),
  INDEX idx_alternate_faculty (alternate_faculty_id, confirmation_status),
  INDEX idx_date (adjustment_date)
);

-- ============================================
-- COURSE & TIMETABLE MANAGEMENT
-- ============================================
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  semester INT,
  credits INT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dept_sem (department, semester)
);

CREATE TABLE timetable (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  faculty_id INT,
  day_of_week ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_no VARCHAR(50),
  mode ENUM('OFFLINE','ONLINE') DEFAULT 'OFFLINE',
  academic_year VARCHAR(20),
  semester INT,
  created_by INT NOT NULL,
  created_via ENUM('MANUAL','UPLOAD') DEFAULT 'MANUAL',
  upload_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (created_by) REFERENCES faculty(id),
  INDEX idx_faculty_schedule (faculty_id, day_of_week, start_time),
  INDEX idx_room_schedule (room_no, day_of_week, start_time)
);

CREATE TABLE timetable_files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  uploaded_by INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_size_kb INT NOT NULL,
  mime_type VARCHAR(100),
  title VARCHAR(255) NULL,
  description TEXT NULL,
  year INT NULL,
  semester VARCHAR(50) NULL,
  visibility ENUM('PRIVATE','DEPARTMENT','PUBLIC') DEFAULT 'PRIVATE',
  version INT DEFAULT 1,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES faculty(id),
  INDEX (uploaded_by),
  INDEX (visibility),
  FULLTEXT INDEX ft_title_desc (title, description)
);

ALTER TABLE faculty
  ADD COLUMN assigned_timetable_file_id BIGINT NULL,
  ADD FOREIGN KEY (assigned_timetable_file_id) REFERENCES timetable_files(id);

CREATE TABLE timetable_access_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id BIGINT NOT NULL,
  action ENUM('UPLOAD','VIEW','DOWNLOAD','ASSIGN','UNASSIGN','DELETE') NOT NULL,
  performed_by INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES timetable_files(id) ON DELETE CASCADE,
  INDEX (performed_by),
  INDEX (file_id)
);

CREATE TABLE course_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  faculty_id INT NOT NULL,
  syllabus JSON,
  week_wise_plan JSON,
  status ENUM('DRAFT','SUBMITTED','APPROVED') DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  INDEX idx_faculty_course (faculty_id, course_id)
);

-- ============================================
-- VAULTIFY - DOCUMENT MANAGEMENT
-- ============================================
CREATE TABLE vault_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO vault_categories (name, description) VALUES
('Certificate', 'Academic and professional certificates'),
('Research', 'Research papers and publications'),
('Patent', 'Patent documents'),
('Teaching', 'Teaching materials and resources'),
('Personal', 'Personal documents'),
('Appointment', 'Appointment letters and contracts');

CREATE TABLE vault_files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  category_id INT NULL,
  title VARCHAR(255),
  description TEXT,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size_kb INT NOT NULL,
  mime_type VARCHAR(100),
  checksum VARCHAR(64),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  visibility ENUM('PRIVATE','DEPARTMENT','PUBLIC','SHARED') DEFAULT 'PRIVATE',
  encrypted BOOL DEFAULT FALSE,
  version INT DEFAULT 1,
  is_latest BOOL DEFAULT TRUE,
  archived BOOL DEFAULT FALSE,
  archived_at TIMESTAMP NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (category_id) REFERENCES vault_categories(id),
  INDEX (faculty_id),
  INDEX (visibility),
  FULLTEXT INDEX ft_title_description (title, description)
);

CREATE TABLE vault_file_shares (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id BIGINT NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES vault_files(id) ON DELETE CASCADE,
  INDEX (token)
);

CREATE TABLE vault_access_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_id BIGINT NOT NULL,
  action ENUM('UPLOAD','DOWNLOAD','VIEW','DELETE','SHARE') NOT NULL,
  performed_by INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES vault_files(id) ON DELETE CASCADE,
  INDEX (file_id),
  INDEX (performed_by)
);

-- ============================================
-- PRODUCT/RESOURCE REQUESTS
-- ============================================
CREATE TABLE product_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  reason TEXT,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED','DELETED') DEFAULT 'PENDING',
  admin_id INT,
  admin_reason TEXT,
  reviewed_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (admin_id) REFERENCES faculty(id),
  INDEX idx_status (status),
  INDEX idx_faculty (faculty_id)
);

-- ============================================
-- RESEARCH TRACKING
-- ============================================
CREATE TABLE research_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('Paper','Journal','Conference','Patent','Book','Chapter') NOT NULL,
  publication_date DATE,
  publisher VARCHAR(255),
  doi VARCHAR(100),
  status ENUM('Published','Under Review','In Progress') DEFAULT 'In Progress',
  file_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (file_id) REFERENCES vault_files(id),
  INDEX idx_faculty_type (faculty_id, type)
);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  department VARCHAR(100),
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  created_by INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES faculty(id),
  INDEX idx_active_priority (active, priority, created_at)
);

-- ============================================
-- ADMIN LOGS
-- ============================================
CREATE TABLE admin_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id BIGINT,
  payload JSON NULL,
  before_state JSON NULL,
  after_state JSON NULL,
  reason TEXT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES faculty(id),
  INDEX idx_admin_action (admin_id, action_type),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at)
);

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Format TIME to 12-hour format
CREATE FUNCTION fn_format_time_12hr(time_val TIME)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
  DECLARE hours INT;
  DECLARE minutes INT;
  DECLARE ampm VARCHAR(2);
  DECLARE display_hours INT;
  
  SET hours = HOUR(time_val);
  SET minutes = MINUTE(time_val);
  SET ampm = IF(hours >= 12, 'PM', 'AM');
  SET display_hours = IF(hours % 12 = 0, 12, hours % 12);
  
  RETURN CONCAT(display_hours, ':', LPAD(minutes, 2, '0'), ' ', ampm);
END //

-- Create admin user (promotion or new)
CREATE PROCEDURE sp_create_admin(
  IN p_name VARCHAR(100), IN p_email VARCHAR(150), IN p_password_hash VARCHAR(255),
  IN p_employee_id VARCHAR(50), IN p_department VARCHAR(100), IN p_designation VARCHAR(100),
  IN p_faculty_type_id INT, IN p_created_by INT, IN p_role_id INT
)
BEGIN
  INSERT INTO faculty (employee_id, name, email, password_hash, role_id, faculty_type_id, department, designation, doj, approved, created_by_admin)
  VALUES (p_employee_id, p_name, p_email, p_password_hash, p_role_id, p_faculty_type_id, p_department, p_designation, CURDATE(), TRUE, p_created_by);
  
  INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, after_state)
  VALUES (p_created_by, 'CREATE_ADMIN', 'faculty', LAST_INSERT_ID(), JSON_OBJECT('email', p_email, 'role_id', p_role_id));
END //

-- Auto-assign default leaves on approval with initial accrual
CREATE PROCEDURE sp_assign_default_leaves(IN p_faculty_id INT)
BEGIN
  DECLARE v_faculty_type_id INT;
  DECLARE v_doj DATE;
  DECLARE v_gender ENUM('MALE','FEMALE','OTHER');
  DECLARE v_service_months INT;
  DECLARE done INT DEFAULT 0;
  DECLARE v_leave_type_id, v_min_service INT;
  DECLARE v_accrual_rate, v_max_balance, v_accrual FLOAT;
  DECLARE v_accrual_period ENUM('DAILY','MONTHLY','YEARLY','ONE_TIME');
  DECLARE v_probation_excluded BOOLEAN;
  DECLARE v_days_in_month, v_days_remaining INT;
  
  DECLARE cur CURSOR FOR
    SELECT lr.leave_type_id, lr.accrual_rate, lr.accrual_period, lr.max_balance, lr.probation_excluded, lr.min_service_months
    FROM leave_rules lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.faculty_type_id = v_faculty_type_id
      AND (lt.gender_restriction = 'ALL' OR lt.gender_restriction = v_gender OR v_gender IS NULL);
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  SELECT faculty_type_id, doj, gender INTO v_faculty_type_id, v_doj, v_gender FROM faculty WHERE id = p_faculty_id;
  SET v_service_months = TIMESTAMPDIFF(MONTH, v_doj, CURDATE());
  
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_leave_type_id, v_accrual_rate, v_accrual_period, v_max_balance, v_probation_excluded, v_min_service;
    IF done THEN LEAVE read_loop; END IF;
    
    SET v_accrual = 0;
    
    IF v_probation_excluded = FALSE OR v_service_months >= 6 THEN
      IF v_service_months >= v_min_service THEN
        IF v_accrual_period = 'MONTHLY' THEN
          SET v_days_in_month = DAY(LAST_DAY(v_doj));
          IF YEAR(v_doj) = YEAR(CURDATE()) AND MONTH(v_doj) = MONTH(CURDATE()) THEN
            SET v_days_remaining = v_days_in_month - DAY(v_doj) + 1;
            SET v_accrual = v_accrual_rate * (v_days_remaining / v_days_in_month);
          ELSE
            SET v_accrual = v_accrual_rate * (TIMESTAMPDIFF(MONTH, v_doj, CURDATE()) + 1);
          END IF;
        ELSEIF v_accrual_period = 'YEARLY' THEN
          IF YEAR(v_doj) = YEAR(CURDATE()) THEN
            SET v_accrual = v_accrual_rate * ((12 - MONTH(v_doj) + 1) / 12);
          ELSE
            SET v_accrual = v_accrual_rate * (YEAR(CURDATE()) - YEAR(v_doj) + 1);
          END IF;
        END IF;
        SET v_accrual = LEAST(v_accrual, v_max_balance);
      END IF;
    END IF;
    
    INSERT INTO leave_balances (faculty_id, leave_type_id, year, balance)
    VALUES (p_faculty_id, v_leave_type_id, YEAR(CURDATE()), v_accrual)
    ON DUPLICATE KEY UPDATE balance = v_accrual;
    
    IF v_accrual > 0 THEN
      INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
      VALUES (p_faculty_id, v_leave_type_id, CURDATE(), v_accrual, v_accrual, 'Initial accrual on approval');
    END IF;
  END LOOP;
  CLOSE cur;
END //

-- Monthly Leave Accrual with Pro-rated DOJ and Probation Check
CREATE PROCEDURE sp_monthly_leave_accrual()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_faculty_id, v_leave_type_id, v_service_months, v_min_service INT;
  DECLARE v_accrual_rate, v_max_balance, v_accrual, v_new_balance FLOAT;
  DECLARE v_doj DATE;
  DECLARE v_days_in_month, v_days_remaining INT;
  DECLARE v_probation_excluded BOOLEAN;
  
  DECLARE cur CURSOR FOR
    SELECT f.id, f.doj, lr.leave_type_id, lr.accrual_rate, lr.max_balance, lr.probation_excluded, lr.min_service_months
    FROM faculty f
    JOIN leave_rules lr ON f.faculty_type_id = lr.faculty_type_id
    WHERE f.active = TRUE AND f.approved = TRUE AND lr.accrual_period = 'MONTHLY';
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_faculty_id, v_doj, v_leave_type_id, v_accrual_rate, v_max_balance, v_probation_excluded, v_min_service;
    IF done THEN LEAVE read_loop; END IF;
    
    SET v_service_months = TIMESTAMPDIFF(MONTH, v_doj, CURDATE());
    
    IF v_probation_excluded = TRUE AND v_service_months < 6 THEN
      ITERATE read_loop;
    END IF;
    
    IF v_service_months < v_min_service THEN
      ITERATE read_loop;
    END IF;
    
    SET v_days_in_month = DAY(LAST_DAY(CURDATE()));
    
    IF YEAR(v_doj) = YEAR(CURDATE()) AND MONTH(v_doj) = MONTH(CURDATE()) THEN
      SET v_days_remaining = v_days_in_month - DAY(v_doj) + 1;
      SET v_accrual = v_accrual_rate * (v_days_remaining / v_days_in_month);
    ELSE
      SET v_accrual = v_accrual_rate;
    END IF;
    
    INSERT INTO leave_balances (faculty_id, leave_type_id, year, balance)
    VALUES (v_faculty_id, v_leave_type_id, YEAR(CURDATE()), v_accrual)
    ON DUPLICATE KEY UPDATE balance = LEAST(balance + v_accrual, v_max_balance);
    
    SELECT balance INTO v_new_balance FROM leave_balances 
    WHERE faculty_id = v_faculty_id AND leave_type_id = v_leave_type_id AND year = YEAR(CURDATE());
    
    INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
    VALUES (v_faculty_id, v_leave_type_id, CURDATE(), v_accrual, v_new_balance, 'Monthly accrual');
  END LOOP;
  CLOSE cur;
END //

-- Apply Leave with Balance, Eligibility and Gender Check
CREATE PROCEDURE sp_apply_leave(
  IN p_faculty_id INT,
  IN p_leave_type_id INT,
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_total_days FLOAT,
  IN p_reason TEXT,
  IN p_leave_category VARCHAR(20),
  IN p_is_during_exam BOOLEAN,
  IN p_contact VARCHAR(100),
  IN p_remarks TEXT,
  IN p_attachments JSON,
  OUT p_leave_id INT,
  OUT p_result VARCHAR(255)
)
BEGIN
  DECLARE v_balance FLOAT;
  DECLARE v_reserved FLOAT;
  DECLARE v_doj DATE;
  DECLARE v_service_months INT;
  DECLARE v_min_service INT;
  DECLARE v_probation_excluded BOOLEAN;
  DECLARE v_faculty_type_id INT;
  DECLARE v_gender ENUM('MALE','FEMALE','OTHER');
  DECLARE v_gender_restriction ENUM('ALL','MALE','FEMALE');
  DECLARE v_overlap_count INT;
  
  SELECT doj, faculty_type_id, gender INTO v_doj, v_faculty_type_id, v_gender FROM faculty WHERE id = p_faculty_id;
  SET v_service_months = TIMESTAMPDIFF(MONTH, v_doj, CURDATE());
  
  SELECT lt.gender_restriction INTO v_gender_restriction FROM leave_types lt WHERE lt.id = p_leave_type_id;
  
  IF v_gender_restriction != 'ALL' AND v_gender_restriction != v_gender THEN
    SET p_result = 'GENDER_NOT_ELIGIBLE';
    SET p_leave_id = NULL;
  ELSE
    SELECT lr.min_service_months, lr.probation_excluded INTO v_min_service, v_probation_excluded
    FROM leave_rules lr
    WHERE lr.faculty_type_id = v_faculty_type_id AND lr.leave_type_id = p_leave_type_id;
    
    IF v_probation_excluded = TRUE AND v_service_months < 6 THEN
      SET p_result = 'PROBATION_PERIOD';
      SET p_leave_id = NULL;
    ELSEIF v_service_months < v_min_service THEN
      SET p_result = 'MIN_SERVICE_NOT_MET';
      SET p_leave_id = NULL;
    ELSE
      SELECT COUNT(*) INTO v_overlap_count
      FROM leave_applications
      WHERE faculty_id = p_faculty_id
        AND status IN ('PENDING', 'APPROVED')
        AND (
          (p_start_date BETWEEN start_date AND end_date) OR
          (p_end_date BETWEEN start_date AND end_date) OR
          (start_date BETWEEN p_start_date AND p_end_date)
        );
      
      IF v_overlap_count > 0 THEN
        SET p_result = 'OVERLAPPING_LEAVE';
        SET p_leave_id = NULL;
      ELSE
        SELECT balance, reserved INTO v_balance, v_reserved
        FROM leave_balances
        WHERE faculty_id = p_faculty_id 
          AND leave_type_id = p_leave_type_id 
          AND year = YEAR(CURDATE());
        
        IF (v_balance - v_reserved) >= p_total_days THEN
          INSERT INTO leave_applications (faculty_id, leave_type_id, start_date, end_date, total_days, reason, leave_category, is_during_exam, contact_during_leave, remarks, attachments)
          VALUES (p_faculty_id, p_leave_type_id, p_start_date, p_end_date, p_total_days, p_reason, p_leave_category, p_is_during_exam, p_contact, p_remarks, p_attachments);
          
          SET p_leave_id = LAST_INSERT_ID();
          
          UPDATE leave_balances 
          SET reserved = reserved + p_total_days
          WHERE faculty_id = p_faculty_id AND leave_type_id = p_leave_type_id AND year = YEAR(CURDATE());
          
          SET p_result = 'SUCCESS';
        ELSE
          SET p_result = 'INSUFFICIENT_BALANCE';
          SET p_leave_id = NULL;
        END IF;
      END IF;
    END IF;
  END IF;
END //

-- Approve/Reject Leave with History
CREATE PROCEDURE sp_update_leave_status(
  IN p_leave_id INT,
  IN p_reviewer_id INT,
  IN p_status ENUM('APPROVED','REJECTED'),
  IN p_reason TEXT
)
BEGIN
  DECLARE v_faculty_id INT;
  DECLARE v_leave_type_id INT;
  DECLARE v_total_days FLOAT;
  DECLARE v_new_balance FLOAT;
  
  SELECT faculty_id, leave_type_id, total_days 
  INTO v_faculty_id, v_leave_type_id, v_total_days
  FROM leave_applications WHERE id = p_leave_id;
  
  UPDATE leave_applications 
  SET status = p_status, reviewer_id = p_reviewer_id, review_reason = p_reason, reviewed_at = CURRENT_TIMESTAMP
  WHERE id = p_leave_id;
  
  IF p_status = 'APPROVED' THEN
    UPDATE leave_balances 
    SET balance = balance - v_total_days, reserved = reserved - v_total_days
    WHERE faculty_id = v_faculty_id AND leave_type_id = v_leave_type_id AND year = YEAR(CURDATE());
    
    SELECT balance INTO v_new_balance FROM leave_balances
    WHERE faculty_id = v_faculty_id AND leave_type_id = v_leave_type_id AND year = YEAR(CURDATE());
    
    INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
    VALUES (v_faculty_id, v_leave_type_id, CURDATE(), -v_total_days, v_new_balance, CONCAT('Leave approved - Application #', p_leave_id));
  ELSE
    UPDATE leave_balances 
    SET reserved = reserved - v_total_days
    WHERE faculty_id = v_faculty_id AND leave_type_id = v_leave_type_id AND year = YEAR(CURDATE());
  END IF;
END //

-- Yearly Leave Accrual with Pro-rating
CREATE PROCEDURE sp_yearly_leave_accrual()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_faculty_id, v_leave_type_id, v_service_months, v_min_service INT;
  DECLARE v_accrual_rate, v_max_balance, v_accrual, v_new_balance FLOAT;
  DECLARE v_doj DATE;
  DECLARE v_probation_excluded BOOLEAN;
  
  DECLARE cur CURSOR FOR
    SELECT f.id, f.doj, lr.leave_type_id, lr.accrual_rate, lr.max_balance, lr.probation_excluded, lr.min_service_months
    FROM faculty f
    JOIN leave_rules lr ON f.faculty_type_id = lr.faculty_type_id
    WHERE f.active = TRUE AND f.approved = TRUE AND lr.accrual_period = 'YEARLY';
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_faculty_id, v_doj, v_leave_type_id, v_accrual_rate, v_max_balance, v_probation_excluded, v_min_service;
    IF done THEN LEAVE read_loop; END IF;
    
    SET v_service_months = TIMESTAMPDIFF(MONTH, v_doj, CURDATE());
    
    IF v_probation_excluded = TRUE AND v_service_months < 6 THEN
      ITERATE read_loop;
    END IF;
    
    IF v_service_months < v_min_service THEN
      ITERATE read_loop;
    END IF;
    
    IF YEAR(v_doj) = YEAR(CURDATE()) THEN
      SET v_accrual = v_accrual_rate * ((12 - MONTH(v_doj) + 1) / 12);
    ELSE
      SET v_accrual = v_accrual_rate;
    END IF;
    
    INSERT INTO leave_balances (faculty_id, leave_type_id, year, balance)
    VALUES (v_faculty_id, v_leave_type_id, YEAR(CURDATE()), v_accrual)
    ON DUPLICATE KEY UPDATE balance = LEAST(balance + v_accrual, v_max_balance);
    
    SELECT balance INTO v_new_balance FROM leave_balances 
    WHERE faculty_id = v_faculty_id AND leave_type_id = v_leave_type_id AND year = YEAR(CURDATE());
    
    INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
    VALUES (v_faculty_id, v_leave_type_id, CURDATE(), v_accrual, v_new_balance, 'Yearly accrual');
  END LOOP;
  CLOSE cur;
END //

-- Carry Forward Leave Balances to New Year
CREATE PROCEDURE sp_carry_forward_leaves()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_faculty_id, v_leave_type_id, v_faculty_type_id INT;
  DECLARE v_old_balance, v_max_balance, v_carry_amount FLOAT;
  DECLARE v_carry_forward BOOLEAN;
  
  DECLARE cur CURSOR FOR
    SELECT lb.faculty_id, lb.leave_type_id, lb.balance, f.faculty_type_id
    FROM leave_balances lb
    JOIN faculty f ON lb.faculty_id = f.id
    WHERE lb.year = YEAR(CURDATE()) - 1 AND f.active = TRUE;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_faculty_id, v_leave_type_id, v_old_balance, v_faculty_type_id;
    IF done THEN LEAVE read_loop; END IF;
    
    SELECT lr.carry_forward, lr.max_balance INTO v_carry_forward, v_max_balance
    FROM leave_rules lr
    WHERE lr.faculty_type_id = v_faculty_type_id AND lr.leave_type_id = v_leave_type_id;
    
    IF v_carry_forward = TRUE THEN
      SET v_carry_amount = LEAST(v_old_balance, v_max_balance);
    ELSE
      SET v_carry_amount = 0;
    END IF;
    
    INSERT INTO leave_balances (faculty_id, leave_type_id, year, balance)
    VALUES (v_faculty_id, v_leave_type_id, YEAR(CURDATE()), v_carry_amount)
    ON DUPLICATE KEY UPDATE balance = v_carry_amount;
    
    IF v_carry_amount > 0 THEN
      INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
      VALUES (v_faculty_id, v_leave_type_id, CURDATE(), v_carry_amount, v_carry_amount, 'Carry forward from previous year');
    END IF;
  END LOOP;
  CLOSE cur;
END //

-- Get Progressive Rate based on Service Tenure
CREATE FUNCTION fn_get_progressive_rate(p_months INT, p_rule_id INT)
RETURNS FLOAT
DETERMINISTIC
BEGIN
  DECLARE v_json JSON;
  DECLARE v_rate FLOAT;
  
  SELECT progressive_json INTO v_json FROM leave_rules WHERE id = p_rule_id;
  
  IF v_json IS NULL THEN
    SELECT accrual_rate INTO v_rate FROM leave_rules WHERE id = p_rule_id;
    RETURN v_rate;
  END IF;
  
  IF p_months <= 24 THEN
    SET v_rate = JSON_UNQUOTE(JSON_EXTRACT(v_json, '$."0-24"'));
  ELSEIF p_months <= 60 THEN
    SET v_rate = JSON_UNQUOTE(JSON_EXTRACT(v_json, '$."25-60"'));
  ELSE
    SET v_rate = JSON_UNQUOTE(JSON_EXTRACT(v_json, '$."61-120"'));
  END IF;
  
  RETURN COALESCE(v_rate, 0);
END //

-- Admin Update Leave Balance
CREATE PROCEDURE sp_admin_update_leave_balance(
  IN p_faculty_id INT,
  IN p_leave_type_id INT,
  IN p_new_balance FLOAT,
  IN p_admin_id INT,
  IN p_reason TEXT
)
BEGIN
  DECLARE v_old_balance FLOAT;
  DECLARE v_adjustment FLOAT;
  
  SELECT balance INTO v_old_balance
  FROM leave_balances
  WHERE faculty_id = p_faculty_id AND leave_type_id = p_leave_type_id AND year = YEAR(CURDATE());
  
  IF v_old_balance IS NULL THEN
    INSERT INTO leave_balances (faculty_id, leave_type_id, year, balance)
    VALUES (p_faculty_id, p_leave_type_id, YEAR(CURDATE()), p_new_balance);
    SET v_adjustment = p_new_balance;
  ELSE
    UPDATE leave_balances
    SET balance = p_new_balance
    WHERE faculty_id = p_faculty_id AND leave_type_id = p_leave_type_id AND year = YEAR(CURDATE());
    SET v_adjustment = p_new_balance - v_old_balance;
  END IF;
  
  INSERT INTO leave_accrual_history (faculty_id, leave_type_id, accrual_date, accrual_amount, total_balance_after, note)
  VALUES (p_faculty_id, p_leave_type_id, CURDATE(), v_adjustment, p_new_balance, CONCAT('Admin adjustment: ', p_reason));
  
  INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, payload, before_state, after_state, reason)
  VALUES (
    p_admin_id,
    'UPDATE_LEAVE_BALANCE',
    'leave_balance',
    p_faculty_id,
    JSON_OBJECT('leave_type_id', p_leave_type_id),
    JSON_OBJECT('balance', v_old_balance),
    JSON_OBJECT('balance', p_new_balance),
    p_reason
  );
END //

-- Permanent Delete User (Super Admin Only)
CREATE PROCEDURE sp_permanent_delete_user(
  IN p_faculty_id INT,
  IN p_admin_id INT,
  IN p_reason TEXT
)
BEGIN
  DECLARE v_user_data JSON;
  
  SELECT JSON_OBJECT(
    'employee_id', employee_id,
    'name', name,
    'email', email,
    'department', department,
    'designation', designation
  ) INTO v_user_data
  FROM faculty WHERE id = p_faculty_id;
  
  DELETE FROM leave_adjustments WHERE leave_application_id IN (SELECT id FROM leave_applications WHERE faculty_id = p_faculty_id);
  DELETE FROM leave_applications WHERE faculty_id = p_faculty_id;
  DELETE FROM leave_accrual_history WHERE faculty_id = p_faculty_id;
  DELETE FROM leave_balances WHERE faculty_id = p_faculty_id;
  DELETE FROM product_requests WHERE faculty_id = p_faculty_id;
  DELETE FROM form_submissions WHERE faculty_id = p_faculty_id;
  DELETE FROM vault_access_logs WHERE file_id IN (SELECT id FROM vault_files WHERE faculty_id = p_faculty_id);
  DELETE FROM vault_file_shares WHERE file_id IN (SELECT id FROM vault_files WHERE faculty_id = p_faculty_id);
  DELETE FROM vault_files WHERE faculty_id = p_faculty_id;
  DELETE FROM timetable_access_logs WHERE file_id IN (SELECT id FROM timetable_files WHERE uploaded_by = p_faculty_id);
  DELETE FROM timetable_files WHERE uploaded_by = p_faculty_id;
  DELETE FROM timetable WHERE faculty_id = p_faculty_id;
  DELETE FROM course_plans WHERE faculty_id = p_faculty_id;
  DELETE FROM research_projects WHERE faculty_id = p_faculty_id;
  DELETE FROM faculty_activity_logs WHERE faculty_id = p_faculty_id;
  DELETE FROM faculty_history WHERE faculty_id = p_faculty_id;
  DELETE FROM auth_tokens WHERE faculty_id = p_faculty_id;
  
  INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, before_state, reason)
  VALUES (p_admin_id, 'PERMANENT_DELETE_USER', 'faculty', p_faculty_id, v_user_data, p_reason);
  
  DELETE FROM faculty WHERE id = p_faculty_id;
END //

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //

-- Auto-assign leaves on faculty approval
CREATE TRIGGER trg_faculty_approved
AFTER UPDATE ON faculty
FOR EACH ROW
BEGIN
  IF NEW.approved = 1 AND OLD.approved = 0 THEN
    CALL sp_assign_default_leaves(NEW.id);
  END IF;
END //

-- Track faculty changes
CREATE TRIGGER trg_faculty_history_update
AFTER UPDATE ON faculty
FOR EACH ROW
BEGIN
  IF OLD.designation != NEW.designation THEN
    INSERT INTO faculty_history (faculty_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'designation', OLD.designation, NEW.designation);
  END IF;
  
  IF OLD.department != NEW.department THEN
    INSERT INTO faculty_history (faculty_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'department', OLD.department, NEW.department);
  END IF;
END //

-- Prevent timetable conflicts
CREATE TRIGGER trg_check_timetable_conflict
BEFORE INSERT ON timetable
FOR EACH ROW
BEGIN
  DECLARE conflict_count INT;
  
  SELECT COUNT(*) INTO conflict_count
  FROM timetable
  WHERE faculty_id = NEW.faculty_id
    AND day_of_week = NEW.day_of_week
    AND (
      (NEW.start_time BETWEEN start_time AND end_time) OR
      (NEW.end_time BETWEEN start_time AND end_time) OR
      (start_time BETWEEN NEW.start_time AND NEW.end_time)
    );
  
  IF conflict_count > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Timetable conflict detected';
  END IF;
END //

DELIMITER ;

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

CREATE VIEW v_leave_summary AS
SELECT 
  f.department,
  lt.name AS leave_type,
  SUM(lb.balance) AS total_balance,
  SUM(lb.reserved) AS total_reserved,
  COUNT(DISTINCT f.id) AS faculty_count,
  SUM(CASE WHEN la.status='APPROVED' THEN la.total_days ELSE 0 END) AS total_approved_days
FROM faculty f
JOIN leave_balances lb ON f.id = lb.faculty_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN leave_applications la ON la.faculty_id = f.id AND la.leave_type_id = lt.id
WHERE f.active = TRUE
GROUP BY f.department, lt.name;

CREATE VIEW v_faculty_workload AS
SELECT 
  f.id,
  f.name,
  f.department,
  COUNT(DISTINCT t.course_id) AS courses_assigned,
  SUM(c.credits) AS total_credits,
  COUNT(t.id) AS total_classes_per_week
FROM faculty f
LEFT JOIN timetable t ON f.id = t.faculty_id
LEFT JOIN courses c ON t.course_id = c.id
WHERE f.active = TRUE
GROUP BY f.id, f.name, f.department;

CREATE VIEW v_pending_approvals AS
SELECT 
  'LEAVE' AS type,
  la.id,
  f.name AS faculty_name,
  f.department,
  lt.name AS leave_type,
  la.start_date,
  la.end_date,
  la.created_at
FROM leave_applications la
JOIN faculty f ON la.faculty_id = f.id
JOIN leave_types lt ON la.leave_type_id = lt.id
WHERE la.status = 'PENDING'
UNION ALL
SELECT 
  'PRODUCT' AS type,
  pr.id,
  f.name AS faculty_name,
  f.department,
  pr.item_name,
  NULL,
  NULL,
  pr.created_at
FROM product_requests pr
JOIN faculty f ON pr.faculty_id = f.id
WHERE pr.status = 'PENDING'
UNION ALL
SELECT 
  'FACULTY' AS type,
  f.id,
  f.name AS faculty_name,
  f.department,
  f.designation,
  NULL,
  NULL,
  f.created_at
FROM faculty f
WHERE f.approved = FALSE AND f.active = TRUE;

CREATE VIEW v_research_stats AS
SELECT 
  f.id,
  f.name,
  f.department,
  COUNT(rp.id) AS total_publications,
  SUM(CASE WHEN rp.type = 'Journal' THEN 1 ELSE 0 END) AS journals,
  SUM(CASE WHEN rp.type = 'Conference' THEN 1 ELSE 0 END) AS conferences,
  SUM(CASE WHEN rp.type = 'Patent' THEN 1 ELSE 0 END) AS patents
FROM faculty f
LEFT JOIN research_projects rp ON f.id = rp.faculty_id
WHERE f.active = TRUE
GROUP BY f.id, f.name, f.department;

CREATE VIEW v_faculty_leave_availability AS
SELECT 
  f.id AS faculty_id,
  f.name AS faculty_name,
  f.doj,
  TIMESTAMPDIFF(MONTH, f.doj, CURDATE()) AS service_months,
  lt.id AS leave_type_id,
  lt.code,
  lt.name AS leave_name,
  lb.year,
  lb.balance,
  lb.reserved,
  (lb.balance - lb.reserved) AS available,
  lr.accrual_rate,
  lr.accrual_period,
  lr.max_balance,
  lr.min_service_months,
  CASE 
    WHEN lr.probation_excluded = TRUE AND TIMESTAMPDIFF(MONTH, f.doj, CURDATE()) < 6 THEN FALSE
    WHEN TIMESTAMPDIFF(MONTH, f.doj, CURDATE()) < lr.min_service_months THEN FALSE
    ELSE TRUE
  END AS is_eligible
FROM faculty f
JOIN leave_balances lb ON lb.faculty_id = f.id
JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN leave_rules lr ON lr.faculty_type_id = f.faculty_type_id AND lr.leave_type_id = lt.id
WHERE f.active = TRUE AND f.approved = TRUE;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample admin user (password: admin123)
INSERT INTO faculty (employee_id, name, email, password_hash, role_id, faculty_type_id, department, designation, doj, gender, approved, active)
VALUES ('ADMIN001', 'System Administrator', 'admin@university.edu', '$2b$10$rxyMGPHm/WQ8x5g9ik2OxeXaQc/sLWMISp3sCykC2jRl0LUKmapEG', 1, 1, 'Administration', 'System Admin', '2020-01-01', 'MALE', TRUE, TRUE);

-- Insert sample faculty for testing
INSERT INTO faculty (employee_id, name, email, password_hash, role_id, faculty_type_id, department, designation, doj, gender, approved, active)
VALUES ('FAC001', 'John Doe', 'john.doe@university.edu', '$2b$10$rxyMGPHm/WQ8x5g9ik2OxeXaQc/sLWMISp3sCykC2jRl0LUKmapEG', 4, 1, 'Computer Science', 'Assistant Professor', '2023-01-15', 'MALE', TRUE, TRUE);

-- Insert sample leave form
INSERT INTO form_definitions (name, category, description, active) 
VALUES ('Standard Leave Application', 'LEAVE', 'Default leave application form', TRUE);

SET @form_id = LAST_INSERT_ID();

INSERT INTO form_fields (form_id, name, label, type, required, order_index) VALUES
(@form_id, 'leave_type', 'Leave Type', 'select', TRUE, 1),
(@form_id, 'start_date', 'Start Date', 'date', TRUE, 2),
(@form_id, 'end_date', 'End Date', 'date', TRUE, 3),
(@form_id, 'reason', 'Reason', 'textarea', TRUE, 4),
(@form_id, 'contact_during_leave', 'Contact Number', 'text', FALSE, 5);
