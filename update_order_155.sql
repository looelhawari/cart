-- Update order ID 155 status to 'delivered'
-- Make sure to backup your database before running this script

-- First, check if the order exists
SELECT id, order_number, status, user_id, total, created_at, updated_at 
FROM orders 
WHERE id = 155;

-- Update the order status to 'delivered'
UPDATE orders 
SET status = 'delivered', 
    updated_at = NOW()
WHERE id = 155;

-- Verify the update
SELECT id, order_number, status, user_id, total, created_at, updated_at 
FROM orders 
WHERE id = 155;

-- Optional: Add a status history entry (if you want to track the change)
INSERT INTO order_status_history (order_id, status, notes, created_at, updated_at)
VALUES (155, 'delivered', 'Status updated to delivered', NOW(), NOW());

-- Show the status history for this order
SELECT * FROM order_status_history WHERE order_id = 155 ORDER BY created_at DESC;
