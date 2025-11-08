-- Enhanced Leave Accrual System Migration
-- This migration creates the enhanced leave accrual system with faculty-type-based rules

-- Create enhanced leave accrual rules table
CREATE TABLE IF NOT EXISTS leave_accrual_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    faculty_type_id VARCHAR(50) NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    
    -- Accrual Configuration
    accrual_period ENUM('monthly', 'quarterly', 'yearly', 'daily') DEFAULT 'monthly',
    accrual_amount DECIMAL(8,2) NOT NULL COMMENT 'Amount accrued per period',
    
    -- Carry-over and Limits
    max_carry_over INT DEFAULT NULL COMMENT 'Maximum days that can be carried over (NULL for unlimited)',
    unlimited_leave BOOLEAN DEFAULT FALSE COMMENT 'Whether this leave type has unlimited accrual',
    
    -- Service-based Rules
    service_months_from INT DEFAULT 0 COMMENT 'Minimum service months for this rule',
    service_months_to INT DEFAULT 999 COMMENT 'Maximum service months for this rule',
    
    -- Calculation Method
    calculation_method ENUM('fixed', 'progressive', 'formula_based', 'custom') DEFAULT 'fixed',
    progressive_rates JSON COMMENT 'Progressive rates based on service periods',
    calculation_formula TEXT COMMENT 'Custom calculation formula',
    
    -- Validity Period
    effective_from DATE NOT NULL,
    effective_to DATE DEFAULT NULL,
    
    -- Additional Settings
    accrual_settings JSON COMMENT 'Additional accrual configuration settings',
    
    -- Status and Timestamps
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_faculty_leave_service (faculty_type_id, leave_type_id, service_months_from, service_months_to),
    INDEX idx_effective_dates (effective_from, effective_to, is_active),
    INDEX idx_accrual_lookup (faculty_type_id, leave_type_id, is_active)
);

-- Enhance faculty_leave_entitlements table with additional accrual fields
ALTER TABLE faculty_leave_entitlements 
ADD COLUMN IF NOT EXISTS unlimited_leave BOOLEAN DEFAULT FALSE COMMENT 'Whether this entitlement allows unlimited leave',
ADD COLUMN IF NOT EXISTS max_carry_over INT DEFAULT NULL COMMENT 'Maximum carry-over days (NULL for unlimited)',
ADD COLUMN IF NOT EXISTS accrual_start_from ENUM('joining_date', 'confirmation_date', 'custom_date') DEFAULT 'joining_date' COMMENT 'When accrual starts',
ADD COLUMN IF NOT EXISTS min_service_months INT DEFAULT 0 COMMENT 'Minimum service months before accrual starts';

-- Enhance leave_types_config table with accrual-specific settings
ALTER TABLE leave_types_config 
ADD COLUMN IF NOT EXISTS supports_unlimited BOOLEAN DEFAULT FALSE COMMENT 'Whether this leave type can be unlimited',
ADD COLUMN IF NOT EXISTS default_accrual_period ENUM('monthly', 'quarterly', 'yearly', 'daily') DEFAULT 'monthly' COMMENT 'Default accrual period',
ADD COLUMN IF NOT EXISTS accrual_cap_per_year DECIMAL(8,2) DEFAULT NULL COMMENT 'Maximum accrual per year (NULL for no cap)';

-- Create leave balance tracking table with enhanced fields
CREATE TABLE IF NOT EXISTS leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    
    -- Balance Tracking
    accrued_days DECIMAL(8,2) DEFAULT 0 COMMENT 'Total days accrued',
    used_days DECIMAL(8,2) DEFAULT 0 COMMENT 'Total days used',
    balance_days DECIMAL(8,2) DEFAULT 0 COMMENT 'Current balance (accrued - used)',
    carried_forward_days DECIMAL(8,2) DEFAULT 0 COMMENT 'Days carried forward from previous year',
    
    -- Accrual Information
    last_accrual_date DATE COMMENT 'Last date when leave was accrued',
    accrual_rate DECIMAL(8,2) DEFAULT 0 COMMENT 'Current accrual rate per month',
    unlimited_leave BOOLEAN DEFAULT FALSE COMMENT 'Whether this balance is unlimited',
    
    -- Year Tracking
    balance_year YEAR DEFAULT (YEAR(CURDATE())) COMMENT 'Year for this balance record',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate balances
    UNIQUE KEY unique_faculty_leave_year (faculty_id, leave_type_id, balance_year),
    
    -- Indexes
    INDEX idx_faculty_balance (faculty_id, balance_year),
    INDEX idx_leave_type_balance (leave_type_id, balance_year),
    INDEX idx_accrual_date (last_accrual_date)
);

-- Create leave accrual history table for audit trail
CREATE TABLE IF NOT EXISTS leave_accrual_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    
    -- Accrual Details
    accrual_date DATE NOT NULL,
    accrual_amount DECIMAL(8,2) NOT NULL,
    accrual_type ENUM('monthly', 'quarterly', 'yearly', 'adjustment', 'carry_forward') NOT NULL,
    
    -- Rule Information
    applied_rule_id INT COMMENT 'ID of the accrual rule that was applied',
    rule_name VARCHAR(100) COMMENT 'Name of the applied rule',
    
    -- Balance Information
    balance_before DECIMAL(8,2) DEFAULT 0,
    balance_after DECIMAL(8,2) DEFAULT 0,
    
    -- Additional Information
    notes TEXT COMMENT 'Additional notes about this accrual',
    processed_by INT COMMENT 'Admin user who processed this accrual',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    FOREIGN KEY (applied_rule_id) REFERENCES leave_accrual_rules(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES faculty(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_faculty_accrual_history (faculty_id, accrual_date),
    INDEX idx_leave_type_history (leave_type_id, accrual_date),
    INDEX idx_accrual_date (accrual_date)
);

-- Insert sample enhanced accrual rules
INSERT INTO leave_accrual_rules (
    rule_name, faculty_type_id, leave_type_id, accrual_period, accrual_amount,
    max_carry_over, unlimited_leave, service_months_from, service_months_to,
    calculation_method, progressive_rates, effective_from, accrual_settings
) VALUES
-- Teaching Faculty - Earned Leave with Progressive Rates
('Teaching EL Progressive', 'teaching', 'earned', 'monthly', 2.50, 15, FALSE, 0, 999, 'progressive', 
 JSON_OBJECT(
   '0-24', 1.0,
   '24-60', 1.2,
   '60-120', 1.4,
   '120+', 1.6
 ), '2024-01-01', 
 JSON_OBJECT('proration', true, 'accrual_timing', 'start_of_month')),

-- Teaching Faculty - Casual Leave
('Teaching CL Fixed', 'teaching', 'casual', 'monthly', 1.00, 0, FALSE, 0, 999, 'fixed', 
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Teaching Faculty - Special Casual Leave
('Teaching SCL Limited', 'teaching', 'special_casual', 'yearly', 2.00, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Non-Teaching Staff - Earned Leave
('Non-Teaching EL Standard', 'non_teaching', 'earned', 'monthly', 2.50, 15, FALSE, 0, 999, 'progressive',
 JSON_OBJECT(
   '0-24', 1.0,
   '24-60', 1.1,
   '60+', 1.3
 ), '2024-01-01',
 JSON_OBJECT('proration', true, 'accrual_timing', 'start_of_month')),

-- Non-Teaching Staff - Casual Leave
('Non-Teaching CL Fixed', 'non_teaching', 'casual', 'monthly', 1.00, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Non-Teaching Staff - Restricted Holiday
('Non-Teaching RH Annual', 'non_teaching', 'rh', 'yearly', 2.00, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Contract Faculty - Limited Earned Leave
('Contract EL Limited', 'contract', 'earned', 'monthly', 1.25, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', true, 'reset_yearly', true)),

-- Contract Faculty - Casual Leave
('Contract CL Limited', 'contract', 'casual', 'monthly', 0.67, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Visiting Faculty - Minimal Leave
('Visiting CL Minimal', 'visiting', 'casual', 'monthly', 0.50, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('proration', false, 'reset_yearly', true)),

-- Medical Leave - Unlimited for all faculty types
('All Faculty ML Unlimited', 'teaching', 'medical', 'yearly', 90.00, NULL, TRUE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('unlimited', true, 'medical_certificate_required', true)),

('All Faculty ML Unlimited NT', 'non_teaching', 'medical', 'yearly', 90.00, NULL, TRUE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('unlimited', true, 'medical_certificate_required', true)),

('Contract ML Limited', 'contract', 'medical', 'yearly', 60.00, 0, FALSE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('medical_certificate_required', true)),

-- Maternity Leave - Gender-specific unlimited
('Maternity Leave Teaching', 'teaching', 'maternity', 'yearly', 180.00, NULL, TRUE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('unlimited', true, 'gender_specific', 'female', 'medical_certificate_required', true)),

('Maternity Leave Non-Teaching', 'non_teaching', 'maternity', 'yearly', 180.00, NULL, TRUE, 0, 999, 'fixed',
 NULL, '2024-01-01',
 JSON_OBJECT('unlimited', true, 'gender_specific', 'female', 'medical_certificate_required', true));

-- Update existing leave types to support new features
UPDATE leave_types_config SET
    supports_unlimited = CASE 
        WHEN leave_type_id IN ('medical', 'maternity', 'study') THEN TRUE
        ELSE FALSE
    END,
    default_accrual_period = CASE 
        WHEN leave_type_id IN ('earned', 'casual') THEN 'monthly'
        WHEN leave_type_id IN ('special_casual', 'rh') THEN 'yearly'
        ELSE 'yearly'
    END,
    accrual_cap_per_year = CASE 
        WHEN leave_type_id = 'earned' THEN 30.00
        WHEN leave_type_id = 'casual' THEN 12.00
        WHEN leave_type_id = 'special_casual' THEN 2.00
        WHEN leave_type_id = 'rh' THEN 2.00
        ELSE NULL
    END;

-- Update faculty_leave_entitlements with enhanced settings
UPDATE faculty_leave_entitlements fle
JOIN leave_types_config ltc ON fle.leave_type_id = ltc.leave_type_id
SET 
    fle.unlimited_leave = CASE 
        WHEN ltc.leave_type_id IN ('medical', 'maternity', 'study') THEN TRUE
        ELSE FALSE
    END,
    fle.max_carry_over = CASE 
        WHEN ltc.leave_type_id = 'earned' THEN 15
        WHEN ltc.leave_type_id IN ('casual', 'special_casual', 'rh') THEN 0
        ELSE NULL
    END,
    fle.accrual_start_from = 'joining_date',
    fle.min_service_months = CASE 
        WHEN ltc.leave_type_id = 'earned' THEN 6
        ELSE 0
    END;



-- Create a view for easy accrual rule lookup
CREATE OR REPLACE VIEW v_active_accrual_rules AS
SELECT 
    lar.*,
    ftc.name as faculty_type_name,
    ltc.name as leave_type_name,
    ltc.description as leave_type_description,
    ltc.supports_unlimited,
    ltc.default_accrual_period
FROM leave_accrual_rules lar
JOIN faculty_types_config ftc ON lar.faculty_type_id = ftc.type_id
JOIN leave_types_config ltc ON lar.leave_type_id = ltc.leave_type_id
WHERE lar.is_active = TRUE 
    AND lar.effective_from <= CURDATE() 
    AND (lar.effective_to IS NULL OR lar.effective_to >= CURDATE())
    AND ftc.is_active = TRUE 
    AND ltc.is_active = TRUE;

-- Create a view for current leave balances with accrual information
CREATE OR REPLACE VIEW v_current_leave_balances AS
SELECT 
    lb.*,
    f.name as faculty_name,
    f.facultyType,
    f.joiningDate,
    ltc.name as leave_type_name,
    ltc.description as leave_type_description,
    DATEDIFF(CURDATE(), f.joiningDate) / 30.44 as service_months,
    CASE 
        WHEN lb.unlimited_leave THEN 'Unlimited'
        ELSE CONCAT(lb.balance_days, ' days')
    END as balance_display
FROM leave_balances lb
JOIN faculty f ON lb.faculty_id = f.id
JOIN leave_types_config ltc ON lb.leave_type_id = ltc.leave_type_id
WHERE lb.balance_year = YEAR(CURDATE());

-- Insert sample leave balances for existing faculty (if any)
INSERT IGNORE INTO leave_balances (faculty_id, leave_type_id, accrued_days, balance_days, accrual_rate, balance_year)
SELECT 
    f.id,
    'earned',
    GREATEST(0, DATEDIFF(CURDATE(), f.joiningDate) / 30.44 * 2.5),
    GREATEST(0, DATEDIFF(CURDATE(), f.joiningDate) / 30.44 * 2.5),
    2.5,
    YEAR(CURDATE())
FROM faculty f
WHERE f.facultyType IN ('teaching', 'non_teaching');

INSERT IGNORE INTO leave_balances (faculty_id, leave_type_id, accrued_days, balance_days, accrual_rate, balance_year)
SELECT 
    f.id,
    'casual',
    GREATEST(0, LEAST(12, DATEDIFF(CURDATE(), f.joiningDate) / 30.44 * 1.0)),
    GREATEST(0, LEAST(12, DATEDIFF(CURDATE(), f.joiningDate) / 30.44 * 1.0)),
    1.0,
    YEAR(CURDATE())
FROM faculty f
WHERE f.facultyType IN ('teaching', 'non_teaching', 'contract', 'visiting');