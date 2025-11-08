-- Enhanced Leave Calculation Database Schema
-- This migration adds support for faculty-specific leave calculations with carry-forward

-- Create leave_balance_history table to track year-over-year balances
CREATE TABLE IF NOT EXISTS leave_balance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    opening_balance DECIMAL(5,2) DEFAULT 0,
    allocated DECIMAL(5,2) DEFAULT 0,
    carry_forward DECIMAL(5,2) DEFAULT 0,
    used_balance DECIMAL(5,2) DEFAULT 0,
    closing_balance DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_faculty_year_leave (faculty_id, year, leave_type),
    INDEX idx_faculty_year (faculty_id, year),
    INDEX idx_leave_type (leave_type)
);

-- Create leave_accrual_log table to track monthly accruals
CREATE TABLE IF NOT EXISTS leave_accrual_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    accrual_rate DECIMAL(4,2) NOT NULL,
    accrued_days DECIMAL(5,2) NOT NULL,
    cumulative_days DECIMAL(5,2) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_faculty_month_leave (faculty_id, year, month, leave_type),
    INDEX idx_faculty_year_month (faculty_id, year, month)
);

-- Create leave_carry_forward_log table to track carry forward processing
CREATE TABLE IF NOT EXISTS leave_carry_forward_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    from_year INT NOT NULL,
    to_year INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    available_balance DECIMAL(5,2) NOT NULL,
    carry_forward_amount DECIMAL(5,2) NOT NULL,
    lapsed_amount DECIMAL(5,2) DEFAULT 0,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_faculty_years (faculty_id, from_year, to_year)
);

-- Add columns to existing users table for enhanced leave tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS leave_calculation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_balance_calculation DATE,
ADD COLUMN IF NOT EXISTS probation_end_date DATE;

-- Update existing leave_balances table structure if it exists
ALTER TABLE leave_balances 
ADD COLUMN IF NOT EXISTS carry_forward_days DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_carry_forward DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS accrual_rate DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accrual_date DATE,
ADD COLUMN IF NOT EXISTS year INT DEFAULT YEAR(CURDATE());

-- Create view for current year leave summary
CREATE OR REPLACE VIEW current_leave_summary AS
SELECT 
    lbh.faculty_id,
    lbh.year,
    lbh.leave_type,
    lbh.opening_balance,
    lbh.allocated,
    lbh.carry_forward,
    lbh.used_balance,
    lbh.closing_balance,
    (lbh.allocated + lbh.carry_forward - lbh.used_balance) as available_balance,
    u.faculty_type,
    u.joining_date,
    u.probation_end_date
FROM leave_balance_history lbh
JOIN users u ON lbh.faculty_id = u.faculty_id
WHERE lbh.year = YEAR(CURDATE());

-- Create stored procedure for monthly accrual processing
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS ProcessMonthlyAccrual(
    IN p_faculty_id VARCHAR(50),
    IN p_year INT,
    IN p_month INT
)
BEGIN
    DECLARE v_faculty_type VARCHAR(50);
    DECLARE v_joining_date DATE;
    DECLARE v_accrual_rate DECIMAL(4,2);
    DECLARE v_max_annual DECIMAL(5,2);
    DECLARE v_current_cumulative DECIMAL(5,2);
    DECLARE v_accrued_days DECIMAL(5,2);
    
    -- Get faculty details
    SELECT faculty_type, joining_date 
    INTO v_faculty_type, v_joining_date
    FROM users 
    WHERE faculty_id = p_faculty_id;
    
    -- Set accrual rates based on faculty type
    CASE v_faculty_type
        WHEN 'teaching' THEN SET v_accrual_rate = 2.5, v_max_annual = 30;
        WHEN 'non_teaching' THEN SET v_accrual_rate = 2.5, v_max_annual = 30;
        WHEN 'contract' THEN SET v_accrual_rate = 1.25, v_max_annual = 15;
        WHEN 'visiting' THEN SET v_accrual_rate = 0.83, v_max_annual = 10;
        ELSE SET v_accrual_rate = 0, v_max_annual = 0;
    END CASE;
    
    -- Calculate accrued days for the month
    SET v_accrued_days = v_accrual_rate;
    
    -- Get current cumulative for the year
    SELECT COALESCE(SUM(accrued_days), 0)
    INTO v_current_cumulative
    FROM leave_accrual_log
    WHERE faculty_id = p_faculty_id 
    AND year = p_year 
    AND leave_type = 'earned'
    AND month < p_month;
    
    -- Cap at maximum annual
    IF (v_current_cumulative + v_accrued_days) > v_max_annual THEN
        SET v_accrued_days = GREATEST(0, v_max_annual - v_current_cumulative);
    END IF;
    
    -- Insert accrual log
    INSERT INTO leave_accrual_log (
        faculty_id, year, month, leave_type, 
        accrual_rate, accrued_days, cumulative_days
    ) VALUES (
        p_faculty_id, p_year, p_month, 'earned',
        v_accrual_rate, v_accrued_days, v_current_cumulative + v_accrued_days
    ) ON DUPLICATE KEY UPDATE
        accrued_days = v_accrued_days,
        cumulative_days = v_current_cumulative + v_accrued_days;
        
END //
DELIMITER ;

-- Create stored procedure for year-end carry forward processing
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS ProcessYearEndCarryForward(
    IN p_faculty_id VARCHAR(50),
    IN p_from_year INT,
    IN p_to_year INT
)
BEGIN
    DECLARE v_faculty_type VARCHAR(50);
    DECLARE v_earned_balance DECIMAL(5,2);
    DECLARE v_max_carry_forward DECIMAL(5,2);
    DECLARE v_carry_forward_amount DECIMAL(5,2);
    DECLARE v_lapsed_amount DECIMAL(5,2);
    
    -- Get faculty type
    SELECT faculty_type INTO v_faculty_type
    FROM users WHERE faculty_id = p_faculty_id;
    
    -- Set carry forward limits based on faculty type
    CASE v_faculty_type
        WHEN 'teaching' THEN SET v_max_carry_forward = 15;
        WHEN 'non_teaching' THEN SET v_max_carry_forward = 15;
        ELSE SET v_max_carry_forward = 0;
    END CASE;
    
    -- Get earned leave balance from previous year
    SELECT COALESCE(closing_balance, 0)
    INTO v_earned_balance
    FROM leave_balance_history
    WHERE faculty_id = p_faculty_id 
    AND year = p_from_year 
    AND leave_type = 'earned';
    
    -- Calculate carry forward and lapsed amounts
    IF v_max_carry_forward > 0 AND v_earned_balance > 0 THEN
        SET v_carry_forward_amount = LEAST(v_earned_balance, v_max_carry_forward);
        SET v_lapsed_amount = GREATEST(0, v_earned_balance - v_max_carry_forward);
    ELSE
        SET v_carry_forward_amount = 0;
        SET v_lapsed_amount = v_earned_balance;
    END IF;
    
    -- Log carry forward processing
    INSERT INTO leave_carry_forward_log (
        faculty_id, from_year, to_year, leave_type,
        available_balance, carry_forward_amount, lapsed_amount
    ) VALUES (
        p_faculty_id, p_from_year, p_to_year, 'earned',
        v_earned_balance, v_carry_forward_amount, v_lapsed_amount
    ) ON DUPLICATE KEY UPDATE
        available_balance = v_earned_balance,
        carry_forward_amount = v_carry_forward_amount,
        lapsed_amount = v_lapsed_amount;
    
    -- Update next year's opening balance
    INSERT INTO leave_balance_history (
        faculty_id, year, leave_type, carry_forward, opening_balance
    ) VALUES (
        p_faculty_id, p_to_year, 'earned', v_carry_forward_amount, v_carry_forward_amount
    ) ON DUPLICATE KEY UPDATE
        carry_forward = v_carry_forward_amount,
        opening_balance = opening_balance + v_carry_forward_amount;
        
END //
DELIMITER ;

-- Insert default configuration data
INSERT IGNORE INTO leave_balance_history (faculty_id, year, leave_type, allocated, opening_balance, closing_balance)
SELECT 
    faculty_id, 
    YEAR(CURDATE()) as year,
    'earned' as leave_type,
    CASE faculty_type
        WHEN 'teaching' THEN 30
        WHEN 'non_teaching' THEN 30
        WHEN 'contract' THEN 15
        WHEN 'visiting' THEN 10
        ELSE 0
    END as allocated,
    0 as opening_balance,
    CASE faculty_type
        WHEN 'teaching' THEN 30
        WHEN 'non_teaching' THEN 30
        WHEN 'contract' THEN 15
        WHEN 'visiting' THEN 10
        ELSE 0
    END as closing_balance
FROM users 
WHERE faculty_type IS NOT NULL;