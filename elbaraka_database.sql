-- =====================================================
-- ELBARAKA HYPERMARKET - DATABASE SCHEMA
-- =====================================================
-- Project: ElBaraka - Hypermarket Mobile Shopping Platform
-- Database: MySQL 8.0+
-- Description: Complete database schema for mobile-first grocery shopping platform
-- Version: 1.0
-- Last Updated: November 18, 2025
-- =====================================================

-- Drop existing database if exists (use with caution in production)
-- DROP DATABASE IF EXISTS elbaraka_db;

-- Create database
CREATE DATABASE IF NOT EXISTS elbaraka_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE elbaraka_db;

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Users Table
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) NULL DEFAULT NULL,
    language ENUM('en', 'ar') DEFAULT 'en',
    role ENUM('customer', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    phone_verified_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_created_at (created_at),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Addresses Table
CREATE TABLE addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(100) NOT NULL COMMENT 'Home, Work, Other',
    street TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Device Tokens Table (for push notifications)
CREATE TABLE device_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token TEXT NOT NULL,
    platform ENUM('ios', 'android') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PRODUCT CATALOG TABLES
-- =====================================================

-- Categories Table (Hierarchical with parent_id for subcategories)
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL COMMENT 'NULL for main categories, ID for subcategories',
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description_en TEXT NULL,
    description_ar TEXT NULL,
    image VARCHAR(255) NULL,
    icon VARCHAR(255) NULL COMMENT 'Emoji or icon identifier for UI',
    sort_order INT DEFAULT 0 COMMENT 'Display order within parent',     
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE products (
    barcode BIGINT UNSIGNED PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    image VARCHAR(255) NULL,
    description_en TEXT NULL,
    description_ar TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NULL,
    cost_price DECIMAL(10, 2) NULL,
    stock_quantity INT DEFAULT 0,
    weight DECIMAL(8, 2) NULL COMMENT 'Weight in grams',
    unit VARCHAR(50) DEFAULT 'piece' COMMENT 'piece, kg, liter, etc',
    nutrition_facts JSON NULL COMMENT 'Nutritional information',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sales_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active),
    INDEX idx_is_featured (is_featured),
    INDEX idx_price (price),
    INDEX idx_created_at (created_at),
    INDEX idx_stock_quantity (stock_quantity),
    FULLTEXT idx_fulltext_search (name_en, name_ar, description_en, description_ar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Categories Pivot Table
CREATE TABLE product_categories (
    product_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- SHOPPING CART TABLES
-- =====================================================

-- Carts Table
CREATE TABLE carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL COMMENT 'NULL for guest carts',
    session_id VARCHAR(255) NULL COMMENT 'For guest users',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart Items Table
CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL, 
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL COMMENT 'Price at time of adding to cart',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_cart_id (cart_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ORDER MANAGEMENT TABLES
-- =====================================================

-- Orders Table
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed') DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash_on_delivery', 'card', 'wallet') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    delivery_address_id BIGINT UNSIGNED NOT NULL,
    delivery_date DATE NULL,
    delivery_time_slot VARCHAR(50) NULL COMMENT '9AM-12PM, 12PM-3PM, etc',
    notes TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_delivery_date (delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items Table
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL COMMENT 'Snapshot of product name',
    product_sku VARCHAR(100) NOT NULL COMMENT 'Snapshot of SKU',
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL COMMENT 'Price per unit at time of order',
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Status History Table
CREATE TABLE order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed') NOT NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL COMMENT 'User ID who changed status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PAYMENT TABLES
-- =====================================================

-- Payment Transactions Table
CREATE TABLE payment_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    transaction_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Payment gateway transaction ID',
    payment_method ENUM('cash_on_delivery', 'card', 'wallet') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    gateway_response JSON NULL COMMENT 'Full response from payment gateway',
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Methods Table (Saved cards - tokenized)
CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('card') DEFAULT 'card',
    card_last_four VARCHAR(4) NOT NULL,
    card_brand ENUM('visa', 'mastercard', 'amex', 'discover', 'other') NOT NULL COMMENT 'Visa, Mastercard, etc',
    token TEXT NOT NULL COMMENT 'Tokenized card from Paymob',
    is_default BOOLEAN DEFAULT FALSE,
    expires_at DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PROMOTIONS & DISCOUNTS TABLES
-- =====================================================

-- Promo Codes Table
CREATE TABLE promo_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('percentage', 'fixed_amount', 'free_delivery') NOT NULL,
    value DECIMAL(10, 2) NOT NULL COMMENT 'Percentage or fixed amount',
    minimum_order DECIMAL(10, 2) DEFAULT 0.00,
    maximum_discount DECIMAL(10, 2) NULL,
    usage_limit INT NULL COMMENT 'Total usage limit, NULL for unlimited',
    usage_per_user INT DEFAULT 1 COMMENT 'Max uses per user',
    used_count INT DEFAULT 0,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active),
    INDEX idx_valid_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promo Code Usage Table
CREATE TABLE promo_code_usage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promo_code_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_promo_code_id (promo_code_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FAVORITES & REVIEWS TABLES
-- =====================================================

-- Favorites Table
CREATE TABLE favorites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews Table
CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_is_approved (is_approved),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NOTIFICATIONS TABLES
-- =====================================================

-- Notifications Table
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL COMMENT 'order_status, promotion, system, etc',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL COMMENT 'Additional notification data',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- COMPLAINTS & SUPPORT TICKETS TABLES
-- =====================================================

-- Complaints/Support Tickets Table
CREATE TABLE complaints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NULL COMMENT 'Related order if applicable',
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    category ENUM('order_issue', 'product_quality', 'delivery_problem', 'payment_issue', 'technical_issue', 'general_inquiry', 'suggestion', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'awaiting_response', 'resolved', 'closed') DEFAULT 'open',
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL COMMENT 'Admin who resolved the complaint',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_ticket_number (ticket_number),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complaint Messages/Replies Table
CREATE TABLE complaint_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'Who sent the message (customer or admin)',
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complaint Attachments Table
CREATE TABLE complaint_attachments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL COMMENT 'image, pdf, etc',
    file_size INT NOT NULL COMMENT 'Size in bytes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    INDEX idx_complaint_id (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MARKETING & BANNERS TABLES
-- =====================================================

-- Banners Table
CREATE TABLE banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    image VARCHAR(255) NOT NULL,
    link_type ENUM('product', 'category', 'url', 'none') DEFAULT 'none',
    link_value VARCHAR(255) NULL COMMENT 'Product ID, Category ID, or URL',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    views_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order),
    INDEX idx_valid_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================

-- Settings Table
CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NULL,
    type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DELIVERY & ZONES TABLES
-- =====================================================

-- Delivery Zones Table
CREATE TABLE delivery_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(255) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    minimum_order DECIMAL(10, 2) DEFAULT 0.00,
    estimated_delivery_time VARCHAR(100) NULL COMMENT '30-60 minutes',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_city (city),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AUTHENTICATION & SESSIONS TABLES (Laravel)
-- =====================================================

-- Password Reset Tokens Table
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personal Access Tokens Table (Laravel Sanctum)
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tokenable (tokenable_type, tokenable_id),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed Jobs Table (Laravel Queue)
CREATE TABLE failed_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(255) NOT NULL UNIQUE,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload LONGTEXT NOT NULL,
    exception LONGTEXT NOT NULL,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jobs Table (Laravel Queue)
CREATE TABLE jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload LONGTEXT NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL,
    reserved_at INT UNSIGNED NULL,
    available_at INT UNSIGNED NOT NULL,
    created_at INT UNSIGNED NOT NULL,
    INDEX idx_queue (queue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ACTIVITY LOG TABLE (Optional - for audit trail)
-- =====================================================

-- Activity Log Table
CREATE TABLE activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_name VARCHAR(255) NULL,
    description TEXT NOT NULL,
    subject_type VARCHAR(255) NULL,
    subject_id BIGINT UNSIGNED NULL,
    causer_type VARCHAR(255) NULL,
    causer_id BIGINT UNSIGNED NULL,
    properties JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subject (subject_type, subject_id),
    INDEX idx_causer (causer_type, causer_id),
    INDEX idx_log_name (log_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default system settings
INSERT INTO settings (`key`, value, type, description) VALUES
('app_name', 'ElBaraka', 'string', 'Application name'),
('currency', 'EGP', 'string', 'Default currency'),
('currency_symbol', 'ج.م', 'string', 'Currency symbol'),
('tax_rate', '14', 'number', 'Tax percentage'),
('delivery_fee', '20', 'number', 'Default delivery fee'),
('free_delivery_threshold', '200', 'number', 'Minimum order for free delivery'),
('minimum_order_amount', '50', 'number', 'Minimum order amount'),
('support_email', 'support@elbaraka.com', 'string', 'Support email address'),
('support_phone', '+20123456789', 'string', 'Support phone number'),
('maintenance_mode', '0', 'boolean', 'Maintenance mode flag'),
('app_version_ios', '1.0.0', 'string', 'iOS app version'),
('app_version_android', '1.0.0', 'string', 'Android app version');

-- Insert default admin user (password: 'password' - hashed with bcrypt)
-- Note: Change password immediately in production!
INSERT INTO users (first_name, last_name, email, phone, password, role, email_verified_at, is_active, is_verified) VALUES
('Admin', 'User', 'admin@elbaraka.com', '+201000000000', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW(), TRUE, TRUE),
('Test', 'User', 'test@example.com', '+201234567890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', NOW(), TRUE, TRUE);

-- Insert sample addresses for test user
INSERT INTO addresses (user_id, label, street, city, is_default) VALUES
(2, 'Home', '15 Tahrir Street, Apartment 5, Floor 3, Downtown', 'Cairo', TRUE),
(2, 'Work', '42 Nile Corniche, Building 8, Suite 201', 'Giza', FALSE),
(2, 'Parents House', '7 El Manial Street, Villa 12', 'Cairo', FALSE);

-- Insert sample payment methods for test user
INSERT INTO payment_methods (user_id, type, card_last_four, card_brand, token, is_default, expires_at) VALUES
(2, 'card', '4242', 'visa', 'tok_visa_4242_test_token_12345', TRUE, '2027-12-31'),
(2, 'card', '5555', 'mastercard', 'tok_mastercard_5555_test_token_67890', FALSE, '2026-08-31'),
(2, 'card', '3782', 'amex', 'tok_amex_3782_test_token_11223', FALSE, '2028-03-31');

-- Insert sample categories
INSERT INTO categories (parent_id, name_en, name_ar, slug, sort_order, is_active) VALUES
(NULL, 'Fruits & Vegetables', 'الفواكه والخضروات', 'fruits-vegetables', 1, TRUE),
(NULL, 'Dairy & Eggs', 'منتجات الألبان والبيض', 'dairy-eggs', 2, TRUE),
(NULL, 'Meat & Poultry', 'اللحوم والدواجن', 'meat-poultry', 3, TRUE),
(NULL, 'Bakery', 'المخبوزات', 'bakery', 4, TRUE),
(NULL, 'Beverages', 'المشروبات', 'beverages', 5, TRUE),
(NULL, 'Snacks', 'الوجبات الخفيفة', 'snacks', 6, TRUE),
(NULL, 'Household', 'المنظفات والمنزل', 'household', 7, TRUE),
(NULL, 'Personal Care', 'العناية الشخصية', 'personal-care', 8, TRUE);

-- =====================================================
-- DATABASE OPTIMIZATION VIEWS
-- =====================================================

-- -- View: Product with average rating
-- CREATE OR REPLACE VIEW products_with_ratings AS
-- SELECT 
--     p.*,
--     COALESCE(AVG(r.rating), 0) as average_rating,
--     COUNT(r.id) as review_count
-- FROM products p
-- LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = TRUE
-- GROUP BY p.id;

-- -- View: Order summary with customer details
-- CREATE OR REPLACE VIEW orders_summary AS
-- SELECT 
--     o.*,
--     u.first_name,
--     u.last_name,
--     u.email as customer_email,
--     u.phone as customer_phone,
--     a.street as delivery_street,
--     a.city as delivery_city,
--     COUNT(oi.id) as items_count
-- FROM orders o
-- JOIN users u ON o.user_id = u.id
-- JOIN addresses a ON o.delivery_address_id = a.id
-- LEFT JOIN order_items oi ON o.id = oi.order_id
-- GROUP BY o.id;

-- -- View: Complaints with customer details
-- CREATE OR REPLACE VIEW complaints_summary AS
-- SELECT 
--     c.*,
--     CONCAT(u.first_name, ' ', u.last_name) as customer_name,
--     u.email as customer_email,
--     u.phone as customer_phone,
--     o.order_number,
--     COUNT(cm.id) as message_count,
--     MAX(cm.created_at) as last_message_at
-- FROM complaints c
-- JOIN users u ON c.user_id = u.id
-- LEFT JOIN orders o ON c.order_id = o.id
-- LEFT JOIN complaint_messages cm ON c.id = cm.complaint_id
-- GROUP BY c.id;

-- -- =====================================================
-- -- STORED PROCEDURES
-- -- =====================================================

-- -- Procedure: Calculate cart total
-- DELIMITER $$
-- CREATE PROCEDURE calculate_cart_total(IN cart_id_param BIGINT)
-- BEGIN
--     SELECT 
--         SUM(ci.quantity * ci.price) as subtotal,
--         COUNT(ci.id) as items_count
--     FROM cart_items ci
--     WHERE ci.cart_id = cart_id_param;
-- END$$
-- DELIMITER ;

-- -- Procedure: Update product stock after order
-- DELIMITER $$
-- CREATE PROCEDURE update_product_stock(IN order_id_param BIGINT)
-- BEGIN
--     UPDATE products p
--     JOIN order_items oi ON p.id = oi.product_id
--     SET p.stock_quantity = p.stock_quantity - oi.quantity,
--         p.sales_count = p.sales_count + oi.quantity
--     WHERE oi.order_id = order_id_param;
-- END$$
-- DELIMITER ;

-- -- =====================================================
-- -- TRIGGERS
-- -- =====================================================

-- -- Trigger: Generate unique order number before insert
-- DELIMITER $$
-- CREATE TRIGGER before_order_insert
-- BEFORE INSERT ON orders
-- FOR EACH ROW
-- BEGIN
--     IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
--         SET NEW.order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 999999), 6, '0'));
--     END IF;
-- END$$
-- DELIMITER ;

-- -- Trigger: Generate unique ticket number before complaint insert
-- DELIMITER $$
-- CREATE TRIGGER before_complaint_insert
-- BEFORE INSERT ON complaints
-- FOR EACH ROW
-- BEGIN
--     IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
--         SET NEW.ticket_number = CONCAT('TKT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 999999), 6, '0'));
--     END IF;
-- END$$
-- DELIMITER ;

-- -- Trigger: Update order total when order items change
-- DELIMITER $$
-- CREATE TRIGGER after_order_item_insert
-- AFTER INSERT ON order_items
-- FOR EACH ROW
-- BEGIN
--     UPDATE orders 
--     SET subtotal = (SELECT SUM(subtotal) FROM order_items WHERE order_id = NEW.order_id),
--         total = subtotal + delivery_fee - discount + tax
--     WHERE id = NEW.order_id;
-- END$$
-- DELIMITER ;

-- -- Trigger: Log order status changes
-- DELIMITER $$
-- CREATE TRIGGER after_order_status_update
-- AFTER UPDATE ON orders
-- FOR EACH ROW
-- BEGIN
--     IF NEW.status != OLD.status THEN
--         INSERT INTO order_status_history (order_id, status, notes)
--         VALUES (NEW.id, NEW.status, CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
--     END IF;
-- END$$
-- DELIMITER ;

-- =====================================================
-- END OF DATABASE SCHEMA
-- =====================================================

-- Display summary information
SELECT 'Database schema created successfully!' as Status;
SELECT COUNT(*) as TableCount FROM information_schema.tables WHERE table_schema = 'elbaraka_db';
