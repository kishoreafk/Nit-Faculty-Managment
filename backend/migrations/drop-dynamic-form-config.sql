-- Drop Dynamic Form Configuration System Tables
-- This migration removes all tables related to the dynamic form configuration system

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS dynamic_form_submissions;
DROP TABLE IF EXISTS form_templates;
DROP TABLE IF EXISTS form_field_configurations;

-- Note: This will permanently delete all dynamic form configuration data
-- Make sure to backup any important data before running this migration