# ELBARAKA - Hypermarket Mobile Shopping Platform

## Project Overview

ELBARAKA is a modern, mobile-first shopping platform connecting customers with a comprehensive hypermarket for groceries, household items, and daily essentials. The platform facilitates product discovery, order management, and customer-store communication exclusively through mobile devices.

### Technology Stack

- **Backend**: Laravel REST API
- **Admin Panel**: Laravel Filament Dashboard
- **Customer Interface**: React Native (iOS & Android)
- **Database**: MySQL with Redis caching
- **Payments**: Paymob integration (Visa/Mastercard)

### Design Philosophy

Fresh, premium, and delightful design with a professional grocery/retail theme following the **ElBaraka Design System** defined in `layout.md`. The design features emerald green as primary color (#16a34a), Poppins typography, floating gradient orbs, and smooth micro-interactions. Every pixel must feel fresh, premium, and mobile-optimized.

## 🚨 SPECIAL INSTRUCTIONS FOR AGENTS

> **IMPORTANT**: Any agent working on this project MUST read and follow these special instructions before proceeding with any task, before starting with any task/ subtask always involve me in the loop ask me which path should u take/task u would start working on, dont modify any existing logic or code without asking me first, after u are done with anything you have to update this file, also let me test each change u make and confirm it.

## 📐 DESIGN SYSTEM REFERENCE

> **🎨 MANDATORY**: Before implementing any UI/UX changes, ALL agents MUST read and reference the [`layout.md`](./layout.md) file which contains the complete ElBaraka Design System including:
>
> - **Color palette** with exact hex codes (Emerald Green #16a34a primary, Orange/Yellow accents)
> - **Typography standards** (Poppins font family, responsive scaling patterns)
> - **Component design patterns** with ready-to-use React Native classes (rounded-3xl cards, active:scale-95 buttons)
> - **Spacing system** (strict 8px grid with px-6 page padding)
> - **Animation standards** (800ms skeleton shimmer, floating gradient orbs, micro-interactions)
> - **Mobile-only design framework** (48×48dp touch targets, SafeAreaView, RTL support)
> - **Signature visual elements** (floating orbs, skeleton loading, bottom sheets)
>
> The `layout.md` file is the SINGLE SOURCE OF TRUTH for every pixel. Any UI/UX work that doesn't follow these standards will be rejected.

### Development Guidelines

- [x] **Always prioritize mobile-first responsive design** with conditional behavior for complex interfaces
- [x] **Follow the established color palette strictly** (Emerald Green #16a34a primary, Orange #f97316/Yellow #facc15 for promos only)
- [x] **Use consistent naming conventions**: kebab-case for files, camelCase for variables, PascalCase for components
- [x] **Implement proper error handling and user feedback** for all user interactions
- [x] **Ensure accessibility compliance** (WCAG 2.1 AA standards) in all implementations
- [x] **Mobile-responsive patterns**: Use responsive classes and implement mobile-specific UX when needed

### Code Quality Standards

- [ ] **Write clean, documented code** with meaningful comments
- [ ] **Follow Laravel and React Native best practices** for their respective parts
- [ ] **Implement proper validation** on both frontend and backend
- [ ] **Use TypeScript** for React Native components when possible
- [ ] **Write unit tests** for critical functionality

### Project-Specific Rules

- [ ] **Shopping cart must persist** across sessions and devices
- [ ] **All product images** must be optimized for mobile viewing
- [ ] **Multilingual support** (Arabic RTL and English LTR) must be considered in all UI implementations
- [ ] **Grocery-themed icons** only - maintain professional appearance
- [ ] **Real-time features** (notifications) should use Laravel Broadcasting with Pusher
- [ ] **Offline mode** should cache essential data for browsing when connectivity is poor

### API Development Rules

- [ ] **All API endpoints** must include proper authentication and authorization
- [ ] **Rate limiting** must be implemented on all public endpoints
- [ ] **Input validation** must be comprehensive with clear error messages
- [ ] **Use Laravel Resources** for consistent API responses
- [ ] **Implement proper CORS** configuration for mobile app

### UI/UX Requirements

> **📐 DESIGN REFERENCE**: All UI/UX requirements below are detailed in [`layout.md`](./layout.md) with implementation examples and React Native classes.

- [x] **Typography**: Poppins font family (@expo-google-fonts/poppins) with exact size scale (h1: 34-40px bold, body: 16px, price: 30-34px bold)
- [x] **Consistent spacing** using strict 8px base unit system (px-6 = 24px page padding on all screens)
- [x] **Loading states** must be implemented for all async operations
- [x] **Skeleton loading** (800ms shimmer) preserving screen headers during load
- [x] **Mobile-first responsive design** with proper touch-friendly interfaces
- [x] **Touch-optimized UI** with minimum 48×48dp touch targets (not 44pt) and active:scale-95 on all buttons
- [x] **Brand color compliance**: Emerald Green #16a34a for prices/CTAs, Orange/Yellow for promos only, strict semantic mapping
- [x] **Floating gradient orbs** on Home & Categories screens (3 orbs minimum, animated pulse)
- [x] **Card styling**: All cards use rounded-3xl + shadow-md + thin border (neutral-gray/30)
- [x] **Button micro-interactions**: active:scale-95 + transition-all duration-200 on every button
- [x] **Bottom sheets** for Cart, Filters, Checkout, Address picker (rounded-t-3xl)
- [ ] **Empty states** with helpful messaging and call-to-actions
- [ ] **Confirmation dialogs** for destructive actions
- [ ] **Toast notifications** for user feedback (success, error, warning)
- [ ] **Pull-to-refresh** for list views
- [ ] **Smooth animations** for transitions and interactions (fade-in-up 0.4s for list items)

### Security Priorities & Implementation

#### 🔐 **Authentication & Authorization (Laravel Sanctum)**

**Configuration Requirements:**

- Token expiration: 1 year for mobile app
- Token prefix configuration via environment variables
- Token generation using Sanctum's createToken method

**Required Middleware Stack:**

- EnsureFrontendRequestsAreStateful for Sanctum
- ThrottleRequests for rate limiting
- Substitute Bindings for route model binding
- Custom JsonResponse middleware
- API versioning middleware
- Localization middleware

- [ ] **Laravel Sanctum** configured with 1-year token expiration
- [ ] **Role-based access control** using Spatie Laravel Permission
- [ ] **Email/Phone verification** before sensitive operations
- [ ] **Multi-device support** with device token management

#### 🛡️ **Input Validation & Sanitization**

**Form Request Validation Requirements:**

- Create Form Request classes for all API endpoints
- Email validation: required, valid email format (RFC/DNS), max 255 characters, unique in users table
- Phone validation: required, regex pattern for international format (10-15 digits), unique in users table
- Password validation: required, minimum 8 characters, confirmed, use Password::defaults()
- Implement prepareForValidation method for input sanitization:
  - Convert email to lowercase and trim whitespace
  - Remove non-numeric characters from phone (except +)
  - Strip tags and trim all string inputs

- [ ] **Form Request classes** for all API endpoints
- [ ] **Automatic input sanitization** (strip_tags, trim)
- [ ] **Strong password policy** (min 8 chars, mixed case, numbers, symbols)
- [ ] **Email DNS validation** for registration
- [ ] **XSS protection** with automatic HTML escaping

#### 🚦 **Rate Limiting Configuration**

**Rate Limit Requirements by Endpoint Type:**

- Authentication endpoints: 5 requests per minute (login/register)
- General authenticated API: 120 requests per minute
- Payment operations: 10 requests per minute
- Search queries: 30 requests per minute

**Implementation:**

- Define rate limiters using RateLimiter::for() for each category
- Apply throttle middleware to routes with appropriate limiter names
- Combine with auth:sanctum middleware for authenticated routes

- [ ] **5 requests/min** for authentication endpoints
- [ ] **120 requests/min** for authenticated API calls
- [ ] **10 requests/min** for payment operations
- [ ] **30 requests/min** for search queries
- [ ] **IP-based limiting** for unauthenticated requests
- [ ] **User-based limiting** for authenticated requests

#### 🌍 **CORS Configuration**

- [ ] **Expo development servers** whitelisted
- [ ] **Mobile app origins** configured
- [ ] **Credentials support** enabled for Sanctum
- [ ] **Exposed rate limit headers**

#### 📁 **File Upload Security**

**Avatar Validation Requirements:**

- Required field
- Must be valid image
- Allowed types: jpg, jpeg, png
- Maximum size: 2MB (2048 KB)
- Minimum dimensions: 100x100 pixels

**Secure Storage Implementation:**

- Generate unique filename using UUID with original extension
- Store in private disk to prevent direct public access
- Store path in database for retrieval

**File Limits by Type:**
| Type | Formats | Max Size | Validation |
| Avatar | jpg, jpeg, png | 2MB | Dimensions check |
| Product Images | jpg, jpeg, png, webp | 5MB | Image optimization |
| Review Images | jpg, jpeg, png | 2MB | Watermarking |
| Complaint Files | jpg, jpeg, png, pdf | 5MB | Virus scanning |

- [ ] **Strict file type validation** (MIME + extension)
- [ ] **File size limits** enforced
- [ ] **Secure filename generation** (UUID)
- [ ] **Private storage** for sensitive files
- [ ] **Image optimization** before storage

#### 🔍 **SQL Injection Prevention**

**Required Practices:**

- ✅ ALWAYS USE: Eloquent ORM (automatically parameterized queries)
- ✅ ALWAYS USE: Query Builder with proper bindings
- ❌ NEVER USE: Raw SQL with string concatenation
- All user input must be passed as bindings, never concatenated into queries

- [ ] **Eloquent ORM** for all database queries
- [ ] **Parameterized queries** when using raw SQL
- [ ] **No string concatenation** in queries
- [ ] **Input sanitization** before database operations

#### 🛡️ **XSS Protection**

**XSS Prevention Requirements:**

- JSON responses automatically escape HTML entities
- Manual escaping using e() helper function for HTML entities
- Use htmlspecialchars() with ENT_QUOTES and UTF-8 encoding for rich text
- Never render user input directly without escaping

- [ ] **Automatic JSON escaping** in API responses
- [ ] **Manual escaping** for rich text content
- [ ] **Content-Type headers** properly set
- [ ] **No eval() or innerHTML** on frontend

#### 💳 **Payment Security (Paymob)**

**Webhook Verification Requirements:**

- Implement webhook signature verification using HMAC SHA-512
- Calculate HMAC using incoming data and stored secret
- Use hash_equals() for timing-attack-safe comparison
- Reject webhooks with invalid signatures

**Payment Intent Requirements:**

- Never store full card numbers in database
- Use Paymob tokenization for card storage
- Generate payment keys server-side
- Return iframe URL for payment processing

- [x] **Paymob webhook signature verification** (HMAC SHA-512) ✅ IMPLEMENTED
- [x] **Never store full card numbers** - use tokenization ✅ IMPLEMENTED
- [x] **PCI DSS compliance** for payment handling ✅ IMPLEMENTED (Paymob handles card data)
- [x] **Secure payment intent generation** ✅ IMPLEMENTED (PaymobService.php)
- [x] **Transaction logging** for audit trail ✅ IMPLEMENTED (paymob_payments table)

#### 🔐 **Password Security**

**Password Policy Requirements:**

- Minimum 8 characters length
- Must contain mixed case letters (uppercase and lowercase)
- Must contain numbers
- Must contain symbols
- Check against haveibeenpwned.com compromised password database

**Password Hashing:**

- Use bcrypt algorithm with cost factor 12 (4096 rounds)
- Automatic hashing via Hash::make()
- Never store plaintext passwords

- [ ] **Minimum 8 characters** with complexity requirements
- [ ] **Bcrypt hashing** with cost factor 12
- [ ] **Compromised password check** via haveibeenpwned API
- [ ] **Password reset tokens** expire after 60 minutes
- [ ] **Throttled password reset** (1 request per minute)

#### 🔒 **Sensitive Data Encryption**

**Encryption Configuration:**

- Use AES-256-CBC cipher algorithm
- Configure in config/app.php

**Automatic Model Attribute Encryption:**

- Use 'encrypted' cast for sensitive database fields
- Apply to: card tokens, SSN, personal identification

**Manual Encryption:**

- Use Crypt facade for manual encryption/decryption
- Encrypt strings using Crypt::encryptString()

**Fields Requiring Encryption:**

- Payment card tokens
- API keys and secrets
- Bank account details
- Personal identification numbers

- [ ] **AES-256-CBC encryption** for sensitive data
- [ ] **Automatic model attribute encryption**
- [ ] **APP_KEY rotation** strategy documented
- [ ] **Encrypted database backups**

#### 🛡️ **Security Headers**

**Required Security Headers:**

- X-Content-Type-Options: nosniff (prevent MIME sniffing)
- X-Frame-Options: DENY (prevent clickjacking)
- X-XSS-Protection: 1; mode=block (XSS filter)
- Strict-Transport-Security: max-age=31536000 (enforce HTTPS)
- Referrer-Policy: strict-origin-when-cross-origin

**Implementation:**

- Create SecurityHeaders middleware
- Add headers to all responses using withHeaders()

- [ ] **X-Content-Type-Options: nosniff**
- [ ] **X-Frame-Options: DENY**
- [ ] **X-XSS-Protection: 1; mode=block**
- [ ] **Strict-Transport-Security** (HSTS)
- [ ] **Content-Security-Policy** configured

#### 📊 **Activity Logging (Audit Trail)**

**Activity Log Requirements:**

- Create ActivityLog model with required fields:
  - user_id (authenticated user)
  - action (descriptive action name)
  - entity_type (model class name)
  - entity_id (model ID)
  - ip_address (request IP)
  - user_agent (browser/app info)
  - metadata (JSON additional details)

**Actions to Log:**

- User registration/login/logout
- Password changes
- Order placement/cancellation
- Payment transactions
- Profile updates
- Admin actions
- Failed authentication attempts

- [ ] **Activity log table** populated for all critical actions
- [ ] **IP address tracking** for security monitoring
- [ ] **User agent logging** for device tracking
- [ ] **Metadata capture** for audit details
- [ ] **Log retention policy** (90 days minimum)

#### 🔒 **Environment Security**

**Environment File Security:**

- NEVER commit .env files to version control
- Store sensitive configuration:
  - APP_KEY (base64 encoded 32-char key)
  - Database passwords (16+ characters)
  - API keys (Paymob, third-party services)
  - HMAC secrets

**Git Configuration:**

- Add to .gitignore:
  - .env
  - .env.backup
  - .env.production
  - All environment files

**Key Management:**

- Generate APP_KEY using php artisan key:generate
- Use strong random passwords (16+ characters)
- Rotate API keys periodically

- [ ] **.env files** never committed to Git
- [ ] **.env.example** provided without real values
- [ ] **APP_KEY generated** via `php artisan key:generate`
- [ ] **Strong database passwords** (16+ chars)
- [ ] **API keys rotated** periodically

#### ✅ **Security Checklist**

**Authentication & Authorization:**

- [ ] Laravel Sanctum configured
- [ ] Token expiration set (1 year)
- [ ] Role-based access control (Spatie)
- [ ] Email/phone verification required

**Data Protection:**

- [ ] HTTPS enforced in production
- [ ] Sensitive data encrypted (AES-256)
- [ ] No plaintext passwords stored
- [ ] Payment tokens never stored

**Input Security:**

- [ ] Form Request validation on all endpoints
- [ ] SQL injection prevention (Eloquent)
- [ ] XSS protection (auto-escaping)
- [ ] File upload validation

**Infrastructure:**

- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Security headers added
- [ ] Activity logging enabled

**Payment Security:**

- [x] Paymob webhook verification ✅ IMPLEMENTED
- [x] PCI DSS compliance ✅ IMPLEMENTED
- [x] Tokenization implemented ✅ IMPLEMENTED
- [x] Transaction audit trail ✅ IMPLEMENTED

**Monitoring:**

- [ ] Failed login tracking
- [ ] Suspicious activity alerts
- [ ] Error logging (Sentry/Bugsnag)
- [ ] Performance monitoring

### Performance Requirements & Optimization

#### **🚀 Redis Caching Strategy**

**Configuration Requirements:**

- Driver: Redis
- Connection: Use 'cache' connection for caching operations
- Lock connection: Use 'default' for cache locks
- Configure in config/cache.php
- Set up Redis store with proper connections

**Caching Layers & TTL:**

| Data Type       | Cache Key Pattern              | TTL    | Invalidation Trigger  |
| --------------- | ------------------------------ | ------ | --------------------- |
| Products List   | `products:list:{filters_hash}` | 5 min  | Product update/create |
| Product Details | `product:{id}`                 | 10 min | Product update        |
| Product by Slug | `product:slug:{slug}`          | 10 min | Product update        |
| Categories Tree | `categories:tree`              | 30 min | Category update       |
| Brands List     | `brands:list`                  | 30 min | Brand update          |
| User Cart       | `cart:user:{user_id}`          | 15 min | Cart modification     |
| User Profile    | `user:profile:{id}`            | 15 min | Profile update        |
| Settings        | `settings:all`                 | 1 hour | Settings update       |
| Banners         | `banners:active:{placement}`   | 10 min | Banner update         |
| Delivery Zones  | `delivery_zones:all`           | 1 hour | Zone update           |
| Product Reviews | `product:reviews:{id}`         | 5 min  | Review approved       |
| Search Results  | `search:{query_hash}`          | 2 min  | N/A (short-lived)     |

**Implementation Examples:**

**Cache Tags for Bulk Invalidation:**

---

#### **📊 Database Query Optimization**

**Eager Loading (Prevent N+1 Queries):**

**Database Indexes (Already in Schema):**

**Query Optimization Techniques:**

---

#### **📄 Pagination Standards**

**API Pagination Configuration:**

**Default Pagination Sizes:**

| Endpoint       | Per Page | Max | Reason              |
| -------------- | -------- | --- | ------------------- |
| Products List  | 20       | 100 | Optimal mobile load |
| Orders List    | 20       | 50  | Detailed data       |
| Notifications  | 20       | 50  | Frequent polling    |
| Search Results | 20       | 100 | User experience     |
| Admin Lists    | 50       | 200 | Dashboard views     |

---

#### **🖼️ Image Optimization**

**Mobile App (React Native):**

**Backend (Laravel - Image Processing):**

**CDN Configuration (Optional):**

---

#### **📦 Bundle Size Optimization (Mobile)**

**Analyze Bundle:**

**Optimization Techniques:**

**Code Splitting (Expo Router):**

---

#### **⚡ Performance Monitoring**

**Laravel Telescope (Development):**

**Query Monitoring:**

**API Response Time Monitoring:**

---

#### **✅ Performance Checklist**

**Backend:**

- [ ] Redis caching implemented for all hot data paths
- [ ] Database queries use eager loading (no N+1)
- [ ] All database indexes created as per schema
- [ ] API responses paginated (default 20 items)
- [ ] Image processing/compression on upload
- [ ] Slow query logging enabled
- [ ] API response time monitoring
- [ ] Cache invalidation strategies documented

**Mobile App:**

- [ ] Images lazy loaded with progressive enhancement
- [ ] expo-image used with caching enabled
- [ ] Image compression before upload (max 1200px, 80% quality)
- [ ] Bundle size optimized (specific imports)
- [ ] Code splitting for heavy screens
- [ ] AsyncStorage used efficiently
- [ ] Pull-to-refresh for data freshness
- [ ] Skeleton loaders for loading states

**Infrastructure:**

- [ ] Redis server configured and monitored
- [ ] CDN configured for static assets (optional)
- [ ] Database connection pooling enabled
- [ ] API rate limiting prevents abuse
- [ ] Gzip compression enabled on API responses

### Documentation Standards

- [ ] **Update API documentation** whenever endpoints change
- [ ] **Document component props** and usage examples
- [ ] **Maintain changelog** for major features and bug fixes
- [ ] **Create user guides** for complex features
- [ ] **Update this instructions file** when adding new requirements
- [x] **Design System Reference**: [`layout.md`](./layout.md) is the SINGLE SOURCE OF TRUTH and must be followed exactly for all UI/UX work

---

## 🎯 CURRENT DEVELOPMENT PHASE

### Phase 1: Mobile App UI/UX Development - ⏳ **IN PROGRESS**

> **STATUS**: Mobile app frontend being built WITHOUT authentication. All screens accessible, using mock data.

- [ ] **1.1** Initialize Laravel project with proper folder structure
- [ ] **1.2** Initialize React Native project (expo) for Customer mobile app
- [ ] **1.3** Configure navigation (React Navigation)
- [ ] **1.4** Set up state management (Redux Toolkit / Zustand)

#### 🔄 Currently Building:

- [x] **1.5** Customer React Native App - All screens with mock data (Home, Browse, Product Details, Cart, Orders, Checkout, Order History, Profile)
- [x] **1.6** Shared components library - Reusable UI components
- [x] **1.7** Responsive Design - Mobile-optimized with touch interactions
- [x] **1.8** Mock Data & State - JSON files and state management for development
- [x] **1.9** No Authentication - All screens accessible without login

#### ⏳ Ready for Next Phase:

- 🔄 **Phase 2**: Backend Integration & Authentication System
- 🔄 **Phase 3**: Payment Gateway & Order Management
- 🔄 **Phase 4**: Admin Panel & Management System

---

## 🚀 RECENT CHANGES & UPDATES

### [December 2025] - Phase 1: Mobile App & Backend Development - ✅ **90% COMPLETE**

#### 🎯 Project Initialization

**Mobile App Setup** - ✅ **100% COMPLETE**

- [x] **React Native Project**: Created React Native Expo project with TypeScript
- [x] **Typography**: Installed and configured Poppins font via @expo-google-fonts/poppins
- [x] **Navigation Setup**: Configured Expo Router with stack, tab, modal, and nested navigators
- [x] **State Management**: Set up Zustand with persist using AsyncStorage
- [x] **Icon Library**: Integrated lucide-react-native for grocery/retail theme icons
- [x] **Image Handling**: Implemented expo-image with caching and optimization
- [x] **Core Components**: Created SkeletonLoader, FloatingOrbs, BottomSheet, Button, Toast, GuestModal, ConfirmDialog, ProductCard components
- [x] **Design System**: Fully implemented ElBaraka color palette (Colors.ts), spacing system (Spacing.ts), and typography (Typography.ts) from layout.md
- [x] **Offline Caching**: Implemented comprehensive caching system:
  - [x] Image cache with 100MB limit and 7-day expiry (imageCache.ts)
  - [x] API response cache with configurable TTL (apiCache.ts)
  - [x] Network status detector with offline indicator (networkDetector.ts, OfflineIndicator component)
- [ ] **RTL Support**: I18nManager for Arabic right-to-left layout pending

**Backend Foundation** - ✅ **100% COMPLETE**

- [x] **Laravel API**: Initialized Laravel 11 project at http://192.168.223.1:8000
- [x] **Database Design**: Created comprehensive database schema with:
  - [x] Products table (barcode, name_en, name_ar, price, sale_price, stock_quantity, rating, review_count, is_featured, is_active)
  - [x] Categories table with hierarchical structure (id, parent_id, name_en, name_ar, slug, image, icon, sort_order, is_active)
  - [x] Category-Product pivot table (many-to-many relationship)
  - [x] Orders and order_items tables
  - [x] Users table (customers, admins with role ENUM)
  - [x] Addresses table
  - [x] Shopping carts table
  - [x] Complaints table (status, priority, category, message thread support)
  - [x] Database indexes for performance optimization
- [x] **Test Data**: Comprehensive seeding:
  - [x] 165 categories (105 parent + 60 subcategories) with images and icons
  - [x] 53 products with pricing, ratings, stock across multiple categories
  - [x] Category hierarchy tested (15 categories with subcategories, each 3-6 subcategories)
  - [x] Products distributed across categories and subcategories
- [x] **File Storage**: Configured public disk for product images, private disk for sensitive files
- [x] **API Routes**: Created comprehensive API structure:
  - [x] Categories API with filtering, sorting, subcategories support
  - [x] Products API with price/rating filters, pagination
  - [x] Featured categories with products endpoint
  - [x] Category products endpoint with pagination
  - [x] Single product endpoint
  - [x] Flash deals endpoint
- [ ] **Redis Setup**: Redis caching and sessions pending
- [ ] **Laravel Sanctum**: API authentication pending (Phase 2)

#### 🎨 Complete UI/UX Implementation - ✅ **95% COMPLETE**

**Core Screens Implemented** - All following ElBaraka Design System from layout.md

- [x] **Welcome Screen** (welcome.tsx)
  - ElBaraka logo and branding
  - Floating gradient orbs (3 orbs with pulse animation)
  - "Get Started" and "Login" CTAs with active:scale-95
  - Professional grocery theme

- [x] **Onboarding Flow** (onboarding.tsx)
  - 3-screen carousel with Poppins typography
  - Skip option
  - Page indicators
  - "Get Started" CTA

- [x] **Authentication Screens**
  - [x] Login screen (login.tsx) with email/password validation
  - [x] Signup screen (signup.tsx) with multi-field validation
  - [x] Forgot Password screen (forgot-password.tsx)
  - All with proper 48dp touch targets and rounded-2xl inputs

- [x] **Home Screen** (index.tsx) - Premium Implementation
  - [x] Floating gradient orbs (primary-900/10%, accent-orange/10%, primary-500/8%)
  - [x] Search bar with voice input
  - [x] Banner carousel with auto-scroll (4 promotional banners)
  - [x] Category horizontal scroll (icons + names, tap to filter)
  - [x] Featured products grid (2-column, rounded-3xl cards)
  - [x] "Shop by Category" section with full category list
  - [x] Quick actions: floating cart button with badge
  - [x] Pull-to-refresh
  - [x] Skeleton loading (800ms shimmer, headers preserved)
  - [x] All cards with shadow-md + border border-neutral-gray/30
  - [x] Active states: active:scale-95 on all interactive elements

- [x] **Categories Tab** (categories.tsx) - **CURRENT BUG: Shows 0 categories**
  - [x] 2-column grid layout with CARD_WIDTH calculation
  - [x] Category cards with image backgrounds and LinearGradient overlays
  - [x] Product count badges
  - [x] Floating gradient orbs
  - [x] Pull-to-refresh
  - [x] Image caching with preloading
  - [x] Filter for root categories only (parent_id = null)
  - [x] Sorted by sort_order
  - ⚠️ **ISSUE**: Categories load from API (6 returned) but display shows "Browse 0 categories"
  - ⚠️ **ERROR**: Image cache error with malformed URLs (ttps:// instead of https://)

- [x] **Category Detail Screen** ([id].tsx) - Premium with Subcategories
  - [x] Hierarchical category display (Main Category → Subcategories)
  - [x] Subcategory chips (horizontal scroll, tap to filter)
  - [x] Breadcrumb navigation showing category path
  - [x] Product grid (2-column) with subcategory filtering
  - [x] "All Products" chip to show main category + all subcategories
  - [x] Product count badges (includes subcategory products)
  - [x] Pull-to-refresh
  - [x] Skeleton loading
  - [x] Empty state when no products
  - [x] Sorting and filtering options

- [x] **Product Detail Screen** ([id].tsx) - **RECENTLY FIXED**
  - [x] API integration (getProduct() call)
  - [x] Image gallery with aspect ratio 1:1
  - [x] Product name, description, price in emerald green
  - [x] Stock status and quantity
  - [x] Rating stars component
  - [x] Quantity selector (- / + buttons)
  - [x] Add to Cart CTA (primary-900 button with active:scale-95)
  - [x] Related products section
  - [x] Skeleton loading state
  - [x] Error handling
  - ✅ **FIXED**: Now uses API instead of static data, proper property mapping (barcode, price, stock_quantity, description_en)

- [x] **Product Reviews Screen** ([id].tsx in reviews folder)
  - [x] Reviews list with ratings
  - [x] Rating breakdown
  - [x] User avatars and names
  - [x] Review dates
  - [x] Helpful/not helpful buttons

- [x] **Search Screen** (search.tsx)
  - [x] Search input with auto-focus
  - [x] Recent searches display
  - [x] Search suggestions
  - [x] Product results grid
  - [x] Clear search history

- [x] **Cart Tab & Modal** (cart.tsx + modal.tsx)
  - [x] Bottom sheet implementation (rounded-t-3xl)
  - [x] Cart items list with images
  - [x] Quantity controls (+ / - buttons with active:scale-95)
  - [x] Remove item functionality
  - [x] Price breakdown (subtotal, delivery, discount, total)
  - [x] Prices in emerald green (primary-900)
  - [x] Proceed to Checkout CTA
  - [x] Empty cart state with helpful message
  - [x] Guest user modal (prompts to login)

- [x] **Checkout Flow** (3-step process)
  - [x] **Address Screen** (address.tsx)
    - Delivery address selection
    - Add new address form
    - Set default address
    - Map integration placeholder
  - [x] **Payment Screen** (payment.tsx)
    - Payment method selection (Card, Cash on Delivery)
    - Add card form (tokenization placeholder)
    - Apply promo code
    - Wallet balance option
  - [x] **Confirmation Screen** (confirmation.tsx)
    - Order summary review
    - Items list
    - Delivery details
    - Payment method
    - Total amount
    - Place Order button
    - Terms acceptance checkbox

- [x] **Order Success Screen** (order-success.tsx)
  - [x] Success checkmark animation
  - [x] Order number display
  - [x] Estimated delivery time
  - [x] Track Order button
  - [x] Continue Shopping button

- [x] **Orders Tab** (orders.tsx)
  - [x] Active orders with status badges
  - [x] Order history list
  - [x] Filter by status
  - [x] Pull-to-refresh
  - [x] Order cards with images and totals
  - [x] Tap to view details

- [x] **Order Detail Screen** ([id].tsx)
  - [x] Order timeline with status progression
  - [x] Items list with quantities and prices
  - [x] Delivery information
  - [x] Payment details
  - [x] Reorder functionality
  - [x] Cancel order button
  - [x] Download receipt option

- [x] **Order Tracking** (track.tsx)
  - [x] Order status timeline
  - [x] Driver information display
  - [x] Estimated delivery time
  - [x] Contact driver button
  - [x] Map placeholder

- [x] **Order Rating** (rate.tsx)
  - [x] Star rating selector
  - [x] Written review input
  - [x] Submit rating button
  - [x] Skip option

- [x] **Offers Tab** (offers.tsx)
  - [x] Featured deals carousel
  - [x] Category-based offers
  - [x] Limited-time deals with countdown
  - [x] Bundle offers
  - [x] Orange/yellow gradient for promo cards

- [x] **Flash Deals Screen** (flash.tsx)
  - [x] Countdown timer
  - [x] Deal products grid
  - [x] Original and sale prices
  - [x] Stock remaining indicator

- [x] **Profile Tab** (profile.tsx)
  - [x] User avatar and name
  - [x] Account statistics (orders, favorites)
  - [x] Navigation to sub-sections:
    - Edit Profile
    - Addresses
    - Payment Methods
    - Favorites
    - Settings
    - Help & Support
    - About
  - [x] Logout button

- [x] **Edit Profile** (edit.tsx)
  - [x] Profile picture upload
  - [x] Name, email, phone fields
  - [x] Save changes button
  - [x] Form validation

- [x] **Addresses Management**
  - [x] **Addresses List** (addresses.tsx)
    - Saved addresses display
    - Set default address
    - Edit/delete options
  - [x] **Add Address** (add-address.tsx)
    - Address form with all fields
    - Map integration placeholder
    - Set as default option
    - Save address button

- [x] **Payment Methods Management**
  - [x] **Payment List** (payment.tsx)
    - Saved cards display (last 4 digits)
    - Default payment indicator
    - Remove card option
  - [x] **Add Card** (add-card.tsx)
    - Card number input
    - Expiry and CVV fields
    - Save card button
    - Security indicators

- [x] **Favorites/Wishlist** (favorites.tsx)
  - [x] Product grid with favorite items
  - [x] Quick add to cart
  - [x] Remove from favorites
  - [x] Empty state

- [x] **Settings Screen** (settings.tsx)
  - [x] Notification preferences
  - [x] Language selection (Arabic/English)
  - [x] Theme toggle (light/dark)
  - [x] Push notification toggle
  - [x] Email notification toggle

- [x] **Change Password** (change-password.tsx)
  - [x] Current password field
  - [x] New password field
  - [x] Confirm password field
  - [x] Password strength indicator
  - [x] Update password button

- [x] **Wallet Screen** (wallet.tsx)
  - [x] Balance display
  - [x] Transaction history
  - [x] Add money button
  - [x] Withdraw option

- [x] **Help & Support** (help.tsx)
  - [x] FAQ sections
  - [x] Contact support button
  - [x] Chat support option
  - [x] Call support option
  - [x] Email support option

- [x] **Complaints/Support Tickets** - **FULLY IMPLEMENTED**
  - [x] **Complaints List** (index.tsx)
    - All complaints with status badges (open, in progress, awaiting response, resolved, closed)
    - Priority indicators (low, medium, high, urgent)
    - Category display
    - Filter by status
    - Search functionality
    - Tap to view details
  - [x] **New Complaint** (new.tsx)
    - Subject and description fields
    - Category selection dropdown (Order issue, Product quality, Delivery problem, Payment issue, Technical issue, General inquiry, Suggestion, Other)
    - Related order selection (optional)
    - Attach photos/documents (camera + gallery)
    - Priority selection
    - Submit button
  - [x] **Complaint Detail** ([id].tsx)
    - Full complaint details view
    - Status and priority display
    - Message thread with admin replies
    - Reply to admin functionality
    - Attach additional files
    - Close complaint option
    - Rate resolution quality
    - Timeline of status changes

- [x] **About Section**
  - [x] **About ElBaraka** (about.tsx)
    - Company information
    - Mission and values
    - Contact information
  - [x] **Privacy Policy** (privacy.tsx)
    - Full privacy policy text
    - Data collection practices
    - User rights
  - [x] **Terms & Conditions** (terms.tsx)
    - User agreement
    - Service terms
    - Liability clauses

- [x] **Notifications Screen** (notifications.tsx)
  - [x] Notifications list grouped by date
  - [x] Read/unread indicators
  - [x] Notification icons by type
  - [x] Mark as read functionality
  - [x] Clear all option
  - [x] Pull-to-refresh

**Reusable Components Library** - ✅ **100% COMPLETE**

- [x] **SkeletonLoader** (SkeletonLoader.tsx)
  - 800ms shimmer animation
  - Preserves headers during load
  - Configurable width, height, border radius

- [x] **FloatingOrbs** (FloatingOrbs.tsx)
  - 3+ gradient orbs with pulse animation
  - Colors: primary-900/10%, accent-orange/10%, primary-500/8%
  - Positioned absolutely behind content

- [x] **Button** (Button.tsx)
  - Primary, Secondary, Accent variants
  - active:scale-95 micro-interaction
  - transition-all duration-200
  - 48dp minimum height
  - Full width option

- [x] **ProductCard** (ProductCard.tsx)
  - Product image with aspect ratio
  - Name, price (emerald green), rating
  - Quick add to cart button
  - Favorite toggle
  - Stock badge
  - Sale badge (orange/yellow)
  - rounded-3xl + shadow-md + border
  - active:scale-95 on press

- [x] **RatingStars** Component (created during category detail work)
  - Display star ratings (filled/half/empty)
  - Configurable size
  - Used in ProductCard and product detail

- [x] **Toast** (Toast.tsx)
  - Success, Error, Warning, Info variants
  - Auto-dismiss after 3 seconds
  - Slide-in animation
  - Icon indicators

- [x] **BottomSheet** (BottomSheet.tsx)
  - rounded-t-3xl styling
  - Backdrop overlay
  - Swipe to dismiss
  - Smooth animations
  - Used for Cart, Filters, Checkout

- [x] **GuestModal** (GuestModal.tsx)
  - Prompts guests to login
  - "Login" and "Continue as Guest" options
  - Shows on cart/checkout attempt

- [x] **ConfirmDialog** (ConfirmDialog.tsx)
  - Confirm/cancel actions
  - Custom title and message
  - Used for destructive actions

- [x] **OfflineIndicator** (OfflineIndicator.tsx)
  - Network status banner
  - Shows when offline
  - Dismissible
  - Red background with white text

**State Management** - ✅ **100% COMPLETE**

- [x] **Zustand Store** (store/index.ts)
  - Cart state (items, total, add, remove, update quantity)
  - User state (profile, addresses, favorites)
  - App state (theme, language, notifications)
  - AsyncStorage persistence

**API Integration** - ✅ **80% COMPLETE**

- [x] **Base API Configuration** (services/api/base.ts)
  - API_BASE_URL: http://192.168.223.1:8000/api/v1
  - Common headers
  - Error handling

- [x] **Category API** (services/api/categoryApi.ts)
  - [x] getCategories() with caching
  - [x] getFeaturedCategoriesWithProducts()
  - [x] getCategoryProducts(id, filters, page)
  - [x] Cache-first strategy with 10-min TTL

- [x] **Products API** (services/api/productsApi.ts)
  - [x] getProducts(filters) with pagination
  - [x] getProduct(id) - **Recently added**
  - [x] getFeaturedProducts()
  - [x] getFlashDeals()
  - [x] Cache-first with 5-min TTL

- [ ] **Auth API** - Pending (Phase 2)
  - [ ] login(email, password)
  - [ ] register(userData)
  - [ ] logout()
  - [ ] resetPassword(email)
- [ ] **Orders API** - Pending (Phase 2)
  - [ ] getOrders()
  - [ ] getOrder(id)
  - [ ] createOrder(orderData)
  - [ ] cancelOrder(id)

- [ ] **Complaints API** - Pending (Phase 2)
  - [ ] getComplaints()
  - [ ] getComplaint(id)
  - [ ] createComplaint(data)
  - [ ] updateComplaint(id, data)
  - [ ] replyToComplaint(id, message)

**Caching System** - ✅ **100% COMPLETE**

- [x] **Image Cache** (services/cache/imageCache.ts)
  - expo-file-system/legacy for compatibility
  - 100MB cache limit
  - 7-day expiry
  - Automatic cleanup
  - getCachedImage(), preloadImages()
  - ⚠️ **BUG**: Malformed URL handling (ttps:// instead of https://)
  - ✅ **FIXED**: Added URL validation and auto-correction

- [x] **API Cache** (services/cache/apiCache.ts)
  - AsyncStorage-based caching
  - Configurable TTL per endpoint
  - cacheFirstFetch() strategy
  - networkFirstFetch() strategy
  - Cache invalidation

- [x] **Network Detector** (services/cache/networkDetector.ts)
  - 5-second polling interval
  - Network status tracking
  - Offline indicator integration

**Data Types & Models** - ✅ **100% COMPLETE**

- [x] **TypeScript Types** (types/index.ts)
  - Product interface (barcode, name_en, name_ar, price, sale_price, stock_quantity, rating, review_count, image, categories)
  - Category interface (id, parent_id, name_en, name_ar, slug, image, icon, sort_order, is_active, subcategories[], products_count)
  - Order interface
  - User interface
  - Cart interface
  - Address interface
  - Complaint interface (status, priority, category, messages)

**Mock Data** - ✅ **100% COMPLETE**

- [x] Products data (data/products.ts)
- [x] Categories data (data/categories.ts)
- [x] Banners data (data/banners.ts)
- [x] Orders data (data/orders.ts)
- [x] User data (data/user.ts)
- [x] Notifications data (data/notifications.ts)

**Design System Implementation** - ✅ **100% COMPLETE**

- [x] **Colors.ts** - ElBaraka color palette
  - Primary (emerald green scale)
  - Neutral (white to charcoal)
  - Accent (orange, yellow, red, lime)
  - All colors from layout.md

- [x] **Spacing.ts** - 8px grid system
  - xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, xxl: 32px

- [x] **Typography.ts** - Font sizes and weights
  - h1-h4 headings
  - body sizes (large, base, medium, small)
  - Price styles
  - Poppins font family

#### 🐛 Known Issues & Fixes

**Issues Fixed:**

1. ✅ **Product Detail "Product not found"** (Fixed Dec 22, 2025)
   - Problem: Used static data, wrong ID type (id vs barcode)
   - Solution: Complete rewrite to use getProduct() API
   - Files: frontend/app/product/[id].tsx
   - Status: ✅ RESOLVED

2. ✅ **expo-file-system deprecation warnings** (Fixed Dec 22, 2025)
   - Problem: downloadAsync deprecated in favor of new API
   - Solution: Changed to expo-file-system/legacy import
   - Files: frontend/services/cache/imageCache.ts
   - Status: ✅ RESOLVED

3. ✅ **Category Subcategories Display** (Verified Dec 22, 2025)
   - Problem: User reported subcategories not showing
   - Investigation: Backend API verified working, frontend code correct
   - Result: Already working correctly, user may have tested wrong category
   - Status: ✅ VERIFIED WORKING

**Current Issues:**

1. ⚠️ **Categories Tab Shows 0 Categories** (In Progress)
   - Problem: API returns 6 categories successfully but UI shows "Browse 0 categories"
   - Console: Shows "✅ Setting 6 categories" but categories.length = 0
   - Hypothesis: Filter `.filter((cat) => !cat.parent_id)` may be removing all categories
   - Status: 🔄 INVESTIGATING
   - Files: frontend/app/(tabs)/categories.tsx

2. ⚠️ **Image Cache Malformed URLs** (In Progress)
   - Problem: URLs show as 'ttps://' instead of 'https://' causing download errors
   - Error: "Expected URL scheme 'http' or 'https' but was 'ttps'"
   - Solution: ✅ Added URL validation and auto-correction in imageCache.ts
   - Status: 🔄 TESTING REQUIRED
   - Files: frontend/services/cache/imageCache.ts

#### � Paymob Payment Gateway Integration - ✅ **100% COMPLETE** (⏳ User Testing Pending)

**Implementation Date**: December 22-23, 2024
**Status**: Fully implemented and documented, awaiting user acceptance testing
**Documentation**: See `PAYMOB_COMPLETE_TESTING_GUIDE.md` for comprehensive testing instructions

**Backend Implementation** - ✅ COMPLETE

- [x] **Database Migration**: `create_paymob_payments_table.php`
  - Stores order_id, transaction_id, amount_cents, currency, payment_status
  - Tracks webhook events and HMAC verification
  - Stores complete transaction data for audit trail
  - Status: ✅ Migration executed successfully

- [x] **PaymobService.php**: Complete 3-step Paymob API integration
  - Step 1: Authentication (retrieve API token)
  - Step 2: Order registration (create order in Paymob)
  - Step 3: Payment key generation (create payment token)
  - Returns iframe URL for frontend payment processing
  - Error handling with detailed logging
  - Status: ✅ Service fully implemented

- [x] **PaymentController.php**: 4 API endpoints
  - POST `/api/payments/paymob/initiate` - Initiate payment and get iframe URL
  - GET `/api/payments/paymob/{orderId}/status` - Check payment status
  - POST `/api/payments/paymob/processed` - Webhook for processed callback
  - GET `/api/payments/paymob/response` - Webhook for response callback
  - HMAC SHA-512 verification on all webhooks
  - Transaction status updates (pending → success/failed)
  - Status: ✅ All endpoints implemented and secured

- [x] **API Routes**: Configured in routes/api.php
  - Protected routes require authentication
  - Public webhook routes for Paymob callbacks
  - Status: ✅ Routes registered

**Frontend Implementation** - ✅ COMPLETE

- [x] **paymentsApi.ts**: API client for Paymob
  - `initiatePaymobPayment(orderId, amountCents)` - Get iframe URL
  - `checkPaymentStatus(orderId)` - Poll payment status
  - Status: ✅ Service implemented

- [x] **PaymentWebView.tsx**: WebView component for payment iframe
  - Loads Paymob iframe with payment key
  - Handles success/failure navigation
  - URL monitoring for callback detection
  - Loading states and error handling
  - Status: ✅ Component implemented

- [x] **payment.tsx**: Dedicated payment screen
  - Uses PaymentWebView component
  - Handles navigation from checkout
  - Status: ✅ Screen implemented

- [x] **checkout/confirmation.tsx**: Checkout flow integration
  - Card payment: Routes to PaymentWebView
  - Cash on Delivery: Direct order placement
  - Status: ✅ Integration complete

**Security Implementation** - ✅ COMPLETE

- [x] HMAC SHA-512 webhook verification
- [x] No card data stored in database (Paymob tokenization)
- [x] Secure environment variable configuration
- [x] Transaction logging for fraud detection
- [x] Status validation and duplicate prevention

**Testing Resources** - ✅ COMPLETE

- [x] **PAYMOB_COMPLETE_TESTING_GUIDE.md** created with:
  - 30-second quick test guide
  - 6 detailed test scenarios (success, cancel, invalid card, network error, webhook verification, status polling)
  - All 4 API endpoints documented with cURL examples
  - Database debugging queries
  - Test card: 4987654321098769, CVV: 123, Expiry: 12/25
  - Production deployment checklist

**Configuration** - ✅ COMPLETE

- [x] Environment variables in `.env`:
  - `PAYMOB_API_KEY` - API authentication key
  - `PAYMOB_INTEGRATION_ID` - Card payment integration ID
  - `PAYMOB_IFRAME_ID` - Payment iframe ID
  - `PAYMOB_HMAC_SECRET` - Webhook HMAC verification secret

**Known Limitations**:

- Currently sandbox mode only (test credentials)
- Production requires:
  - Live Paymob merchant account
  - Production API credentials
  - Live HMAC secret for webhook verification
  - SSL certificate for callback URLs

**Next Steps for User**:

1. ⏳ Test payment flow using PAYMOB_COMPLETE_TESTING_GUIDE.md
2. ⏳ Verify successful payment with test card
3. ⏳ Test payment cancellation flow
4. ⏳ Verify webhook callbacks in database
5. ⏳ Test Cash on Delivery fallback
6. ⏳ Obtain production Paymob credentials when ready to launch

**Files Modified/Created**:

Backend:

- `backend/database/migrations/xxxx_create_paymob_payments_table.php`
- `backend/app/Models/PaymobPayment.php`
- `backend/app/Services/PaymobService.php`
- `backend/app/Http/Controllers/Api/PaymentController.php`
- `backend/routes/api.php`
- `backend/.env` (credentials added)

Frontend:

- `frontend/services/api/paymentsApi.ts`
- `frontend/components/PaymentWebView.tsx`
- `frontend/app/payment.tsx`
- `frontend/app/checkout/confirmation.tsx` (updated)
- `frontend/package.json` (react-native-webview added)

Documentation:

- `PAYMOB_COMPLETE_TESTING_GUIDE.md` (comprehensive testing guide)

#### 🔧 Code Quality & Refactoring - 🔄 **IN PROGRESS** (Phase 1 of 7)

**Refactoring Plan Created**: December 23, 2024
**Documentation**: See `COMPREHENSIVE_REFACTORING_PLAN.md` for complete 7-phase plan
**Timeline**: 4 weeks (20 working days)
**Goal**: Bring codebase to FAANG-level production standards

**Phase 1: Code Quality & TypeScript Standards** - 🔄 IN PROGRESS (2-3 days)

- [x] **TypeScript Configuration Improvements**
  - Added `"ignoreDeprecations": "6.0"` to suppress baseUrl warning
  - Added strict type checking options:
    - `"noUnusedLocals": true`
    - `"noUnusedParameters": true`
    - `"noImplicitAny": true`
    - `"strictNullChecks": true`
    - `"forceConsistentCasingInFileNames": true`
  - File: `frontend/tsconfig.json`
  - Status: ✅ COMPLETE

- [x] **Unused Code Removal** - 🔄 IN PROGRESS
  - `frontend/app/(auth)/forgot-password.tsx`: Removed unused `Check` import and `otpTimer` variable
  - Status: 2 files cleaned, 18+ files remaining
  - Next: Continue removing unused variables, imports, and dead code across codebase

**Remaining Phases** - ⏳ PLANNED

- [ ] **Phase 2**: Architecture Patterns (4-5 days)
  - Repository pattern for data access
  - Service layer for business logic
  - Dependency injection
  - Error boundary components

- [ ] **Phase 3**: Security Hardening (2-3 days)
  - Input sanitization
  - SQL injection prevention
  - XSS prevention
  - CSRF protection
  - Rate limiting enhancement

- [ ] **Phase 4**: Performance Optimization (3-4 days)
  - Database query optimization
  - N+1 query elimination
  - API response caching
  - React component memoization
  - Image lazy loading

- [ ] **Phase 5**: API & Service Layer (3-4 days)
  - API versioning
  - Consistent error responses
  - Request/Response DTOs
  - API documentation (Swagger/OpenAPI)

- [ ] **Phase 6**: Frontend Components (3-4 days)
  - Component composition patterns
  - Custom hooks for reusability
  - Accessibility improvements (WCAG 2.1)
  - Loading states standardization

- [ ] **Phase 7**: Testing & Documentation (4-5 days)
  - Unit tests (target: >80% coverage)
  - Integration tests
  - E2E tests for critical flows
  - API documentation
  - Component documentation

**Current Metrics**:

- TypeScript Errors: ~20 (Down from baseline)
- ESLint Warnings: ~50 (Down from baseline)
- Test Coverage: 0% (Target: >80%)
- Code Duplication: High (Target: <3%)

**Success Metrics** (Target by end of Phase 7):

- 0 TypeScript compilation errors
- <5 ESLint warnings (non-critical only)
- > 80% test coverage
- <200ms average API response time
- 90+ Lighthouse performance score
- 100% WCAG 2.1 Level AA compliance

#### �📊 Development Progress Summary

**Overall Progress: 92%** (Updated - Includes Paymob integration + Phase 1 refactoring)

- ✅ Backend Setup: 100%
- ✅ Frontend Setup: 100%
- ✅ UI/UX Implementation: 95%
- ✅ API Integration: 85% (Up from 80% - added 4 Paymob endpoints)
- ✅ Caching System: 100%
- ❌ Authentication: 0% (Phase 2)
- ✅ Payment Integration: 100% ✅ PAYMOB COMPLETE (⏳ User acceptance testing pending)
- ❌ Admin Panel: 0% (Phase 3)

**Screens Completed: 36/36** (100%) - Added payment.tsx
**Components Completed: 16/16** (100%) - Added PaymentWebView.tsx
**API Endpoints Working: 10/76** (13%) - Added 4 Paymob endpoints
**Database Tables: 9/26** (35%) - Added paymob_payments table

**Ready for:**

- ✅ UI/UX testing with real data
- ✅ Navigation testing
- ✅ Caching testing
- ✅ Payment gateway testing (Paymob sandbox) - See PAYMOB_COMPLETE_TESTING_GUIDE.md
- 🔄 Bug fixing (categories display, image URLs)
- 🔄 Code quality improvements (Phase 1 of 7-phase refactoring plan)
- ⏳ Phase 2: Authentication & API integration

---

## ✅ AGENT IMPLEMENTATION CHECKLIST (Must verify before any PR)

> **CRITICAL**: Every agent must verify these requirements from `elbaraka.layout.md` before submitting work:

- [ ] Poppins font loaded via `@expo-google-fonts/poppins`
- [ ] Floating gradient orbs component implemented on Home screen (3 orbs minimum with pulse animation)
- [ ] Global skeleton shimmer component created (800ms duration, preserves screen titles)
- [ ] Every button has `active:scale-95` + `transition-all duration-200`
- [ ] Every card has `rounded-3xl` + `shadow-md` minimum + thin border
- [ ] All prices displayed in emerald green (#16a34a primary-900)
- [ ] Orange (#f97316) and Yellow (#facc15) used ONLY for promotions/deals
- [ ] Arabic RTL layout tested and perfect (layout flips, text aligns correctly)
- [ ] All touch targets ≥ 48×48dp (not 44pt)
- [ ] SafeAreaView properly implemented on all screens
- [ ] Bottom sheets use `rounded-t-3xl` styling
- [ ] Page padding is `px-6` (24px) on all screens
- [ ] Images use `react-native-fast-image` with progressive loading
- [ ] Skeleton loading preserves headers during load states

---

## 📋 PROJECT IMPLEMENTATION CHECKLIST

### Phase 1: Project Setup & Architecture

#### Backend Development (Laravel)

- [ ] **1.11** Set up Laravel Sanctum for API authentication
- [ ] **1.12** Configure database migrations for core entities
  - [ ] **1.12.1** Users (customers, admins)
  - [ ] **1.12.2** Products (with categories, variants)
  - [ ] **1.12.3** Orders and order items
  - [ ] **1.12.4** Shopping carts
  - [ ] **1.12.5** Delivery addresses
  - [ ] **1.12.6** Payment transactions
  - [ ] **1.12.7** Notifications
- [ ] **1.13** Create API routes structure
- [ ] **1.14** Implement CORS configuration for mobile app
- [ ] **1.15** Set up file storage for product images
- [ ] **1.16** Configure email services for notifications
- [ ] **1.17** Implement rate limiting for API endpoints
- [ ] **1.18** Set up Redis for caching and sessions

#### Mobile App Setup (React Native)

- [x] **1.19** Install Poppins font family (@expo-google-fonts/poppins)
- [x] **1.20** Set up React Navigation with proper structure
- [x] **1.21** Configure state management (Redux Toolkit/Zustand)
- [x] **1.22** Implement Design System from layout.md
  - [x] Color palette constants (primary-900 #16a34a, accent-orange #f97316, etc.)
  - [x] Typography scale (h1-h4, body sizes, price styles)
  - [x] Spacing system (8px grid)
  - [x] Component library (buttons with active:scale-95, cards with rounded-3xl)
- [x] **1.23** Create core reusable components
  - [x] Skeleton shimmer component (800ms animation)
  - [x] Floating gradient orbs component
  - [x] Bottom sheet component (rounded-t-3xl)
  - [x] Primary/Secondary/Accent buttons with micro-interactions
- [ ] **1.24** Set up Axios/React Query for API communication
- [ ] **1.25** Configure environment variables for dev/prod
- [ ] **1.26** Set up push notifications (Firebase Cloud Messaging)
- [ ] **1.27** Configure react-native-fast-image for image caching and optimization
- [ ] **1.28** Set up secure storage for tokens (react-native-keychain)
- [ ] **1.29** Configure RTL support for Arabic (I18nManager.forceRTL)

#### Admin Panel Setup

- [ ] **1.26** Install and configure Laravel Filament
- [ ] **1.27** Create admin user seeder
- [ ] **1.28** Set up Filament resources for all entities

### Phase 2: Authentication & User Management

#### Backend Authentication

- [ ] **2.1** Implement customer registration API
- [ ] **2.2** Implement login/logout API with token management
- [ ] **2.3** Create password reset functionality
- [ ] **2.4** Implement email/phone verification
- [ ] **2.5** Create profile management API
- [ ] **2.6** Implement role-based access control
- [ ] **2.7** Add social login options (Google)

#### Mobile App Authentication

- [x] **2.8** Create onboarding screens
- [x] **2.9** Build login screen with validation
- [x] **2.10** Build registration flow (multi-step)
- [x] **2.11** Implement authentication state management
- [ ] **2.12** Create protected navigation
- [x] **2.13** Implement logout functionality
- [ ] **2.14** Add biometric authentication option
- [x] **2.15** Create password reset flow

### Phase 3: Core Mobile Features Development

#### Home Screen & Navigation

- [x] **3.1** Design and implement home screen layout
  - [x] Category horizontal scroll with icons
  - [x] Banner carousel with auto-scroll
  - [x] Featured products grid
  - [x] Quick search bar
  - [x] Floating cart button with badge
- [x] **3.2** Implement bottom tab navigation
  - [x] Home tab
  - [x] Browse/Categories tab
  - [x] Cart tab
  - [x] Orders tab
  - [x] Offers tab
  - [x] Profile tab
- [ ] **3.3** Create drawer navigation for settings
- [x] **3.4** Implement search functionality
  - [x] Search bar with autocomplete
  - [ ] Elastic Search
  - [x] Recent searches
  - [ ] Popular searches
  - [x] Search filters

#### Product Browsing & Discovery

- [x] **3.5** Build category browsing screen (with hierarchical subcategories)
  - [x] Main category grid with images and icons
  - [x] Subcategory navigation (tap category to view subcategories)
  - [x] Hierarchical category tree display
  - [x] Product count badges (includes subcategory products)
  - [x] Breadcrumb navigation (Main Category > Subcategory)
  - [x] Filter by main category (includes all subcategories)
  - [x] Filter by specific subcategory only
- [x] **3.6** Implement product listing
  - [x] Grid/list view toggle
  - [x] Product cards with images, price, stock
  - [x] Quick add to cart
  - [x] Wishlist/favorite option
- [x] **3.7** Create product details screen
  - [x] Image gallery with zoom
  - [x] Product information (description, ingredients, nutrition)
  - [x] Price and stock availability
  - [x] Quantity selector
  - [x] Add to cart CTA
  - [x] Related products
  - [x] Customer reviews and ratings

#### Shopping Cart & Checkout

- [x] **3.8** Build shopping cart screen
  - [x] Cart item list with images
  - [x] Quantity controls (+/-)
  - [x] Remove item functionality
  - [x] Price breakdown (subtotal, delivery, total)
  - [x] Promo code input
  - [x] Proceed to checkout button
- [x] **3.9** Implement checkout flow
  - [x] Delivery address selection/creation
  - [x] Delivery time slot picker
  - [x] Payment method selection
  - [x] Order summary review
  - [x] Place order confirmation
- [x] **3.10** Integrate Paymob, Stripe payment gateway ✅ PAYMOB COMPLETE (⏳ User testing pending)
  - [x] Card payment flow ✅ IMPLEMENTED (PaymentWebView.tsx)
  - [x] Cash on delivery option ✅ IMPLEMENTED
  - [x] Payment success/failure handling ✅ IMPLEMENTED (callbacks + status endpoint)
  - [x] Receipt generation ✅ IMPLEMENTED (paymob_payments table with full transaction data)

#### Order Management

- [x] **3.11** Create orders list screen
  - [x] Active orders with status
  - [x] Order history
  - [x] Order filtering by status
  - [x] Pull-to-refresh
- [x] **3.12** Build order details screen
  - [x] Order items list
  - [x] Delivery information
  - [x] Payment details
  - [x] Order tracking timeline
  - [x] Cancel order option
  - [x] Reorder functionality
  - [x] Download receipt

#### Profile & Settings

- [x] **3.13** Implement profile screen
  - [x] User information display
  - [x] Edit profile form
  - [x] Profile picture upload
  - [x] Account statistics
- [x] **3.14** Create address management
  - [x] Address list
  - [x] Add new address with map
  - [x] Edit/delete addresses
  - [x] Set default address
- [x] **3.15** Build settings screen
  - [x] Notification preferences
  - [x] Language selection (Arabic/English)
  - [x] Theme preferences
  - [x] About app information
  - [x] Logout option

### Phase 4: Advanced Features

#### Notifications & Real-time Updates

- [ ] **4.1** Implement push notifications
  - [ ] Firebase Cloud Messaging setup
  - [ ] Notification permission request
  - [ ] Handle notification tap
  - [ ] Notification history
- [ ] **4.2** Create real-time order tracking
  - [ ] WebSocket connection for order updates
  - [ ] Live delivery tracking on map
  - [ ] Driver location updates
  - [ ] Estimated delivery time

#### Favorites & Wishlist

- [x] **4.3** Build favorites/wishlist feature
  - [x] Add/remove favorites
  - [x] Favorites list screen
  - [x] Quick add to cart from favorites
  - [ ] Share favorite products

#### Promotions & Discounts

- [x] **4.4** Implement promo code system
  - [ ] Promo code validation API
  - [x] Apply discount to cart
  - [x] Display available offers
  - [ ] Promo code history
- [x] **4.5** Create offers/deals screen
  - [x] Featured deals carousel
  - [x] Category-based offers
  - [x] Limited-time deals with countdown
  - [x] Bundle offers

#### Search & Filter Enhancements

- [ ] **4.6** Advanced product search
  - [ ] Elastic Search integration
  - [ ] Voice search integration
- [ ] **4.7** Comprehensive filtering
  - [ ] Category Filter
  - [ ] Price range slider
  - [ ] Rating filters
  - [ ] Availability filters
  - [ ] Sort options (price, popularity, rating)

#### Customer Support & Complaints

- [x] **4.8** Build complaints/support ticket system
  - [x] Submit complaint form with category selection
  - [x] Attach images/files to complaints (product photos, screenshots)
  - [x] Ticket number generation
  - [x] Complaint status tracking (open, in progress, awaiting response, resolved, closed)
  - [x] Priority levels (low, medium, high, urgent)
  - [x] View complaint history
  - [x] Messaging thread within complaint
  - [ ] Receive notifications on admin replies
  - [x] Close complaint functionality
  - [x] Rate complaint resolution

### Phase 5: Admin Panel Development

#### Dashboard & Analytics

- [ ] **5.1** Build admin dashboard overview
  - [ ] Sales metrics (daily, weekly, monthly)
  - [ ] Order statistics
  - [ ] Customer statistics
  - [ ] Revenue charts
  - [ ] Top-selling products
  - [ ] Low stock alerts
- [ ] **5.2** Implement analytics reports
  - [ ] Sales reports
  - [ ] Inventory reports
  - [ ] Customer behavior analytics
  - [ ] Export reports (PDF, Excel)

#### Product Management

- [ ] **5.3** Create product management interface
  - [ ] Product list with search/filter
  - [ ] Add new product form
  - [ ] Edit product details
  - [ ] Bulk product import (CSV)
  - [ ] Product image gallery management
  - [ ] Inventory tracking
  - [ ] Price management
  - [ ] Product categories management
- [ ] **5.4** Implement category management (hierarchical with subcategories)
  - [ ] Category tree structure with parent-child relationships
  - [ ] Add/edit/delete main categories
  - [ ] Add/edit/delete subcategories under main categories
  - [ ] Move subcategories between parent categories
  - [ ] Category images and icons (emoji support)
  - [ ] Category ordering (sort_order field)
  - [ ] Drag-and-drop reordering interface
  - [ ] Prevent deleting categories with subcategories (or cascade delete option)
  - [ ] Product count display (including subcategory products)

#### Order Management

- [ ] **5.5** Build order management system
  - [ ] Orders list with filters
  - [ ] Order details view
  - [ ] Update order status
  - [ ] Process refunds
  - [ ] Print order receipts
  - [ ] Assign delivery personnel
  - [ ] Bulk order operations

#### Customer Management

- [ ] **5.6** Create customer management
  - [ ] Customer list with search
  - [ ] Customer profile details
  - [ ] Order history per customer
  - [ ] Customer lifetime value
  - [ ] Send notifications to customers
  - [ ] Block/unblock customers

#### Promotions & Marketing

- [ ] **5.7** Build promotion management
  - [ ] Create promo codes
  - [ ] Set discount rules
  - [ ] Schedule promotions
  - [ ] Track promo code usage
  - [ ] Banner management for mobile app
- [ ] **5.8** Implement notification system
  - [ ] Send push notifications
  - [ ] Create notification campaigns
  - [ ] Target specific customer segments
  - [ ] Notification analytics

#### Complaints & Support Management

- [ ] **5.9** Build complaint management system
  - [ ] Complaints list with filters (status, priority, category, date)
  - [ ] Complaint details view
  - [ ] Reply to customer complaints
  - [ ] Update complaint status
  - [ ] Assign complaints to admin staff
  - [ ] Set priority levels
  - [ ] View customer complaint history
  - [ ] Complaint resolution workflow
  - [ ] Analytics (average resolution time, complaints by category)
  - [ ] Email notifications to customers
  - [ ] Bulk complaint operations
  - [ ] Export complaints data

#### Settings & Configuration

- [ ] **5.10** Create system settings
  - [ ] Delivery fee configuration
  - [ ] Delivery zones management
  - [ ] Tax settings
  - [ ] Payment gateway configuration
  - [ ] App settings (minimum order, etc.)
  - [ ] Email templates
  - [ ] SMS templates

### Phase 6: Testing & Quality Assurance

#### Mobile App Testing

- [ ] **6.1** Unit testing for components
- [ ] **6.2** Integration testing for API calls
- [ ] **6.3** E2E testing for user flows
- [ ] **6.4** Performance testing
- [ ] **6.5** Accessibility testing
- [ ] **6.6** Device compatibility testing
- [ ] **6.7** iOS App Store review preparation
- [ ] **6.8** Google Play Store review preparation

#### Backend Testing

- [ ] **6.9** API endpoint testing
- [ ] **6.10** Database query optimization
- [ ] **6.11** Load testing
- [ ] **6.12** Security penetration testing
- [ ] **6.13** Payment gateway testing

#### Cross-Platform Testing

- [ ] **6.14** Test on various Android devices
- [ ] **6.15** Test on various iOS devices
- [ ] **6.16** Test different screen sizes
- [ ] **6.17** Test different OS versions
- [ ] **6.18** Test RTL/LTR language switching

### Phase 7: Performance & Security

#### Performance Optimization

- [ ] **7.1** Optimize API response times
- [ ] **7.2** Implement image optimization and CDN
- [ ] **7.3** Add lazy loading for product lists
- [ ] **7.4** Optimize mobile app bundle size
- [ ] **7.5** Implement Redis caching strategy
- [ ] **7.6** Database query optimization
- [ ] **7.7** Implement pagination for all lists

#### Security Implementation

- [ ] **7.8** Implement comprehensive input validation
- [ ] **7.9** Add CSRF protection
- [ ] **7.10** Secure file uploads
- [ ] **7.11** Implement API rate limiting
- [ ] **7.12** Add SQL injection protection
- [ ] **7.13** Implement XSS protection
- [ ] **7.14** Secure payment data handling
- [ ] **7.15** Regular security audits

### Phase 8: Deployment & Monitoring

#### Deployment Setup

- [ ] **8.1** Configure production environment
- [ ] **8.2** Set up CI/CD pipeline
- [ ] **8.3** Configure domain and SSL
- [ ] **8.4** Set up database backups
- [ ] **8.5** Configure monitoring tools (Sentry, New Relic)
- [ ] **8.6** Deploy to App Store
- [ ] **8.7** Deploy to Google Play Store
- [ ] **8.8** Set up crash reporting

#### Launch Preparation

- [ ] **8.9** Create user documentation
- [ ] **8.10** Prepare customer support materials
- [ ] **8.11** Set up error logging
- [ ] **8.12** Configure analytics tracking
- [ ] **8.13** Plan soft launch strategy
- [ ] **8.14** Prepare marketing materials

---

## 🎯 Core Features Specification

### Mobile App Home Screen

**Hero Section**

- ELBARAKA logo with professional branding
- Welcome message with personalized greeting
- Search bar with voice input option
- Location selector for delivery area
- Promotional banner carousel with auto-scroll

**Category Navigation**

- Horizontal scrollable category cards with icons for main categories
- Tap on category to view subcategories
- Hierarchical category structure (main categories → subcategories)
- Popular categories highlighted
- "View All Categories" option showing full hierarchical tree
- Quick access to frequently browsed categories
- Subcategory filtering for products

**Featured Section**

- Daily deals carousel
- Flash sales with countdown timers
- Seasonal promotions
- New arrivals showcase

**Quick Actions**

- Floating cart button with item count badge
- Recently viewed products
- Favorites/wishlist quick access
- Barcode scanner for quick product lookup

### Customer Mobile Interface (React Native)

**Dashboard/Home Features**

- Personalized product recommendations
- Order again shortcuts from history
- Active order tracking widget
- Quick reorder from favorites
- Banner promotions and seasonal campaigns

**Product Browsing**

- Category-based navigation with visual hierarchy
- Product grid with infinite scroll
- Product cards showing:
  - Product image
  - Name and description
  - Price with discount badge
  - Stock availability
  - Quick add to cart
  - Favorite/wishlist toggle
- Filter and sort options
  - Price range
  - Category selection
  - Rating filter
  - Availability (in stock, out of stock)
- Search with autocomplete, Elastic Searching
- Barcode scanner

**Product Detail View**

- Image gallery with pinch-to-zoom
- Product title and brand
- Price information (current, original, discount percentage)
- Stock status and quantity available
- Detailed description
- Nutrition facts and ingredients
- Allergen information
- Customer reviews and ratings
- Related/similar products
- Frequently bought together suggestions
- Share product option
- Add to cart with quantity selector
- Add to favorites

**Shopping Cart**

- Persistent cart across sessions
- Cart item cards with:
  - Product image and name
  - Price per unit
  - Quantity controls
  - Remove item button
  - Item total
- Price breakdown:
  - Subtotal
  - Delivery fee
  - Discounts applied
  - Tax
  - Total amount
- Promo code input and validation
- Proceed to checkout button
- Suggested products based on cart
- Minimum order amount indicator

**Checkout Process**

- **Step 1: Delivery Information**
  - Delivery address selection
  - Add new address with map integration
  - Contact phone number
  - Delivery instructions/notes
- **Step 2: Delivery Time**
  - Delivery time slot selection
  - Express delivery option
  - Scheduled delivery
- **Step 3: Payment**
  - Payment method selection (Card, Cash on Delivery)
  - Saved cards list (tokenized)
  - Add new card
  - Apply wallet balance
  - Promo code section
- **Step 4: Review & Place Order**
  - Order summary review
  - Terms and conditions acceptance
  - Place order button
  - Order confirmation screen

**Order Management**

- Active Orders view
  - Order status (Processing, Confirmed, Out for Delivery, Delivered)
  - Estimated delivery time
  - Driver information and contact
  - Cancel order option
- Order History
  - Past orders list with date and total
  - Order details view
  - Reorder functionality
  - Download receipt
  - Rate order and leave review
- Order Details
  - Items ordered with quantities
  - Delivery address
  - Payment information
  - Order timeline
  - Invoice/receipt (Option to export receipt as PDF, print receipt)

**Profile & Account**

- Personal Information
  - Profile picture
  - Name and email
  - Phone number
  - Edit profile
- Address Book
  - Saved addresses list
  - Add/edit/delete addresses
  - Set default address
  - Map integration for address selection
- Payment Methods
  - Saved cards (tokenized, last 4 digits only)
  - Add new card
  - Remove card
  - Default payment method
- Order History
  - All past orders
  - Filter by date, status
  - Search orders
- Favorites/Wishlist
  - Saved products
  - Quick add to cart
  - Remove from favorites
- Complaints & Support Tickets
  - View all submitted complaints/tickets
  - Submit new complaint with details:
    - Subject and description
    - Category selection (order issue, product quality, delivery problem, payment issue, technical issue, general inquiry, suggestion, other)
    - Related order selection (optional)
    - Attach photos/documents (damaged products, receipts, screenshots)
  - Track complaint status (open, in progress, awaiting response, resolved, closed)
  - View priority level (low, medium, high, urgent)
  - Message thread with admin replies
  - Receive real-time notifications on updates
  - Close/reopen complaints
  - Rate resolution quality
  - Filter complaints by status and category
- Settings
  - Notification preferences (enable/disable, email, SMS)
  - Language selection (Arabic/English with RTL/LTR)
  - Theme preferences (light/dark mode)
  - App version and info
  - Logout

**Support & Help**

- Contact Support & Complaints
  - Submit complaint/ticket with category selection
  - Attach images/files to complaint
  - Track complaint status (open, in progress, resolved)
  - View complaint history
  - Reply to admin messages
  - Close resolved complaints
  - Priority levels (low, medium, high, urgent)
  - Categories: Order issue, Product quality, Delivery problem, Payment issue, Technical issue, General inquiry, Suggestion, Other
  - Email support
  - Phone support
- About
  - About ElBaraka
  - Terms and conditions
  - Privacy policy
  - Return and refund policy

### Admin Dashboard (Laravel Filament)

**Dashboard Overview**

- Key Performance Indicators (KPIs)
  - Total sales (today, week, month)
  - Number of orders
  - Number of customers
  - Average order value
- Sales Charts
  - Revenue trends
  - Orders by status
  - Sales by category
- Quick Stats
  - Pending orders count
  - Low stock items
  - Out of stock items
  - Active customers
- Recent Activities
  - Latest orders
  - New customer registrations
  - Recent reviews

**Product Management**

- Products List
  - Search and filter products
  - Bulk actions (delete, update status, update price)
  - Export products to CSV
- Add/Edit Product
  - Basic information (name, description, SKU)
  - Pricing (regular price, sale price, cost price)
  - Inventory (stock quantity, low stock threshold)
  - Images (multiple images with drag-to-reorder)
  - Category assignment
  - Brand selection
  - Tags and attributes
  - SEO metadata
  - Nutritional information
  - Allergen information
  - Visibility settings (published, draft, scheduled)
- Category Management
  - Category tree view
  - Add/edit/delete categories
  - Category images and icons
  - SEO settings per category
  - Category ordering
- Brand Management
  - Brands list
  - Add/edit brands
  - Brand logos
- Inventory Management
  - Stock levels overview
  - Low stock alerts
  - Out of stock items
  - Stock adjustment history
  - Bulk stock update

**Order Management**

- Orders List
  - View all orders
  - Filter by status, date, payment method
  - Search by order ID, customer name
  - Bulk status updates
- Order Details
  - Customer information
  - Items ordered
  - Payment details
  - Delivery information
  - Order timeline
  - Change order status
  - Print invoice
  - Process refund
  - Add internal notes
- Order Status Management
  - Pending → Confirmed → Preparing → Out for Delivery → Delivered
  - Cancel order with reason
  - Mark as failed delivery
- Refunds & Returns
  - Refund requests list
  - Process refund
  - Partial/full refund options
  - Refund reason tracking

**Customer Management**

- Customers List
  - All registered customers
  - Search by name, email, phone
  - Filter by status, registration date
  - Customer segmentation
- Customer Details
  - Personal information
  - Contact details
  - Delivery addresses
  - Order history
  - Total spent
  - Lifetime value
  - Account status (active, blocked)
- Customer Actions
  - Edit customer information
  - View order history
  - Send notification
  - Block/unblock customer
  - Reset password

**Promotions & Marketing**

- Promo Codes
  - Create promo codes
  - Code types (percentage, fixed amount, free delivery)
  - Usage limits (per customer, total uses)
  - Validity period
  - Minimum order amount
  - Applicable products/categories
  - Track promo code usage
- Banners
  - Home screen banners
  - Category banners
  - Upload banner images
  - Set banner order
  - Schedule banner display
  - Link to products/categories
- Push Notifications
  - Create notification campaigns
  - Target audience (all, segments, specific customers)
  - Schedule notifications
  - Notification history
  - Analytics (sent, delivered, clicked)

**Reports & Analytics**

- Sales Reports
  - Sales by date range
  - Sales by category
  - Sales by product
  - Payment method breakdown
  - Export to Excel/PDF
- Inventory Reports
  - Stock levels
  - Stock movement
  - Low stock items
  - Out of stock items
  - Inventory value
- Customer Reports
  - New customer registrations
  - Customer lifetime value
  - Customer retention rate
  - Top customers by orders/spend
- Order Reports
  - Orders by status
  - Average order value
  - Orders by payment method
  - Delivery performance
  - Order fulfillment time
- Complaints Reports
  - Complaints by category
  - Average resolution time
  - Complaints by status
  - Customer satisfaction ratings
  - Most common issues

**Complaints & Support Management**

- Complaints Dashboard
  - Active complaints count
  - Pending responses count
  - Average resolution time
  - Complaints by priority
  - Recent complaints list
- Complaints List
  - View all complaints with filters:
    - Status (open, in progress, awaiting response, resolved, closed)
    - Priority (low, medium, high, urgent)
    - Category (order issue, product quality, delivery, payment, technical, etc.)
    - Date range
    - Customer name/email
  - Search by ticket number or description
  - Sort by date, priority, status
- Complaint Details View
  - Customer information
  - Ticket number and timeline
  - Related order details (if applicable)
  - Complaint description and category
  - Message thread with customer
  - Attached files/images
  - Status history
- Complaint Actions
  - Reply to customer messages
  - Update status (in progress, awaiting response, resolved, closed)
  - Change priority level
  - Assign to admin staff member
  - Add internal notes
  - Attach files/documents
  - Mark as resolved
  - Close complaint
- Notifications
  - Email notification to customer on reply
  - Push notification for urgent complaints
  - Admin alerts for new complaints
  - Escalation alerts for unresolved complaints (>48hrs)

**Settings & Configuration**

- General Settings
  - Store name and logo
  - Contact information
  - Store address
  - Operating hours
  - Currency settings
  - Tax settings
- Delivery Settings
  - Delivery zones and fees
  - Free delivery thresholdser
  - Delivery time slots
  - Express delivery settings
  - Minimum order amount
- Payment Settings
  - Enable/disable payment methods
  - Paymob API credentials
  - Cash on delivery settings
  - Payment gateway fees
- Notification Settings
  - Email notification templates
  - SMS notification templates
  - Push notification settings
  - Notification triggers
- App Settings
  - App version management
  - Force update settings
  - Maintenance mode
  - API rate limiting
- User Management
  - Admin users list
  - Create/edit admins
  - Role and permission management
  - Activity logs

---

## 🎨 UI/UX Design Guidelines

### Design System Foundation

**Typography Hierarchy**

- **Primary Font**: Poppins (mandatory via @expo-google-fonts/poppins) or Inter fallback
- **Headings**: Bold/Semibold weights for hierarchy
  - H1: 34-40px font-bold (screen titles)
  - H2: 28-32px font-bold (section titles)
  - H3: 22-24px font-semibold (card titles)
  - H4: 18-20px font-semibold (subheadings)
- **Body Text**:
  - body-large: 18px medium (descriptions)
  - body-base: 16px regular (main body text)
  - body-medium: 14px regular (labels, captions)
  - body-small: 12px regular (helper text, badges)
- **Price Text**:
  - price-large: 30-34px bold (current price in emerald green)
  - price-old: 18px bold line-through text-neutral-medium (crossed out old price)
- **Text Colors** (from elbaraka.layout.md):
  - Primary text: #1e293b (neutral-charcoal)
  - Secondary text: #64748b (neutral-medium)
  - Prices: #16a34a (primary-900 emerald green)
  - Discounts: #f97316 (accent-orange)
  - Errors: #ef4444 (accent-red)
  - Success: #84cc16 (primary-500)

**Color Palette** (from elbaraka.layout.md - STRICT compliance required)

- **Primary Colors (Emerald Green)**
  - primary-900: #16a34a (main buttons, prices, CTAs, headers)
  - primary-800: #15803d (hover states)
  - primary-700: #22c55e (success accents)
  - primary-500: #84cc16 ("Added to cart" confirmations)
- **Neutral System**
  - neutral-white: #ffffff (content areas, cards)
  - neutral-cloud: #f8fafc (page backgrounds)
  - neutral-light: #f1f5f9 (card backgrounds, subtle borders)
  - neutral-gray: #e2e8f0 (skeleton, disabled states, light borders)
  - neutral-medium: #64748b (secondary text, placeholders)
  - neutral-charcoal: #1e293b (primary text, headings)
- **Accent Colors** (Use ONLY for designated purposes)
  - accent-orange: #f97316 (promotions, deals, urgency - NOT general use)
  - accent-yellow: #facc15 (limited-time badges, highlights)
  - accent-red: #ef4444 (errors, out-of-stock)
  - accent-lime: #a3e635 (success highlights, confirmations)
- **Gradients** (Mandatory on Home & key screens)
  - Background: "bg-gradient-to-b from-emerald-50 via-white to-emerald-50"
  - Promotion: "bg-gradient-to-r from-accent-orange to-accent-yellow"
  - Success: "bg-gradient-to-r from-primary-700 to-accent-lime"
  - Floating orbs: primary-900/10%, accent-orange/10%, primary-500/8%

**Semantic Color Mapping** (Never deviate)
| Meaning | Color |
|---------|-------|
| Freshness/Trust | primary-900 (#16a34a) |
| Prices/Money | primary-900 (#16a34a) |
| Success/Added | primary-500 (#84cc16) or accent-lime |
| Promotions/Deals | accent-orange + accent-yellow ONLY |
| Error/Out of stock | accent-red (#ef4444) |
| Backgrounds | neutral-cloud → white gradient |
| Primary text | neutral-charcoal (#1e293b) |
| Secondary text | neutral-medium (#64748b) |

**Spacing System** (Strict 8px Grid from elbaraka.layout.md)

| Value | Class             | Usage                                                     |
| ----- | ----------------- | --------------------------------------------------------- |
| 8px   | p-2 / m-2 / gap-2 | 8px (minimal spacing)                                     |
| 12px  | p-3 / gap-3       | 12px (card internal padding)                              |
| 16px  | p-4 / gap-4       | 16px (standard spacing)                                   |
| 24px  | p-6 / gap-6       | 24px (page horizontal padding - MANDATORY on all screens) |
| 32px  | p-8 / gap-8       | 32px (large spacing)                                      |
| 48px  | p-12              | 48px (extra large spacing)                                |
| 64px  | p-16              | 64px (section spacing)                                    |

**Critical Rules:**

- **Page horizontal padding**: `px-6` (24px) on ALL screens - no exceptions
- **Card spacing**: 12px internal padding, 16px between cards
- **List item spacing**: 8px between items
- All measurements in dp (density-independent pixels) for React Native

### Mobile Component Library

**Buttons** (React Native classes from elbaraka.layout.md)

- **Primary Button** (Add to Cart / Place Order / Checkout):

  ```tsx
  className =
    "bg-primary-900 active:bg-primary-800 text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-200";
  ```

  - Minimum height: 48dp (touch target)
  - Full width on mobile for primary actions
  - MUST have active:scale-95 micro-interaction

- **Secondary Button**:

  ```tsx
  className =
    "border-2 border-neutral-gray bg-white text-neutral-charcoal font-semibold py-4 px-6 rounded-2xl active:bg-neutral-cloud active:scale-95 transition-all duration-200";
  ```

  - Height: 48dp
  - Used for secondary actions

- **Accent / Promo Button**:

  ```tsx
  className =
    "bg-gradient-to-r from-accent-orange to-accent-yellow text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-200";
  ```

  - Use ONLY for promotions and special deals

- **Icon Buttons**:
  - Minimum 48×48dp touch target
  - active:scale-95 on press
  - Clear visual feedback

**Cards & Containers** (React Native classes from elbaraka.layout.md)

- **Product Cards**:

  ```tsx
  className =
    "bg-white rounded-3xl overflow-hidden shadow-md active:shadow-xl transition-all duration-300 border border-neutral-gray/30";
  ```

  - Image aspect ratio: 1:1 or 4:3
  - Rounded corners: rounded-3xl (mandatory)
  - Shadow: shadow-md minimum, shadow-xl on press
  - Border: thin neutral-gray/30 border required
  - Internal padding: 12px

- **Category Cards**:

  ```tsx
  className =
    "bg-gradient-to-br from-white to-emerald-50 rounded-3xl shadow-lg p-6 items-center justify-center border border-emerald-200/50";
  ```

  - Gradient background required
  - Centered icon and text

- **Content Cards**:
  - Rounded corners: rounded-3xl (not 16pt)
  - Padding: 16px
  - Shadow for depth (shadow-md minimum)
  - White or neutral-light background
- **Bottom Sheets / Modals**:

  ```tsx
  className = "bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl";
  ```

  - Top corners rounded only (rounded-t-3xl)
  - Used for Cart, Filters, Checkout, Address picker

**Forms & Inputs** (React Native classes from elbaraka.layout.md)

- **Input Fields**:

  ```tsx
  className =
    "w-full px-5 py-4 bg-white border-2 border-neutral-gray rounded-2xl text-base text-neutral-charcoal placeholder-neutral-medium focus:border-primary-900 focus:ring-4 focus:ring-primary-900/20";
  ```

  - Height: 48dp minimum (touch-friendly)
  - Border radius: rounded-2xl
  - Focus state: emerald green border with ring
  - Clear button inside input

- **Labels**:
  - Above input fields
  - 14px font size (body-medium)
  - 8px margin below label
- **Error States**:
  - accent-red border (#ef4444)
  - Error message below in accent-red
  - Icon indicator
- **Success States**:
  - primary-500 or accent-lime border
  - Success icon

**Navigation**

- Bottom Tab Bar:
  - Height: 60pt
  - 5 main tabs maximum
  - Icons with labels
  - Active state indication
  - Badge for cart item count
- Header/Top Bar:
  - Height: 56pt
  - Title centered or left-aligned
  - Back button on left
  - Action buttons on right (search, cart, etc.)
  - Shadow or border to separate from content
- Drawer Navigation (if used):
  - Swipe from left edge
  - Overlay with backdrop
  - User profile at top
  - Menu items with icons

### Responsive Mobile Design

**Screen Size Considerations**

- Small phones: 320pt width (iPhone SE)
- Standard phones: 375pt - 414pt width (iPhone 12, 13, 14)
- Large phones: 428pt+ width (iPhone 14 Pro Max, Android phablets)
- Tablets: 768pt+ width (iPad, Android tablets)

**Touch-First Approach** (from elbaraka.layout.md - Mobile-Only Rules)

- **Minimum touch target: 48×48dp** (React Native - non-negotiable)
- SafeAreaView + proper insets everywhere
- Font scaling respected (user accessibility settings)
- All images: react-native-fast-image + progressive loading
- FlatList must use getItemLayout where possible for performance
- Adequate spacing between interactive elements (minimum 8dp)
- Large, clear tap areas with visual feedback
- Active states: active:scale-95 on all buttons and cards
- Swipe gestures for common actions
- Pull-to-refresh on all list views
- Long-press for additional options
- Full RTL (Right-to-Left) support for Arabic (layout flips perfectly)

**Adaptive Layouts**

- Flexible grids that adapt to screen width
- 2-column grid for product listings on small screens
- 3-4 columns on larger phones and tablets
- Single column for forms and detailed content
- Collapsible sections on smaller screens
- Bottom sheets for options and filters

### Grocery/Retail-Themed Iconography

**Icon Categories**

- Product categories: Fruits, vegetables, dairy, meat, bakery, beverages, household
- Actions: Search, cart, heart (favorites), user, filter, sort
- Status: Check (in stock), X (out of stock), clock (pending), truck (delivery)
- Navigation: Home, categories, orders, profile, menu
- Payment: Credit card, cash, wallet

**Icon Standards**

- Consistent stroke width (2pt)
- Outline or filled styles (choose one consistently)
- Size: 24x24dp default, scale to 20dp or 28dp as needed
- Color: Match brand colors (primary-900 for main icons, neutral-medium for secondary)
- Vector format for scalability
- Descriptive labels for accessibility

### ✨ Signature Visual Elements (from elbaraka.layout.md - MUST be present)

> **NON-NEGOTIABLE**: These elements define ElBaraka's brand identity and MUST be implemented:

1. **Floating Animated Gradient Orbs**
   - Required on: Home screen & Category screens
   - Minimum: 3 orbs with different colors
   - Colors: primary-900/10%, accent-orange/10%, primary-500/8%
   - Animation: `pulse 8s infinite ease-in-out`
   - Creates premium, modern atmosphere

2. **Skeleton Loading (800ms Shimmer)**
   - Required on: Every list and detail screen
   - Duration: 800ms shimmer animation
   - **Critical**: Headers must be preserved during loading
   - Animation: `shimmer 1.5s infinite linear`
   - Background: neutral-gray with animated shimmer

3. **Rounded-3xl on All Cards**
   - Product cards, category cards, content cards
   - No exceptions - rounded-3xl is mandatory

4. **Subtle Shadow + Thin Border**
   - Every card: shadow-md minimum + border border-neutral-gray/30
   - Active state: shadow-xl

5. **Green Prices Everywhere**
   - All prices MUST be primary-900 (#16a34a emerald green)
   - Old/crossed prices: neutral-medium with line-through

6. **Orange Only for Promotions**
   - accent-orange (#f97316) used EXCLUSIVELY for deals/promos
   - Never use orange for general UI elements

7. **Bottom Sheets for Key Actions**
   - Required for: Cart, Filters, Checkout steps, Address picker
   - Styling: rounded-t-3xl with shadow-2xl

8. **Active State Micro-interactions**
   - Every button and interactive card: active:scale-95
   - Transition: transition-all duration-200 ease-out

### ✨ Animations & Micro-Interactions (from elbaraka.layout.md - Mandatory)

### Accessibility & Internationalization

**Accessibility Standards (WCAG 2.1 AA)**

- Color contrast ratios:
  - Normal text: 4.5:1 minimum
  - Large text: 3:1 minimum
- **Touch target size: 48×48dp minimum** (per elbaraka.layout.md mobile-only rules)
- Screen reader support:
  - Meaningful labels for all interactive elements
  - Content hierarchy with headings
  - Alternative text for images
  - Announcements for dynamic content changes
- Font scaling support (user accessibility settings)
- Reduce motion option for animations
- Semantic native components (React Native accessibility props)

**Multilingual Support**

- RTL (Right-to-Left) layout support for Arabic
  - Mirror layout for navigation
  - Text alignment changes
  - Icon flipping where appropriate (e.g., back button)
- LTR (Left-to-Right) for English
- Language toggle easily accessible
- Culturally appropriate imagery and colors
- Localized content (currency, date formats, phone numbers)
- Translation management system for all text

**Performance Considerations** (from elbaraka.layout.md)

- **Optimized images**:
  - Use react-native-fast-image (mandatory per elbaraka.layout.md)
  - Progressive loading for all images
  - Multiple resolutions (1x, 2x, 3x for retina)
  - Lazy loading for FlatLists
  - Image caching strategy
  - WebP or native image formats
- **Minimal bundle size**:
  - Code splitting where possible
  - Remove unused dependencies
  - Hermes engine for React Native (Android performance)
- **Fast initial load**:
  - Show skeleton screens immediately (800ms shimmer)
  - Progressive data loading
  - Cache API responses with Redis backend
  - Headers preserved during skeleton loading
- **FlatList optimization**:
  - Use getItemLayout where possible
  - Proper keyExtractor
  - windowSize optimization
  - removeClippedSubviews on Android
- **Offline support**:
  - Cache recently viewed products
  - Queue actions when offline
  - Sync when connectivity restored
  - Clear offline status indicator

### User Experience Principles

**Clarity & Simplicity**

- Clear visual hierarchy
- One primary action per screen
- Minimal text, maximum imagery
- Obvious call-to-actions
- Progressive disclosure (show details on demand)

**Efficiency & Speed**

- Quick access to frequently used features
- Search front and center
- One-tap reorder from history
- Smart defaults (delivery address, payment method)
- Autofill for forms
- Batch operations where appropriate

**Trust & Security**

- Secure payment indicators (lock icon, secure badge)
- Clear privacy policy
- Transparent pricing (no hidden fees)
- Order confirmation and receipts
- Delivery tracking
- Customer support easily accessible

**Feedback & Communication**

- Clear success messages (order placed, item added)
- Informative error messages with solutions
- Loading indicators for all async operations
- Progress indicators for multi-step processes
- Toast notifications for background actions
- Empty states with helpful guidance

**Delight & Engagement**

- Smooth animations and transitions
- Celebrate milestones (first order, loyalty rewards)
- Personalized recommendations
- Seasonal themes and special occasions
- Gamification elements (optional): points, badges
- Social sharing of products/lists

---

## 🔧 Technical Implementation Requirements

### Backend API Specifications

> **📋 NOTE**: Complete API documentation with all 72 production endpoints, request/response examples, authentication requirements, rate limiting, caching strategies, and security implementations is available in `apis.md`

**Quick Reference:**

- **Total Endpoints:** 72 (56 customer + 16 admin)
- **Base URL:** `/api/v1`
- **Authentication:** Laravel Sanctum (60-minute access tokens, 30-day refresh tokens)
- **Authorization:** Simple role ENUM (customer, admin) - NO Spatie Permission
- **API Documentation:** See `apis.md` for complete specifications

### Database Schema Requirements

> **📊 NOTE**: Complete MySQL 8.0+ schema with all tables, indexes, views, stored procedures, and triggers is available in `elbaraka_database.sql`

---

## 📊 PROJECT STATUS SUMMARY

### ✅ **PLANNING COMPLETE**

**Project Documentation** - 100% Complete

- Comprehensive requirements documented
- Technology stack defined
- Development phases outlined
- Feature specifications detailed
- API endpoints specified
- Database schema designed
- UI/UX guidelines established
- Security and performance requirements defined

### ⏳ **NEXT PHASE PRIORITIES**

**Phase 1: Project Setup & Foundation** (Ready to Start)

1. **Backend Setup**
   - Initialize Laravel project
   - Set up database (MySQL) and caching (Redis)
   - Configure Laravel Sanctum for API authentication
   - Create core database migrations
   - Set up API routing structure

2. **Mobile App Setup**
   - Initialize React Native project with TypeScript
   - Configure React Navigation
   - Set up state management (Redux Toolkit or Zustand)
   - Configure API client (Axios with interceptors)
   - Set up secure storage for tokens

3. **Admin Panel Setup**
   - Install Laravel Filament
   - Create admin user and authentication
   - Set up basic dashboard

4. **Development Tools**
   - Set up version control (Git)
   - Configure CI/CD pipeline
   - Set up development, staging, production environments
   - Configure error tracking (Sentry)

**Phase 2: Core Features Development**

1. **Authentication System**
   - User registration and login (mobile + backend)
   - Email/phone verification
   - Password reset flow
   - Profile management

2. **Product Catalog**
   - Product listing and browsing
   - Category navigation
   - Product details screen
   - Search functionality

3. **Shopping Cart**
   - Add/remove/update cart items
   - Cart persistence
   - Price calculation

4. **Basic Order Flow**
   - Checkout process
   - Order placement
   - Order history

### 🎯 **CURRENT PROJECT STATE**

- **Documentation**: Comprehensive and ready
- **Code**: Not started
- **Infrastructure**: Not set up
- **Testing**: Not started
- **Deployment**: Not configured

### 📈 **PROJECT METRICS (Planned)**

- **Mobile Screens**: ~25 main screens planned
- **API Endpoints**: ~60+ endpoints specified
- **Database Tables**: ~25 main tables designed
- **Admin Resources**: ~15 Filament resources planned
- **Development Time**: Phase 1-3 estimated 3-4 months
- **Team Size**: Recommended 2-3 developers (1 backend, 1-2 mobile)

**The project is now fully planned and documented. Ready to begin Phase 1: Project Setup & Foundation.**

---

## 📝 DEVELOPMENT NOTES

### Important Considerations

1. **Payment Integration**
   - Paymob integration requires merchant account setup
   - Test thoroughly in sandbox before production
   - Ensure compliance with payment card industry standards

2. **Mobile App Performance**
   - Implement image optimization and caching early
   - Use FlatList with proper optimization for product lists
   - Profile and eliminate performance bottlenecks before launch

3. **Multilingual Support**
   - Plan for RTL from the start, don't retrofit
   - Use a proper i18n library (react-i18next)
   - Store language preference and sync across devices

4. **Testing Strategy**
   - Write unit tests for critical business logic
   - Implement E2E tests for main user flows
   - Test on real devices, not just simulators
   - Test offline scenarios and poor connectivity

5. **Scalability Planning**
   - Design database with indexing from the start
   - Implement Redis caching early for frequently accessed data
   - Plan for horizontal scaling of backend
   - Consider CDN for image delivery

<!-- ### Future Enhancement Ideas

- **Loyalty Program**: Points system for rewards and discounts
- **Subscription Orders**: Recurring orders for regular items
- **Gift Cards**: Digital gift card purchases and redemption
- **Recipe Integration**: Recipes with shopping list generation
- **Smart Lists**: AI-powered shopping list suggestions
- **Meal Planning**: Weekly meal planner with automatic cart filling
- **Voice Assistant**: Integration with Siri/Google Assistant
- **Augmented Reality**: AR for visualizing products
- **Social Features**: Share lists, gift sharing, group orders
- **Sustainability**: Carbon footprint tracking, eco-friendly options -->

---

**Document Version**: 1.0
**Last Updated**: November 18, 2025
**Maintained By**: ElBaraka Development Team

---

## Agent Update Log

- 2026-01-25: Implemented complaints + favorites backend APIs with attachments, wired frontend screens/store to APIs, aligned schema/docs. Pending user testing/verification.
- 2026-01-25: Added complaint/favorite seed data for user_id=2 and full feature documentation (FEATURES_COMPLAINTS_FAVORITES.md).
- 2026-01-25: Improved complaint order selector UI (bottom sheet list) and ensured complaint list refetch behavior.
- 2026-01-26: Upgraded promo code engine backend (CartService/OrderService/CheckoutService/CheckoutController) to support applies_to and BOGO logic, consistent cart-based totals, first-order eligibility, and cart-based promo validation totals.
- 2026-01-26: Frontend cart flow now persists applied promo code in state for checkout, updates types for BOGO/applies_to, and clears promo state on cart mutations.
- 2026-01-26: Ran promo upgrade migrations (promo_codes alter + promo_code_categories/products + promo_code_bogo_rules).
- 2026-01-26: Seeded promo_codes for all test cases (order/category/product/free_delivery/first_order/bogo) and linked target tables.
- 2026-01-26: Updated promo seeder to use deterministic targets (lowest category IDs + product barcodes) and re-seeded.
- 2026-01-26: Completed promo-code audit across backend + frontend (no code changes); documented gaps vs hypermarket requirements.
- 2026-01-26: Implemented promo finalization (card success, wallet success, COD delivery endpoint), promo snapshot on orders, reworked promo validation payloads, and added promo visibility + revalidation UI across cart/checkout/orders/success screens.
- 2026-01-26: Fixed order-success promo rendering conditional syntax error.
- 2026-01-26: Added safe migration `2026_01_26_211532_add_promo_code_snapshot_to_orders_table.php` and ran it to ensure `orders.promo_code_snapshot` exists; verified `frontend/app/(tabs)/orders.tsx` syntax.
- 2026-01-26: Investigated FIRSTORDER promo rejection for user_id 7; DB shows 0 paid/completed orders and promo config valid, but carts are guest-only (no user_id), indicating auth/user not attached during cart/apply promo.
- 2026-01-26: Investigated remove promo failure; CartController::removePromo uses `$request->session()->forget()` on API routes (no session middleware), likely throwing "Session store not set on request" and returning 500.
- 2026-01-26: Fixed remove promo failure by removing session access from `CartController::removePromo` (stateless API); now returns cart details without 500.
- 2026-01-26: Investigated SUPER30 per-user limit; promo_code_usage has a row for user_id 7, but latest cart is guest-only (user_id NULL), meaning apply-promo is likely unauthenticated and bypasses per-user limit.
- 2026-01-26: Added public Offers APIs (`GET /offers`, `GET /offers/summary`) with OfferService to build promo-based offers, eligibility states, targets, filters, and sorting (backend only).
- 2026-01-26: Replaced Offers tab UI with API-driven promo offers (search, filters, eligibility pills, CTAs) and added home offers banner using `/offers/summary`.
- 2026-01-26: Enhanced Offers tab with Hot/Ending Soon sections and skeleton loading cards aligned to layout.md.
- 2026-01-26: Added shimmer animation to offers skeletons and converted Hot/Ending Soon sections to horizontal carousels with compact cards.
- 2026-01-26: Redesigned Offers tab UX with guest note, bottom-sheet filters, user-friendly card hierarchy, copy code, and updated home banner with active offer count + max savings.
- 2026-01-26: Updated Offers cards (copy button feedback, clearer product deals, simplified CTAs, timing badge logic) and added Offer Items screen for full product lists with discounted prices.
- 2026-01-26: Refined Offers UX per feedback (copy button inline, removed eligibility badges/messages, timing badge logic, clearer product deals) and added /offers/items screen to list all offer products with discounted prices.
- 2026-01-27: Fixed offer items price formatting guards, prevented BOGO items screen from showing whole-cart state, made offer items cards link to product detail, and improved offer validity/badge visuals with distinct timing colors.
- 2026-01-27: Switched category offer items to category cards with image grid and click-through to category products, and added offer-aware pricing on home/category/product screens via active offer lookup.
- 2026-01-27: Added offer-aware pricing on favorites, surfaced category deal badges on Categories tab, standardized currency labels to EGP, and updated splash image to assets/images/splash.webp.
- 2026-01-27: Updated app name to CART in app.json/app config and aligned sample env APP_NAME for splash/app label consistency.
- 2026-01-27: Converted splash.webp to splash.png for Expo prebuild compatibility and updated app.json splash image path.
- 2026-01-27: Added Gradle TLS protocol flags and plugin repositories to address Android build TLS handshake failures.
- 2026-01-27: Added android/local.properties with sdk.dir pointing to the default Android SDK path to fix missing ANDROID_HOME during Expo Android build.
