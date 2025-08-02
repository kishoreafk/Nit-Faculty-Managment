-- Add admin functionality to existing database

-- Add role and approval columns to faculty table
ALTER TABLE faculty ADD COLUMN role ENUM('admin', 'faculty') DEFAULT 'faculty';
ALTER TABLE faculty ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE faculty ADD COLUMN approved_by INT NULL;
ALTER TABLE faculty ADD COLUMN approved_at TIMESTAMP NULL;

-- Create admin user (password: admin123)
INSERT INTO faculty (firstName, lastName, email, password, department, employeeId, designation, role, is_approved, approved_at) 
VALUES ('Admin', 'User', 'adminlogin@collage.edu', '$2b$10$8K1p/a0dqFNH7Aa1ibinsuXioZeo.WdfiTqUEgYpjVE4Q0VdRw1Lu', 'Administration', 'ADMIN001', 'Administrator', 'admin', TRUE, NOW());

-- Add foreign key constraint
ALTER TABLE faculty ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES faculty(id);

-- Update existing users to be approved (for existing data)
UPDATE faculty SET is_approved = TRUE WHERE role = 'faculty';