-- Fix for proof display issue - Add missing columns to product_requests table

USE faculty_management_system;

-- Add missing image URL columns to product_requests table
ALTER TABLE product_requests 
ADD COLUMN IF NOT EXISTS product_image_url VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS bill_image_url VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS decision_note TEXT NULL;

-- Update the uploaded_at column name in faculty_timetables if it doesn't exist
ALTER TABLE faculty_timetables 
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure the proofFile column in leave_requests is long enough
ALTER TABLE leave_requests 
MODIFY COLUMN proofFile VARCHAR(500) NULL;

-- Show current structure to verify changes
DESCRIBE product_requests;
DESCRIBE leave_requests;