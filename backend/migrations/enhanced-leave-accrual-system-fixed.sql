-- Enhanced Leave Accrual System Migration (Fixed)
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
    
    -- Indexes
    INDEX idx_faculty_leave_service (faculty_type_id, leave_type_id, service_months_from, service_months_to),
    INDEX idx_effective_dates (effective_from, effective_to, is_active),
    INDEX idx_accrual_lookup (faculty_type_id, leave_type_id, is_active)
);

-- Insert sample enhanced accrual rules
INSERT IGNORE INTO leave_accrual_rules (
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