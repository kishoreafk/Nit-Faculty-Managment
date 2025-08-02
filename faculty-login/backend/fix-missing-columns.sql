-- Fix missing columns in product_requests table
USE faculty_management_system;

-- Add missing columns to product_requests table
ALTER TABLE product_requests 
ADD COLUMN product_image_url VARCHAR(500) NULL AFTER description,
ADD COLUMN bill_image_url VARCHAR(500) NULL AFTER product_image_url,
ADD COLUMN decision_note TEXT NULL AFTER approvedAt;

-- Verify the changes
DESCRIBE product_requests;