# El Baraka Hypermarket - Complete System Documentation

## 📋 Project Overview

**Project Name:** El Baraka Hypermarket App  
**Version:** 2.0 (Enterprise Edition)  
**Last Updated:** February 2026  
**Developer:** Kareem Hesham  

This documentation covers the complete e-commerce platform including a React Native mobile app, React admin dashboard, and Laravel backend API. The system supports online grocery shopping with real-time notifications, payment processing, and delivery management.

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology | Location |
|-----------|------------|----------|
| **Mobile App** | React Native + Expo SDK 54 | `frontend/` |
| **Admin Dashboard** | React + TypeScript + Vite + TanStack Query | `admindash frontend/` |
| **Backend API** | Laravel 11 + PHP 8.4 | `unibackend/` |
| **Database** | MySQL 8.0 | Production server |
| **Push Notifications** | Expo Push + Firebase Cloud Messaging | Integrated |
| **Payment Gateway** | PayMob | Egypt |
| **Hosting** | Ubuntu + Nginx + PHP-FPM | `cartshop.site` |

### Server Configuration

- **Domain:** https://cartshop.site
- **Server IP:** 72.62.235.178
- **Web Server:** Nginx 1.18.0
- **PHP Version:** 8.4-fpm
- **SSL:** Let's Encrypt

---

## 📱 Mobile App Features

### Core Features

1. **User Authentication**
   - Email/Password registration with OTP verification
   - Social login (Google, Apple)
   - Password reset via email OTP
   - Session management (30-day sessions)

2. **Product Browsing**
   - Category-based navigation
   - Search with filters
   - Product details with images
   - Favorites/Wishlist
   - Price drop alerts
   - Back-in-stock notifications

3. **Shopping Cart**
   - Real-time cart updates
   - Cart abandonment tracking
   - Price change alerts
   - Minimum order validation
   - Free delivery threshold display

4. **Checkout Flow**
   - Address management (CRUD)
   - Multiple payment methods
   - PayMob integration (Cards, Wallets)
   - Cash on Delivery
   - Wallet payment
   - Promo code support
   - Order summary

5. **Order Management**
   - Order tracking
   - Order history
   - Reorder functionality
   - Order cancellation
   - Refund tracking

6. **Wallet System**
   - Balance display
   - Transaction history
   - Cashback tracking
   - Refund credits

7. **Support System**
   - Complaint submission
   - Chat with support
   - Ticket tracking
   - Smart bot assistance

### UI/UX Features

- **Green Brand Theme:** `#22C55E`
- **Animated Splash Screen:** Lottie animation with shopping cart
- **Arabic/English Support:** Full RTL support
- **Dark/Light Mode:** System-based
- **Pull-to-Refresh:** On all list screens
- **Haptic Feedback:** On interactions

---

## 🔔 Enterprise Notification System

### Notification Categories (70+ Types)

#### 1. Order & Delivery
- Order placed/confirmed/preparing
- Out for delivery/delivered
- Order cancelled/rejected
- Delivery delayed/failed
- Courier nearby
- Invoice ready

#### 2. Product & Inventory
- Back in stock (watchlist)
- Price drop alerts
- Low stock warning
- New product in category
- Product discontinued

#### 3. Offers & Promotions
- New promotion available
- Flash sale started/ending
- Coupon available/expiring
- Loyalty reward earned
- Personalized offers

#### 4. Cart & Checkout
- Cart abandonment reminders (1h, 24h, 72h)
- Price changed in cart
- Item removed (out of stock)
- Free delivery unlocked

#### 5. Chat & Support
- New support message
- Agent joined/left chat
- Complaint status update
- Chat escalated

#### 6. Account & Security
- New login detected
- Login from new device
- Password changed
- Suspicious activity
- Account verification

#### 7. Wallet & Payments
- Wallet credited/debited
- Cashback received/expiring
- Payment successful/failed
- Refund processed

#### 8. System & Updates
- App update available
- Terms/Policy updated
- Service maintenance
- Legal notices

### Notification Channels (Android)

| Channel | Priority | Purpose |
|---------|----------|---------|
| `orders` | HIGH | Order updates |
| `promotions` | MEDIUM | Marketing |
| `wallet` | HIGH | Financial |
| `support` | MEDIUM | Support |
| `account` | MAX | Security |
| `product` | MEDIUM | Alerts |
| `cart` | MEDIUM | Reminders |
| `system` | LOW | Updates |
| `smart` | LOW | AI recommendations |

### Background Processing Jobs

| Job | Schedule | Function |
|-----|----------|----------|
| `ProcessCartAbandonmentReminders` | Every 15 min | Send cart reminders |
| `ProcessFlashSaleNotifications` | Every 5 min | Flash sale alerts |
| `ProcessReorderReminders` | Daily 10 AM | Reorder suggestions |
| `ProcessProductWatchlistNotifications` | Every 30 min | Price/stock alerts |
| `ProcessCouponExpirationReminders` | Daily 9 AM | Coupon expiry alerts |

### Notification Preferences

Users can toggle 15 preference categories:
- Order Updates, Delivery Updates
- Promotions, Flash Sales, Price Drops
- Back in Stock, Cart Reminders
- Support Updates, Chat Messages
- Security Alerts, Wallet Updates
- Reorder Reminders, System Updates
- Marketing, Quiet Hours (with time picker)

---

## 🖥️ Admin Dashboard Features

### Dashboard Overview
- Total revenue with growth %
- Order count & trends
- Customer analytics
- Stock alerts
- Recent orders
- Quick actions

### Products Management
- Product CRUD operations
- Bulk import/export
- Image upload (multi-image)
- Stock management
- Price updates
- Sale settings

### Orders Management
- Order listing with filters
- Status management workflow
- Order details view
- Refund processing
- Invoice generation

### Store Settings (Fully Dynamic)
- Working hours configuration
- Temporary closure toggle
- Minimum order amount
- Delivery fee settings
- Free delivery threshold
- All stored in database with caching

### Reviews Management
- Reviews listing with pagination
- Status management (approve/reject)
- Admin responses
- Analytics dashboard with charts:
  - Rating distribution pie chart
  - Reviews by status bar chart
  - 30-day trend line chart
  - Top reviewed products

### Promotions
- Create/edit promotions
- Target categories/products
- Flash sales management
- Analytics & performance

### Promo Codes
- Code generation
- Usage limits
- Target users/products
- BOGO rules
- Analytics

### Support/Complaints
- Ticket management
- Chat interface
- Canned responses
- Smart bot integration
- Agent assignment

### Notifications Management
- Broadcast to all users
- Target specific users
- Notification templates (83 pre-built)
- Delivery tracking
- Analytics

### Users Management
- User listing
- Customer notes
- VIP status management
- Activity logs

---

## 🔧 Backend API Endpoints

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/resend-otp
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/logout
POST   /api/v1/auth/social-login
```

### User Profile
```
GET    /api/v1/user/profile
PUT    /api/v1/user/profile
PUT    /api/v1/user/change-password
GET    /api/v1/user/addresses
POST   /api/v1/user/addresses
PUT    /api/v1/user/addresses/{id}
DELETE /api/v1/user/addresses/{id}
```

### Products
```
GET    /api/v1/products
GET    /api/v1/products/{barcode}
GET    /api/v1/categories
GET    /api/v1/categories/{id}/products
```

### Cart
```
GET    /api/v1/cart
POST   /api/v1/cart/add
PUT    /api/v1/cart/update/{id}
DELETE /api/v1/cart/remove/{id}
DELETE /api/v1/cart/clear
```

### Orders
```
GET    /api/v1/orders
GET    /api/v1/orders/{id}
POST   /api/v1/orders
PUT    /api/v1/orders/{id}/cancel
POST   /api/v1/orders/{id}/reorder
```

### Notifications
```
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PUT    /api/v1/notifications/{id}/read
POST   /api/v1/notifications/read-all
DELETE /api/v1/notifications/{id}
POST   /api/v1/notifications/token
DELETE /api/v1/notifications/token
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
```

### Watchlist & Flash Sales
```
GET    /api/v1/watchlist
POST   /api/v1/watchlist
PUT    /api/v1/watchlist/{barcode}
DELETE /api/v1/watchlist/{barcode}
GET    /api/v1/flash-sales
GET    /api/v1/flash-sales/upcoming
```

### Admin Store Settings
```
GET    /api/v1/admin/store-settings
GET    /api/v1/admin/store-settings/status
PUT    /api/v1/admin/store-settings/working-hours
POST   /api/v1/admin/store-settings/toggle-closure
PUT    /api/v1/admin/store-settings/setting
PUT    /api/v1/admin/store-settings/settings
GET    /api/v1/admin/store-settings/delivery
PUT    /api/v1/admin/store-settings/delivery
POST   /api/v1/admin/store-settings/clear-cache
```

### Admin Reviews
```
GET    /api/v1/admin/reviews
GET    /api/v1/admin/reviews/analytics
GET    /api/v1/admin/reviews/{id}
PUT    /api/v1/admin/reviews/{id}/status
POST   /api/v1/admin/reviews/{id}/respond
DELETE /api/v1/admin/reviews/{id}
```

---

## 🗄️ Database Schema (New Tables)

### Enterprise Notification Tables

```sql
-- Product watchlist for back-in-stock and price alerts
CREATE TABLE product_watchlist (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    product_barcode VARCHAR(50),
    notify_price_drop BOOLEAN DEFAULT TRUE,
    notify_back_in_stock BOOLEAN DEFAULT TRUE,
    original_price DECIMAL(10,2),
    created_at TIMESTAMP
);

-- Cart abandonment tracking
CREATE TABLE cart_reminders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    cart_total DECIMAL(10,2),
    last_reminder_sent TIMESTAMP,
    reminder_count INT DEFAULT 0,
    items_snapshot JSON,
    created_at TIMESTAMP
);

-- 83 notification templates
CREATE TABLE notification_templates (
    id BIGINT PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    type VARCHAR(50),
    title_en VARCHAR(255),
    title_ar VARCHAR(255),
    body_en TEXT,
    body_ar TEXT,
    category VARCHAR(50),
    priority ENUM('max','high','medium','low'),
    channel VARCHAR(50),
    data_schema JSON,
    is_active BOOLEAN DEFAULT TRUE
);

-- Notification delivery analytics
CREATE TABLE notification_analytics (
    id BIGINT PRIMARY KEY,
    notification_id BIGINT,
    user_id BIGINT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    action_taken VARCHAR(100)
);

-- AI-based purchase pattern tracking
CREATE TABLE user_purchase_patterns (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    product_barcode VARCHAR(50),
    purchase_count INT DEFAULT 1,
    last_purchased_at TIMESTAMP,
    average_interval_days INT,
    next_predicted_purchase DATE
);

-- Security: Login history tracking
CREATE TABLE user_login_history (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20),
    device_name VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    is_new_device BOOLEAN DEFAULT FALSE,
    is_suspicious BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    logged_in_at TIMESTAMP
);

-- Flash sales management
CREATE TABLE flash_sales (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    discount_percentage INT,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notification_sent BOOLEAN DEFAULT FALSE
);

CREATE TABLE flash_sale_products (
    id BIGINT PRIMARY KEY,
    flash_sale_id BIGINT,
    product_barcode VARCHAR(50),
    flash_price DECIMAL(10,2)
);

-- Notification preferences per user
CREATE TABLE notification_preferences (
    id BIGINT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    order_updates BOOLEAN DEFAULT TRUE,
    delivery_updates BOOLEAN DEFAULT TRUE,
    promotions BOOLEAN DEFAULT TRUE,
    flash_sales BOOLEAN DEFAULT TRUE,
    price_drops BOOLEAN DEFAULT TRUE,
    back_in_stock BOOLEAN DEFAULT TRUE,
    cart_reminders BOOLEAN DEFAULT TRUE,
    support_updates BOOLEAN DEFAULT TRUE,
    chat_messages BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    wallet_updates BOOLEAN DEFAULT TRUE,
    payment_alerts BOOLEAN DEFAULT TRUE,
    reorder_reminders BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE,
    marketing BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME
);
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PHP 8.4+
- Composer
- MySQL 8.0+
- Expo CLI

### Local Development

**Backend:**
```bash
cd unibackend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
# Runs at http://localhost:8000
```

**Admin Dashboard:**
```bash
cd "admindash frontend"
npm install
npm run dev
# Runs at http://localhost:3000
```

**Mobile App:**
```bash
cd frontend
npm install
npx expo start
# Scan QR with Expo Go
```

### Running Background Jobs Locally

```bash
# Terminal 1 - Laravel Scheduler
php artisan schedule:work

# Terminal 2 - Queue Worker
php artisan queue:work
```

---

## 🚀 Deployment

### Server Deployment Commands

**Backend:**
```bash
ssh root@72.62.235.178
cd /var/www/elbaraka/cart/unibackend
git pull origin fullnotifysys
php artisan migrate --force
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan route:cache
sudo systemctl restart php8.4-fpm
```

**Admin Dashboard:**
```bash
cd /var/www/elbaraka/cart/admindash\ frontend
git pull origin fullnotifysys
npm install
npm run build
cp -r dist/* /var/www/elbaraka/cart/admindashboard_frontend/dist/
```

### Cron Job Setup (Required)

Add to server crontab for scheduled notifications:
```bash
* * * * * cd /var/www/elbaraka/cart/unibackend && php artisan schedule:run >> /dev/null 2>&1
```

### Mobile App Build

```bash
cd frontend
npx eas build --platform android --profile preview  # APK for testing
npx eas build --platform android --profile production  # AAB for Play Store
```

---

## 🔐 Security Features

1. **Authentication**
   - JWT tokens with 30-day expiry
   - OTP verification for registration/password reset
   - Rate limiting on auth endpoints
   - Session management

2. **Data Protection**
   - Input validation on all endpoints
   - SQL injection prevention (Eloquent ORM)
   - XSS protection (sanitized outputs)
   - CSRF tokens for web forms

3. **Payment Security**
   - PCI-compliant PayMob integration
   - Card tokenization (no raw card data stored)
   - Secure card storage with encryption
   - Transaction logging with audit trail

4. **Account Security**
   - Login history tracking
   - New device detection with notifications
   - Suspicious activity alerts
   - Password strength requirements

---

## 📊 Key Services

### EnterpriseNotificationService

Main service for all notification handling:

```php
// Order notifications
notifyOrderPlaced($userId, $orderId, $total)
notifyOrderConfirmed($userId, $orderId)
notifyOrderPreparing($userId, $orderId)
notifyOrderOutForDelivery($userId, $orderId, $estimatedTime)
notifyOrderDelivered($userId, $orderId)
notifyOrderCancelled($userId, $orderId, $reason)

// Product notifications
notifyProductBackInStock($userId, $productName, $barcode)
notifyProductPriceChanged($userId, $productName, $oldPrice, $newPrice, $barcode)

// Security notifications
notifyNewLogin($userId, $location, $device)
notifyNewDevice($userId, $deviceName, $location)
notifySuspiciousActivity($userId, $activityType)
notifyPasswordChanged($userId)

// Marketing notifications
notifyFlashSaleStarted($userId, $saleName, $discount)
notifyFlashSaleEnding($userId, $saleName, $minutesLeft)
notifyPromotionAvailable($userId, $promoTitle, $discount)

// Cart notifications
notifyCartAbandoned($userId, $cartTotal, $itemCount, $reminderType)

// Wallet notifications
notifyWalletCredited($userId, $amount, $reason)
notifyWalletDebited($userId, $amount, $reason)
notifyRefundProcessed($userId, $orderId, $amount)
```

### PushNotificationService

Handles actual push delivery via Expo:

```php
sendToUser($userId, $title, $body, $data)
sendToMultipleUsers($userIds, $title, $body, $data)
sendBroadcast($title, $body, $data)
```

---

## 📁 Project Structure

```
elbarakkaaaaa/
├── frontend/                      # React Native Mobile App
│   ├── app/                      # Expo Router pages
│   │   ├── (auth)/              # Auth screens
│   │   ├── (tabs)/              # Tab navigation
│   │   ├── orders/              # Order screens
│   │   └── profile/             # Profile screens
│   ├── components/               # Reusable components
│   │   ├── AnimatedSplash.tsx   # Lottie splash screen
│   │   └── Toast.tsx            # Toast notifications
│   ├── services/                 # API services
│   │   ├── notificationService.ts
│   │   └── backgroundNotificationTask.ts
│   ├── store/                    # Zustand store
│   ├── constants/                # Colors, styles
│   └── assets/                   # Images, animations
│
├── admindash frontend/            # React Admin Dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── reviews/         # Review management
│   │   │   ├── settings/        # Store settings
│   │   │   └── dashboard/       # Main dashboard
│   │   ├── components/          # UI components
│   │   ├── services/            # API services
│   │   └── lib/                 # Utilities
│   └── dist/                     # Production build
│
├── unibackend/                    # Laravel Backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Api/Admin/       # Admin controllers
│   │   │   │   ├── AdminStoreSettingsController.php
│   │   │   │   └── AdminReviewController.php
│   │   │   └── Api/             # Public controllers
│   │   ├── Models/              # Eloquent models
│   │   ├── Services/
│   │   │   ├── EnterpriseNotificationService.php
│   │   │   └── PushNotificationService.php
│   │   └── Jobs/                # Scheduled jobs
│   │       ├── ProcessCartAbandonmentReminders.php
│   │       ├── ProcessFlashSaleNotifications.php
│   │       ├── ProcessReorderReminders.php
│   │       ├── ProcessProductWatchlistNotifications.php
│   │       └── ProcessCouponExpirationReminders.php
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   │       └── NotificationTemplatesSeeder.php
│   └── routes/
│       └── api.php
│
└── Documentation/
    ├── his.md                    # This documentation
    ├── DEPLOYMENT_GUIDE.md
    ├── PAYMOB_INTEGRATION.md
    └── API_DOCUMENTATION.md
```

---

## ✅ Implementation Status

### Completed Features

- ✅ User authentication with OTP
- ✅ Product catalog with categories
- ✅ Shopping cart with persistence
- ✅ Checkout with multiple payment methods
- ✅ PayMob payment integration
- ✅ Wallet system with transactions
- ✅ Order management
- ✅ Push notification system (70+ types)
- ✅ Background job processing
- ✅ Admin dashboard with analytics
- ✅ Dynamic store settings
- ✅ Review management with charts
- ✅ Support/complaint system
- ✅ Promo codes with BOGO rules
- ✅ Green animated splash screen
- ✅ App icons configured

### In Progress

- 🔄 Push notification registration fix
- 🔄 Server deployment verification

---

## 📞 Support & Contact

**Developer:** Kareem Hesham  
**Email:** kareemhesham105@gmail.com  
**GitHub:** github.com/looelhawari/cart  
**Branch:** `fullnotifysys`

---

## 📜 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial release - basic e-commerce |
| 1.5 | Jan 2026 | PayMob integration, Wallet system |
| 2.0 | Feb 2026 | Enterprise notification system, Dynamic admin settings |

---

*Documentation generated: February 5, 2026*
