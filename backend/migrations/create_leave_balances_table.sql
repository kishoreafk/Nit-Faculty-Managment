-- Create leave_balances table to store faculty leave allocations and balances
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
    UNIQUE KEY unique_faculty_leave_year (faculty_id, leave_type_id, year),
    INDEX idx_faculty_year (faculty_id, year),
    INDEX idx_leave_type (leave_type_id)
);

-- Create leave_adjustments table for tracking adjustment duties
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
    FOREIGN KEY (adjustment_faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
    INDEX idx_leave_application (leave_application_id),
    INDEX idx_adjustment_faculty (adjustment_faculty_id),
    INDEX idx_date (date)
);

-- Create leave_balance_history table for tracking balance changes
CREATE TABLE IF NOT EXISTS leave_balance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    transaction_type ENUM('allocation', 'usage', 'carry_forward', 'adjustment', 'encashment') NOT NULL,
    days_changed DECIMAL(5,2) NOT NULL,
    balance_before DECIMAL(5,2) NOT NULL,
    balance_after DECIMAL(5,2) NOT NULL,
    reference_id INT, -- Can reference leave_applications.id or other relevant tables
    reference_type VARCHAR(50), -- 'leave_application', 'carry_forward', etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    INDEX idx_faculty_year (faculty_id, year),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id)
);