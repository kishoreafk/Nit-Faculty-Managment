-- Enhanced Leave Configuration Schema
-- Add more detailed leave policy fields

-- Add new columns to leave_types_config for enhanced features
ALTER TABLE leave_types_config 
ADD COLUMN annual_reset BOOLEAN DEFAULT TRUE COMMENT 'Whether leave balance resets annually',
ADD COLUMN reset_date VARCHAR(10) DEFAULT '01-01' COMMENT 'Annual reset date (MM-DD format)',
ADD COLUMN reset_frequency ENUM('yearly', 'monthly', 'quarterly', 'custom') DEFAULT 'yearly' COMMENT 'How often leave balance resets',
ADD COLUMN accrual_start_date DATE COMMENT 'When leave accrual starts for new employees',
ADD COLUMN accrual_cap INT DEFAULT 0 COMMENT 'Maximum leave days that can be accrued (0 = no cap)',
ADD COLUMN negative_balance_allowed BOOLEAN DEFAULT FALSE COMMENT 'Allow negative leave balance',
ADD COLUMN max_negative_days INT DEFAULT 0 COMMENT 'Maximum negative balance allowed',
ADD COLUMN weekend_count BOOLEAN DEFAULT TRUE COMMENT 'Whether weekends are counted in leave days',
ADD COLUMN holiday_count BOOLEAN DEFAULT FALSE COMMENT 'Whether holidays are counted in leave days',
ADD COLUMN half_day_allowed BOOLEAN DEFAULT TRUE COMMENT 'Whether half-day leave is allowed',
ADD COLUMN sandwich_leave_policy TEXT COMMENT 'Policy for sandwich leaves (between holidays)',
ADD COLUMN consecutive_limit INT DEFAULT 0 COMMENT 'Maximum consecutive days allowed (0 = no limit)',
ADD COLUMN monthly_limit INT DEFAULT 0 COMMENT 'Maximum days per month (0 = no limit)',
ADD COLUMN quarterly_limit INT DEFAULT 0 COMMENT 'Maximum days per quarter (0 = no limit)',
ADD COLUMN documentation_required TEXT COMMENT 'Required documentation for this leave type',
ADD COLUMN auto_approval_limit INT DEFAULT 0 COMMENT 'Days that can be auto-approved (0 = manual approval)',
ADD COLUMN blackout_periods JSON COMMENT 'Periods when this leave type is not allowed',
ADD COLUMN eligibility_criteria JSON COMMENT 'Criteria for eligibility (tenure, performance, etc.)',
ADD COLUMN leave_category ENUM('paid', 'unpaid', 'partially_paid') DEFAULT 'paid' COMMENT 'Leave payment category',
ADD COLUMN proration_rule ENUM('none', 'monthly', 'daily', 'custom') DEFAULT 'none' COMMENT 'How to prorate leave for new joiners',
ADD COLUMN encashment_rules JSON COMMENT 'Rules for leave encashment',
ADD COLUMN transfer_rules JSON COMMENT 'Rules for transferring leave between types',
ADD COLUMN notification_settings JSON COMMENT 'Notification settings for this leave type',
ADD COLUMN integration_settings JSON COMMENT 'Settings for external system integration';

-- Add new columns to faculty_leave_entitlements for enhanced tracking
ALTER TABLE faculty_leave_entitlements 
ADD COLUMN accrual_frequency ENUM('monthly', 'quarterly', 'yearly', 'daily') DEFAULT 'monthly' COMMENT 'How often leave is accrued',
ADD COLUMN accrual_start_month INT DEFAULT 1 COMMENT 'Month when accrual starts (1-12)',
ADD COLUMN probation_entitlement INT DEFAULT 0 COMMENT 'Leave days during probation period',
ADD COLUMN carry_forward_limit INT DEFAULT 0 COMMENT 'Maximum days that can be carried forward',
ADD COLUMN carry_forward_expiry_months INT DEFAULT 12 COMMENT 'Months after which carried forward leave expires',
ADD COLUMN encashment_percentage DECIMAL(5,2) DEFAULT 100.00 COMMENT 'Percentage of leave value for encashment',
ADD COLUMN min_service_months INT DEFAULT 0 COMMENT 'Minimum service months required for this leave',
ADD COLUMN gender_restriction ENUM('male', 'female', 'all') DEFAULT 'all' COMMENT 'Gender restriction for this leave type',
ADD COLUMN marital_status_restriction ENUM('married', 'unmarried', 'all') DEFAULT 'all' COMMENT 'Marital status restriction',
ADD COLUMN age_restriction_min INT DEFAULT 0 COMMENT 'Minimum age for this leave type',
ADD COLUMN age_restriction_max INT DEFAULT 100 COMMENT 'Maximum age for this leave type',
ADD COLUMN performance_rating_required DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Minimum performance rating required',
ADD COLUMN custom_rules JSON COMMENT 'Custom rules specific to this faculty type and leave type combination';

-- Create new table for leave balance tracking with enhanced features
CREATE TABLE IF NOT EXISTS leave_balance_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    balance_year YEAR NOT NULL,
    opening_balance DECIMAL(5,2) DEFAULT 0.00,
    accrued_balance DECIMAL(5,2) DEFAULT 0.00,
    used_balance DECIMAL(5,2) DEFAULT 0.00,
    carried_forward DECIMAL(5,2) DEFAULT 0.00,
    encashed_balance DECIMAL(5,2) DEFAULT 0.00,
    expired_balance DECIMAL(5,2) DEFAULT 0.00,
    adjusted_balance DECIMAL(5,2) DEFAULT 0.00,
    current_balance DECIMAL(5,2) DEFAULT 0.00,
    last_accrual_date DATE,
    last_reset_date DATE,
    next_reset_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    UNIQUE KEY unique_faculty_leave_year (faculty_id, leave_type_id, balance_year),
    INDEX idx_faculty_year (faculty_id, balance_year),
    INDEX idx_leave_type_year (leave_type_id, balance_year)
);

-- Create table for leave accrual history
CREATE TABLE IF NOT EXISTS leave_accrual_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    leave_type_id VARCHAR(50) NOT NULL,
    accrual_date DATE NOT NULL,
    accrual_amount DECIMAL(5,2) NOT NULL,
    accrual_type ENUM('monthly', 'quarterly', 'yearly', 'adjustment', 'bonus') NOT NULL,
    balance_before DECIMAL(5,2) DEFAULT 0.00,
    balance_after DECIMAL(5,2) DEFAULT 0.00,
    remarks TEXT,
    processed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    INDEX idx_faculty_date (faculty_id, accrual_date),
    INDEX idx_leave_type_date (leave_type_id, accrual_date)
);

-- Create table for leave policy exceptions
CREATE TABLE IF NOT EXISTS leave_policy_exceptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT,
    faculty_type_id VARCHAR(50),
    leave_type_id VARCHAR(50),
    exception_type ENUM('individual', 'group', 'temporary', 'permanent') NOT NULL,
    exception_field VARCHAR(100) NOT NULL COMMENT 'Field being overridden',
    original_value TEXT COMMENT 'Original policy value',
    exception_value TEXT NOT NULL COMMENT 'Exception value',
    effective_from DATE NOT NULL,
    effective_to DATE,
    reason TEXT NOT NULL,
    approved_by INT,
    approval_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    INDEX idx_faculty_effective (faculty_id, effective_from, effective_to),
    INDEX idx_leave_type_effective (leave_type_id, effective_from, effective_to)
);

-- Create table for leave calendar and blackout periods
CREATE TABLE IF NOT EXISTS leave_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    calendar_year YEAR NOT NULL,
    leave_type_id VARCHAR(50),
    faculty_type_id VARCHAR(50),
    blackout_start_date DATE NOT NULL,
    blackout_end_date DATE NOT NULL,
    blackout_reason VARCHAR(255) NOT NULL,
    blackout_type ENUM('complete', 'partial', 'restricted') DEFAULT 'complete',
    max_applications_allowed INT DEFAULT 0,
    priority_criteria JSON COMMENT 'Criteria for prioritizing applications during restricted periods',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    INDEX idx_calendar_year (calendar_year),
    INDEX idx_blackout_dates (blackout_start_date, blackout_end_date)
);

-- Update existing leave_types_config with enhanced default values
UPDATE leave_types_config SET
    annual_reset = TRUE,
    reset_date = '01-01',
    reset_frequency = 'yearly',
    accrual_cap = CASE 
        WHEN leave_type_id = 'earned' THEN 80
        WHEN leave_type_id = 'casual' THEN 12
        ELSE max_carry_forward_days * 2
    END,
    weekend_count = CASE 
        WHEN leave_type_id IN ('casual', 'earned') THEN FALSE
        ELSE TRUE
    END,
    holiday_count = FALSE,
    half_day_allowed = CASE 
        WHEN leave_type_id IN ('casual', 'earned', 'medical') THEN TRUE
        ELSE FALSE
    END,
    consecutive_limit = CASE 
        WHEN leave_type_id = 'casual' THEN 5
        WHEN leave_type_id = 'earned' THEN 30
        ELSE 0
    END,
    monthly_limit = CASE 
        WHEN leave_type_id = 'casual' THEN 3
        ELSE 0
    END,
    auto_approval_limit = CASE 
        WHEN leave_type_id = 'casual' THEN 2
        ELSE 0
    END,
    leave_category = CASE 
        WHEN leave_type_id = 'hpl' THEN 'partially_paid'
        WHEN leave_type_id IN ('study', 'sabbatical') THEN 'unpaid'
        ELSE 'paid'
    END,
    proration_rule = 'monthly',
    eligibility_criteria = JSON_OBJECT(
        'min_service_months', CASE 
            WHEN leave_type_id = 'earned' THEN 6
            WHEN leave_type_id = 'study' THEN 24
            ELSE 0
        END,
        'performance_rating', CASE 
            WHEN leave_type_id = 'study' THEN 3.5
            ELSE 0
        END
    ),
    encashment_rules = JSON_OBJECT(
        'allowed', encashment_allowed,
        'max_days_per_year', CASE 
            WHEN leave_type_id = 'earned' THEN 15
            ELSE 0
        END,
        'encashment_rate', 100,
        'min_balance_required', CASE 
            WHEN leave_type_id = 'earned' THEN 10
            ELSE 0
        END
    ),
    notification_settings = JSON_OBJECT(
        'advance_reminder_days', advance_notice_days,
        'approval_reminder_days', 2,
        'balance_low_threshold', 5,
        'notify_supervisor', TRUE,
        'notify_hr', CASE 
            WHEN leave_type_id IN ('study', 'maternity', 'medical') THEN TRUE
            ELSE FALSE
        END
    );

-- Update faculty_leave_entitlements with enhanced default values
UPDATE faculty_leave_entitlements fle
JOIN leave_types_config ltc ON fle.leave_type_id = ltc.leave_type_id
SET 
    fle.accrual_frequency = CASE 
        WHEN ltc.accrual_period = 'monthly' THEN 'monthly'
        WHEN ltc.accrual_period = 'yearly' THEN 'yearly'
        ELSE 'monthly'
    END,
    fle.carry_forward_limit = CASE 
        WHEN ltc.carry_forward = TRUE THEN ltc.max_carry_forward_days
        ELSE 0
    END,
    fle.carry_forward_expiry_months = CASE 
        WHEN ltc.carry_forward = TRUE THEN 12
        ELSE 0
    END,
    fle.encashment_percentage = CASE 
        WHEN ltc.encashment_allowed = TRUE THEN 100.00
        ELSE 0.00
    END,
    fle.min_service_months = CASE 
        WHEN fle.leave_type_id = 'earned' THEN 6
        WHEN fle.leave_type_id = 'study' THEN 24
        ELSE 0
    END,
    fle.custom_rules = JSON_OBJECT(
        'accrual_rate_per_month', ROUND(fle.max_days / 12, 2),
        'max_accumulation', fle.max_days * 1.5,
        'special_conditions', CASE 
            WHEN fle.faculty_type_id = 'contract' THEN 'Pro-rated based on contract duration'
            WHEN fle.faculty_type_id = 'visiting' THEN 'Limited to visit duration'
            ELSE NULL
        END
    );

-- Insert sample leave calendar entries for current year
INSERT INTO leave_calendar (calendar_year, leave_type_id, blackout_start_date, blackout_end_date, blackout_reason, blackout_type) VALUES
(YEAR(CURDATE()), NULL, CONCAT(YEAR(CURDATE()), '-03-15'), CONCAT(YEAR(CURDATE()), '-04-15'), 'Annual Examination Period', 'restricted'),
(YEAR(CURDATE()), NULL, CONCAT(YEAR(CURDATE()), '-11-01'), CONCAT(YEAR(CURDATE()), '-12-31'), 'Semester End Activities', 'restricted'),
(YEAR(CURDATE()), 'casual', CONCAT(YEAR(CURDATE()), '-01-26'), CONCAT(YEAR(CURDATE()), '-01-26'), 'Republic Day', 'complete'),
(YEAR(CURDATE()), 'casual', CONCAT(YEAR(CURDATE()), '-08-15'), CONCAT(YEAR(CURDATE()), '-08-15'), 'Independence Day', 'complete');

-- Create indexes for better performance
CREATE INDEX idx_leave_balance_faculty_year ON leave_balance_tracking(faculty_id, balance_year);
CREATE INDEX idx_leave_balance_type_year ON leave_balance_tracking(leave_type_id, balance_year);
CREATE INDEX idx_accrual_history_faculty_date ON leave_accrual_history(faculty_id, accrual_date);
CREATE INDEX idx_policy_exceptions_effective ON leave_policy_exceptions(effective_from, effective_to, is_active);
CREATE INDEX idx_leave_calendar_dates ON leave_calendar(blackout_start_date, blackout_end_date, is_active);