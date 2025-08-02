-- Faculty Management System - Complete Database Setup
-- This file contains all the necessary SQL statements to create and initialize the database

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS faculty_management_system;
USE faculty_management_system;

-- Faculty table - Main user table with admin functionality
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
  joiningDate DATE,
  role ENUM('admin', 'faculty') DEFAULT 'faculty',
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add foreign key constraint for approved_by
ALTER TABLE faculty 
ADD CONSTRAINT IF NOT EXISTS fk_approved_by 
FOREIGN KEY (approved_by) REFERENCES faculty(id);

-- Leave requests table with proof upload and admin approval
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facultyId INT NOT NULL,
  leaveType ENUM('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave') NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  reason TEXT NOT NULL,
  proofFile VARCHAR(500) NULL,
  proofFileName VARCHAR(255) NULL,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approvedBy INT NULL,
  approvedAt TIMESTAMP NULL,
  rejectionReason TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Product requests table with image uploads
CREATE TABLE IF NOT EXISTS product_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  productName VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  description TEXT,
  product_image_url VARCHAR(500) NULL,
  bill_image_url VARCHAR(500) NULL,
  priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  status ENUM('Pending', 'Approved', 'Rejected', 'Delivered') DEFAULT 'Pending',
  approvedBy INT,
  approvedAt TIMESTAMP NULL,
  decision_note TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES faculty(id) ON DELETE SET NULL
);

-- Files table for general file uploads
CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facultyId INT NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  filePath VARCHAR(500) NOT NULL,
  fileSize INT,
  fileType VARCHAR(100),
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Course plans table
CREATE TABLE IF NOT EXISTS course_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facultyId INT NOT NULL,
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
  FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Faculty timetables table
CREATE TABLE IF NOT EXISTS faculty_timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  timetable_image_url VARCHAR(500) NOT NULL,
  semester VARCHAR(50),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Admin logs table for tracking admin actions
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

-- Create default admin user (password: admin123)
INSERT IGNORE INTO faculty (
  firstName, 
  lastName, 
  email, 
  password, 
  department, 
  employeeId, 
  designation, 
  role, 
  is_approved, 
  approved_at
) VALUES (
  'Admin', 
  'User', 
  'adminlogin@collage.edu', 
  '$2b$10$8K1p/a0dqFNH7Aa1ibinsuXioZeo.WdfiTqUEgYpjVE4Q0VdRw1Lu', 
  'Administration', 
  'ADMIN001', 
  'Administrator', 
  'admin', 
  TRUE, 
  NOW()
);

-- Insert sample faculty data for testing (password: password)
INSERT IGNORE INTO faculty (
  firstName, 
  lastName, 
  email, 
  password, 
  phone, 
  department, 
  employeeId, 
  designation, 
  role, 
  is_approved
) VALUES
  ('John', 'Doe', 'john.doe@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567890', 'Computer Science', 'EMP001', 'Assistant Professor', 'faculty', TRUE),
  ('Jane', 'Smith', 'jane.smith@university.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567891', 'Mathematics', 'EMP002', 'Associate Professor', 'faculty', TRUE);

-- Ensure all existing faculty users are approved
UPDATE faculty SET is_approved = TRUE WHERE role = 'faculty' AND is_approved = FALSE;

-- Verify database structure
SHOW TABLES;