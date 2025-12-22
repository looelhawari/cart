-- Mock Data for Testing - Fixed Schema
-- Bakery (133)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2001001001001', 'خبز فرنسي طازج', 'Fresh French Bread', 'fresh-french-bread', 'خبز فرنسي مقرمش', 'Crispy French bread', 8.50, NULL, 45, 0),
('2001001001002', 'كرواسون بالزبدة', 'Butter Croissant', 'butter-croissant', 'كرواسون طازج', 'Fresh croissant', 4.99, 3.99, 60, 1),
('2001001001003', 'دونات بالشوكولاتة', 'Chocolate Donut', 'chocolate-donut', 'دونات بالشوكولاتة', 'Chocolate donut', 6.50, NULL, 30, 0),
('2001001001004', 'كعك السمسم', 'Sesame Bagel', 'sesame-bagel', 'كعك بالسمسم', 'Sesame bagel', 5.00, NULL, 25, 0),
('2001001001005', 'خبز البرجر', 'Burger Buns Pack', 'burger-buns-pack', 'خبز برجر', 'Burger buns', 12.00, NULL, 40, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2001001001001', 133), ('2001001001002', 133), ('2001001001003', 133), ('2001001001004', 133), ('2001001001005', 133),
('2001001001002', 3), ('2001001001003', 3);

-- Breakfast (134)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2002001001001', 'كورن فليكس عسل', 'Honey Cornflakes 500g', 'honey-cornflakes-500g', 'رقائق ذرة بالعسل', 'Honey corn flakes', 28.50, 24.99, 55, 1),
('2002001001002', 'شوفان سريع', 'Quick Oats 1kg', 'quick-oats-1kg', 'شوفان سريع', 'Quick oats', 35.00, NULL, 70, 0),
('2002001001003', 'زبدة فول سوداني', 'Peanut Butter 340g', 'peanut-butter-340g', 'زبدة فول سوداني', 'Peanut butter', 42.00, NULL, 35, 1),
('2002001001004', 'مربى الفراولة', 'Strawberry Jam 450g', 'strawberry-jam-450g', 'مربى فراولة', 'Strawberry jam', 22.50, NULL, 48, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2002001001001', 134), ('2002001001002', 134), ('2002001001003', 134), ('2002001001004', 134);

-- Dairy & Eggs (146)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2003001001001', 'حليب كامل الدسم', 'Full Fat Milk 1L', 'full-fat-milk-1l', 'حليب كامل الدسم', 'Full-fat milk', 15.00, NULL, 120, 0),
('2003001001002', 'لبن زبادي يوناني', 'Greek Yogurt 500g', 'greek-yogurt-500g', 'زبادي يوناني', 'Greek yogurt', 28.00, 24.50, 65, 1),
('2003001001003', 'جبنة شيدر شرائح', 'Cheddar Cheese 200g', 'cheddar-cheese-200g', 'جبنة شيدر', 'Cheddar cheese', 32.00, NULL, 45, 0),
('2003001001004', 'بيض بلدي كبير', 'Large Farm Eggs 12pcs', 'large-farm-eggs-12pcs', 'بيض طازج', 'Fresh eggs', 24.00, NULL, 90, 0),
('2003001001005', 'زبدة طبيعية', 'Natural Butter 250g', 'natural-butter-250g', 'زبدة طبيعية', 'Natural butter', 38.50, NULL, 55, 1);

INSERT INTO product_categories (product_id, category_id) VALUES
('2003001001001', 146), ('2003001001002', 146), ('2003001001003', 146), ('2003001001004', 146), ('2003001001005', 146);

-- Fresh Fruits & Vegetables (145)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2004001001001', 'تفاح أحمر', 'Red Apples 1kg', 'red-apples-1kg', 'تفاح أحمر طازج', 'Fresh red apples', 18.00, 15.50, 100, 1),
('2004001001002', 'موز طازج', 'Fresh Bananas 1kg', 'fresh-bananas-1kg', 'موز ناضج', 'Ripe bananas', 12.00, NULL, 150, 0),
('2004001001003', 'برتقال', 'Oranges 1kg', 'oranges-1kg', 'برتقال طازج', 'Fresh oranges', 14.00, NULL, 110, 0),
('2004001001004', 'طماطم', 'Tomatoes 1kg', 'fresh-tomatoes-1kg', 'طماطم طازجة', 'Fresh tomatoes', 10.00, NULL, 80, 0),
('2004001001005', 'خيار', 'Cucumbers 1kg', 'cucumbers-1kg', 'خيار طازج', 'Fresh cucumbers', 8.50, NULL, 95, 0),
('2004001001006', 'فلفل رومي ملون', 'Mixed Bell Peppers 500g', 'mixed-bell-peppers-500g', 'فلفل رومي', 'Bell peppers', 16.00, 13.99, 60, 1);

INSERT INTO product_categories (product_id, category_id) VALUES
('2004001001001', 145), ('2004001001002', 145), ('2004001001003', 145),
('2004001001004', 145), ('2004001001005', 145), ('2004001001006', 145);

-- Chips & Snacks (138)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2005001001001', 'شيبس بطاطس ملح', 'Potato Chips Salt 150g', 'potato-chips-salt-150g', 'شيبس بطاطس', 'Potato chips', 8.50, 6.99, 200, 1),
('2005001001002', 'شيبس باربيكيو', 'BBQ Chips 150g', 'bbq-chips-150g', 'شيبس باربيكيو', 'BBQ chips', 8.50, 6.99, 180, 1),
('2005001001003', 'بوب كورن', 'Ready Popcorn 100g', 'ready-popcorn-100g', 'فشار جاهز', 'Ready popcorn', 12.00, NULL, 90, 0),
('2005001001004', 'مكسرات مشكلة', 'Mixed Nuts 200g', 'mixed-nuts-200g', 'مكسرات فاخرة', 'Mixed nuts', 45.00, NULL, 65, 1);

INSERT INTO product_categories (product_id, category_id) VALUES
('2005001001001', 138), ('2005001001002', 138), ('2005001001003', 138), ('2005001001004', 138);

-- Water & Ice (136)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2006001001001', 'كولا', 'Cola 2L', 'cola-2l', 'مشروب غازي كولا', 'Cola soft drink', 12.00, 9.99, 300, 1),
('2006001001002', 'سفن اب', '7UP 2L', '7up-2l', 'مشروب ليمون', 'Lemon-lime drink', 12.00, 9.99, 280, 1),
('2006001001003', 'عصير برتقال', 'Orange Juice 1L', 'orange-juice-1l', 'عصير برتقال', 'Orange juice', 18.00, NULL, 150, 0),
('2006001001004', 'مياه معدنية', 'Mineral Water 1.5L', 'mineral-water-1-5l', 'مياه معدنية', 'Mineral water', 4.00, NULL, 500, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2006001001001', 136), ('2006001001002', 136), ('2006001001003', 136), ('2006001001004', 136);

-- Canned & Jarred (142)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2007001001001', 'تونة في الماء', 'Tuna in Water 160g', 'tuna-in-water-160g', 'تونة معلبة', 'Canned tuna', 14.50, NULL, 200, 0),
('2007001001002', 'فول مدمس', 'Fava Beans 400g', 'fava-beans-400g', 'فول معلب', 'Canned beans', 6.50, NULL, 180, 0),
('2007001001003', 'ذرة حلوة', 'Sweet Corn 340g', 'sweet-corn-340g', 'ذرة معلبة', 'Canned corn', 8.00, 6.50, 160, 1),
('2007001001004', 'طماطم مقشرة', 'Peeled Tomatoes 400g', 'peeled-tomatoes-400g', 'طماطم معلبة', 'Canned tomatoes', 9.50, NULL, 140, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2007001001001', 142), ('2007001001002', 142), ('2007001001003', 142), ('2007001001004', 142);

-- Pasta (65)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2008001001001', 'معكرونة اسباجيتي', 'Spaghetti 500g', 'spaghetti-500g', 'معكرونة إيطالية', 'Italian pasta', 12.00, NULL, 250, 0),
('2008001001002', 'معكرونة بيني', 'Penne Pasta 500g', 'penne-pasta-500g', 'معكرونة بيني', 'Penne pasta', 12.00, NULL, 230, 0),
('2008001001003', 'نودلز فورية', 'Instant Noodles 5pack', 'instant-noodles-5pack', 'نودلز سريعة', 'Instant noodles', 15.00, 12.99, 300, 1),
('2008001001004', 'معكرونة فوتشيني', 'Fettuccine 500g', 'fettuccine-500g', 'معكرونة عريضة', 'Wide pasta', 14.00, NULL, 180, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2008001001001', 65), ('2008001001002', 65), ('2008001001003', 65), ('2008001001004', 65);

-- Frozen (12)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2009001001001', 'دجاج مجمد', 'Frozen Chicken 1kg', 'frozen-chicken-1kg', 'دجاج كامل', 'Whole chicken', 42.00, NULL, 85, 0),
('2009001001002', 'برجر دجاج', 'Chicken Burger 450g', 'chicken-burger-450g', 'برجر دجاج', 'Chicken burger', 32.00, 28.50, 95, 1),
('2009001001003', 'بطاطس مقلية', 'French Fries 1kg', 'french-fries-1kg', 'بطاطس مجمدة', 'Frozen fries', 18.00, NULL, 120, 0),
('2009001001004', 'خضار مشكلة', 'Mixed Vegetables 400g', 'mixed-vegetables-400g', 'خضار مجمدة', 'Frozen vegetables', 15.00, NULL, 100, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2009001001001', 12), ('2009001001002', 12), ('2009001001003', 12), ('2009001001004', 12);

-- Cleaning (46)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2010001001001', 'مسحوق غسيل', 'Laundry Detergent 3kg', 'laundry-detergent-3kg', 'مسحوق غسيل', 'Laundry powder', 48.00, 42.00, 80, 1),
('2010001001002', 'منعم أقمشة', 'Fabric Softener 2L', 'fabric-softener-2l', 'منعم ملابس', 'Fabric softener', 28.00, NULL, 70, 0),
('2010001001003', 'صابون أطباق', 'Dish Soap 1L', 'dish-soap-1l', 'صابون سائل', 'Dish soap', 16.00, NULL, 110, 0),
('2010001001004', 'منظف أرضيات', 'Floor Cleaner 1L', 'floor-cleaner-1l', 'منظف معطر', 'Floor cleaner', 22.00, NULL, 65, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2010001001001', 46), ('2010001001002', 46), ('2010001001003', 46), ('2010001001004', 46);

-- Baby Care (147)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2011001001001', 'حفاضات أطفال', 'Baby Diapers Size 4', 'baby-diapers-size-4', 'حفاضات مقاس 4', 'Diapers size 4', 85.00, 78.00, 50, 1),
('2011001001002', 'مناديل مبللة', 'Baby Wipes 80pcs', 'baby-wipes-80pcs', 'مناديل أطفال', 'Baby wipes', 18.00, NULL, 120, 0),
('2011001001003', 'شامبو أطفال', 'Baby Shampoo 400ml', 'baby-shampoo-400ml', 'شامبو لطيف', 'Gentle shampoo', 32.00, NULL, 75, 0),
('2011001001004', 'بودرة أطفال', 'Baby Powder 200g', 'baby-powder-200g', 'بودرة تلك', 'Baby powder', 24.00, NULL, 60, 0);

INSERT INTO product_categories (product_id, category_id) VALUES
('2011001001001', 147), ('2011001001002', 147), ('2011001001003', 147), ('2011001001004', 147);

-- Healthy Snacks (24)
INSERT INTO products (barcode, name_ar, name_en, slug, description_ar, description_en, price, sale_price, stock_quantity, is_featured) VALUES
('2012001001001', 'بروتين بار', 'Protein Bar Chocolate 60g', 'protein-bar-chocolate-60g', 'بار بروتين', 'Protein bar', 18.00, NULL, 85, 1),
('2012001001002', 'لوز محمص', 'Roasted Almonds 150g', 'roasted-almonds-150g', 'لوز محمص', 'Roasted almonds', 38.00, NULL, 60, 1),
('2012001001003', 'تمر معبأ', 'Packed Dates 500g', 'packed-dates-500g', 'تمر فاخر', 'Premium dates', 42.00, 38.00, 70, 1);

INSERT INTO product_categories (product_id, category_id) VALUES
('2012001001001', 24), ('2012001001002', 24), ('2012001001003', 24);
