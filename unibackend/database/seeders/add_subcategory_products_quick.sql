-- Quick test: Add products to some subcategories to test navigation

-- Products for "Fresh Milk" subcategory (ID: 199)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4001, 'Whole Milk 1L', 'حليب كامل الدسم', 'whole-milk-1l-test', 'Fresh whole milk', 11.99, NULL, 300, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800', 4.6, 420, NOW(), NOW()),
(4002, 'Skimmed Milk 1L', 'حليب خالي الدسم', 'skimmed-milk-1l-test', 'Low fat milk', 10.99, 9.99, 250, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800', 4.5, 310, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4001, 199), (4002, 199);

-- Products for "Yogurt & Labneh" subcategory (ID: 200)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4003, 'Plain Yogurt 500g', 'زبادي سادة', 'plain-yogurt-500g-test', 'Creamy plain yogurt', 8.99, NULL, 400, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', 4.7, 530, NOW(), NOW()),
(4004, 'Labneh 250g', 'لبنة', 'labneh-250g-test', 'Thick strained yogurt', 12.99, 11.49, 200, 'https://images.unsplash.com/photo-1571212515416-17a327adf906?w=800', 4.8, 640, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4003, 200), (4004, 200);

-- Products for "Tomatoes" subcategory (ID: 148)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4005, 'Cherry Tomatoes 250g', 'طماطم كرزية', 'cherry-tomatoes-test', 'Sweet cherry tomatoes', 14.99, NULL, 180, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800', 4.5, 280, NOW(), NOW()),
(4006, 'Roma Tomatoes 1kg', 'طماطم رومية', 'roma-tomatoes-test', 'Perfect for sauces', 9.99, 8.49, 350, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800', 4.4, 210, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4005, 148), (4006, 148);

-- Products for "Apples" subcategory (ID: 153)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4007, 'Red Apples 1kg', 'تفاح أحمر', 'red-apples-1kg-test', 'Sweet red apples', 16.99, 14.99, 300, 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800', 4.7, 520, NOW(), NOW()),
(4008, 'Green Apples 1kg', 'تفاح أخضر', 'green-apples-1kg-test2', 'Tart green apples', 15.99, NULL, 280, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800', 4.6, 410, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4007, 153), (4008, 153);

-- Products for "Beef" subcategory (ID: 158)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4009, 'Beef Tenderloin 500g', 'فيليه لحم بقري', 'beef-tenderloin-test', 'Premium beef tenderloin', 149.99, NULL, 50, 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800', 4.9, 180, NOW(), NOW()),
(4010, 'Ground Beef 500g', 'لحم مفروم', 'ground-beef-test', 'Fresh ground beef', 45.99, 42.99, 150, 'https://images.unsplash.com/photo-1607623488235-35667fb23bb8?w=800', 4.6, 340, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4009, 158), (4010, 158);

-- Products for "Chocolate Bars" subcategory (ID: 178)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(4011, 'Milk Chocolate Bar', 'شوكولاتة بالحليب', 'milk-chocolate-bar-test', 'Smooth milk chocolate', 5.99, NULL, 500, 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800', 4.8, 920, NOW(), NOW()),
(4012, 'Dark Chocolate 70%', 'شوكولاتة داكنة', 'dark-chocolate-70-test', 'Rich dark chocolate', 7.99, 6.99, 400, 'https://images.unsplash.com/photo-1606312619070-d48b4cac5f38?w=800', 4.7, 780, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (4011, 178), (4012, 178);
