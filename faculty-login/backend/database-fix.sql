-- Database schema fixes for all tables

-- Fix leave_requests table - add missing columns
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS proofFile VARCHAR(255),
ADD COLUMN IF NOT EXISTS proofFileName VARCHAR(255);

-- Fix product_requests table - rename facultyId to faculty_id if needed
-- First check if faculty_id column exists, if not rename facultyId
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'product_requests' 
                   AND COLUMN_NAME = 'faculty_id' 
                   AND TABLE_SCHEMA = DATABASE());

SET @sql = IF(@col_exists = 0, 
              'ALTER TABLE product_requests CHANGE facultyId faculty_id INT NOT NULL', 
              'SELECT "faculty_id column already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure admin_logs table exists
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id INT,
  target_item_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES faculty(id),
  FOREIGN KEY (target_user_id) REFERENCES faculty(id)
);

-- Ensure faculty_timetables table exists
CREATE TABLE IF NOT EXISTS faculty_timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  timetable_image_url VARCHAR(255) NOT NULL,
  semester VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);

-- Add admin functionality to faculty table if not exists
ALTER TABLE faculty 
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'faculty') DEFAULT 'faculty',
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by INT NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key constraint if not exists
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                  WHERE TABLE_NAME = 'faculty' 
                  AND CONSTRAINT_NAME = 'fk_approved_by' 
                  AND TABLE_SCHEMA = DATABASE());

SET @sql = IF(@fk_exists = 0, 
              'ALTER TABLE faculty ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES faculty(id)', 
              'SELECT "Foreign key already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create admin user if not exists
INSERT IGNORE INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
VALUES ('Admin', 'User', 'adminlogin@collage.edu', '$2b$10$8K1p/a0dqFNH7Aa1ibinsuXioZeo.WdfiTqUEgYpjVE4Q0VdRw1Lu', 'Administration', 'ADMIN001', 'Administrator', 'admin', TRUE, NOW());

-- Update existing users to be approved
UPDATE faculty SET is_approved = TRUE WHERE role = 'faculty' AND is_approved = FALSE;