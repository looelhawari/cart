-- Add more subcategories for categories without subcategories
-- This ensures all major categories have at least 2-3 subcategories for testing

-- Dairy & Eggs (id=4)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Fresh Milk', 'حليب طازج', 'fresh-milk-dairy', 4, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800', '🥛', 41, 1, NOW(), NOW()),
('Yogurt & Labneh', 'زبادي ولبنة', 'yogurt-labneh', 4, 'https://images.unsplash.com/photo-1571212515416-17a327adf906?w=800', '🥣', 42, 1, NOW(), NOW()),
('Butter & Ghee', 'زبدة وسمن', 'butter-ghee', 4, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800', '🧈', 43, 1, NOW(), NOW());

-- Bakery (id=5)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Fresh Bread', 'خبز طازج', 'fresh-bread-bakery', 5, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', '🍞', 51, 1, NOW(), NOW()),
('Pastries & Croissants', 'معجنات وكرواسون', 'pastries-croissants', 5, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', '🥐', 52, 1, NOW(), NOW()),
('Cakes & Desserts', 'كيك وحلويات', 'cakes-desserts-bakery', 5, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', '🎂', 53, 1, NOW(), NOW());

-- Beverages (id=6)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Soft Drinks', 'مشروبات غازية', 'soft-drinks-beverages', 6, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800', '🥤', 61, 1, NOW(), NOW()),
('Energy Drinks', 'مشروبات الطاقة', 'energy-drinks-beverages', 6, 'https://images.unsplash.com/photo-1622543925917-763c34f3868b?w=800', '⚡', 62, 1, NOW(), NOW()),
('Tea & Herbal Drinks', 'شاي ومشروبات عشبية', 'tea-herbal-drinks', 6, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '🍵', 63, 1, NOW(), NOW());

-- Snacks (id=7)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Chips & Crisps', 'شيبس', 'chips-crisps', 7, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800', '🥔', 71, 1, NOW(), NOW()),
('Nuts & Seeds', 'مكسرات وبذور', 'nuts-seeds-snacks', 7, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800', '🥜', 72, 1, NOW(), NOW()),
('Crackers & Biscuits', 'كراكرز وبسكويت', 'crackers-biscuits', 7, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800', '🍪', 73, 1, NOW(), NOW());

-- Frozen Foods (id=8)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Frozen Vegetables', 'خضار مجمدة', 'frozen-vegetables', 8, 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800', '🥦', 81, 1, NOW(), NOW()),
('Frozen Meat & Poultry', 'لحوم ودواجن مجمدة', 'frozen-meat-poultry', 8, 'https://images.unsplash.com/photo-1607623488235-35667fb23bb8?w=800', '🍗', 82, 1, NOW(), NOW()),
('Ready Meals', 'وجبات جاهزة', 'ready-meals', 8, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', '🍱', 83, 1, NOW(), NOW());

-- Canned Goods (id=9)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Canned Vegetables', 'خضار معلبة', 'canned-vegetables', 9, 'https://images.unsplash.com/photo-1599590986677-cc00748bd88f?w=800', '🥫', 91, 1, NOW(), NOW()),
('Canned Tuna & Fish', 'تونة وأسماك معلبة', 'canned-tuna-fish', 9, 'https://images.unsplash.com/photo-1580554530778-ca36943938b2?w=800', '🐟', 92, 1, NOW(), NOW()),
('Canned Beans & Legumes', 'فول وبقوليات معلبة', 'canned-beans', 9, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800', '🫘', 93, 1, NOW(), NOW());

-- Cooking Essentials (id=10)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Cooking Oils', 'زيوت الطبخ', 'cooking-oils', 10, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800', '🛢️', 101, 1, NOW(), NOW()),
('Flour & Baking', 'دقيق ومستلزمات خبز', 'flour-baking', 10, 'https://images.unsplash.com/photo-1628398827831-2a877bc1a5eb?w=800', '🌾', 102, 1, NOW(), NOW()),
('Spices & Seasonings', 'بهارات وتوابل', 'spices-seasonings', 10, 'https://images.unsplash.com/photo-1596040033229-a0b13b7ef3e6?w=800', '🌶️', 103, 1, NOW(), NOW());

-- Personal Care (id=11)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Hair Care', 'العناية بالشعر', 'hair-care', 11, 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800', '💇', 111, 1, NOW(), NOW()),
('Skin Care', 'العناية بالبشرة', 'skin-care', 11, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', '🧴', 112, 1, NOW(), NOW()),
('Oral Care', 'العناية بالفم', 'oral-care', 11, 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800', '🦷', 113, 1, NOW(), NOW());

-- Household Cleaning (id=12)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Laundry Detergents', 'منظفات الغسيل', 'laundry-detergents', 12, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800', '🧺', 121, 1, NOW(), NOW()),
('Surface Cleaners', 'منظفات الأسطح', 'surface-cleaners', 12, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800', '🧽', 122, 1, NOW(), NOW()),
('Air Fresheners', 'معطرات الجو', 'air-fresheners', 12, 'https://images.unsplash.com/photo-1631540522743-95577906d53c?w=800', '🌸', 123, 1, NOW(), NOW());

-- Baby Products (id=13)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Baby Food', 'طعام الأطفال', 'baby-food', 13, 'https://images.unsplash.com/photo-1616072397627-951f37ab0370?w=800', '👶', 131, 1, NOW(), NOW()),
('Diapers & Wipes', 'حفاضات ومناديل', 'diapers-wipes', 13, 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800', '🧷', 132, 1, NOW(), NOW()),
('Baby Care Products', 'منتجات العناية بالطفل', 'baby-care-products', 13, 'https://images.unsplash.com/photo-1612826504541-47f5e6f7e6d7?w=800', '🍼', 133, 1, NOW(), NOW());

-- Pet Supplies (id=14)
INSERT INTO `categories` (`name_en`, `name_ar`, `slug`, `parent_id`, `image`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('Pet Food', 'طعام الحيوانات', 'pet-food', 14, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800', '🐕', 141, 1, NOW(), NOW()),
('Pet Toys & Accessories', 'ألعاب ومستلزمات الحيوانات', 'pet-toys-accessories', 14, 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800', '🎾', 142, 1, NOW(), NOW()),
('Pet Grooming', 'العناية بالحيوانات', 'pet-grooming', 14, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', '✂️', 143, 1, NOW(), NOW());
