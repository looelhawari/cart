-- Add comprehensive products for all categories and subcategories
-- This ensures we can test all scenarios: main categories with/without subcategories

-- Products for Fresh Vegetables (category_id=1)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2001, 'Fresh Tomatoes', 'طماطم طازجة', 'fresh-tomatoes-2001', 'Ripe red tomatoes', 8.99, NULL, 500, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800', 4.6, 320, NOW(), NOW()),
(2002, 'Cucumber', 'خيار', 'cucumber-2002', 'Fresh green cucumber', 5.50, 4.99, 300, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800', 4.4, 185, NOW(), NOW()),
(2003, 'Bell Peppers Mix', 'فلفل حلو ملون', 'bell-peppers-mix-2003', 'Colorful bell peppers pack', 12.99, NULL, 200, 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800', 4.7, 240, NOW(), NOW());

-- Link products to Fresh Vegetables category
INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES
(2001, 1), (2002, 1), (2003, 1);

-- Products for Fresh Fruits (category_id=2)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2004, 'Fresh Bananas', 'موز طازج', 'Ripe yellow bananas', 2, 9.99, 8.49, 1, 450, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800', 4.8, 520, NOW(), NOW()),
(2005, 'Green Apples', 'تفاح أخضر', 'Crisp green apples', 2, 14.99, NULL, 1, 350, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800', 4.5, 380, NOW(), NOW()),
(2006, 'Strawberries Box', 'فراولة', 'Sweet fresh strawberries', 2, 18.99, 16.99, 1, 180, 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800', 4.9, 670, NOW(), NOW());

-- Products for Fresh Meat (category_id=3)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2007, 'Fresh Beef Steak', 'ستيك لحم بقري', 'Premium beef cuts', 3, 89.99, NULL, 1, 80, 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800', 4.8, 290, NOW(), NOW()),
(2008, 'Lamb Chops', 'ريش لحم خروف', 'Tender lamb chops', 3, 119.99, 109.99, 1, 60, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800', 4.7, 210, NOW(), NOW()),
(2009, 'Whole Chicken', 'دجاجة كاملة', 'Fresh whole chicken', 3, 45.99, NULL, 1, 120, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800', 4.6, 450, NOW(), NOW());

-- Products for Dairy & Eggs (category_id=4)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2010, 'Full Fat Milk 1L', 'حليب كامل الدسم', 'Fresh full cream milk', 4, 12.99, NULL, 1, 400, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800', 4.5, 580, NOW(), NOW()),
(2011, 'Greek Yogurt 500g', 'زبادي يوناني', 'Thick creamy yogurt', 4, 18.50, 16.99, 1, 250, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', 4.7, 340, NOW(), NOW()),
(2012, 'Farm Fresh Eggs (12)', 'بيض طازج', 'Large fresh eggs', 4, 22.99, NULL, 1, 300, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800', 4.8, 720, NOW(), NOW());

-- Products for Bakery (category_id=5)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2013, 'Whole Wheat Bread', 'خبز قمح كامل', 'Healthy whole grain bread', 5, 8.99, NULL, 1, 350, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 4.4, 420, NOW(), NOW()),
(2014, 'Butter Croissants (6)', 'كرواسون بالزبدة', 'Flaky butter croissants', 5, 24.99, 21.99, 1, 150, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', 4.8, 510, NOW(), NOW()),
(2015, 'Chocolate Cake', 'كيك شوكولاتة', 'Rich chocolate layer cake', 5, 45.99, NULL, 1, 80, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 4.9, 380, NOW(), NOW());

-- Products for Beverages (category_id=6)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2016, 'Cola 2L', 'كولا', 'Classic cola drink', 6, 9.99, 8.49, 1, 600, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800', 4.3, 890, NOW(), NOW()),
(2017, 'Energy Drink 250ml', 'مشروب طاقة', 'Boosts energy and focus', 6, 12.99, NULL, 1, 400, 'https://images.unsplash.com/photo-1622543925917-763c34f3868b?w=800', 4.2, 320, NOW(), NOW()),
(2018, 'Green Tea (20 bags)', 'شاي أخضر', 'Premium green tea', 6, 16.99, 14.99, 1, 250, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', 4.6, 540, NOW(), NOW());

-- Products for Snacks (category_id=7)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2019, 'BBQ Chips 150g', 'شيبس باربيكيو', 'Crunchy BBQ flavored chips', 7, 7.99, NULL, 1, 500, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800', 4.4, 630, NOW(), NOW()),
(2020, 'Mixed Nuts 200g', 'مكسرات مشكلة', 'Premium roasted nuts', 7, 24.99, 22.49, 1, 200, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800', 4.7, 410, NOW(), NOW()),
(2021, 'Chocolate Cookies', 'كوكيز شوكولاتة', 'Crunchy chocolate chip cookies', 7, 14.99, NULL, 1, 350, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800', 4.8, 520, NOW(), NOW());

-- Products for Frozen Foods (category_id=8)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2022, 'Frozen Mixed Vegetables', 'خضار مجمدة مشكلة', 'Healthy frozen vegetables', 8, 18.99, 16.49, 1, 300, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800', 4.5, 380, NOW(), NOW()),
(2023, 'Frozen Chicken Nuggets', 'ناجتس دجاج', 'Crispy chicken nuggets', 8, 32.99, NULL, 1, 250, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800', 4.6, 720, NOW(), NOW()),
(2024, 'Frozen Pizza Margherita', 'بيتزا مارجريتا', 'Ready-to-bake pizza', 8, 39.99, 34.99, 1, 180, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', 4.4, 490, NOW(), NOW());

-- Products for Canned Goods (category_id=9)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2025, 'Canned Corn 400g', 'ذرة معلبة', 'Sweet corn kernels', 9, 8.99, NULL, 1, 400, 'https://images.unsplash.com/photo-1599590986677-cc00748bd88f?w=800', 4.3, 310, NOW(), NOW()),
(2026, 'Tuna in Oil 180g', 'تونة بالزيت', 'Premium tuna chunks', 9, 16.99, 14.99, 1, 350, 'https://images.unsplash.com/photo-1580554530778-ca36943938b2?w=800', 4.6, 580, NOW(), NOW()),
(2027, 'Chickpeas 400g', 'حمص معلب', 'Ready-to-eat chickpeas', 9, 9.99, NULL, 1, 300, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800', 4.5, 270, NOW(), NOW());

-- Products for Cooking Essentials (category_id=10)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2028, 'Olive Oil 750ml', 'زيت زيتون', 'Extra virgin olive oil', 10, 49.99, 44.99, 1, 200, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800', 4.8, 650, NOW(), NOW()),
(2029, 'All Purpose Flour 1kg', 'دقيق متعدد الاستخدامات', 'Premium wheat flour', 10, 11.99, NULL, 1, 500, 'https://images.unsplash.com/photo-1628398827831-2a877bc1a5eb?w=800', 4.4, 410, NOW(), NOW()),
(2030, 'Mixed Spices Set', 'طقم بهارات مشكلة', 'Essential spice collection', 10, 34.99, 29.99, 1, 150, 'https://images.unsplash.com/photo-1596040033229-a0b13b7ef3e6?w=800', 4.7, 320, NOW(), NOW());

-- Products for Personal Care (category_id=11)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2031, 'Shampoo 400ml', 'شامبو', 'Nourishing hair shampoo', 11, 28.99, NULL, 1, 280, 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800', 4.5, 740, NOW(), NOW()),
(2032, 'Face Moisturizer 50ml', 'مرطب الوجه', 'Hydrating face cream', 11, 45.99, 39.99, 1, 200, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 4.7, 520, NOW(), NOW()),
(2033, 'Toothpaste Triple Pack', 'معجون أسنان', 'Fresh mint toothpaste', 11, 19.99, NULL, 1, 350, 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800', 4.6, 630, NOW(), NOW());

-- Products for Household Cleaning (category_id=12)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2034, 'Laundry Detergent 2L', 'منظف غسيل', 'Powerful stain remover', 12, 34.99, 31.49, 1, 250, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800', 4.5, 580, NOW(), NOW()),
(2035, 'Multi-Surface Cleaner', 'منظف متعدد الأسطح', 'Kills 99.9% germs', 12, 22.99, NULL, 1, 300, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800', 4.6, 410, NOW(), NOW()),
(2036, 'Air Freshener Spray', 'معطر جو', 'Lavender scent', 12, 16.99, 14.99, 1, 400, 'https://images.unsplash.com/photo-1631540522743-95577906d53c?w=800', 4.4, 320, NOW(), NOW());

-- Products for Baby Products (category_id=13)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2037, 'Baby Food Puree', 'طعام أطفال مهروس', 'Organic fruit puree', 13, 14.99, NULL, 1, 200, 'https://images.unsplash.com/photo-1616072397627-951f37ab0370?w=800', 4.8, 490, NOW(), NOW()),
(2038, 'Diapers Size 4 (40)', 'حفاضات', 'Super absorbent diapers', 13, 79.99, 69.99, 1, 150, 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800', 4.7, 680, NOW(), NOW()),
(2039, 'Baby Wipes (80)', 'مناديل أطفال', 'Gentle wet wipes', 13, 18.99, NULL, 1, 350, 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800', 4.6, 540, NOW(), NOW());

-- Products for Pet Supplies (category_id=14)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `description_en`, `category_id`, `price`, `sale_price`, `in_stock`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(2040, 'Dog Food Chicken 2kg', 'طعام كلاب', 'Premium chicken formula', 14, 89.99, 79.99, 1, 120, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800', 4.6, 380, NOW(), NOW()),
(2041, 'Cat Toy Ball', 'كرة لعبة قطط', 'Interactive cat toy', 14, 12.99, NULL, 1, 250, 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800', 4.5, 210, NOW(), NOW()),
(2042, 'Pet Shampoo 500ml', 'شامبو حيوانات', 'Gentle pet grooming', 14, 32.99, 28.99, 1, 180, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', 4.7, 290, NOW(), NOW());
