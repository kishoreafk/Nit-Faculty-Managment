-- Create logs table for admin actions
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type ENUM('leave_approved', 'leave_rejected', 'product_approved', 'product_rejected', 'timetable_assigned') NOT NULL,
  target_user_id INT NOT NULL,
  target_item_id INT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES faculty(id),
  FOREIGN KEY (target_user_id) REFERENCES faculty(id)
);