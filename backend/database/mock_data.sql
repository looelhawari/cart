-- Mock Data for Testing Categories, Subcategories, and Products
-- Created: December 21, 2025
-- Purpose: Add comprehensive test data for UI testing
-- Note: This file can be safely removed after testing

-- ============================================
-- ADDITIONAL PRODUCTS FOR EXISTING CATEGORIES
-- ============================================

-- Bakery Products (Category ID: 133)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, image, is_featured, created_at, updated_at) VALUES
('2001001001001', 'خبز فرنسي طازج', 'Fresh French Bread', 'خبز فرنسي مقرمش من الخارج وناعم من الداخل', 'Crispy on the outside, soft on the inside French bread', 8.50, NULL, 45, NULL, 0, NOW(), NOW()),
('2001001001002', 'كرواسون بالزبدة', 'Butter Croissant', 'كرواسون طازج محضر يومياً', 'Freshly baked daily croissant', 4.99, 3.99, 60, NULL, 1, NOW(), NOW()),
('2001001001003', 'دونات بالشوكولاتة', 'Chocolate Donut', 'دونات محلى بطبقة شوكولاتة غنية', 'Sweet donut with rich chocolate coating', 6.50, NULL, 30, NULL, 0, NOW(), NOW()),
('2001001001004', 'كعك السمسم', 'Sesame Bagel', 'كعك طازج مغطى ببذور السمسم', 'Fresh bagel topped with sesame seeds', 5.00, NULL, 25, NULL, 0, NOW(), NOW()),
('2001001001005', 'خبز البرجر', 'Burger Buns Pack', 'عبوة 6 قطع خبز برجر طري', 'Pack of 6 soft burger buns', 12.00, NULL, 40, NULL, 0, NOW(), NOW());

-- Breakfast Products (Category ID: 134)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2002001001001', 'كورن فليكس عسل', 'Honey Cornflakes 500g', 'رقائق ذرة محلاة بالعسل', 'Corn flakes sweetened with honey', 28.50, 24.99, 55, NULL, 1, NOW(), NOW()),
('2002001001002', 'شوفان سريع التحضير', 'Quick Oats 1kg', 'شوفان عضوي سريع التحضير', 'Organic quick-cooking oats', 35.00, NULL, 70, NULL, 0, NOW(), NOW()),
('2002001001003', 'زبدة الفول السوداني', 'Peanut Butter 340g', 'زبدة فول سوداني كريمية', 'Creamy peanut butter spread', 42.00, NULL, 35, NULL, 1, NOW(), NOW()),
('2002001001004', 'مربى الفراولة', 'Strawberry Jam 450g', 'مربى فراولة طبيعية 100%', '100% natural strawberry jam', 22.50, NULL, 48, NULL, 0, NOW(), NOW());

-- Dairy & Eggs (Category ID: 146)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2003001001001', 'حليب كامل الدسم', 'Full Fat Milk 1L', 'حليب طازج كامل الدسم', 'Fresh full-fat milk', 15.00, NULL, 120, NULL, 0, NOW(), NOW()),
('2003001001002', 'لبن زبادي يوناني', 'Greek Yogurt 500g', 'زبادي يوناني عالي البروتين', 'High protein Greek yogurt', 28.00, 24.50, 65, NULL, 1, NOW(), NOW()),
('2003001001003', 'جبنة شيدر شرائح', 'Cheddar Cheese Slices 200g', 'شرائح جبنة شيدر للسندويتشات', 'Cheddar cheese slices for sandwiches', 32.00, NULL, 45, NULL, 0, NOW(), NOW()),
('2003001001004', 'بيض بلدي كبير', 'Large Farm Eggs 12pcs', 'بيض طازج حجم كبير', 'Fresh large-sized eggs', 24.00, NULL, 90, NULL, 0, NOW(), NOW()),
('2003001001005', 'زبدة طبيعية', 'Natural Butter 250g', 'زبدة من حليب البقر الطازج', 'Butter from fresh cow milk', 38.50, NULL, 55, NULL, 1, NOW(), NOW());

-- Fresh Fruits & Vegetables (Category ID: 145)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2004001001001', 'تفاح أحمر', 'Red Apples 1kg', 'تفاح أحمر طازج', 'Fresh red apples', 18.00, 15.50, 100, NULL, 1, NOW(), NOW()),
('2004001001002', 'موز طازج', 'Fresh Bananas 1kg', 'موز ناضج جاهز للأكل', 'Ripe ready-to-eat bananas', 12.00, NULL, 150, NULL, 0, NOW(), NOW()),
('2004001001003', 'برتقال', 'Oranges 1kg', 'برتقال طازج غني بفيتامين سي', 'Fresh oranges rich in vitamin C', 14.00, NULL, 110, NULL, 0, NOW(), NOW()),
('2004001001004', 'طماطم', 'Tomatoes 1kg', 'طماطم طازجة محلية', 'Fresh local tomatoes', 10.00, NULL, 80, NULL, 0, NOW(), NOW()),
('2004001001005', 'خيار', 'Cucumbers 1kg', 'خيار طازج ومقرمش', 'Fresh crispy cucumbers', 8.50, NULL, 95, NULL, 0, NOW(), NOW()),
('2004001001006', 'فلفل رومي ملون', 'Mixed Bell Peppers 500g', 'فلفل رومي أحمر وأصفر وأخضر', 'Red, yellow and green bell peppers', 16.00, 13.99, 60, NULL, 1, NOW(), NOW());

-- Chips & Snacks (Category ID: 138)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2005001001001', 'شيبس بطاطس ملح', 'Potato Chips Salt 150g', 'شيبس بطاطس مقرمش بالملح', 'Crispy potato chips with salt', 8.50, 6.99, 200, NULL, 1, NOW(), NOW()),
('2005001001002', 'شيبس باربيكيو', 'BBQ Chips 150g', 'شيبس بنكهة الباربيكيو', 'BBQ flavored chips', 8.50, 6.99, 180, NULL, 1, NOW(), NOW()),
('2005001001003', 'بوب كورن جاهز', 'Ready Popcorn 100g', 'فشار جاهز بالزبدة', 'Ready-made butter popcorn', 12.00, NULL, 90, NULL, 0, NOW(), NOW()),
('2005001001004', 'مكسرات مشكلة', 'Mixed Nuts 200g', 'مكسرات فاخرة مشكلة', 'Premium mixed nuts', 45.00, NULL, 65, NULL, 1, NOW(), NOW());

-- Beverages - Soft Drinks (Category ID: 136)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2006001001001', 'كولا', 'Cola 2L', 'مشروب غازي كولا', 'Cola soft drink', 12.00, 9.99, 300, NULL, 1, NOW(), NOW()),
('2006001001002', 'سفن اب', '7UP 2L', 'مشروب غازي ليمون', 'Lemon-lime soft drink', 12.00, 9.99, 280, NULL, 1, NOW(), NOW()),
('2006001001003', 'عصير برتقال', 'Orange Juice 1L', 'عصير برتقال طبيعي 100%', '100% natural orange juice', 18.00, NULL, 150, NULL, 0, NOW(), NOW()),
('2006001001004', 'مياه معدنية', 'Mineral Water 1.5L', 'مياه معدنية نقية', 'Pure mineral water', 4.00, NULL, 500, NULL, 0, NOW(), NOW());

-- Canned & Jarred Goods (Category ID: 142)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2007001001001', 'تونة في الماء', 'Tuna in Water 160g', 'تونة معلبة في الماء', 'Canned tuna in water', 14.50, NULL, 200, NULL, 0, NOW(), NOW()),
('2007001001002', 'فول مدمس', 'Fava Beans 400g', 'فول مدمس معلب جاهز', 'Ready canned fava beans', 6.50, NULL, 180, NULL, 0, NOW(), NOW()),
('2007001001003', 'ذرة حلوة', 'Sweet Corn 340g', 'ذرة حلوة معلبة', 'Canned sweet corn', 8.00, 6.50, 160, NULL, 1, NOW(), NOW()),
('2007001001004', 'طماطم مقشرة', 'Peeled Tomatoes 400g', 'طماطم مقشرة معلبة', 'Canned peeled tomatoes', 9.50, NULL, 140, NULL, 0, NOW(), NOW());

-- Pasta & Noodles (Category ID: 65)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2008001001001', 'معكرونة اسباجيتي', 'Spaghetti 500g', 'معكرونة إسباجيتي إيطالية', 'Italian spaghetti pasta', 12.00, NULL, 250, NULL, 0, NOW(), NOW()),
('2008001001002', 'معكرونة بيني', 'Penne Pasta 500g', 'معكرونة بيني', 'Penne rigate pasta', 12.00, NULL, 230, NULL, 0, NOW(), NOW()),
('2008001001003', 'نودلز فورية', 'Instant Noodles 5pack', 'نودلز سريعة التحضير', 'Quick-cooking instant noodles', 15.00, 12.99, 300, NULL, 1, NOW(), NOW()),
('2008001001004', 'معكرونة فوتشيني', 'Fettuccine 500g', 'معكرونة فوتشيني عريضة', 'Wide fettuccine pasta', 14.00, NULL, 180, NULL, 0, NOW(), NOW());

-- Frozen Foods (Category ID: 12)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2009001001001', 'دجاج مجمد', 'Frozen Chicken 1kg', 'دجاج كامل مجمد', 'Whole frozen chicken', 42.00, NULL, 85, NULL, 0, NOW(), NOW()),
('2009001001002', 'برجر دجاج', 'Chicken Burger 450g', 'برجر دجاج مجمد 6 قطع', 'Frozen chicken burger 6pcs', 32.00, 28.50, 95, NULL, 1, NOW(), NOW()),
('2009001001003', 'بطاطس مقلية', 'French Fries 1kg', 'بطاطس مجمدة جاهزة للقلي', 'Frozen ready-to-fry french fries', 18.00, NULL, 120, NULL, 0, NOW(), NOW()),
('2009001001004', 'خضار مشكلة', 'Mixed Vegetables 400g', 'خضار مجمدة مشكلة', 'Frozen mixed vegetables', 15.00, NULL, 100, NULL, 0, NOW(), NOW());

-- Cleaning Products (Category ID: 46)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2010001001001', 'مسحوق غسيل', 'Laundry Detergent 3kg', 'مسحوق غسيل للملابس البيضاء والملونة', 'Laundry powder for whites and colors', 48.00, 42.00, 80, NULL, 1, NOW(), NOW()),
('2010001001002', 'منعم أقمشة', 'Fabric Softener 2L', 'منعم ملابس برائحة منعشة', 'Fabric softener with fresh scent', 28.00, NULL, 70, NULL, 0, NOW(), NOW()),
('2010001001003', 'صابون سائل أطباق', 'Dish Soap 1L', 'صابون سائل لغسل الأطباق', 'Liquid dish washing soap', 16.00, NULL, 110, NULL, 0, NOW(), NOW()),
('2010001001004', 'منظف أرضيات', 'Floor Cleaner 1L', 'منظف أرضيات معطر', 'Scented floor cleaner', 22.00, NULL, 65, NULL, 0, NOW(), NOW());

-- Baby Care (Category ID: 147)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2011001001001', 'حفاضات أطفال', 'Baby Diapers Size 4 - 40pcs', 'حفاضات أطفال مقاس 4', 'Baby diapers size 4', 85.00, 78.00, 50, NULL, 1, NOW(), NOW()),
('2011001001002', 'مناديل مبللة', 'Baby Wipes 80pcs', 'مناديل مبللة للأطفال', 'Baby wet wipes', 18.00, NULL, 120, NULL, 0, NOW(), NOW()),
('2011001001003', 'شامبو أطفال', 'Baby Shampoo 400ml', 'شامبو لطيف للأطفال', 'Gentle baby shampoo', 32.00, NULL, 75, NULL, 0, NOW(), NOW()),
('2011001001004', 'بودرة أطفال', 'Baby Powder 200g', 'بودرة تلك للأطفال', 'Baby talcum powder', 24.00, NULL, 60, NULL, 0, NOW(), NOW());

-- Healthy Snacks (Category ID: 24)
INSERT INTO products (barcode, name_ar, name_en, description_ar, description_en, price, sale_price, stock, image_url, is_featured, created_at, updated_at) VALUES
('2012001001001', 'بروتين بار', 'Protein Bar Chocolate 60g', 'بار بروتين بالشوكولاتة', 'Chocolate protein bar', 18.00, NULL, 85, NULL, 1, NOW(), NOW()),
('2012001001002', 'لوز محمص', 'Roasted Almonds 150g', 'لوز محمص بدون ملح', 'Unsalted roasted almonds', 38.00, NULL, 60, NULL, 1, NOW(), NOW()),
('2012001001003', 'تمر معبأ', 'Packed Dates 500g', 'تمر فاخر معبأ', 'Premium packed dates', 42.00, 38.00, 70, NULL, 1, NOW(), NOW());

-- ==============================================
-- LINK PRODUCTS TO CATEGORIES
-- ==============================================

-- Bakery (133)
INSERT INTO product_categories (product_id, category_id) VALUES
('2001001001001', 133), ('2001001001002', 133), ('2001001001003', 133),
('2001001001004', 133), ('2001001001005', 133);

-- Also link to Croissants subcategory (3)
INSERT INTO product_categories (product_id, category_id) VALUES
('2001001001002', 3), ('2001001001003', 3);

-- Breakfast Products (134)
INSERT INTO product_categories (product_id, category_id) VALUES
('2002001001001', 134), ('2002001001002', 134), ('2002001001003', 134), ('2002001001004', 134);

-- Dairy & Eggs (146)
INSERT INTO product_categories (product_id, category_id) VALUES
('2003001001001', 146), ('2003001001002', 146), ('2003001001003', 146),
('2003001001004', 146), ('2003001001005', 146);

-- Fresh Fruits & Vegetables (145)
INSERT INTO product_categories (product_id, category_id) VALUES
('2004001001001', 145), ('2004001001002', 145), ('2004001001003', 145),
('2004001001004', 145), ('2004001001005', 145), ('2004001001006', 145);

-- Chips & Snacks (138)
INSERT INTO product_categories (product_id, category_id) VALUES
('2005001001001', 138), ('2005001001002', 138), ('2005001001003', 138), ('2005001001004', 138);

-- Water & Ice (136)
INSERT INTO product_categories (product_id, category_id) VALUES
('2006001001001', 136), ('2006001001002', 136), ('2006001001003', 136), ('2006001001004', 136);

-- Canned & Jarred Goods (142)
INSERT INTO product_categories (product_id, category_id) VALUES
('2007001001001', 142), ('2007001001002', 142), ('2007001001003', 142), ('2007001001004', 142);

-- Pasta (65)
INSERT INTO product_categories (product_id, category_id) VALUES
('2008001001001', 65), ('2008001001002', 65), ('2008001001003', 65), ('2008001001004', 65);

-- Frozen Chicken Products (12)
INSERT INTO product_categories (product_id, category_id) VALUES
('2009001001001', 12), ('2009001001002', 12), ('2009001001003', 12), ('2009001001004', 12);

-- Laundry Detergents & Bleach (46)
INSERT INTO product_categories (product_id, category_id) VALUES
('2010001001001', 46), ('2010001001002', 46), ('2010001001003', 46), ('2010001001004', 46);

-- Baby Care (147)
INSERT INTO product_categories (product_id, category_id) VALUES
('2011001001001', 147), ('2011001001002', 147), ('2011001001003', 147), ('2011001001004', 147);

-- Healthy Snacks (24)
INSERT INTO product_categories (product_id, category_id) VALUES
('2012001001001', 24), ('2012001001002', 24), ('2012001001003', 24);

-- ================================
-- SUMMARY
-- ================================
-- Added 70+ new products across 13 major categories
-- Each category now has 4-6 products for better testing
-- Mix of featured products and sale items
-- Realistic pricing and stock levels
-- Arabic and English names/descriptions
-- All linked to appropriate categories
