-- Add comprehensive test products for all categories
-- Products are linked to categories through product_categories pivot table

-- Fresh Vegetables products (category_id=1)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3001, 'Fresh Tomatoes 1kg', 'طماطم طازجة', 'fresh-tomatoes-1kg', 'Ripe red tomatoes', 8.99, NULL, 500, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800', 4.6, 320, NOW(), NOW()),
(3002, 'Cucumber 500g', 'خيار', 'cucumber-500g', 'Fresh green cucumber', 5.50, 4.99, 300, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800', 4.4, 185, NOW(), NOW()),
(3003, 'Bell Peppers Mix', 'فلفل حلو ملون', 'bell-peppers-mix', 'Colorful bell peppers pack', 12.99, NULL, 200, 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800', 4.7, 240, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3001, 1), (3002, 1), (3003, 1);

-- Fresh Fruits products (category_id=2)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3004, 'Fresh Bananas 1kg', 'موز طازج', 'fresh-bananas-1kg', 'Ripe yellow bananas', 9.99, 8.49, 450, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800', 4.8, 520, NOW(), NOW()),
(3005, 'Green Apples 1kg', 'تفاح أخضر', 'green-apples-1kg', 'Crisp green apples', 14.99, NULL, 350, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800', 4.5, 380, NOW(), NOW()),
(3006, 'Strawberries 250g', 'فراولة', 'strawberries-250g', 'Sweet fresh strawberries', 18.99, 16.99, 180, 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800', 4.9, 670, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3004, 2), (3005, 2), (3006, 2);

-- Fresh Meat products (category_id=3)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3007, 'Beef Steak 500g', 'ستيك لحم بقري', 'beef-steak-500g', 'Premium beef cuts', 89.99, NULL, 80, 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800', 4.8, 290, NOW(), NOW()),
(3008, 'Lamb Chops 750g', 'ريش لحم خروف', 'lamb-chops-750g', 'Tender lamb chops', 119.99, 109.99, 60, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800', 4.7, 210, NOW(), NOW()),
(3009, 'Whole Chicken 1.5kg', 'دجاجة كاملة', 'whole-chicken-15kg', 'Fresh whole chicken', 45.99, NULL, 120, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800', 4.6, 450, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3007, 3), (3008, 3), (3009, 3);

-- Dairy & Eggs products (category_id=4)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3010, 'Full Fat Milk 1L', 'حليب كامل الدسم', 'full-fat-milk-1l', 'Fresh full cream milk', 12.99, NULL, 400, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800', 4.5, 580, NOW(), NOW()),
(3011, 'Greek Yogurt 500g', 'زبادي يوناني', 'greek-yogurt-500g', 'Thick creamy yogurt', 18.50, 16.99, 250, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', 4.7, 340, NOW(), NOW()),
(3012, 'Farm Fresh Eggs 12', 'بيض طازج', 'farm-fresh-eggs-12', 'Large fresh eggs', 22.99, NULL, 300, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800', 4.8, 720, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3010, 4), (3011, 4), (3012, 4);

-- Bakery products (category_id=5)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3013, 'Whole Wheat Bread', 'خبز قمح كامل', 'whole-wheat-bread', 'Healthy whole grain bread', 8.99, NULL, 350, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 4.4, 420, NOW(), NOW()),
(3014, 'Butter Croissants 6pc', 'كرواسون بالزبدة', 'butter-croissants-6pc', 'Flaky butter croissants', 24.99, 21.99, 150, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', 4.8, 510, NOW(), NOW()),
(3015, 'Chocolate Cake', 'كيك شوكولاتة', 'chocolate-cake', 'Rich chocolate layer cake', 45.99, NULL, 80, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 4.9, 380, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3013, 5), (3014, 5), (3015, 5);

-- Beverages products (category_id=6)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3016, 'Cola 2L', 'كولا', 'cola-2l', 'Classic cola drink', 9.99, 8.49, 600, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800', 4.3, 890, NOW(), NOW()),
(3017, 'Energy Drink 250ml', 'مشروب طاقة', 'energy-drink-250ml', 'Boosts energy and focus', 12.99, NULL, 400, 'https://images.unsplash.com/photo-1622543925917-763c34f3868b?w=800', 4.2, 320, NOW(), NOW()),
(3018, 'Green Tea 20 Bags', 'شاي أخضر', 'green-tea-20bags', 'Premium green tea', 16.99, 14.99, 250, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', 4.6, 540, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3016, 6), (3017, 6), (3018, 6);

-- Snacks products (category_id=7)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3019, 'BBQ Chips 150g', 'شيبس باربيكيو', 'bbq-chips-150g', 'Crunchy BBQ flavored chips', 7.99, NULL, 500, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800', 4.4, 630, NOW(), NOW()),
(3020, 'Mixed Nuts 200g', 'مكسرات مشكلة', 'mixed-nuts-200g', 'Premium roasted nuts', 24.99, 22.49, 200, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800', 4.7, 410, NOW(), NOW()),
(3021, 'Chocolate Cookies', 'كوكيز شوكولاتة', 'chocolate-cookies', 'Crunchy chocolate chip cookies', 14.99, NULL, 350, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800', 4.8, 520, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3019, 7), (3020, 7), (3021, 7);

-- Frozen Foods products (category_id=8)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3022, 'Frozen Mixed Veg 1kg', 'خضار مجمدة مشكلة', 'frozen-mixed-veg-1kg', 'Healthy frozen vegetables', 18.99, 16.49, 300, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800', 4.5, 380, NOW(), NOW()),
(3023, 'Chicken Nuggets 400g', 'ناجتس دجاج', 'chicken-nuggets-400g', 'Crispy chicken nuggets', 32.99, NULL, 250, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800', 4.6, 720, NOW(), NOW()),
(3024, 'Pizza Margherita', 'بيتزا مارجريتا', 'pizza-margherita', 'Ready-to-bake pizza', 39.99, 34.99, 180, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', 4.4, 490, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3022, 8), (3023, 8), (3024, 8);

-- Canned Goods products (category_id=9)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3025, 'Canned Corn 400g', 'ذرة معلبة', 'canned-corn-400g', 'Sweet corn kernels', 8.99, NULL, 400, 'https://images.unsplash.com/photo-1599590986677-cc00748bd88f?w=800', 4.3, 310, NOW(), NOW()),
(3026, 'Tuna in Oil 180g', 'تونة بالزيت', 'tuna-oil-180g', 'Premium tuna chunks', 16.99, 14.99, 350, 'https://images.unsplash.com/photo-1580554530778-ca36943938b2?w=800', 4.6, 580, NOW(), NOW()),
(3027, 'Chickpeas 400g', 'حمص معلب', 'chickpeas-400g', 'Ready-to-eat chickpeas', 9.99, NULL, 300, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800', 4.5, 270, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3025, 9), (3026, 9), (3027, 9);

-- Cooking Essentials products (category_id=10)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3028, 'Olive Oil 750ml', 'زيت زيتون', 'olive-oil-750ml', 'Extra virgin olive oil', 49.99, 44.99, 200, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800', 4.8, 650, NOW(), NOW()),
(3029, 'All Purpose Flour 1kg', 'دقيق متعدد الاستخدامات', 'flour-1kg', 'Premium wheat flour', 11.99, NULL, 500, 'https://images.unsplash.com/photo-1628398827831-2a877bc1a5eb?w=800', 4.4, 410, NOW(), NOW()),
(3030, 'Mixed Spices Set', 'طقم بهارات مشكلة', 'mixed-spices-set', 'Essential spice collection', 34.99, 29.99, 150, 'https://images.unsplash.com/photo-1596040033229-a0b13b7ef3e6?w=800', 4.7, 320, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3028, 10), (3029, 10), (3030, 10);

-- Personal Care products (category_id=11)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3031, 'Shampoo 400ml', 'شامبو', 'shampoo-400ml', 'Nourishing hair shampoo', 28.99, NULL, 280, 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800', 4.5, 740, NOW(), NOW()),
(3032, 'Face Moisturizer 50ml', 'مرطب الوجه', 'face-moisturizer-50ml', 'Hydrating face cream', 45.99, 39.99, 200, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 4.7, 520, NOW(), NOW()),
(3033, 'Toothpaste 3 Pack', 'معجون أسنان', 'toothpaste-3pack', 'Fresh mint toothpaste', 19.99, NULL, 350, 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800', 4.6, 630, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3031, 11), (3032, 11), (3033, 11);

-- Household Cleaning products (category_id=12)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3034, 'Laundry Detergent 2L', 'منظف غسيل', 'laundry-detergent-2l', 'Powerful stain remover', 34.99, 31.49, 250, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800', 4.5, 580, NOW(), NOW()),
(3035, 'Multi-Surface Cleaner', 'منظف متعدد الأسطح', 'multi-surface-cleaner', 'Kills 99.9% germs', 22.99, NULL, 300, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800', 4.6, 410, NOW(), NOW()),
(3036, 'Air Freshener Lavender', 'معطر جو لافندر', 'air-freshener-lavender', 'Fresh lavender scent', 16.99, 14.99, 400, 'https://images.unsplash.com/photo-1631540522743-95577906d53c?w=800', 4.4, 320, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3034, 12), (3035, 12), (3036, 12);

-- Baby Products (category_id=13)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3037, 'Baby Food Puree', 'طعام أطفال مهروس', 'baby-food-puree', 'Organic fruit puree', 14.99, NULL, 200, 'https://images.unsplash.com/photo-1616072397627-951f37ab0370?w=800', 4.8, 490, NOW(), NOW()),
(3038, 'Diapers Size 4 (40pc)', 'حفاضات', 'diapers-size4-40pc', 'Super absorbent diapers', 79.99, 69.99, 150, 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800', 4.7, 680, NOW(), NOW()),
(3039, 'Baby Wipes (80pc)', 'مناديل أطفال', 'baby-wipes-80pc', 'Gentle wet wipes', 18.99, NULL, 350, 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800', 4.6, 540, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3037, 13), (3038, 13), (3039, 13);

-- Pet Supplies products (category_id=14)
INSERT INTO `products` (`barcode`, `name_en`, `name_ar`, `slug`, `description_en`, `price`, `sale_price`, `stock_quantity`, `image`, `rating`, `review_count`, `created_at`, `updated_at`) VALUES
(3040, 'Dog Food Chicken 2kg', 'طعام كلاب', 'dog-food-chicken-2kg', 'Premium chicken formula', 89.99, 79.99, 120, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800', 4.6, 380, NOW(), NOW()),
(3041, 'Cat Toy Ball', 'كرة لعبة قطط', 'cat-toy-ball', 'Interactive cat toy', 12.99, NULL, 250, 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800', 4.5, 210, NOW(), NOW()),
(3042, 'Pet Shampoo 500ml', 'شامبو حيوانات', 'pet-shampoo-500ml', 'Gentle pet grooming', 32.99, 28.99, 180, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', 4.7, 290, NOW(), NOW());

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES (3040, 14), (3041, 14), (3042, 14);
