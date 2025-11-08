-- Add leave calculation configuration to the system

-- Add leave calculation columns to faculty_leave_entitlements table
ALTER TABLE faculty_leave_entitlements 
ADD COLUMN monthly_accrual_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Leave days accrued per month',
ADD COLUMN yearly_accrual_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Leave days accrued per year',
ADD COLUMN accrual_calculation_method ENUM('monthly', 'yearly', 'daily', 'custom') DEFAULT 'monthly' COMMENT 'How leave is calculated',
ADD COLUMN working_days_per_month INT DEFAULT 22 COMMENT 'Working days per month for calculation',
ADD COLUMN working_days_per_year INT DEFAULT 264 COMMENT 'Working days per year for calculation',
ADD COLUMN proration_method ENUM('none', 'monthly', 'daily', 'working_days') DEFAULT 'monthly' COMMENT 'How to prorate for partial months',
ADD COLUMN calculation_formula TEXT COMMENT 'Custom formula for leave calculation',
ADD COLUMN minimum_service_for_accrual INT DEFAULT 0 COMMENT 'Minimum service days before accrual starts',
ADD COLUMN accrual_start_from ENUM('joining_date', 'confirmation_date', 'custom_date') DEFAULT 'joining_date' COMMENT 'When accrual starts';

-- Create leave calculation rules table for more complex scenarios
CREATE TABLE IF NOT EXISTS leave_calculation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    faculty_type_id VARCHAR(50),
    leave_type_id VARCHAR(50),
    service_months_from INT DEFAULT 0,
    service_months_to INT DEFAULT 999,
    calculation_method ENUM('fixed_monthly', 'fixed_yearly', 'progressive', 'formula_based') DEFAULT 'fixed_monthly',
    base_rate DECIMAL(5,2) DEFAULT 0.00,
    progressive_rates JSON COMMENT 'Progressive rates based on service years',
    calculation_formula TEXT COMMENT 'Custom calculation formula',
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_type_id) REFERENCES faculty_types_config(type_id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_config(leave_type_id) ON DELETE CASCADE,
    INDEX idx_faculty_leave_service (faculty_type_id, leave_type_id, service_months_from, service_months_to),
    INDEX idx_effective_dates (effective_from, effective_to, is_active)
);

-- Update existing faculty_leave_entitlements with calculated monthly rates
UPDATE faculty_leave_entitlements fle
JOIN leave_types_config ltc ON fle.leave_type_id = ltc.leave_type_id
SET 
    fle.monthly_accrual_rate = CASE 
        WHEN ltc.accrual_period = 'monthly' THEN ROUND(fle.max_days / 12, 2)
        WHEN ltc.accrual_period = 'yearly' THEN fle.max_days
        ELSE ROUND(fle.max_days / 12, 2)
    END,
    fle.yearly_accrual_rate = fle.max_days,
    fle.accrual_calculation_method = CASE 
        WHEN ltc.accrual_period = 'yearly' THEN 'yearly'
        ELSE 'monthly'
    END,
    fle.working_days_per_month = 22,
    fle.working_days_per_year = 264,
    fle.proration_method = 'monthly';

-- Insert sample leave calculation rules
INSERT INTO leave_calculation_rules (
    rule_name, faculty_type_id, leave_type_id, service_months_from, service_months_to,
    calculation_method, base_rate, progressive_rates, effective_from
) VALUES
-- Teaching Faculty - Earned Leave with progressive rates
('Teaching EL Progressive', 'teaching', 'earned', 0, 60, 'progressive', 2.5, 
 JSON_OBJECT(
   '0-24', 2.5,
   '24-60', 3.0,
   '60-120', 3.5,
   '120+', 4.0
 ), '2024-01-01'),

-- Teaching Faculty - Casual Leave
('Teaching CL Fixed', 'teaching', 'casual', 0, 999, 'fixed_monthly', 1.0, NULL, '2024-01-01'),

-- Non-Teaching Staff - Different rates
('Non-Teaching EL', 'non_teaching', 'earned', 0, 999, 'fixed_monthly', 2.0, NULL, '2024-01-01'),
('Non-Teaching CL', 'non_teaching', 'casual', 0, 999, 'fixed_monthly', 0.67, NULL, '2024-01-01'),

-- Contract Faculty - Pro-rated
('Contract EL', 'contract', 'earned', 0, 999, 'fixed_monthly', 1.5, NULL, '2024-01-01'),
('Contract CL', 'contract', 'casual', 0, 999, 'fixed_monthly', 0.5, NULL, '2024-01-01'),

-- Visiting Faculty - Limited
('Visiting CL', 'visiting', 'casual', 0, 999, 'fixed_monthly', 0.25, NULL, '2024-01-01');

-- Create leave accrual calculation functions table for custom formulas
CREATE TABLE IF NOT EXISTS leave_calculation_functions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    formula_template TEXT NOT NULL COMMENT 'Template with placeholders like {service_months}, {base_rate}, etc.',
    parameters JSON COMMENT 'Required parameters and their types',
    example_usage TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample calculation functions
INSERT INTO leave_calculation_functions (function_name, description, formula_template, parameters, example_usage) VALUES
('linear_progression', 'Linear progression based on service years', 
 '{base_rate} + ({service_years} * {increment_per_year})', 
 JSON_OBJECT('base_rate', 'number', 'increment_per_year', 'number'),
 'For EL: base_rate=2.5, increment_per_year=0.1'),

('tiered_calculation', 'Tiered calculation with different rates for service bands',
 'CASE WHEN {service_months} < 24 THEN {tier1_rate} WHEN {service_months} < 60 THEN {tier2_rate} ELSE {tier3_rate} END',
 JSON_OBJECT('tier1_rate', 'number', 'tier2_rate', 'number', 'tier3_rate', 'number'),
 'Different rates for 0-2 years, 2-5 years, 5+ years'),

('performance_based', 'Performance-based calculation',
 '{base_rate} * {performance_multiplier}',
 JSON_OBJECT('base_rate', 'number', 'performance_multiplier', 'number'),
 'Base rate multiplied by performance rating'),

('working_days_based', 'Based on actual working days',
 '({working_days_in_month} / {standard_working_days}) * {monthly_rate}',
 JSON_OBJECT('monthly_rate', 'number', 'standard_working_days', 'number'),
 'Prorated based on actual working days in month');

-- Add indexes for better performance
CREATE INDEX idx_calculation_rules_lookup ON leave_calculation_rules(faculty_type_id, leave_type_id, is_active, effective_from, effective_to);
CREATE INDEX idx_entitlements_calculation ON faculty_leave_entitlements(faculty_type_id, leave_type_id, monthly_accrual_rate);

-- Update leave_types_config to include calculation settings
ALTER TABLE leave_types_config 
ADD COLUMN default_calculation_method ENUM('fixed', 'progressive', 'formula_based', 'custom') DEFAULT 'fixed' COMMENT 'Default calculation method for this leave type',
ADD COLUMN calculation_notes TEXT COMMENT 'Notes about how this leave type should be calculated',
ADD COLUMN supports_proration BOOLEAN DEFAULT TRUE COMMENT 'Whether this leave type supports proration',
ADD COLUMN accrual_timing ENUM('start_of_month', 'end_of_month', 'mid_month', 'daily') DEFAULT 'start_of_month' COMMENT 'When in the month leave is accrued';

-- Update existing leave types with calculation settings
UPDATE leave_types_config SET
    default_calculation_method = CASE 
        WHEN leave_type_id = 'earned' THEN 'progressive'
        WHEN leave_type_id IN ('casual', 'medical') THEN 'fixed'
        ELSE 'fixed'
    END,
    calculation_notes = CASE 
        WHEN leave_type_id = 'earned' THEN 'Progressive accrual based on service years'
        WHEN leave_type_id = 'casual' THEN 'Fixed monthly accrual'
        WHEN leave_type_id = 'medical' THEN 'Annual allocation, no monthly accrual'
        ELSE 'Standard fixed calculation'
    END,
    supports_proration = CASE 
        WHEN leave_type_id IN ('earned', 'casual') THEN TRUE
        ELSE FALSE
    END,
    accrual_timing = CASE 
        WHEN leave_type_id = 'earned' THEN 'start_of_month'
        WHEN leave_type_id = 'casual' THEN 'start_of_month'
        ELSE 'start_of_month'
    END;