-- Fix for faculty table column name issue
-- Run this to fix the existing database: mysql -u root -p"Naveenaa@0205" nit_ < fix_faculty_column.sql

USE nit_;

-- Ensure faculty_type_id column exists and is properly configured
ALTER TABLE `faculty` 
MODIFY COLUMN `faculty_type_id` VARCHAR(50) DEFAULT 'teaching';

-- Drop existing foreign key if it exists (to avoid duplicate key errors)
SET @fk_exists = (SELECT COUNT(*) 
                  FROM information_schema.TABLE_CONSTRAINTS 
                  WHERE CONSTRAINT_SCHEMA = 'nit_' 
                  AND TABLE_NAME = 'faculty' 
                  AND CONSTRAINT_NAME = 'fk_faculty_type');

SET @sql = IF(@fk_exists > 0, 
              'ALTER TABLE faculty DROP FOREIGN KEY fk_faculty_type', 
              'SELECT "Foreign key does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint
ALTER TABLE `faculty`
ADD CONSTRAINT `fk_faculty_type` 
FOREIGN KEY (`faculty_type_id`) 
REFERENCES `faculty_types_config`(`type_id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verify the change
DESCRIBE faculty;

SELECT 'Faculty table column fixed successfully!' as Status;
