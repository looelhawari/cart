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
-- CREATE DATABASE IF NOT EXISTS elbaraka 
-- CHARACTER SET utf8mb4 
-- COLLATE utf8mb4_unicode_ci;

USE elbaraka;

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
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE CASCADE,
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
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE CASCADE,
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
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
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

-- Paymob Transactions Table
CREATE TABLE paymob_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    internal_order_id VARCHAR(255) NOT NULL COMMENT 'Our internal order reference',
    paymob_order_id VARCHAR(255) NULL COMMENT 'Paymob order ID from registration step',
    transaction_id VARCHAR(255) NULL COMMENT 'Paymob transaction ID from callback',
    amount_cents INT NOT NULL COMMENT 'Amount in cents (EGP × 100)',
    currency VARCHAR(3) DEFAULT 'EGP',
    payment_method ENUM('CARD', 'WALLET') NOT NULL,
    status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
    payment_token TEXT NULL COMMENT 'Generated payment token for iframe',
    hmac_signature VARCHAR(255) NULL COMMENT 'HMAC signature from callback',
    billing_data JSON NULL COMMENT 'Customer billing information',
    paymob_response JSON NULL COMMENT 'Full Paymob callback response',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_paymob_order_id (paymob_order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status),
    INDEX idx_internal_order_id (internal_order_id)
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
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE CASCADE,
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
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE CASCADE,
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
INSERT INTO users (first_name, last_name, email, phone, password, role, is_active, is_verified) VALUES
('Admin', 'User', 'admin@elbaraka.com', '+201000000000', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE, TRUE),
('Test', 'User', 'test@example.com', '+201234567890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE);

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

-- Insert additional test users
INSERT INTO users (first_name, last_name, email, phone, password, role, is_active, is_verified) VALUES
('Ahmed', 'Mohamed', 'ahmed.mohamed@example.com', '+201111111111', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE),
('Fatima', 'Hassan', 'fatima.hassan@example.com', '+201222222222', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE),
('Omar', 'Ali', 'omar.ali@example.com', '+201333333333', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE),
('Sarah', 'Ibrahim', 'sarah.ibrahim@example.com', '+201444444444', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE),
('Youssef', 'Mahmoud', 'youssef.mahmoud@example.com', '+201555555555', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', TRUE, TRUE);

-- Insert 50 categories (parent and subcategories)
INSERT INTO categories (parent_id, name_en, name_ar, slug, sort_order, is_active) VALUES
-- Main Categories
(NULL, 'Fruits & Vegetables', 'الفواكه والخضروات', 'fruits-vegetables', 1, TRUE),
(NULL, 'Dairy & Eggs', 'منتجات الألبان والبيض', 'dairy-eggs', 2, TRUE),
(NULL, 'Meat & Poultry', 'اللحوم والدواجن', 'meat-poultry', 3, TRUE),
(NULL, 'Seafood', 'المأكولات البحرية', 'seafood', 4, TRUE),
(NULL, 'Bakery', 'المخبوزات', 'bakery', 5, TRUE),
(NULL, 'Beverages', 'المشروبات', 'beverages', 6, TRUE),
(NULL, 'Snacks', 'الوجبات الخفيفة', 'snacks', 7, TRUE),
(NULL, 'Frozen Foods', 'الأطعمة المجمدة', 'frozen-foods', 8, TRUE),
(NULL, 'Canned Goods', 'المعلبات', 'canned-goods', 9, TRUE),
(NULL, 'Grains & Pasta', 'الحبوب والمكرونة', 'grains-pasta', 10, TRUE),
(NULL, 'Condiments & Sauces', 'التوابل والصلصات', 'condiments-sauces', 11, TRUE),
(NULL, 'Breakfast Foods', 'أطعمة الإفطار', 'breakfast-foods', 12, TRUE),
(NULL, 'Sweets & Chocolate', 'الحلويات والشوكولاتة', 'sweets-chocolate', 13, TRUE),
(NULL, 'Household Cleaning', 'منظفات المنزل', 'household-cleaning', 14, TRUE),
(NULL, 'Personal Care', 'العناية الشخصية', 'personal-care', 15, TRUE),
(NULL, 'Baby Care', 'العناية بالأطفال', 'baby-care', 16, TRUE),
(NULL, 'Pet Care', 'العناية بالحيوانات الأليفة', 'pet-care', 17, TRUE),

-- Subcategories for Fruits & Vegetables (parent_id = 1)
(1, 'Fresh Fruits', 'الفواكه الطازجة', 'fresh-fruits', 1, TRUE),
(1, 'Fresh Vegetables', 'الخضروات الطازجة', 'fresh-vegetables', 2, TRUE),
(1, 'Organic Produce', 'المنتجات العضوية', 'organic-produce', 3, TRUE),
(1, 'Herbs & Spices', 'الأعشاب والتوابل', 'herbs-spices', 4, TRUE),

-- Subcategories for Dairy & Eggs (parent_id = 2)
(2, 'Milk', 'الحليب', 'milk', 1, TRUE),
(2, 'Cheese', 'الجبن', 'cheese', 2, TRUE),
(2, 'Yogurt', 'الزبادي', 'yogurt', 3, TRUE),
(2, 'Butter & Cream', 'الزبدة والقشدة', 'butter-cream', 4, TRUE),
(2, 'Eggs', 'البيض', 'eggs', 5, TRUE),

-- Subcategories for Meat & Poultry (parent_id = 3)
(3, 'Beef', 'لحم البقر', 'beef', 1, TRUE),
(3, 'Chicken', 'الدجاج', 'chicken', 2, TRUE),
(3, 'Lamb', 'لحم الضأن', 'lamb', 3, TRUE),
(3, 'Processed Meats', 'اللحوم المصنعة', 'processed-meats', 4, TRUE),

-- Subcategories for Seafood (parent_id = 4)
(4, 'Fresh Fish', 'السمك الطازج', 'fresh-fish', 1, TRUE),
(4, 'Shrimp', 'الجمبري', 'shrimp', 2, TRUE),
(4, 'Frozen Seafood', 'المأكولات البحرية المجمدة', 'frozen-seafood', 3, TRUE),

-- Subcategories for Beverages (parent_id = 6)
(6, 'Soft Drinks', 'المشروبات الغازية', 'soft-drinks', 1, TRUE),
(6, 'Juices', 'العصائر', 'juices', 2, TRUE),
(6, 'Water', 'المياه', 'water', 3, TRUE),
(6, 'Tea & Coffee', 'الشاي والقهوة', 'tea-coffee', 4, TRUE),
(6, 'Energy Drinks', 'مشروبات الطاقة', 'energy-drinks', 5, TRUE),

-- Subcategories for Snacks (parent_id = 7)
(7, 'Chips & Crisps', 'الشيبسي', 'chips-crisps', 1, TRUE),
(7, 'Nuts & Seeds', 'المكسرات والبذور', 'nuts-seeds', 2, TRUE),
(7, 'Crackers & Biscuits', 'البسكويت والكراكرز', 'crackers-biscuits', 3, TRUE),
(7, 'Popcorn', 'الفشار', 'popcorn', 4, TRUE),

-- Subcategories for Personal Care (parent_id = 15)
(15, 'Hair Care', 'العناية بالشعر', 'hair-care', 1, TRUE),
(15, 'Skin Care', 'العناية بالبشرة', 'skin-care', 2, TRUE),
(15, 'Oral Care', 'العناية بالفم', 'oral-care', 3, TRUE),
(15, 'Bath & Body', 'الاستحمام والجسم', 'bath-body', 4, TRUE),

-- Subcategories for Household Cleaning (parent_id = 14)
(14, 'Laundry Detergent', 'مسحوق الغسيل', 'laundry-detergent', 1, TRUE),
(14, 'Dish Soap', 'صابون الأطباق', 'dish-soap', 2, TRUE),
(14, 'Surface Cleaners', 'منظفات الأسطح', 'surface-cleaners', 3, TRUE);

-- Insert 100 Products with Real Data
INSERT INTO products (barcode, name_en, name_ar, slug, image, description_en, description_ar, price, sale_price, cost_price, stock_quantity, weight, unit, is_featured, is_active) VALUES
-- Fruits & Vegetables (1-20)
(1001, 'Fresh Apples - Red Delicious', 'تفاح أحمر طازج', 'fresh-apples-red-delicious', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6', 'Crispy and sweet red delicious apples, perfect for snacking', 'تفاح أحمر مقرمش وحلو، مثالي للوجبات الخفيفة', 25.00, 22.50, 15.00, 150, 1000, 'kg', TRUE, TRUE),
(1002, 'Organic Bananas', 'موز عضوي', 'organic-bananas', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e', 'Fresh organic bananas rich in potassium', 'موز عضوي طازج غني بالبوتاسيوم', 18.00, NULL, 12.00, 200, 1000, 'kg', TRUE, TRUE),
(1003, 'Fresh Tomatoes', 'طماطم طازجة', 'fresh-tomatoes', 'https://images.unsplash.com/photo-1592924357229-8b17f3efb530', 'Ripe and juicy tomatoes for salads and cooking', 'طماطم ناضجة وعصيرية للسلطات والطهي', 15.00, 13.50, 8.00, 180, 1000, 'kg', FALSE, TRUE),
(1004, 'Carrots', 'جزر', 'carrots', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37', 'Fresh crunchy carrots, high in vitamin A', 'جزر طازج مقرمش، غني بفيتامين أ', 12.00, NULL, 7.00, 120, 1000, 'kg', FALSE, TRUE),
(1005, 'Green Lettuce', 'خس أخضر', 'green-lettuce', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1', 'Crisp green lettuce for fresh salads', 'خس أخضر مقرمش للسلطات الطازجة', 10.00, NULL, 5.00, 90, 500, 'piece', FALSE, TRUE),
(1006, 'Sweet Oranges', 'برتقال حلو', 'sweet-oranges', 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9', 'Juicy sweet oranges packed with vitamin C', 'برتقال حلو عصيري غني بفيتامين سي', 20.00, 18.00, 12.00, 140, 1000, 'kg', TRUE, TRUE),
(1007, 'Fresh Cucumber', 'خيار طازج', 'fresh-cucumber', 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e', 'Refreshing cucumbers perfect for salads', 'خيار منعش مثالي للسلطات', 8.00, NULL, 4.00, 100, 1000, 'kg', FALSE, TRUE),
(1008, 'Red Bell Peppers', 'فلفل أحمر حلو', 'red-bell-peppers', 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83', 'Sweet red bell peppers for cooking', 'فلفل أحمر حلو للطهي', 35.00, NULL, 22.00, 80, 1000, 'kg', FALSE, TRUE),
(1009, 'Fresh Strawberries', 'فراولة طازجة', 'fresh-strawberries', 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2', 'Sweet and fresh strawberries', 'فراولة طازجة وحلوة', 45.00, 42.00, 30.00, 60, 250, 'piece', TRUE, TRUE),
(1010, 'Broccoli', 'بروكلي', 'broccoli', 'https://images.unsplash.com/photo-1584270354949-c26b0d5b1481', 'Fresh broccoli florets, rich in nutrients', 'زهرات بروكلي طازجة غنية بالمغذيات', 28.00, NULL, 18.00, 70, 500, 'piece', FALSE, TRUE),
(1011, 'Fresh Grapes - Green', 'عنب أخضر طازج', 'fresh-grapes-green', 'https://images.unsplash.com/photo-1599819177908-4e3b663e7ac6', 'Sweet seedless green grapes', 'عنب أخضر بدون بذور حلو', 40.00, 38.00, 25.00, 90, 500, 'kg', TRUE, TRUE),
(1012, 'Fresh Potatoes', 'بطاطس طازجة', 'fresh-potatoes', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655', 'High-quality potatoes for all cooking needs', 'بطاطس عالية الجودة لجميع احتياجات الطهي', 10.00, NULL, 6.00, 250, 1000, 'kg', FALSE, TRUE),
(1013, 'Fresh Spinach', 'سبانخ طازجة', 'fresh-spinach', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb', 'Nutrient-rich fresh spinach leaves', 'أوراق سبانخ طازجة غنية بالمغذيات', 15.00, NULL, 9.00, 85, 500, 'piece', FALSE, TRUE),
(1014, 'Watermelon', 'بطيخ', 'watermelon', 'https://images.unsplash.com/photo-1587049352846-4a222e784343', 'Refreshing sweet watermelon', 'بطيخ حلو منعش', 8.00, NULL, 5.00, 150, 5000, 'piece', TRUE, TRUE),
(1015, 'Fresh Mango', 'مانجو طازجة', 'fresh-mango', 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716', 'Sweet tropical mangoes', 'مانجو استوائية حلوة', 50.00, 47.00, 35.00, 75, 500, 'kg', TRUE, TRUE),
(1016, 'Onions - Yellow', 'بصل أصفر', 'onions-yellow', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb', 'Fresh yellow onions for everyday cooking', 'بصل أصفر طازج للطهي اليومي', 12.00, NULL, 7.00, 200, 1000, 'kg', FALSE, TRUE),
(1017, 'Fresh Garlic', 'ثوم طازج', 'fresh-garlic', 'https://images.unsplash.com/photo-1580910051074-3eb694886505', 'Aromatic fresh garlic cloves', 'فصوص ثوم طازجة عطرية', 45.00, NULL, 30.00, 60, 250, 'kg', FALSE, TRUE),
(1018, 'Lemons', 'ليمون', 'lemons', 'https://images.unsplash.com/photo-1590502593747-42a996133562', 'Fresh lemons rich in vitamin C', 'ليمون طازج غني بفيتامين سي', 22.00, 20.00, 14.00, 130, 1000, 'kg', FALSE, TRUE),
(1019, 'Fresh Zucchini', 'كوسة طازجة', 'fresh-zucchini', 'https://images.unsplash.com/photo-1595951735267-a962e98c84f8', 'Green zucchini for healthy meals', 'كوسة خضراء للوجبات الصحية', 18.00, NULL, 11.00, 95, 1000, 'kg', FALSE, TRUE),
(1020, 'Fresh Cauliflower', 'قرنبيط طازج', 'fresh-cauliflower', 'https://images.unsplash.com/photo-1568584711271-61a0e0a6e2b1', 'White cauliflower heads, versatile vegetable', 'رؤوس قرنبيط أبيض، خضار متعدد الاستخدامات', 20.00, NULL, 13.00, 80, 800, 'piece', FALSE, TRUE),

-- Dairy & Eggs (21-35)
(2001, 'Fresh Whole Milk 1L', 'حليب كامل الدسم 1 لتر', 'fresh-whole-milk-1l', 'https://images.unsplash.com/photo-1550583724-b2692b85b150', 'Pure fresh whole milk, rich and creamy', 'حليب طازج كامل الدسم نقي وكريمي', 22.00, NULL, 15.00, 180, 1000, 'piece', TRUE, TRUE),
(2002, 'Low Fat Milk 1L', 'حليب قليل الدسم 1 لتر', 'low-fat-milk-1l', 'https://images.unsplash.com/photo-1563636619-e9143da7973b', 'Healthy low-fat milk option', 'خيار حليب صحي قليل الدسم', 20.00, NULL, 13.00, 160, 1000, 'piece', FALSE, TRUE),
(2003, 'Greek Yogurt 500g', 'زبادي يوناني 500 جم', 'greek-yogurt-500g', 'https://images.unsplash.com/photo-1488477181946-6428a0291777', 'Thick and creamy Greek yogurt', 'زبادي يوناني سميك وكريمي', 35.00, 33.00, 23.00, 120, 500, 'piece', TRUE, TRUE),
(2004, 'Natural Yogurt 1kg', 'زبادي طبيعي 1 كجم', 'natural-yogurt-1kg', 'https://images.unsplash.com/photo-1571212515416-26b60b90eb77', 'Fresh natural yogurt, probiotic-rich', 'زبادي طبيعي طازج غني بالبروبيوتيك', 28.00, NULL, 18.00, 140, 1000, 'piece', FALSE, TRUE),
(2005, 'Cheddar Cheese 250g', 'جبنة شيدر 250 جم', 'cheddar-cheese-250g', 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c', 'Premium aged cheddar cheese', 'جبنة شيدر معتقة فاخرة', 55.00, NULL, 38.00, 95, 250, 'piece', TRUE, TRUE),
(2006, 'Mozzarella Cheese 200g', 'جبنة موتزاريلا 200 جم', 'mozzarella-cheese-200g', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002', 'Fresh mozzarella for pizza and pasta', 'موتزاريلا طازجة للبيتزا والمكرونة', 48.00, 45.00, 32.00, 105, 200, 'piece', TRUE, TRUE),
(2007, 'Butter 250g', 'زبدة 250 جم', 'butter-250g', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d', 'Pure butter for cooking and baking', 'زبدة نقية للطهي والخبز', 42.00, NULL, 28.00, 130, 250, 'piece', FALSE, TRUE),
(2008, 'Fresh Eggs - 12 Pack', 'بيض طازج - 12 بيضة', 'fresh-eggs-12-pack', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f', 'Farm-fresh large eggs', 'بيض كبير طازج من المزرعة', 38.00, 36.00, 25.00, 200, 720, 'piece', TRUE, TRUE),
(2009, 'Cream Cheese 200g', 'جبنة كريمي 200 جم', 'cream-cheese-200g', 'https://images.unsplash.com/photo-1486297678162-eb2a19b24a78', 'Smooth cream cheese spread', 'جبنة كريمي ناعمة للدهن', 40.00, NULL, 27.00, 85, 200, 'piece', FALSE, TRUE),
(2010, 'Feta Cheese 300g', 'جبنة فيتا 300 جم', 'feta-cheese-300g', 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41', 'Traditional crumbly feta cheese', 'جبنة فيتا تقليدية قابلة للتفتت', 50.00, 47.00, 34.00, 90, 300, 'piece', FALSE, TRUE),
(2011, 'Heavy Cream 250ml', 'قشدة ثقيلة 250 مل', 'heavy-cream-250ml', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da', 'Rich heavy cream for desserts', 'قشدة ثقيلة غنية للحلويات', 32.00, NULL, 22.00, 75, 250, 'piece', FALSE, TRUE),
(2012, 'Parmesan Cheese 150g', 'جبنة بارميزان 150 جم', 'parmesan-cheese-150g', 'https://images.unsplash.com/photo-1599471099497-4becc0a19679', 'Aged Italian Parmesan cheese', 'جبنة بارميزان إيطالية معتقة', 65.00, NULL, 45.00, 60, 150, 'piece', TRUE, TRUE),
(2013, 'Sour Cream 200g', 'قشدة حامضة 200 جم', 'sour-cream-200g', 'https://images.unsplash.com/photo-1616270672-a11e0c3e9cc5', 'Tangy sour cream for toppings', 'قشدة حامضة لذيذة للتزيين', 28.00, NULL, 19.00, 70, 200, 'piece', FALSE, TRUE),
(2014, 'Cottage Cheese 400g', 'جبنة قريش 400 جم', 'cottage-cheese-400g', 'https://images.unsplash.com/photo-1486297678162-eb2a19b24a78', 'Low-fat cottage cheese, high in protein', 'جبنة قريش قليلة الدسم عالية البروتين', 35.00, NULL, 24.00, 80, 400, 'piece', FALSE, TRUE),
(2015, 'Chocolate Milk 1L', 'حليب بالشوكولاتة 1 لتر', 'chocolate-milk-1l', 'https://images.unsplash.com/photo-1571212515416-26b60b90eb77', 'Delicious chocolate flavored milk', 'حليب لذيذ بنكهة الشوكولاتة', 26.00, 24.50, 17.00, 110, 1000, 'piece', TRUE, TRUE),

-- Meat & Poultry (36-45)
(3001, 'Fresh Chicken Breast 1kg', 'صدور دجاج طازجة 1 كجم', 'fresh-chicken-breast-1kg', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791', 'Lean and tender chicken breast', 'صدور دجاج طرية وقليلة الدهن', 85.00, NULL, 60.00, 120, 1000, 'kg', TRUE, TRUE),
(3002, 'Whole Chicken 1.5kg', 'دجاجة كاملة 1.5 كجم', 'whole-chicken-1-5kg', 'https://images.unsplash.com/photo-1587593810167-a84920ea0781', 'Fresh whole chicken, cleaned', 'دجاجة كاملة طازجة ومنظفة', 120.00, 115.00, 85.00, 95, 1500, 'piece', TRUE, TRUE),
(3003, 'Ground Beef 500g', 'لحم بقري مفروم 500 جم', 'ground-beef-500g', 'https://images.unsplash.com/photo-1603048588665-791ca8aea617', 'Fresh lean ground beef for burgers', 'لحم بقري مفروم طازج قليل الدهن للبرجر', 95.00, NULL, 68.00, 80, 500, 'piece', TRUE, TRUE),
(3004, 'Beef Steak 300g', 'ستيك لحم بقري 300 جم', 'beef-steak-300g', 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6', 'Premium quality beef steak cuts', 'قطع ستيك لحم بقري عالية الجودة', 145.00, 140.00, 100.00, 65, 300, 'piece', TRUE, TRUE),
(3005, 'Chicken Wings 1kg', 'أجنحة دجاج 1 كجم', 'chicken-wings-1kg', 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7', 'Fresh chicken wings for grilling', 'أجنحة دجاج طازجة للشوي', 70.00, NULL, 48.00, 90, 1000, 'kg', FALSE, TRUE),
(3006, 'Lamb Chops 500g', 'قطع لحم ضأن 500 جم', 'lamb-chops-500g', 'https://images.unsplash.com/photo-1595777216528-071e0127ccbf', 'Tender lamb chops for grilling', 'قطع لحم ضأن طرية للشوي', 165.00, NULL, 120.00, 55, 500, 'piece', TRUE, TRUE),
(3007, 'Beef Sausages 400g', 'سجق لحم بقري 400 جم', 'beef-sausages-400g', 'https://images.unsplash.com/photo-1612927601601-6638404737ce', 'Juicy beef sausages, ready to cook', 'سجق لحم بقري عصيري جاهز للطهي', 55.00, NULL, 38.00, 100, 400, 'piece', FALSE, TRUE),
(3008, 'Chicken Thighs 1kg', 'أفخاذ دجاج 1 كجم', 'chicken-thighs-1kg', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f', 'Juicy chicken thighs, bone-in', 'أفخاذ دجاج عصيرية بالعظم', 75.00, 72.00, 52.00, 85, 1000, 'kg', FALSE, TRUE),
(3009, 'Turkey Breast 500g', 'صدر ديك رومي 500 جم', 'turkey-breast-500g', 'https://images.unsplash.com/photo-1600353068314-c38f1fafef55', 'Lean turkey breast slices', 'شرائح صدر ديك رومي قليل الدهن', 98.00, NULL, 70.00, 60, 500, 'piece', TRUE, TRUE),
(3010, 'Minced Lamb 500g', 'لحم ضأن مفروم 500 جم', 'minced-lamb-500g', 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976', 'Fresh minced lamb meat', 'لحم ضأن مفروم طازج', 110.00, 105.00, 78.00, 70, 500, 'piece', FALSE, TRUE),

-- Seafood (46-50)
(4001, 'Fresh Salmon Fillet 400g', 'فيليه سلمون طازج 400 جم', 'fresh-salmon-fillet-400g', 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6', 'Premium fresh salmon fillet', 'فيليه سلمون طازج فاخر', 185.00, 180.00, 135.00, 45, 400, 'piece', TRUE, TRUE),
(4002, 'Shrimp 500g', 'جمبري 500 جم', 'shrimp-500g', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47', 'Fresh jumbo shrimp, cleaned', 'جمبري جامبو طازج ومنظف', 135.00, NULL, 95.00, 55, 500, 'piece', TRUE, TRUE),
(4003, 'Tilapia Fish 500g', 'سمك بلطي 500 جم', 'tilapia-fish-500g', 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44', 'Fresh tilapia fish fillets', 'فيليه سمك بلطي طازج', 75.00, 72.00, 52.00, 65, 500, 'piece', FALSE, TRUE),
(4004, 'Frozen Mixed Seafood 600g', 'مأكولات بحرية مشكلة مجمدة 600 جم', 'frozen-mixed-seafood-600g', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', 'Mixed seafood blend for cooking', 'خليط مأكولات بحرية للطهي', 120.00, NULL, 85.00, 75, 600, 'piece', TRUE, TRUE),
(4005, 'Crab Meat 300g', 'لحم السلطعون 300 جم', 'crab-meat-300g', 'https://images.unsplash.com/photo-1580959375944-f71e00a2696f', 'Premium crab meat, ready to use', 'لحم سلطعون فاخر جاهز للاستخدام', 155.00, NULL, 110.00, 40, 300, 'piece', TRUE, TRUE),

-- Bakery (51-60)
(5001, 'Fresh White Bread', 'خبز أبيض طازج', 'fresh-white-bread', 'https://images.unsplash.com/photo-1509440159596-0249088772ff', 'Soft and fresh white bread loaf', 'رغيف خبز أبيض طازج وطري', 8.00, NULL, 4.50, 200, 400, 'piece', FALSE, TRUE),
(5002, 'Whole Wheat Bread', 'خبز قمح كامل', 'whole-wheat-bread', 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877', 'Healthy whole wheat bread', 'خبز قمح كامل صحي', 10.00, NULL, 6.00, 180, 450, 'piece', TRUE, TRUE),
(5003, 'Croissants 6 Pack', 'كرواسون - 6 قطع', 'croissants-6-pack', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', 'Buttery French croissants', 'كرواسون فرنسي بالزبدة', 35.00, 33.00, 22.00, 95, 300, 'piece', TRUE, TRUE),
(5004, 'Bagels 4 Pack', 'بيجل - 4 قطع', 'bagels-4-pack', 'https://images.unsplash.com/photo-1551106652-a5bcf4b29ab6', 'Fresh plain bagels for breakfast', 'بيجل سادة طازج للإفطار', 25.00, NULL, 16.00, 110, 320, 'piece', FALSE, TRUE),
(5005, 'Burger Buns 8 Pack', 'خبز برجر - 8 قطع', 'burger-buns-8-pack', 'https://images.unsplash.com/photo-1563887917861-426b01d0d45c', 'Soft sesame burger buns', 'خبز برجر طري بالسمسم', 22.00, 20.00, 14.00, 125, 400, 'piece', FALSE, TRUE),
(5006, 'Pita Bread 6 Pack', 'خبز بيتا - 6 قطع', 'pita-bread-6-pack', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47', 'Traditional pita bread pockets', 'خبز بيتا تقليدي', 12.00, NULL, 7.50, 150, 300, 'piece', FALSE, TRUE),
(5007, 'Cake Donuts 6 Pack', 'دونات كيك - 6 قطع', 'cake-donuts-6-pack', 'https://images.unsplash.com/photo-1551024506-0bccd828d307', 'Sweet glazed cake donuts', 'دونات كيك محلى بالطلاء', 40.00, 38.00, 26.00, 80, 360, 'piece', TRUE, TRUE),
(5008, 'Muffins 4 Pack', 'مافن - 4 قطع', 'muffins-4-pack', 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa', 'Blueberry muffins, freshly baked', 'مافن بالتوت الأزرق طازج من الفرن', 32.00, NULL, 21.00, 90, 280, 'piece', TRUE, TRUE),
(5009, 'Baguette', 'باجيت فرنسي', 'baguette', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', 'Classic French baguette', 'باجيت فرنسي كلاسيكي', 15.00, NULL, 9.00, 130, 250, 'piece', FALSE, TRUE),
(5010, 'Chocolate Cake Slice', 'قطعة كيك شوكولاتة', 'chocolate-cake-slice', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587', 'Rich chocolate layer cake', 'كيك طبقات شوكولاتة غني', 28.00, 26.50, 18.00, 70, 150, 'piece', TRUE, TRUE),

-- Beverages (61-75)
(6001, 'Coca-Cola 1.5L', 'كوكا كولا 1.5 لتر', 'coca-cola-1-5l', 'https://images.unsplash.com/photo-1554866585-cd94860890b7', 'Classic Coca-Cola soft drink', 'مشروب كوكا كولا الكلاسيكي', 18.00, 17.00, 12.00, 250, 1500, 'piece', TRUE, TRUE),
(6002, 'Pepsi 1.5L', 'بيبسي 1.5 لتر', 'pepsi-1-5l', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e', 'Pepsi cola soft drink', 'مشروب بيبسي كولا', 17.50, NULL, 11.50, 240, 1500, 'piece', TRUE, TRUE),
(6003, 'Sprite 1.5L', 'سبرايت 1.5 لتر', 'sprite-1-5l', 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3', 'Lemon-lime flavored soda', 'مشروب غازي بنكهة الليمون', 17.50, NULL, 11.50, 230, 1500, 'piece', FALSE, TRUE),
(6004, 'Orange Juice 1L', 'عصير برتقال 1 لتر', 'orange-juice-1l', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba', '100% pure orange juice', 'عصير برتقال طبيعي 100%', 32.00, 30.00, 22.00, 145, 1000, 'piece', TRUE, TRUE),
(6005, 'Apple Juice 1L', 'عصير تفاح 1 لتر', 'apple-juice-1l', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba', 'Fresh apple juice, no added sugar', 'عصير تفاح طازج بدون سكر مضاف', 30.00, NULL, 21.00, 130, 1000, 'piece', FALSE, TRUE),
(6006, 'Mineral Water 1.5L', 'مياه معدنية 1.5 لتر', 'mineral-water-1-5l', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', 'Pure mineral water', 'مياه معدنية نقية', 6.00, 5.50, 3.50, 350, 1500, 'piece', FALSE, TRUE),
(6007, 'Sparkling Water 1L', 'مياه فوارة 1 لتر', 'sparkling-water-1l', 'https://images.unsplash.com/photo-1523362628745-0c100150b504', 'Carbonated sparkling water', 'مياه فوارة مكربنة', 12.00, NULL, 7.50, 180, 1000, 'piece', FALSE, TRUE),
(6008, 'Energy Drink 250ml', 'مشروب طاقة 250 مل', 'energy-drink-250ml', 'https://images.unsplash.com/photo-1622543925917-763c34f6a27a', 'High-energy sports drink', 'مشروب طاقة رياضي عالي الطاقة', 22.00, 20.00, 14.00, 160, 250, 'piece', TRUE, TRUE),
(6009, 'Green Tea Box 25 Bags', 'شاي أخضر - 25 كيس', 'green-tea-box-25-bags', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9', 'Premium green tea bags', 'أكياس شاي أخضر فاخر', 38.00, NULL, 26.00, 120, 50, 'piece', TRUE, TRUE),
(6010, 'Black Coffee 200g', 'قهوة سوداء 200 جم', 'black-coffee-200g', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e', 'Rich ground coffee beans', 'حبوب قهوة مطحونة غنية', 55.00, 52.00, 38.00, 95, 200, 'piece', TRUE, TRUE),
(6011, 'Mango Juice 1L', 'عصير مانجو 1 لتر', 'mango-juice-1l', 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71', 'Tropical mango juice drink', 'عصير مانجو استوائي', 34.00, NULL, 24.00, 110, 1000, 'piece', TRUE, TRUE),
(6012, 'Iced Tea 1.5L', 'شاي مثلج 1.5 لتر', 'iced-tea-1-5l', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc', 'Refreshing iced tea drink', 'مشروب شاي مثلج منعش', 20.00, NULL, 13.50, 140, 1500, 'piece', FALSE, TRUE),
(6013, 'Lemonade 1L', 'ليموناضة 1 لتر', 'lemonade-1l', 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f8d', 'Fresh homestyle lemonade', 'ليموناضة طازجة منزلية الطراز', 25.00, 23.50, 16.00, 115, 1000, 'piece', FALSE, TRUE),
(6014, 'Hot Chocolate Mix 400g', 'مزيج شوكولاتة ساخنة 400 جم', 'hot-chocolate-mix-400g', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed', 'Rich hot chocolate powder', 'مسحوق شوكولاتة ساخنة غني', 42.00, NULL, 29.00, 85, 400, 'piece', TRUE, TRUE),
(6015, 'Coconut Water 330ml', 'ماء جوز الهند 330 مل', 'coconut-water-330ml', 'https://images.unsplash.com/photo-1585788994095-cbd8856d0d2c', 'Natural coconut water, hydrating', 'ماء جوز هند طبيعي ومرطب', 28.00, NULL, 19.00, 100, 330, 'piece', TRUE, TRUE),

-- Snacks (76-90)
(7001, 'Potato Chips 150g', 'شيبسي بطاطس 150 جم', 'potato-chips-150g', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b', 'Crispy salted potato chips', 'شيبسي بطاطس مقرمش مملح', 18.00, 17.00, 11.00, 200, 150, 'piece', TRUE, TRUE),
(7002, 'Cheese Puffs 120g', 'كرات الجبن 120 جم', 'cheese-puffs-120g', 'https://images.unsplash.com/photo-1613919263912-c7d0c33338e6', 'Cheesy corn puffs snack', 'وجبة خفيفة من كرات الذرة بالجبن', 15.00, NULL, 9.50, 180, 120, 'piece', FALSE, TRUE),
(7003, 'Mixed Nuts 200g', 'مكسرات مشكلة 200 جم', 'mixed-nuts-200g', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32', 'Premium roasted mixed nuts', 'مكسرات محمصة فاخرة مشكلة', 65.00, 62.00, 45.00, 95, 200, 'piece', TRUE, TRUE),
(7004, 'Chocolate Bar 50g', 'لوح شوكولاتة 50 جم', 'chocolate-bar-50g', 'https://images.unsplash.com/photo-1581798459219-318e76abe3f0', 'Milk chocolate bar', 'لوح شوكولاتة بالحليب', 12.00, NULL, 7.50, 250, 50, 'piece', TRUE, TRUE),
(7005, 'Crackers 200g', 'كراكرز 200 جم', 'crackers-200g', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35', 'Salted crackers for snacking', 'كراكرز مملح للتسالي', 16.00, 15.00, 10.00, 170, 200, 'piece', FALSE, TRUE),
(7006, 'Popcorn 100g', 'فشار 100 جم', 'popcorn-100g', 'https://images.unsplash.com/photo-1578849278619-e73505e9610f', 'Butter-flavored popcorn', 'فشار بنكهة الزبدة', 14.00, NULL, 8.50, 160, 100, 'piece', FALSE, TRUE),
(7007, 'Granola Bar 6 Pack', 'بار جرانولا - 6 قطع', 'granola-bar-6-pack', 'https://images.unsplash.com/photo-1606312619070-d48b4ceb9f28', 'Healthy oat and honey granola bars', 'بار جرانولا صحي بالشوفان والعسل', 35.00, 33.00, 23.00, 110, 180, 'piece', TRUE, TRUE),
(7008, 'Pretzels 150g', 'بريتزل 150 جم', 'pretzels-150g', 'https://images.unsplash.com/photo-1607920591413-4ec007e70023', 'Crunchy salted pretzels', 'بريتزل مقرمش مملح', 17.00, NULL, 11.00, 140, 150, 'piece', FALSE, TRUE),
(7009, 'Trail Mix 180g', 'خليط المكسرات 180 جم', 'trail-mix-180g', 'https://images.unsplash.com/photo-1585632215405-029a6c78c88e', 'Nuts, dried fruits, and chocolate mix', 'خليط مكسرات وفواكه مجففة وشوكولاتة', 48.00, NULL, 33.00, 100, 180, 'piece', TRUE, TRUE),
(7010, 'Rice Cakes 120g', 'كعك الأرز 120 جم', 'rice-cakes-120g', 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae', 'Light and crispy rice cakes', 'كعك أرز خفيف ومقرمش', 20.00, NULL, 13.00, 125, 120, 'piece', FALSE, TRUE),
(7011, 'Cookies Chocolate Chip 250g', 'كوكيز برقائق الشوكولاتة 250 جم', 'cookies-chocolate-chip-250g', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e', 'Classic chocolate chip cookies', 'كوكيز كلاسيكي برقائق الشوكولاتة', 28.00, 26.50, 18.00, 135, 250, 'piece', TRUE, TRUE),
(7012, 'Gummy Bears 200g', 'دببة جيلاتينية 200 جم', 'gummy-bears-200g', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f', 'Fruit-flavored gummy bears', 'دببة جيلاتينية بنكهات الفواكه', 22.00, NULL, 14.50, 150, 200, 'piece', TRUE, TRUE),
(7013, 'Tortilla Chips 180g', 'شيبسي تورتيلا 180 جم', 'tortilla-chips-180g', 'https://images.unsplash.com/photo-1613919263912-c7d0c33338e6', 'Corn tortilla chips with sea salt', 'شيبسي تورتيلا ذرة بملح البحر', 19.00, 18.00, 12.00, 145, 180, 'piece', FALSE, TRUE),
(7014, 'Sunflower Seeds 150g', 'بذور عباد الشمس 150 جم', 'sunflower-seeds-150g', 'https://images.unsplash.com/photo-1557844352-761f2565b576', 'Roasted salted sunflower seeds', 'بذور عباد الشمس محمصة مملحة', 25.00, NULL, 16.00, 120, 150, 'piece', FALSE, TRUE),
(7015, 'Protein Bar 60g', 'بار بروتين 60 جم', 'protein-bar-60g', 'https://images.unsplash.com/photo-1598970605070-92d6bf4ac58b', 'High-protein energy bar', 'بار طاقة عالي البروتين', 32.00, 30.00, 21.00, 105, 60, 'piece', TRUE, TRUE),

-- Household Cleaning (91-95)
(8001, 'Laundry Detergent 2L', 'مسحوق غسيل 2 لتر', 'laundry-detergent-2l', 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce', 'Powerful liquid laundry detergent', 'مسحوق غسيل سائل قوي', 65.00, 62.00, 45.00, 130, 2000, 'piece', TRUE, TRUE),
(8002, 'Dish Soap 750ml', 'صابون أطباق 750 مل', 'dish-soap-750ml', 'https://images.unsplash.com/photo-1563453392212-326f5e854473', 'Lemon-scented dish washing liquid', 'سائل غسيل أطباق برائحة الليمون', 28.00, NULL, 18.50, 165, 750, 'piece', FALSE, TRUE),
(8003, 'All-Purpose Cleaner 1L', 'منظف متعدد الأغراض 1 لتر', 'all-purpose-cleaner-1l', 'https://images.unsplash.com/photo-1585421514738-01798e348b17', 'Multi-surface cleaning spray', 'بخاخ تنظيف متعدد الأسطح', 35.00, 33.00, 23.00, 140, 1000, 'piece', FALSE, TRUE),
(8004, 'Glass Cleaner 500ml', 'منظف زجاج 500 مل', 'glass-cleaner-500ml', 'https://images.unsplash.com/photo-1585421514738-01798e348b17', 'Streak-free glass and mirror cleaner', 'منظف زجاج ومرايا بدون خطوط', 22.00, NULL, 14.50, 120, 500, 'piece', FALSE, TRUE),
(8005, 'Floor Cleaner 1.5L', 'منظف أرضيات 1.5 لتر', 'floor-cleaner-1-5l', 'https://images.unsplash.com/photo-1585421514738-01798e348b17', 'Fresh-scented floor cleaning liquid', 'سائل تنظيف أرضيات برائحة منعشة', 42.00, 40.00, 28.00, 110, 1500, 'piece', FALSE, TRUE),

-- Personal Care (96-100)
(9001, 'Shampoo 400ml', 'شامبو 400 مل', 'shampoo-400ml', 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388', 'Moisturizing hair shampoo', 'شامبو مرطب للشعر', 48.00, 45.00, 32.00, 145, 400, 'piece', TRUE, TRUE),
(9002, 'Conditioner 400ml', 'بلسم 400 مل', 'conditioner-400ml', 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc', 'Nourishing hair conditioner', 'بلسم مغذي للشعر', 50.00, NULL, 35.00, 135, 400, 'piece', FALSE, TRUE),
(9003, 'Body Wash 500ml', 'غسول جسم 500 مل', 'body-wash-500ml', 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273', 'Refreshing shower gel', 'جل استحمام منعش', 42.00, 40.00, 28.00, 150, 500, 'piece', TRUE, TRUE),
(9004, 'Toothpaste 120g', 'معجون أسنان 120 جم', 'toothpaste-120g', 'https://images.unsplash.com/photo-1622034455735-3457b3c5e5b6', 'Fluoride toothpaste for strong teeth', 'معجون أسنان بالفلورايد لأسنان قوية', 25.00, NULL, 16.50, 180, 120, 'piece', TRUE, TRUE),
(9005, 'Hand Soap 250ml', 'صابون يدين 250 مل', 'hand-soap-250ml', 'https://images.unsplash.com/photo-1584305574647-0cc949a6f7f1', 'Antibacterial hand wash liquid', 'سائل غسيل يدين مضاد للبكتيريا', 22.00, 20.00, 14.00, 160, 250, 'piece', FALSE, TRUE);

-- Link Products to Categories
INSERT INTO product_categories (product_id, category_id) VALUES
-- Fruits & Vegetables to subcategories (18, 19)
(1001, 18), (1002, 18), (1006, 18), (1009, 18), (1011, 18), (1014, 18), (1015, 18), (1018, 18),
(1003, 19), (1004, 19), (1005, 19), (1007, 19), (1008, 19), (1010, 19), (1012, 19), (1013, 19), (1016, 19), (1017, 19), (1019, 19), (1020, 19),
-- Dairy to subcategories (22-26)
(2001, 22), (2002, 22), (2015, 22),
(2003, 24), (2004, 24),
(2005, 23), (2006, 23), (2009, 23), (2010, 23), (2012, 23), (2014, 23),
(2007, 25), (2011, 25), (2013, 25),
(2008, 26),
-- Meat & Poultry to subcategories (28-29)
(3003, 28), (3004, 28),
(3001, 29), (3002, 29), (3005, 29), (3008, 29), (3009, 29),
(3006, 30), (3010, 30),
(3007, 31),
-- Seafood to subcategories (32-34)
(4001, 32), (4003, 32),
(4002, 33),
(4004, 34), (4005, 34),
-- Bakery (5)
(5001, 5), (5002, 5), (5003, 5), (5004, 5), (5005, 5), (5006, 5), (5007, 5), (5008, 5), (5009, 5), (5010, 5),
-- Beverages to subcategories (35-39)
(6001, 35), (6002, 35), (6003, 35),
(6004, 36), (6005, 36), (6011, 36), (6013, 36),
(6006, 37), (6007, 37),
(6009, 38), (6010, 38), (6012, 38), (6014, 38),
(6008, 39), (6015, 39),
-- Snacks to subcategories (40-43)
(7001, 40), (7002, 40), (7013, 40),
(7003, 41), (7009, 41), (7014, 41),
(7004, 41), (7005, 42), (7008, 42), (7011, 42), (7012, 42),
(7006, 43),
(7007, 42), (7010, 42), (7015, 42),
-- Household Cleaning to subcategories (47-49)
(8001, 47),
(8002, 48),
(8003, 49), (8004, 49), (8005, 49),
-- Personal Care to subcategories (44-46)
(9001, 44), (9002, 44),
(9003, 46), (9005, 46),
(9004, 45);

-- Insert Promo Codes
INSERT INTO promo_codes (code, type, value, minimum_order, maximum_discount, usage_limit, usage_per_user, used_count, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'percentage', 10.00, 100.00, 50.00, NULL, 1, 0, '2026-01-01 00:00:00', '2026-12-31 23:59:59', TRUE),
('SAVE20', 'percentage', 20.00, 200.00, 100.00, 500, 3, 45, '2026-01-01 00:00:00', '2026-06-30 23:59:59', TRUE),
('FIRST50', 'fixed_amount', 50.00, 150.00, NULL, NULL, 1, 12, '2026-01-01 00:00:00', '2026-12-31 23:59:59', TRUE),
('FREEDEL', 'free_delivery', 0.00, 100.00, NULL, 1000, 5, 234, '2026-01-01 00:00:00', '2026-12-31 23:59:59', TRUE),
('SUMMER25', 'percentage', 25.00, 250.00, 150.00, 200, 2, 87, '2026-06-01 00:00:00', '2026-08-31 23:59:59', TRUE),
('NEWYEAR15', 'percentage', 15.00, 100.00, 75.00, 300, 1, 156, '2026-01-01 00:00:00', '2026-01-31 23:59:59', TRUE),
('VIP100', 'fixed_amount', 100.00, 500.00, NULL, 50, 1, 23, '2026-01-01 00:00:00', '2026-12-31 23:59:59', TRUE),
('FLASHSALE', 'percentage', 30.00, 300.00, 200.00, 100, 1, 67, '2026-01-20 00:00:00', '2026-01-25 23:59:59', TRUE),
('LOYAL5', 'percentage', 5.00, 50.00, 25.00, NULL, 10, 445, '2026-01-01 00:00:00', '2026-12-31 23:59:59', TRUE),
('MEGA50', 'fixed_amount', 50.00, 200.00, NULL, 150, 2, 98, '2026-01-15 00:00:00', '2026-02-15 23:59:59', TRUE);

-- Insert Sample Orders for Reviews
INSERT INTO orders (user_id, order_number, status, subtotal, delivery_fee, discount, tax, total, payment_method, payment_status, delivery_address_id, created_at) VALUES
(2, 'ORD-2026-001', 'delivered', 250.00, 20.00, 0.00, 35.00, 305.00, 'card', 'completed', 1, '2026-01-10 14:30:00'),
(3, 'ORD-2026-002', 'delivered', 180.00, 20.00, 20.00, 22.40, 202.40, 'wallet', 'completed', 1, '2026-01-12 10:15:00'),
(4, 'ORD-2026-003', 'delivered', 420.00, 0.00, 0.00, 58.80, 478.80, 'cash_on_delivery', 'pending', 1, '2026-01-14 16:45:00'),
(5, 'ORD-2026-004', 'delivered', 310.00, 20.00, 30.00, 42.00, 342.00, 'card', 'completed', 1, '2026-01-16 09:20:00'),
(6, 'ORD-2026-005', 'delivered', 145.00, 20.00, 0.00, 20.30, 185.30, 'wallet', 'completed', 1, '2026-01-18 13:55:00');

-- Insert Order Items for Reviews
INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, price, subtotal) VALUES
-- Order 1
(1, 1001, 'Fresh Apples - Red Delicious', 'SKU-1001', 2, 25.00, 50.00),
(1, 2001, 'Fresh Whole Milk 1L', 'SKU-2001', 3, 22.00, 66.00),
(1, 3001, 'Fresh Chicken Breast 1kg', 'SKU-3001', 1, 85.00, 85.00),
-- Order 2
(2, 1009, 'Fresh Strawberries', 'SKU-1009', 2, 45.00, 90.00),
(2, 2003, 'Greek Yogurt 500g', 'SKU-2003', 1, 35.00, 35.00),
(2, 6001, 'Coca-Cola 1.5L', 'SKU-6001', 3, 18.00, 54.00),
-- Order 3
(3, 4001, 'Fresh Salmon Fillet 400g', 'SKU-4001', 2, 185.00, 370.00),
(3, 1006, 'Sweet Oranges', 'SKU-1006', 2, 20.00, 40.00),
-- Order 4
(4, 2005, 'Cheddar Cheese 250g', 'SKU-2005', 2, 55.00, 110.00),
(4, 3002, 'Whole Chicken 1.5kg', 'SKU-3002', 1, 120.00, 120.00),
(4, 7001, 'Potato Chips 150g', 'SKU-7001', 5, 18.00, 90.00),
-- Order 5
(5, 5003, 'Croissants 6 Pack', 'SKU-5003', 2, 35.00, 70.00),
(5, 6010, 'Black Coffee 200g', 'SKU-6010', 1, 55.00, 55.00);

-- Insert Product Reviews
INSERT INTO reviews (order_id, user_id, product_id, rating, comment, is_approved, created_at) VALUES
-- Positive reviews
(1, 2, 1001, 5, 'These apples are incredibly fresh and crispy! Perfect for snacking. Highly recommend!', TRUE, '2026-01-12 15:30:00'),
(1, 2, 2001, 5, 'Best milk I have bought from ElBaraka. Very fresh and creamy. Will order again!', TRUE, '2026-01-12 15:35:00'),
(1, 2, 3001, 4, 'Good quality chicken breast. Tender and lean. Slightly expensive but worth it.', TRUE, '2026-01-12 15:40:00'),
(2, 3, 1009, 5, 'Strawberries are sweet and fresh! My kids loved them. Great quality.', TRUE, '2026-01-14 11:20:00'),
(2, 3, 2003, 5, 'Thick and creamy Greek yogurt. Perfect for breakfast. Excellent product!', TRUE, '2026-01-14 11:25:00'),
(2, 3, 6001, 4, 'Delivered cold and fresh. Good price compared to other stores.', TRUE, '2026-01-14 11:30:00'),
(3, 4, 4001, 5, 'Premium quality salmon! Cooked perfectly. Will definitely buy again.', TRUE, '2026-01-16 17:10:00'),
(3, 4, 1006, 4, 'Oranges are juicy and sweet. A bit pricey but fresh quality.', TRUE, '2026-01-16 17:15:00'),
(4, 5, 2005, 5, 'Best cheddar cheese! Rich flavor and melts beautifully. Highly recommended!', TRUE, '2026-01-18 10:05:00'),
(4, 5, 3002, 4, 'Fresh whole chicken, well-cleaned. Good size and quality.', TRUE, '2026-01-18 10:10:00'),
(4, 5, 7001, 3, 'Chips are okay. A bit too salty for my taste but still crunchy.', TRUE, '2026-01-18 10:15:00'),
(5, 6, 5003, 5, 'Delicious buttery croissants! Taste like from a French bakery. Amazing!', TRUE, '2026-01-20 14:30:00'),
(5, 6, 6010, 5, 'Rich and aromatic coffee. Perfect morning brew. Will buy again!', TRUE, '2026-01-20 14:35:00'),
-- More variety reviews
(1, 2, 1001, 4, 'Good apples but some were a bit small. Still tasty though.', TRUE, '2026-01-13 09:15:00'),
(2, 3, 1009, 5, 'Absolutely love these strawberries! So fresh and perfect for desserts.', TRUE, '2026-01-15 16:45:00'),
(3, 4, 4001, 5, 'Salmon quality is top-notch. Very happy with my purchase.', TRUE, '2026-01-17 12:20:00'),
(4, 5, 2005, 4, 'Great cheese but wish it came in larger packs.', TRUE, '2026-01-19 08:50:00'),
(5, 6, 5003, 5, 'These croissants are the best! Flaky and delicious.', TRUE, '2026-01-21 07:30:00'),
-- Some average reviews
(1, 2, 2001, 3, 'Milk is good but expires too quickly. Otherwise fine.', TRUE, '2026-01-13 10:00:00'),
(2, 3, 6001, 3, 'Standard Coca-Cola. Nothing special but delivered on time.', TRUE, '2026-01-15 13:40:00'),
(4, 5, 7001, 2, 'Chips were a bit stale. Disappointed with freshness.', TRUE, '2026-01-19 09:30:00');

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

-- =====================================================
-- END OF DATABASE SCHEMA
-- =====================================================

-- Display summary information
SELECT 'Database schema created successfully!' as Status;
SELECT COUNT(*) as TableCount FROM information_schema.tables WHERE table_schema = 'elbaraka_db';
