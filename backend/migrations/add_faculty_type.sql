-- Disable safe update mode
SET SQL_SAFE_UPDATES = 0;

-- Add facultyType column to faculty table
ALTER TABLE faculty ADD COLUMN facultyType ENUM('Teaching', 'Non-Teaching') DEFAULT 'Teaching' AFTER designation;

-- Update existing records to have a default faculty type based on designation
UPDATE faculty 
SET facultyType = CASE 
    WHEN LOWER(designation) LIKE '%professor%' OR LOWER(designation) LIKE '%lecturer%' OR LOWER(designation) LIKE '%teacher%' THEN 'Teaching'
    ELSE 'Non-Teaching'
END;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'faculty' AND COLUMN_NAME = 'facultyType';

-- Show sample data
SELECT id, firstName, lastName, designation, facultyType FROM faculty LIMIT 5;