-- Add NEW subcategories only (avoiding duplicates from previous attempts)
-- Fix circular parent_id issues first
UPDATE categories SET parent_id = NULL WHERE parent_id = id;

-- Subcategories for Coffee (ID 59) - These appear to be missing
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(59, 'Ground Coffee', 'قهوة مطحونة', 'ground-coffee-59', 'Pre-ground coffee', 'قهوة مطحونة جاهزة', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800', '☕', 1, 1),
(59, 'Coffee Beans', 'حبوب قهوة', 'coffee-beans-59', 'Whole coffee beans', 'حبوب قهوة كاملة', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800', '☕', 2, 1),
(59, 'Instant Coffee', 'قهوة فورية', 'instant-coffee-59', 'Instant coffee', 'قهوة سريعة التحضير', 'https://images.unsplash.com/photo-1610632380989-680d6c6c96a6?w=800', '☕', 3, 1),
(59, 'Coffee Pods & Capsules', 'كبسولات قهوة', 'coffee-pods-59', 'Nespresso, Dolce Gusto pods', 'كبسولات نسبريسو ودولتشي جوستو', 'https://images.unsplash.com/photo-1594631661960-3eab5c7f2c3f?w=800', '☕', 4, 1);

-- Subcategories for Chocolate & Candy (ID 47)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(47, 'Chocolate Bars', 'ألواح شوكولاتة', 'chocolate-bars-47', 'Chocolate bars and tablets', 'ألواح وقطع شوكولاتة', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800', '🍫', 1, 1),
(47, 'Chocolate Boxes', 'علب شوكولاتة', 'chocolate-boxes-47', 'Assorted chocolate boxes', 'علب شوكولاتة متنوعة', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800', '🍬', 2, 1),
(47, 'Hard Candy', 'حلوى صلبة', 'hard-candy-47', 'Hard candies and lollipops', 'حلوى صلبة ومصاصات', 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=800', '🍭', 3, 1),
(47, 'Gummy Candy', 'حلوى جيلاتينية', 'gummy-candy-47', 'Gummy bears and jellies', 'دببة جيلاتينية وحلوى', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800', '🐻', 4, 1);

-- Subcategories for Frozen Pizza (ID 29)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(29, 'Margherita Pizza', 'بيتزا مارجريتا', 'margherita-pizza-29', 'Classic margherita pizza', 'بيتزا مارجريتا كلاسيكية', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800', '🍕', 1, 1),
(29, 'Pepperoni Pizza', 'بيتزا بيبروني', 'pepperoni-pizza-29', 'Pepperoni pizza', 'بيتزا بيبروني', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800', '🍕', 2, 1),
(29, 'Vegetarian Pizza', 'بيتزا نباتية', 'vegetarian-pizza-29', 'Vegetarian pizzas', 'بيتزا بالخضروات', 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=800', '🍕', 3, 1),
(29, 'Specialty Pizza', 'بيتزا متخصصة', 'specialty-pizza-29', 'Gourmet and specialty pizzas', 'بيتزا فاخرة ومتخصصة', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', '🍕', 4, 1);

-- Subcategories for Ice Cream & Gelato (ID 36)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(36, 'Ice Cream Tubs', 'عبوات آيس كريم', 'ice-cream-tubs-36', 'Ice cream family size tubs', 'عبوات آيس كريم عائلية', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800', '🍨', 1, 1),
(36, 'Ice Cream Bars', 'ألواح آيس كريم', 'ice-cream-bars-36', 'Ice cream bars and sticks', 'ألواح وعيدان آيس كريم', 'https://images.unsplash.com/photo-1563228117-2e90a575d43e?w=800', '🍦', 2, 1),
(36, 'Gelato', 'جيلاتو', 'gelato-36', 'Italian gelato', 'جيلاتو إيطالي', 'https://images.unsplash.com/photo-1561150169-371f366853d7?w=800', '🍨', 3, 1),
(36, 'Sorbet & Ice Pops', 'سوربيه وعصائر مثلجة', 'sorbet-ice-pops-36', 'Fruit sorbet and popsicles', 'سوربيه فواكه وعصائر مثلجة', 'https://images.unsplash.com/photo-1558244661-d248897f7bc4?w=800', '🍧', 4, 1);

-- Subcategories for Skin Care (ID 87)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(87, 'Face Cleansers', 'منظفات وجه', 'face-cleansers-87', 'Facial cleansers and washes', 'منظفات وغسول وجه', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800', '🧼', 1, 1),
(87, 'Moisturizers', 'مرطبات', 'moisturizers-87', 'Face and body moisturizers', 'مرطبات وجه وجسم', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', '🧴', 2, 1),
(87, 'Sunscreen', 'واقي شمس', 'sunscreen-87', 'Sun protection products', 'منتجات حماية من الشمس', 'https://images.unsplash.com/photo-1556228841-33067e00c8ba?w=800', '☀️', 3, 1);

-- Subcategories for Fresh Fish (ID 16)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(16, 'Salmon', 'سلمون', 'salmon-16', 'Fresh salmon', 'سلمون طازج', 'https://images.unsplash.com/photo-1580439328954-6dc0ad62afb9?w=800', '🐟', 1, 1),
(16, 'Tuna', 'تونة', 'tuna-16', 'Fresh tuna', 'تونة طازجة', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', '🐟', 2, 1),
(16, 'White Fish', 'سمك أبيض', 'white-fish-16', 'Cod, haddock, tilapia', 'سمك القد والبلطي', 'https://images.unsplash.com/photo-1580439329481-7031096ba0a1?w=800', '🐟', 3, 1);

-- Subcategories for Tea & Herbal Tea (ID 60)
INSERT INTO categories (parent_id, name_en, name_ar, slug, description_en, description_ar, image, icon, sort_order, is_active) VALUES
(60, 'Black Tea', 'شاي أسود', 'black-tea-60', 'Black tea varieties', 'أنواع الشاي الأسود', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800', '🍵', 1, 1),
(60, 'Green Tea', 'شاي أخضر', 'green-tea-60', 'Green tea varieties', 'أنواع الشاي الأخضر', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', '🍵', 2, 1),
(60, 'Herbal Tea', 'شاي أعشاب', 'herbal-tea-60', 'Herbal and fruit infusions', 'شاي الأعشاب والفواكه', 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800', '🌿', 3, 1);
