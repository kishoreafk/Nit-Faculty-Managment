-- Simple migration to add missing tables and columns

-- Add admin functionality to faculty table
ALTER TABLE faculty 
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'faculty') DEFAULT 'faculty',
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS approved_by INT NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Create admin_logs table
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

-- Create admin user if not exists
INSERT IGNORE INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
VALUES ('Admin', 'User', 'adminlogin@collage.edu', '$2b$10$8K1p/a0dqFNH7Aa1ibinsuXioZeo.WdfiTqUEgYpjVE4Q0VdRw1Lu', 'Administration', 'ADMIN001', 'Administrator', 'admin', TRUE, NOW());

-- Update existing users to be approved
UPDATE faculty SET is_approved = TRUE WHERE is_approved IS NULL OR is_approved = FALSE;