# 📋 Comprehensive Project Research Report — ElBaraka / CART

> **Generated:** Auto-research of all 15 root-level documentation & SQL files  
> **Project:** ElBaraka Hypermarket (branded "CART")  
> **Scope:** Complete codebase documentation audit

---

## Table of Contents

1. [Files Read — Complete Inventory](#1-files-read--complete-inventory)
2. [Detailed Summary of Each File](#2-detailed-summary-of-each-file)
3. [Overall Project Description, Goals & Architecture](#3-overall-project-description-goals--architecture)
4. [Database Schema from SQL Files](#4-database-schema-from-sql-files)
5. [API Documentation](#5-api-documentation)
6. [Payment System Details](#6-payment-system-details)
7. [Delivery System Details](#7-delivery-system-details)
8. [Instructions & Guidelines](#8-instructions--guidelines)
9. [Issues & Inconsistencies Between Documents](#9-issues--inconsistencies-between-documents)

---

## 1. Files Read — Complete Inventory

| # | File | Lines | Type | Status |
|---|------|-------|------|--------|
| 1 | `apis.md` | 2,290 | API Documentation | ✅ Fully Read |
| 2 | `pages.md` | 2,196 | UI/UX Page Specifications | ✅ Fully Read |
| 3 | `project-instructions.md` | 2,856 | Master Project Instructions | ✅ Fully Read |
| 4 | `TOKENIZATION_SYSTEM_A_TO_Z.md` | 1,749 | Payment/Tokenization System | ✅ Fully Read |
| 5 | `deep-research-report.md` | 377 | Paymob Code Review | ✅ Fully Read |
| 6 | `DELIVERY_SYSTEM_STATUS.md` | ~350 | Delivery System Spec | ✅ Fully Read |
| 7 | `layout.md` | ~400 | Mobile Design System | ✅ Fully Read |
| 8 | `LEAFLET_OSM_TESTING_GUIDE.md` | 805 | Map Testing Guide | ✅ Fully Read |
| 9 | `ORDER_CANCELLATION_REFUND_SYSTEM.md` | 481 | Cancellation/Refund Spec | ✅ Fully Read |
| 10 | `PAYMENT_IMPLEMENTATION_COMPLETE_REPORT.md` | 627 | Payment Fix Report | ✅ Fully Read |
| 11 | `PRODUCTION_BUILD_GUIDE.md` | ~100 | Build/Deploy Guide | ✅ Fully Read |
| 12 | `README.md` | 329 | Project Overview | ✅ Fully Read |
| 13 | `SOCIAL_LOGIN_AND_PROFILE_DOCUMENTATION.md` | 483 | Social Auth Spec | ✅ Fully Read |
| 14 | `elbaraka_server.sql` | 2,635 | Production DB Dump | ✅ Schema Captured (69 tables) |
| 15 | `elbaraka_unified.sql` | 7,429 | Dev/Unified DB Dump | ✅ Partially Read (same schema) |

**Supplementary file also noted:** `TOKENIZATION_SYSTEM_A_TO_Z.md.bak` (backup, not separately analyzed)

---

## 2. Detailed Summary of Each File

### 2.1 `apis.md` (2,290 lines)
The **definitive API reference** documenting **74 endpoints** (57 customer-facing + 17 admin). Every endpoint includes:
- HTTP method + route
- Authentication requirements (Bearer token / public)
- Complete request body (JSON) with field types and validations
- Full response JSON examples with realistic Egyptian grocery data
- Error response formats

**Endpoint groups:**
- **Auth (7):** Register, verify phone (OTP), login, refresh token, logout, forgot/reset password
- **Profile (4):** Get profile, update profile, upload avatar, change password
- **Addresses (5):** CRUD + set default address
- **Categories (2):** Hierarchical tree, subcategories with brands
- **Products (4):** List with 10+ filters, details, featured, suggestions
- **Cart (7):** Add/update/remove/clear + promo code apply/remove (guest+auth with merge)
- **Orders (7):** Checkout/create (with DB transaction), list, details, track, cancel, reorder, invoice PDF
- **Payments (3):** Paymob intent creation, webhook (HMAC SHA-512), COD
- **Favorites (3):** List, add, remove (toggle)
- **Reviews (2):** Get product reviews, submit review (purchase validation)
- **Complaints (5):** List tickets, create (multipart/form-data with attachments), get details, reply, close
- **Notifications (4):** Register/remove device token, list, mark read
- **Banners & Promotions (2):** List active banners, list promotions
- **Admin (17):** Categories CRUD with subcategories/reorder, Brands CRUD, Products CRUD with images, Orders status/refund, Promo codes CRUD with usage tracking, Banners CRUD, Complaints/tickets management

**Security Best Practices section** covers: token lifetime, rate limiting, cart merge rules, stock deduction in transactions, price locking, Cloudinary storage, input validation, CORS, password bcrypt cost 12.

---

### 2.2 `pages.md` (2,196 lines)
The **complete page-by-page specification** for every screen in the mobile app and admin dashboard.

**Customer Mobile App:**
- **Auth Flow:** Splash → Onboarding (3 slides) → Welcome → Login → Register → Forgot Password → OTP Verification
- **5-Tab Navigation:** Home, Browse (categories), Cart, Orders, Profile
- **Home Screen:** Location selector, search bar, banner carousel, category icons (horizontal), flash deals timer, featured products, best sellers
- **Product Detail:** Image gallery, price/discount, quantity selector, add-to-cart, reviews section, related products
- **Cart & Checkout:** 4-step flow — Address selection → Delivery time slot → Payment method → Order review & confirm
- **Orders:** List with status tabs (active/completed/cancelled), detailed order view with timeline, live tracking with map
- **Profile:** 12 sub-screens (edit profile, change password, addresses, payment methods, wallet, wishlist, order history, complaints, settings, about, language, notifications preferences)

**Admin Dashboard (9 major sections):**
1. **Login** with optional 2FA
2. **Dashboard** — 4 KPI stat cards, revenue/orders charts, quick stats, recent activities, system alerts
3. **Product Management** — Products list (search/filter/bulk actions/table), Add/Edit product (8 tabs: basic info, pricing, media, inventory, SEO, attributes, categories, related), Bulk import CSV, Categories tree management, Brands CRUD, Inventory management
4. **Order Management** — Orders list (filterable/sortable), Order details (status management, customer info, delivery info, payment, items, notes, timeline, actions), Refunds page
5. **Customer Management** — Customers list, Customer details with 8 tabs (overview, orders, addresses, wallet, reviews, complaints, notes, activity)
6. **Promotions & Marketing** — Promo codes CRUD (8 types including BOGO, min purchase, free shipping, flash sale), Banners management, Push notifications (send form with targeting/scheduling, history)
7. **Complaints & Support** — Dashboard (metrics + charts), Complaints list, Complaint details (chat interface, canned responses, timeline, actions, satisfaction rating)
8. **Reports & Analytics** — Reports dashboard, 5 report types (Sales, Inventory, Customer, Order, Complaints) each with charts, tables, export CSV
9. **Settings & Configuration** — General settings, Delivery settings (zones, fees, time slots), Payment settings (Paymob credentials, COD toggle), Notification settings

---

### 2.3 `project-instructions.md` (2,856 lines)
The **master project instruction document** — mandated as "must read and follow" for all agents. Contains:

- **Project Identity:** ElBaraka Hypermarket, mobile-first grocery e-commerce for Egypt, branded as "CART"
- **Tech Stack:** Laravel 11 + MySQL 8 + Redis (backend), React Native + Expo SDK 54 + Zustand (mobile), React + Vite + Leaflet.js (admin)
- **Development Guidelines:** Mobile-first design, strict emerald green (#16a34a) color palette, Poppins font mandatory, 8px grid spacing
- **Security Specifications:** Laravel Sanctum tokens (30min access, 30-day refresh), bcrypt cost 12, AES-256-CBC encryption, rate limiting (60 req/min auth, 30 req/min guest)
- **Performance:** Redis caching (TTL: categories 24h, products 1h, user data 30min), pagination 20 items/page default
- **8 Development Phases:**
  - Phase 1: Project Setup & Core Backend *(partially done)*
  - Phase 2: Authentication System *(partially done)*
  - Phase 3: Core Shopping Features *(mostly done — product detail, cart, checkout, orders checked)*
  - Phase 4: Additional Features *(partially done — favorites done, notifications/search pending)*
  - Phase 5: Admin Panel *(all pending)*
  - Phase 6: Testing *(all pending)*
  - Phase 7: Performance & Security Hardening *(all pending)*
  - Phase 8: Deployment *(all pending)*
- **Progress Summary:** 92% overall, UI 95%, API Integration 85%, Auth 0% (in project-instructions claim), Admin 0%
- **7-Phase Code Refactoring Plan** (Phase 1 in progress: target 0 TypeScript errors, >80% test coverage)
- **Complete UI/UX Design System:** Typography scale, color palette with semantic mapping, component library with exact React Native/NativeWind classes (buttons, cards, forms, bottom sheets, navigation), 8 mandatory "Signature Visual Elements" (floating orbs, skeleton loading, rounded-3xl corners, shadow+border combination, green prices, orange for promos only, bottom sheets for actions, active:scale-95 press feedback)
- **Accessibility:** WCAG 2.1 AA compliance, 48×48dp touch targets, screen reader support
- **Multilingual/RTL:** Full Arabic/English support, dynamic RTL layout switching
- **Agent Update Log:** Extensive changelog from Jan 25–27, 2026 documenting all modifications (complaints/favorites APIs, promo code engine upgrade, offers tab, code quality improvements)

---

### 2.4 `TOKENIZATION_SYSTEM_A_TO_Z.md` (1,749 lines)
The **exhaustive payment tokenization reference** — described as the "single source of truth" for the entire payment pipeline.

- **4 Payment Flows:**
  - Flow A: Unified Checkout / 3DS (new cards, high-value, recent failures, new users)
  - Flow B: MOTO one-click (saved cards, low-risk, <5000 EGP)
  - Flow C: MOTO→3DS Fallback (when MOTO is declined, auto-retry with 3DS)
  - Flow D: COD (Cash on Delivery) — no Paymob involvement
- **Decision Engine:** `PaymentDecisionService` with 8 rules (new user → 3DS, amount >5000 → 3DS, recent failures → 3DS, no saved card → 3DS, MOTO disabled → 3DS, otherwise → MOTO)
- **Token Lifecycle:** Dual Webhook Bridge pattern — TOKEN callback writes to Redis cache, TRANSACTION callback pulls from cache; AES-256-CBC encrypted storage; SHA-256 fingerprint deduplication; soft-delete with restore capability
- **State Machine:** PENDING → PAID | FAILED; PAID → REFUNDED
- **Polling:** READ-ONLY status checks, 2s interval, max 30 attempts, no side effects
- **PaymentConfirmationService:** 5-step `confirmPayment()` — validate HMAC → match amounts → update payment record → process order → save token
- **32 Test Scenarios:** Covering new card flow, save card, MOTO success, MOTO→3DS fallback, MOTO failure, high-value 3DS, recent failures 3DS, new user 3DS, duplicate webhook idempotency, HMAC failure rejection, amount/currency mismatch, token cache bridge, token save failure (graceful), duplicate card dedup, soft-delete restore, APP_KEY rotation, is_capture quirk, COD, app crash recovery, wallet, WebView URL interception, polling timeout, set default card, delete card reassignment, expired card, pre-check, concurrent webhooks, auth-not-captured, MOTO disabled, classic iframe fallback, direct saved card endpoint
- **Environment Configuration:** All `.env` variables documented (`PAYMOB_API_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, integration IDs, iFrame ID, HMAC secret)
- **Integration IDs:** Card/3DS: 5084814, MOTO: 5511054, Wallet: 5084831, iFrame: 919973
- **Troubleshooting:** 5 common issues with step-by-step solutions
- **Glossary:** 30+ payment terms defined
- **Appendices:** Paymob API endpoints, integration IDs table, environment-specific behavior

---

### 2.5 `deep-research-report.md` (377 lines)
A **critical code review** of the Paymob tokenization implementation, identifying **production-level bugs:**

- **Fatal parse error** in `PaymentMethod.php` (misplaced brace)
- **Signature mismatch** in `PaymobPayment.php` (wrong argument count in `processPaymobCallback`)
- **DB transaction misuse** (transaction wraps only part of the logic)
- **Missing auth checks** on sensitive endpoints
- **Incorrect property usage** (`$this->paymobPaymentId` used where it doesn't exist)
- **Recommended canonical architecture** with Mermaid flowcharts showing the correct flow
- **Prioritized fix list:** P0 (fatal errors), P1 (security), P2 (logic improvements)

---

### 2.6 `DELIVERY_SYSTEM_STATUS.md` (~350 lines)
Documents the **3-layer delivery system architecture:**

- **Backend (Laravel):** Delivery zones CRUD (polygon-based), 19 driver API routes, auto-assignment algorithm, GPS tracking endpoints, FCM push notifications, order lifecycle (pending → preparing → ready → out_for_delivery → delivered)
- **Admin Dashboard (React + Leaflet):** Zone management with polygon drawing on map, drivers CRUD, live driver locations (10s refresh), delivery performance stats
- **Customer Mobile App:** Live order tracking (map with driver marker, ETA, status timeline), delivery status notifications
- **Driver Mobile App:** 3 main screens (orders list, active delivery with navigation, delivery confirmation)
- **Remaining Nice-to-Haves:** WebSocket for real-time updates, standalone driver APK build, admin live tracking map, customer ratings for drivers

---

### 2.7 `layout.md` (~400 lines)
The **official mobile design system** — self-described as "SINGLE SOURCE OF TRUTH for every pixel."

- **Colors:** Primary emerald `#16a34a` (with shades 50–900), neutrals (slate), accents (orange `#f97316` for promos only, yellow for ratings, red for errors, lime for badges)
- **Typography:** Poppins font mandatory (h1: 34–40px bold → body: 16px regular → price: 30–34px bold), Arabic fallback: system default
- **Components:** Exact React Native / NativeWind class specifications for every component (primary/secondary/outline buttons, product cards, category cards, input fields, search bar, bottom sheets, tab bar)
- **Grid System:** 8px base grid, `px-6` page padding, card gap `gap-4`
- **Touch Targets:** Minimum 48×48dp per Material Design guidelines
- **RTL Support:** Full `I18nManager.forceRTL()`, `writingDirection: 'rtl'`, flex-row-reverse

---

### 2.8 `LEAFLET_OSM_TESTING_GUIDE.md` (805 lines)
A **comprehensive testing guide** for the migration from paid map services (Google Maps/Mapbox) to free alternatives (Leaflet.js + OpenStreetMap + Nominatim):

- **31 Test Scenarios** organized by:
  - Admin Dashboard (zone management, polygon drawing, driver locations, address search)
  - Customer Mobile App (address selection, order tracking, delivery map)
  - Backend API (geocoding, zone containment checks, coordinate validation)
- **Success Criteria:** Zero API keys required, all CRUD operations work, total cost = $0/month
- **Known Limitations:** Nominatim 1 req/sec rate limit, OSM tiles less detailed than Google in Egypt

---

### 2.9 `ORDER_CANCELLATION_REFUND_SYSTEM.md` (481 lines)
The **complete specification for order cancellation and refund logic:**

- **Decision Matrix:**
  - Card payment + status before preparing: Full refund
  - Card payment + status during preparing: 86% refund (14% penalty)
  - Card payment + status after shipped: No cancellation allowed
  - COD: Cancel + restock, no refund processing needed
- **Flow:** Refund-first-then-cancel pattern (refund must succeed before order status changes)
- **Concurrency:** Pessimistic locking (`SELECT ... FOR UPDATE`) to prevent double-refund
- **Database:** `order_refunds` table with amount, reason, transaction_id, status
- **Configuration:** `config/refund.php` with configurable penalty percentage (default 14%)
- **Audit Trail:** Every refund action logged to `admin_logs`

---

### 2.10 `PAYMENT_IMPLEMENTATION_COMPLETE_REPORT.md` (627 lines)
A **post-mortem report** documenting **23+ fixes across 14 files:**

- **8 Security Fixes:** HMAC validation, auth middleware, input sanitization, amount verification, idempotency keys, rate limiting on payment endpoints, token encryption
- **11 Bug Fixes:** Webhook processing, payment status updates, polling mechanism, error handling, database transaction integrity, payment recovery flow
- **Database Migration:** Added `user_id` and `special_reference` columns to `paymob_payments` table
- **Frontend Fixes:** Polling interval correction, payment recovery screen, TypeScript type definitions
- **Testing:** Updated test scenarios and webhook simulation scripts

---

### 2.11 `PRODUCTION_BUILD_GUIDE.md` (~100 lines)
Short **build & deployment instructions:**

- Production API URL: `https://cartshop.site/api/v1`
- Android build command: `eas build --platform android --profile production`
- Package name: `com.elbaraka.hypermarket`
- Test credentials: `admin@elbaraka.com` / `admin123456`
- Environment variable configuration

---

### 2.12 `README.md` (329 lines)
**Project overview document:**

- Feature highlights (multilingual, real-time tracking, Paymob payments, promo engine)
- Technology stack summary
- Prerequisites (Node.js 18+, PHP 8.2+, MySQL 8.0+, Composer, Redis)
- Setup instructions for backend (`composer install`, `php artisan migrate:fresh --seed`), frontend (`npx expo start`), and admin dashboard (`npm run dev`)
- Environment variable templates

---

### 2.13 `SOCIAL_LOGIN_AND_PROFILE_DOCUMENTATION.md` (483 lines)
Documents the **Google social login integration:**

- **Google Login Flow:** OAuth2 → ID token → backend verification → create/link account → issue Sanctum token
- **Google Web Client ID:** `1011283400029-jkh5hbp3qhmsclcq1rg22q6v7dku8ip9.apps.googleusercontent.com`
- **SocialAuthController:** 4 cases — new user registration, existing user login, link Google to existing account, account conflict resolution
- **Email Change Flow:** 3-step process — request change → verify OTP → update email
- **Token Management:** Revoke old tokens on social login, single active token policy
- **Security:** Google ID token server-side verification, no client-side trust

---

### 2.14 `elbaraka_server.sql` (2,635 lines)
**Production MySQL 8.0 database dump** (`elbaraka_db`) containing:

- **69 CREATE TABLE statements** (full schema)
- **Real production seed data** including 173 Egyptian grocery categories with Arabic/English names
- Key tables detailed in Section 4 below
- Foreign key relationships and indexes

---

### 2.15 `elbaraka_unified.sql` (7,429 lines)
**Development/unified MySQL 8.4.3 database dump** (`elbaraka-market`) from phpMyAdmin:

- Same schema structure as `elbaraka_server.sql`
- Contains extensive test/seed data with realistic user activity logs
- Extended address schema (includes `recipient_name`, `phone`, `building`, `floor`, `apartment`)
- Comprehensive `admin_logs` with old/new value tracking

---

## 3. Overall Project Description, Goals & Architecture

### 3.1 Project Identity
**ElBaraka Hypermarket** is a mobile-first e-commerce platform for an Egyptian grocery and household goods store. The consumer-facing app is branded as **"CART"** (`app.json` name). The system serves an existing physical hypermarket looking to expand into online ordering with home delivery.

### 3.2 Goals
1. **Complete online grocery shopping** — browse categories, search products, add to cart, checkout with multiple payment options
2. **Real-time delivery tracking** — GPS-based driver tracking with live map, ETA, and status updates
3. **Secure payments** — Paymob integration (Egypt's leading payment gateway) with card tokenization, MOTO one-click, 3DS, wallet, and COD
4. **Multilingual support** — Full Arabic and English with RTL layout switching
5. **Comprehensive admin management** — Dashboard for products, orders, customers, promotions, complaints, analytics
6. **Driver management** — Dedicated driver app for accepting and fulfilling deliveries
7. **Customer engagement** — Push notifications, promo codes (8 types including BOGO), favorites, reviews, complaints with chatbot support

### 3.3 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTS                                │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Customer App│  │ Driver App  │  │ Admin Dashboard      │  │
│  │ React Native│  │ React Native│  │ React + Vite         │  │
│  │ Expo SDK 54 │  │ Expo Router │  │ Leaflet.js + OSM     │  │
│  │ Zustand     │  │             │  │ Tailwind CSS         │  │
│  │ TypeScript  │  │ TypeScript  │  │ TypeScript           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                │                     │              │
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Laravel 11)                        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Sanctum  │ │ REST API │ │ Webhook │ │ Cloudinary       │  │
│  │ Auth     │ │ v1       │ │ Handler │ │ Image Storage    │  │
│  └──────────┘ └──────────┘ └─────────┘ └──────────────────┘  │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Paymob   │ │ FCM Push │ │ Redis   │ │ Spatie Activity  │  │
│  │ Payment  │ │ Notifs   │ │ Cache   │ │ Logging          │  │
│  └──────────┘ └──────────┘ └─────────┘ └──────────────────┘  │
│                                                               │
│  Production: https://cartshop.site/api/v1                     │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ MySQL 8  │ │ Redis    │ │ Pusher   │
    │ 69 tables│ │ Cache    │ │ Realtime │
    └──────────┘ └──────────┘ └──────────┘
```

### 3.4 Key Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Maps | Leaflet.js + OpenStreetMap | $0/month vs Google Maps paid API |
| Payment | Paymob (Egypt) | Only viable payment gateway for Egypt |
| State | Zustand (not Redux) | Simpler, less boilerplate for mobile |
| Navigation | Expo Router (file-based) | Convention over configuration |
| Auth | Laravel Sanctum tokens | SPA + mobile support, simpler than Passport |
| Images | Cloudinary | CDN + transformations, no local storage |
| Styling | NativeWind (Tailwind for RN) | Consistent with admin dashboard Tailwind |
| Geocoding | Nominatim (OSM) | Free, no API key required |

### 3.5 Development Status
- **Overall: ~92%** (as reported in project-instructions)
- UI implementation: 95%
- API integration: 85%
- Authentication: Partially done (social login exists despite "0%" claim)
- Admin panel: Not started
- Testing: Not started
- Deployment: Not started (but production URL exists and DB has data)

---

## 4. Database Schema from SQL Files

### 4.1 Complete Table Inventory (69 Tables)

The database was confirmed to contain **69 tables** via `CREATE TABLE` enumeration in `elbaraka_server.sql`:

#### Authentication & Users (8 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Main user table | id, name, email, phone, password, google_id, avatar, role (customer/admin/driver), email_verified_at, wallet_balance |
| `pending_registrations` | Pre-verified registrations | phone, otp, data (JSON), expires_at |
| `otps` | One-time passwords | phone, otp, type (register/reset/verify), expires_at, attempts |
| `password_reset_tokens` | Password reset | email, token, created_at |
| `personal_access_tokens` | Sanctum tokens | tokenable_type, tokenable_id, name, token, abilities, last_used_at |
| `sessions` | Active sessions | id, user_id, ip_address, user_agent, payload, last_activity |
| `user_login_history` | Login audit trail | user_id, ip, user_agent, device_type, login_at, location |
| `user_settings` | Per-user preferences | user_id, setting_key, setting_value |

#### Products & Categories (6 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `products` | Product catalog | **barcode** (unique identifier), name_en, name_ar, description_en, description_ar, price, discount_price, stock_quantity, unit, brand, weight, image, is_featured, is_active, category_id, views_count, avg_rating |
| `categories` | Hierarchical categories | id, name_en, name_ar, slug, description_en, description_ar, image, icon, parent_id (self-reference), sort_order, is_active — **173 records of real Egyptian grocery data** |
| `product_categories` | Product↔Category pivot | product_id, category_id |
| `product_watchlist` | Price watch alerts | user_id, product_id, target_price, notified |
| `favorites` | User wishlists | user_id, product_id |
| `reviews` | Product reviews | user_id, product_id, rating (1-5), comment, is_approved |

#### Shopping Cart (3 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `carts` | Cart headers | user_id (nullable), session_id (for guests), promo_code_id, merged_at — **supports guest→auth cart merge** |
| `cart_items` | Cart line items | cart_id, **product_id** (⚠️ references `products.barcode`, not `products.id`), quantity, unit_price, options (JSON) |
| `cart_reminders` | Abandoned cart recovery | cart_id, reminder_stage (1/2/3), reminded_at, converted_at — **3-stage abandoned cart email sequence** |

#### Orders & Fulfillment (4 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `orders` | Order headers | user_id, order_number, status (pending/confirmed/preparing/ready/out_for_delivery/delivered/cancelled), subtotal, discount, delivery_fee, tax, total, payment_method, payment_status, delivery_address (JSON), delivery_time_slot, notes, driver_id, delivered_at, cancelled_at, cancellation_reason |
| `order_items` | Order line items | order_id, product_id, product_name, quantity, unit_price, total_price, options (JSON) — **denormalized product name for historical accuracy** |
| `order_status_history` | Status timeline | order_id, status, changed_by, notes, created_at |
| `refund_locks` | Pessimistic locking | order_id, locked_at, lock_token — **prevents double-refund race conditions** |

#### Payments (3 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `paymob_payments` | Paymob transactions | order_id, user_id, paymob_order_id, transaction_id, amount_cents, currency (EGP), status, payment_method_type, special_reference, hmac_validated, webhook_payload (JSON), response_data (JSON) |
| `payment_methods` | Saved card tokens | user_id, card_type (visa/mastercard), last_four, masked_pan, **encrypted_token** (AES-256-CBC), token_fingerprint (SHA-256), expiry_month, expiry_year, is_default, is_active, paymob_token, deleted_at (soft-delete) |
| `payment_transactions` | Transaction log | order_id, type (payment/refund), gateway, amount, status, gateway_reference, metadata (JSON) |

#### Delivery System (2 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `delivery_zones` | Delivery coverage areas | name, coordinates (JSON polygon), delivery_fee, min_order, estimated_time, is_active |
| `addresses` | User addresses | user_id, label (home/work/other), address_line_1, address_line_2, city, area, postal_code, latitude, longitude, is_default, recipient_name, phone, building, floor, apartment, landmark, notes |

#### Promotions System (7 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `promo_codes` | Promo code definitions | code, type (percentage/fixed/free_shipping/bogo/min_purchase/flash_sale/category/brand), value, min_order_amount, max_discount, usage_limit, per_user_limit, starts_at, expires_at, is_active |
| `promo_code_usage` | Usage tracking | promo_code_id, user_id, order_id, discount_amount |
| `promo_code_bogo_rules` | Buy-one-get-one rules | promo_code_id, buy_product_id, buy_quantity, get_product_id, get_quantity, get_discount_percentage |
| `promo_code_categories` | Category-specific promos | promo_code_id, category_id |
| `promo_code_products` | Product-specific promos | promo_code_id, product_id |
| `promotions` | Display promotions | title_en, title_ar, description, image, type, discount_value, starts_at, ends_at, is_active |
| `promotion_categories` / `promotion_products` | Promotion targeting pivots | promotion_id, category_id / product_id |

#### Flash Sales (2 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `flash_sales` | Time-limited sales events | name, starts_at, ends_at, is_active, discount_type, discount_value |
| `flash_sale_products` | Products in flash sales | flash_sale_id, product_id, sale_price, stock_limit, sold_count |

#### Complaints & Support (7 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `complaints` | Complaint tickets | user_id, order_id, subject, type, priority, status, assigned_to, bot_handled, bot_confidence, escalated_at, resolved_at, satisfaction_rating |
| `complaint_messages` | Ticket messages | complaint_id, sender_type (user/admin/bot), message, is_bot_reply |
| `complaint_attachments` | File attachments | complaint_id / message_id, file_path, file_type, file_size |
| `canned_responses` | Pre-written replies | title, message, category, is_active, usage_count |
| `support_tickets` | Legacy support tickets | user_id, subject, status, priority |
| `ticket_messages` | Legacy ticket messages | ticket_id, sender_type, message |
| `customer_notes` | Admin notes on customers | user_id, admin_id, note |

#### Bot System (2 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `bot_conversation_contexts` | Chatbot state | user_id, complaint_id, context (JSON), last_intent, confidence_score, turn_count |
| `bot_responses` | Bot response templates | intent, response_template, confidence_threshold, is_active |

#### Notifications (6 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `notifications` | Laravel notifications | id (UUID), type, notifiable_type, notifiable_id, data (JSON), read_at |
| `device_tokens` | FCM push tokens | user_id, token, device_type (android/ios/web), is_active |
| `notification_templates` | Notification templates | name, title_en, title_ar, body_en, body_ar, type, variables (JSON) |
| `notification_preferences` | User preferences | user_id, channel (push/email/sms), type, is_enabled |
| `notification_analytics` | Delivery analytics | notification_id, sent_count, delivered_count, opened_count, clicked_count |
| `notification_deliveries` / `notification_reads` | Delivery/read tracking | notification_id, user_id, delivered_at / read_at |

#### Wallet System (2 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_wallets` | Wallet balances | user_id, balance, currency (EGP) |
| `wallet_transactions` | Wallet transaction log | wallet_id, type (credit/debit), amount, description, reference_type, reference_id |

#### Analytics & Logging (5 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `activity_log` | Spatie activity log | log_name, description, subject_type, subject_id, causer_type, causer_id, properties (JSON) |
| `activity_logs` | Custom activity log | user_id, action, entity_type, entity_id, ip_address, user_agent, metadata (JSON) |
| `admin_logs` | Admin audit trail | admin_id, action, module, entity_type, entity_id, old_values, new_values, changes (JSON), ip_address, response_status |
| `rating_logs` | Rating change history | product_id, old_rating, new_rating, review_id |
| `user_purchase_patterns` | Purchase analytics | user_id, total_orders, total_spent, avg_order_value, favorite_category, last_order_at |

#### System & Configuration (5 tables)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `settings` | Global key-value settings | key, value, group |
| `store_settings` | Store configuration | key, value, type (text/number/boolean/json) |
| `static_pages` | CMS pages | slug, title_en, title_ar, content_en, content_ar, is_active |
| `system_announcements` | Admin announcements | title, message, type (info/warning/critical), starts_at, ends_at, is_active |
| `migrations` | Laravel migration tracking | migration, batch |

#### Infrastructure (4 tables)
| Table | Purpose |
|-------|---------|
| `cache` | Laravel cache store |
| `cache_locks` | Atomic cache locks |
| `jobs` | Laravel queue jobs |
| `job_batches` | Laravel batch jobs |
| `failed_jobs` | Failed queue jobs |

### 4.2 Key Relationships & Design Notes

```
users ─┬── addresses (1:N)
       ├── orders (1:N) ──── order_items (1:N)
       │                └─── order_status_history (1:N)
       ├── carts (1:1 active) ── cart_items (1:N)
       ├── payment_methods (1:N, soft-delete)
       ├── favorites (N:M with products)
       ├── reviews (1:N)
       ├── complaints (1:N) ── complaint_messages (1:N)
       ├── device_tokens (1:N)
       ├── user_wallets (1:1)
       └── notification_preferences (1:N)

products ── identified by BARCODE (not auto-increment ID)
         ├── product_categories (N:M with categories)
         ├── cart_items.product_id → products.barcode
         └── order_items (denormalized snapshot)

categories ── self-referencing (parent_id → categories.id)
           └── 173 records of real Egyptian grocery data

promo_codes ── 8 types with supporting pivot tables
            ├── promo_code_bogo_rules (BOGO config)
            ├── promo_code_categories (category targeting)
            ├── promo_code_products (product targeting)
            └── promo_code_usage (tracking)
```

**Critical Design Decision:** `cart_items.product_id` references `products.barcode` (VARCHAR), NOT `products.id` (INT). This is intentional — products are identified by their physical barcode throughout the system.

---

## 5. API Documentation

### 5.1 Endpoint Summary

| Domain | Count | Auth Required | Notes |
|--------|-------|---------------|-------|
| Authentication | 7 | Mixed | Register/login public, others auth |
| Profile | 4 | Yes | Bearer token |
| Addresses | 5 | Yes | CRUD + set default |
| Categories | 2 | No | Public catalog browsing |
| Products | 4 | No | Public with optional auth for personalization |
| Cart | 7 | Mixed | Guest (session) + Auth (merge on login) |
| Orders | 7 | Yes | Including checkout with DB transaction |
| Payments | 3 | Mixed | Webhook is public (HMAC-verified) |
| Favorites | 3 | Yes | Toggle pattern |
| Reviews | 2 | Mixed | GET public, POST requires purchase proof |
| Complaints | 5 | Yes | Multipart upload support |
| Notifications | 4 | Yes | Device token management |
| Banners & Promos | 2 | No | Public display |
| **Admin APIs** | **17** | **Yes (admin role)** | **Full CRUD for all entities** |
| **TOTAL** | **74** | | |

### 5.2 Base URL & Versioning
- **Production:** `https://cartshop.site/api/v1`
- **Versioning:** URI-based (`/api/v1/...`)
- **Response format:** JSON with consistent `{ status, message, data }` envelope

### 5.3 Authentication Scheme
```
Authorization: Bearer <sanctum_token>
```
- **Access token:** Short-lived (reported as 30min in apis.md)
- **Refresh token:** 30-day lifetime
- **Rate limits:** 60 req/min (authenticated), 30 req/min (guest)

### 5.4 Critical API Flows

**Cart Merge (Mandatory on Login):**
1. Guest adds items using `session_id`
2. On login, `POST /auth/login` returns user token
3. System automatically merges guest cart → user cart
4. Conflicts resolved: user's existing quantity wins if higher

**Order Creation (DB Transaction):**
1. `POST /orders/checkout` validates stock, locks prices
2. Inside single MySQL transaction:
   - Create order record
   - Create order items (snapshot prices)
   - Deduct stock quantities
   - Apply promo code (if any)
   - Clear cart
3. If any step fails → full rollback

**Webhook Processing:**
1. Paymob sends POST to `/api/v1/payments/webhook`
2. Server validates HMAC-SHA512 signature
3. Matches `special_reference` to find order
4. Verifies amount_cents matches order total
5. Updates payment status → triggers order confirmation

### 5.5 Admin API Capabilities
| Resource | Operations | Special Features |
|----------|-----------|------------------|
| Categories | CRUD + reorder | Hierarchical with subcategories, drag-and-drop reorder |
| Brands | CRUD | Logo upload |
| Products | CRUD + images | Multi-image upload, bulk operations |
| Orders | List + status + refund | Status change triggers notifications, refund with penalty |
| Promo Codes | CRUD + usage | 8 promo types, usage analytics |
| Banners | CRUD | Image upload, scheduling |
| Complaints | List + manage | Assignment, status change, canned responses |

---

## 6. Payment System Details

### 6.1 Overview
The payment system integrates with **Paymob** (Egypt's leading payment gateway at `accept.paymob.com`) and supports **4 distinct payment flows** plus COD.

### 6.2 Payment Flows

#### Flow A — Unified Checkout / 3DS (New Cards & High-Risk)
```
Customer → Select "Pay with Card" → Frontend creates payment intent →
Backend calls Paymob API → Returns checkout URL → Customer enters card →
3DS verification → Paymob webhook → Backend confirms → Order paid
```
**Triggered when:** New user, no saved cards, amount >5000 EGP, recent payment failures, MOTO disabled

#### Flow B — MOTO One-Click (Saved Cards, Low-Risk)
```
Customer → Select saved card → Frontend sends token →
Backend calls Paymob MOTO API → Immediate response → Order paid
```
**Triggered when:** Has saved card, amount ≤5000 EGP, no recent failures, MOTO enabled

#### Flow C — MOTO→3DS Fallback
```
Customer → Select saved card → Backend attempts MOTO →
MOTO declined → Auto-redirect to 3DS checkout → Standard 3DS flow
```
**Triggered when:** MOTO attempt receives decline response

#### Flow D — Cash on Delivery (COD)
```
Customer → Select "Cash on Delivery" → Backend creates order →
Status = pending → Delivered → Driver collects cash → Status = paid
```
**No Paymob involvement.** Order amount limits may apply.

### 6.3 Decision Engine — `PaymentDecisionService`
8 rules evaluated in order:
1. New user (no previous orders) → **3DS**
2. Amount > 5000 EGP → **3DS**
3. Recent payment failure (last 24h) → **3DS**
4. No saved card available → **3DS**
5. Saved card expired → **3DS**
6. MOTO integration disabled → **3DS**
7. Has valid saved card + low risk → **MOTO**
8. Default fallback → **3DS**

### 6.4 Token Lifecycle & Security

**Dual Webhook Bridge Pattern:**
```
TOKEN Callback (from Paymob) → Redis Cache (key: paymob_token:{order_id}, TTL: 5min)
                                     ↑
TRANSACTION Callback → Pulls token from Redis → Encrypts → Saves to payment_methods
```

**Encryption:**
- **Storage:** AES-256-CBC using Laravel's `APP_KEY`
- **Deduplication:** SHA-256 fingerprint of raw token → prevents duplicate cards
- **Soft-delete:** Cards are soft-deleted, can be restored
- **Default reassignment:** Deleting default card auto-assigns another as default

### 6.5 Webhook Security
```php
// HMAC-SHA512 Verification
$calculatedHmac = hash_hmac('sha512', $dataString, $hmacSecret);
if (!hash_equals($calculatedHmac, $receivedHmac)) {
    return response()->json(['error' => 'Invalid HMAC'], 403);
}
```
- **Idempotency:** Duplicate webhooks detected by `transaction_id`
- **Amount verification:** `webhook.amount_cents` must match `order.total * 100`
- **Currency verification:** Must be `EGP`

### 6.6 Paymob Integration IDs
| Integration | ID | Purpose |
|------------|-----|---------|
| Card / 3DS | 5084814 | Standard card payments with 3D Secure |
| MOTO | 5511054 | Mail Order / Telephone Order (one-click) |
| Wallet | 5084831 | Mobile wallet payments |
| iFrame | 919973 | Embedded checkout iframe |

### 6.7 Refund System
- **Full refund:** Before "preparing" status
- **Partial refund (86%):** During "preparing" status (14% penalty, configurable)
- **No refund:** After "shipped" / "out_for_delivery"
- **COD:** Cancel + restock only, no financial refund
- **Concurrency:** Pessimistic locking prevents double-refund
- **Flow:** Refund processed first → only then order status changes to cancelled

### 6.8 State Machine
```
PENDING ──→ PAID ──→ REFUNDED
   │
   └──→ FAILED
```

### 6.9 Known Production Bugs (from deep-research-report.md)
- ⚠️ Fatal parse error in `PaymentMethod.php` (misplaced brace)
- ⚠️ Signature mismatch in `PaymobPayment.php` (wrong argument count)
- ⚠️ DB transaction wraps only part of payment logic
- ⚠️ Missing auth checks on some payment endpoints
- ✅ 23 fixes applied (per PAYMENT_IMPLEMENTATION_COMPLETE_REPORT.md)

---

## 7. Delivery System Details

### 7.1 Architecture (3 Layers)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Customer App   │    │   Admin Panel    │    │   Driver App    │
│                 │    │                  │    │                 │
│ • Track order   │    │ • Manage zones   │    │ • View orders   │
│ • View ETA      │    │ • Manage drivers │    │ • Accept/reject │
│ • Status updates│    │ • Live map       │    │ • Navigate      │
│ • Rate driver   │    │ • Performance    │    │ • Confirm       │
└────────┬────────┘    └────────┬─────────┘    └────────┬────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Laravel Backend    │
                    │                      │
                    │ • 19 driver API routes│
                    │ • Zone polygon check │
                    │ • Auto-assignment    │
                    │ • GPS tracking       │
                    │ • FCM push notifs    │
                    │ • Order lifecycle    │
                    └──────────────────────┘
```

### 7.2 Delivery Zones
- **Polygon-based** geographic zones stored as JSON coordinate arrays
- Admin draws zones on Leaflet.js map with polygon drawing tool
- Each zone has: name, coordinates, delivery_fee, min_order, estimated_time
- Backend validates customer address is within an active delivery zone before checkout

### 7.3 Order Lifecycle
```
pending → confirmed → preparing → ready → out_for_delivery → delivered
                                                    ↑
                                              driver assigned
```
- Each transition logged in `order_status_history`
- FCM push notifications sent on each status change
- GPS coordinates updated during `out_for_delivery` phase

### 7.4 Driver Management
- **19 API routes** for driver operations
- **Auto-assignment algorithm** — considers: proximity, current load, availability
- **GPS tracking endpoints** — driver app sends location updates
- **FCM push notifications** — new order alerts, status reminders

### 7.5 Maps Technology
- **Leaflet.js + OpenStreetMap** (migrated from Google Maps)
- **Nominatim** for geocoding (address → coordinates)
- **Zero cost** — no API keys required
- **Limitation:** Nominatim rate limit of 1 request/second
- **31 test scenarios** documented in LEAFLET_OSM_TESTING_GUIDE.md

### 7.6 Remaining Work
- [ ] WebSocket real-time updates (currently polling)
- [ ] Standalone driver APK build
- [ ] Admin live tracking map
- [ ] Customer-to-driver ratings
- [ ] Route optimization

---

## 8. Instructions & Guidelines

### 8.1 Design System (Mandatory)

**Typography:**
- Font: **Poppins** (mandatory, no substitutes)
- Scale: h1 34–40px → h2 28px → h3 22px → body 16px → caption 12px → price 30–34px
- Arabic fallback: System default (no custom Arabic font)

**Color Palette (Strict Enforcement):**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Emerald Green | `#16a34a` | Buttons, headers, icons, prices |
| Primary Dark | Dark Emerald | `#15803d` | Pressed states, headers |
| Primary Light | Light Emerald | `#dcfce7` | Backgrounds, badges |
| Accent | Orange | `#f97316` | **Promotions/discounts ONLY** |
| Error | Red | `#ef4444` | Errors, destructive actions |
| Warning | Yellow/Amber | `#f59e0b` | Warnings, ratings |
| Background | White | `#ffffff` | Page backgrounds |
| Surface | Gray-50 | `#f8fafc` | Card backgrounds |
| Text | Slate-900 | `#0f172a` | Primary text |
| Text Secondary | Slate-500 | `#64748b` | Secondary text |

**8 Mandatory Signature Visual Elements:**
1. Floating gradient orbs on auth screens (`bg-emerald-400/20 blur-3xl`)
2. Skeleton loading placeholders (not spinners)
3. `rounded-3xl` corners on all cards
4. Combined `shadow-sm` + `border border-gray-100` on cards
5. Green color for all price displays
6. Orange used ONLY for promo/discount badges
7. Bottom sheets for all action menus (not modals)
8. `active:scale-95` press feedback on all tappable elements

### 8.2 Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Authentication | Laravel Sanctum bearer tokens |
| Token Lifetime | 30min access, 30-day refresh |
| Password Hashing | bcrypt, cost factor 12 |
| Card Token Encryption | AES-256-CBC with APP_KEY |
| Webhook Verification | HMAC-SHA512 |
| Rate Limiting (Auth) | 60 requests/minute |
| Rate Limiting (Guest) | 30 requests/minute |
| File Upload | Max 5MB images, allowed: jpg/png/webp |
| CORS | Strict origin whitelist |
| Input Validation | Server-side Laravel validation on all endpoints |
| SQL Injection | Eloquent ORM parameterized queries |
| XSS | Laravel Blade escaping + sanitized API responses |

### 8.3 Performance Requirements

| Metric | Target |
|--------|--------|
| API Response | < 200ms for cached, < 500ms for uncached |
| Redis Cache TTL (Categories) | 24 hours |
| Redis Cache TTL (Products) | 1 hour |
| Redis Cache TTL (User Data) | 30 minutes |
| Pagination | 20 items/page (default), max 100 |
| Image Loading | Cloudinary CDN with responsive transforms |
| Payment Polling | 2s interval, max 30 attempts (60s timeout) |

### 8.4 Accessibility (WCAG 2.1 AA)
- Minimum touch target: 48×48dp
- Color contrast ratio: 4.5:1 minimum
- Screen reader support (accessibilityLabel on all interactive elements)
- Focus management for modals and bottom sheets
- Error messages associated with form fields

### 8.5 Multilingual / RTL
- Full Arabic and English support
- `I18nManager.forceRTL()` for layout direction
- `writingDirection: 'rtl'` on text elements
- All user-facing strings in i18n translation files
- Database stores both `name_en` and `name_ar` for all content

### 8.6 Development Phases (Checklist Status)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup & Core Backend | 🟡 Partial |
| 2 | Authentication System | 🟡 Partial |
| 3 | Core Shopping Features | 🟢 Mostly Done |
| 4 | Additional Features (Notifs, Favorites, Promos) | 🟡 Partial |
| 5 | Admin Panel | 🔴 Not Started |
| 6 | Testing | 🔴 Not Started |
| 7 | Performance & Security Hardening | 🔴 Not Started |
| 8 | Deployment | 🔴 Not Started |

### 8.7 Code Quality Targets
- Zero TypeScript errors
- >80% test coverage
- ESLint strict mode
- Consistent naming conventions (camelCase for JS/TS, snake_case for PHP/DB)

---

## 9. Issues & Inconsistencies Between Documents

### 9.1 🔴 Critical Inconsistencies

#### Token Lifetime Discrepancy
| Document | Access Token Lifetime | Refresh Token |
|----------|----------------------|---------------|
| `apis.md` | 30 minutes | 30 days |
| `project-instructions.md` | 30 minutes | 30 days |
| `TOKENIZATION_SYSTEM_A_TO_Z.md` | References "60 minutes" in some sections | — |
| `SOCIAL_LOGIN_AND_PROFILE_DOCUMENTATION.md` | Implies "1 year" for social tokens | — |

**Impact:** Inconsistent token lifetime could cause unexpected logouts or security issues.

#### Endpoint Count Varies
| Document | Claimed Count |
|----------|---------------|
| `apis.md` (final line) | 74 endpoints (57 customer + 17 admin) |
| `project-instructions.md` | "72 endpoints" referenced |
| Actual enumeration in `apis.md` | ~74 (confirmed by manual count) |

**Impact:** Minor documentation inconsistency, actual count is 74.

#### Authentication Status Contradiction
| Document | Claim |
|----------|-------|
| `project-instructions.md` (progress summary) | "Auth: **0%**" |
| `SOCIAL_LOGIN_AND_PROFILE_DOCUMENTATION.md` | Google login fully implemented, 4 auth cases documented |
| `apis.md` | 7 auth endpoints fully documented with examples |
| `elbaraka_unified.sql` | Contains real login activity logs with timestamps |

**Impact:** Auth is clearly not 0% — social login, OTP, and standard auth are implemented. The progress tracker is outdated.

### 9.2 🟡 Moderate Inconsistencies

#### Promo Code Feature Status
| Document | Status |
|----------|--------|
| `project-instructions.md` (Phase 4 checklist) | Promotions: "partially done" |
| `apis.md` | Full promo code CRUD + apply/remove endpoints documented |
| `elbaraka_server.sql` | 7 promo-related tables exist with BOGO rules, category/product targeting |
| Agent Update Log | "Promo code engine upgrade" completed on Jan 26, 2026 |

**Conclusion:** Promo system is more complete than the checklist suggests. Checklist is stale.

#### Address Schema Differences Between SQL Dumps
| Field | `elbaraka_server.sql` | `elbaraka_unified.sql` |
|-------|----------------------|----------------------|
| `recipient_name` | Not present | Present |
| `phone` | Not present | Present |
| `building` | Not present | Present |
| `floor` | Not present | Present |
| `apartment` | Not present | Present |

**Impact:** The unified/dev database has a more recent migration with extended address fields. Production may need a migration update.

#### Two Complaint/Support Systems
The database contains **both:**
- `complaints` + `complaint_messages` + `complaint_attachments` (new system, used by APIs)
- `support_tickets` + `ticket_messages` (legacy system, appears unused)

**Impact:** Legacy `support_tickets` tables should be cleaned up or explicitly deprecated.

#### Dual Activity Logging
The database contains **both:**
- `activity_log` (Spatie package — automated)
- `activity_logs` (custom table — manual)

**Impact:** Potential confusion about which log source is authoritative. Should consolidate or clearly document the purpose of each.

### 9.3 🟢 Minor Inconsistencies

#### Product Identification
- `products` table uses `barcode` as the unique business identifier
- `cart_items.product_id` references `products.barcode` (VARCHAR), not `products.id` (INT)
- Most API documentation refers to `product_id` without clarifying it's the barcode
- **Potential confusion for new developers** — should be explicitly documented

#### Map Technology References
- `LEAFLET_OSM_TESTING_GUIDE.md` documents complete migration from Google Maps
- Some older sections of `project-instructions.md` may still reference Google Maps
- Admin dashboard code uses Leaflet.js (confirmed)

#### Database Names
| SQL File | Database Name | MySQL Version |
|----------|--------------|---------------|
| `elbaraka_server.sql` | `elbaraka_db` | 8.0 |
| `elbaraka_unified.sql` | `elbaraka-market` | 8.4.3 |

**Impact:** Different database names and MySQL versions suggest separate environments. The "unified" dump is from a newer MySQL version.

### 9.4 📝 Missing Documentation

1. **Driver App APIs** — `DELIVERY_SYSTEM_STATUS.md` mentions 19 driver routes but they are NOT documented in `apis.md` (which only covers customer + admin endpoints)
2. **WebSocket/Pusher events** — Referenced in README but no event documentation exists
3. **Wallet system** — `user_wallets` and `wallet_transactions` tables exist in the database but no API endpoints or documentation cover wallet functionality
4. **Flash sales API** — Database tables exist (`flash_sales`, `flash_sale_products`) but no dedicated API endpoints are documented
5. **Bot system** — `bot_conversation_contexts` and `bot_responses` tables exist but chatbot logic is not documented anywhere
6. **System announcements** — `system_announcements` table exists with no API or documentation
7. **User purchase patterns** — Analytics table exists but no documentation on how it's populated or used

### 9.5 📊 Summary of Issues

| Severity | Count | Key Items |
|----------|-------|-----------|
| 🔴 Critical | 3 | Token lifetime mismatch, Auth progress wrong, endpoint count varies |
| 🟡 Moderate | 4 | Stale promo checklist, address schema drift, dual complaint systems, dual logging |
| 🟢 Minor | 3 | Product ID confusion, lingering Google Maps refs, DB name differences |
| 📝 Missing Docs | 7 | Driver APIs, WebSocket events, Wallet, Flash sales, Bot, Announcements, Purchase patterns |
| **Total** | **17** | |

---

## Appendix: Quick Reference

### Test Credentials
- **Admin:** `admin@elbaraka.com` / `admin123456`
- **Production URL:** `https://cartshop.site/api/v1`
- **Package:** `com.elbaraka.hypermarket`

### Key Configuration Values
```env
PAYMOB_API_KEY=<secret>
PAYMOB_SECRET_KEY=<secret>
PAYMOB_PUBLIC_KEY=<secret>
PAYMOB_CARD_INTEGRATION_ID=5084814
PAYMOB_MOTO_INTEGRATION_ID=5511054
PAYMOB_WALLET_INTEGRATION_ID=5084831
PAYMOB_IFRAME_ID=919973
PAYMOB_HMAC_SECRET=<secret>
GOOGLE_WEB_CLIENT_ID=1011283400029-jkh5hbp3qhmsclcq1rg22q6v7dku8ip9.apps.googleusercontent.com
```

### Technology Stack Summary
| Layer | Technology |
|-------|-----------|
| Backend | Laravel 11, PHP 8.2, MySQL 8.0, Redis |
| Customer App | React Native, Expo SDK 54, TypeScript, Zustand, NativeWind |
| Driver App | React Native, Expo Router, TypeScript |
| Admin Dashboard | React, Vite, Tailwind CSS, Leaflet.js, TypeScript |
| Payments | Paymob (Egypt), AES-256-CBC tokens |
| Maps | Leaflet.js + OpenStreetMap + Nominatim |
| Images | Cloudinary CDN |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Real-time | Pusher (broadcasting) |
| Auth | Laravel Sanctum |

---

*Report generated by comprehensive analysis of all 15 root-level documentation and SQL files in the CART workspace.*
