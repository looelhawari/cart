# CART (ElBaraka) — Hypermarket Mobile Shopping Platform

## Project Overview

CART (ElBaraka branding) is a production-grade, mobile-first hypermarket shopping platform connecting customers with a comprehensive grocery/household marketplace. The platform provides product discovery, order management, delivery tracking, payment processing, and customer-store communication across **four applications**:

1. **Customer Mobile App** (React Native / Expo)
2. **Driver Mobile App** (React Native / Expo)
3. **Admin Dashboard** (React / Vite / Tailwind)
4. **Backend API** (Laravel 11)

### Technology Stack

| Layer                  | Technology                                                                |
| ---------------------- | ------------------------------------------------------------------------- |
| **Backend API**        | Laravel 11 (PHP 8.2+), MySQL 8.0+, Redis                                  |
| **Customer App**       | React Native 0.81 / Expo SDK 54, TypeScript, Zustand, TanStack Query v5   |
| **Driver App**         | React Native 0.81 / Expo SDK 54, TypeScript, Expo Router 6                |
| **Admin Dashboard**    | React 18, Vite 5, Tailwind CSS 3.4, Radix UI, Recharts, Leaflet           |
| **Payments**           | Paymob (Visa/Mastercard, MOTO + 3DS, tokenized saved cards, card refunds) |
| **Real-time**          | Laravel Echo + Pusher (WebSockets) / Laravel Reverb                       |
| **Push Notifications** | Expo Push Notifications (expo-notifications)                              |
| **Image CDN**          | Cloudinary                                                                |
| **Maps**               | OpenStreetMap / Leaflet / Nominatim (free, no API key)                    |
| **Auth**               | Laravel Sanctum (access + refresh tokens), OTP email verification         |
| **Social Login**       | Google (native SDK) + Apple Authentication                                |
| **PDF Generation**     | DomPDF (invoices), jsPDF (admin reports)                                  |
| **i18n**               | English + Arabic (full RTL support)                                       |
| **Background Tasks**   | Laravel Queue (jobs), Expo TaskManager (driver location)                  |

### Design Philosophy

Fresh, premium, and delightful design with a professional grocery/retail theme following the **ElBaraka Design System** defined in `layout.md`. The design features emerald green as primary color (#16a34a), Poppins typography, floating gradient orbs, and smooth micro-interactions. Every pixel must feel fresh, premium, and mobile-optimized.

---

## 🚨 SPECIAL INSTRUCTIONS FOR AGENTS

> **IMPORTANT**: Any agent working on this project MUST read and follow these special instructions before proceeding with any task, before starting with any task/subtask always involve me in the loop ask me which path should u take/task u would start working on, don't modify any existing logic or code without asking me first, after u are done with anything you have to update this file, also let me test each change u make and confirm it.

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

---

## 📊 PROJECT STATUS — MASTER OVERVIEW

**Overall Project Completion: ~95%**

| Component              | Status                | Completion |
| ---------------------- | --------------------- | ---------- |
| Backend API            | ✅ Production-ready   | 98%        |
| Customer Mobile App    | ✅ Feature-complete   | 95%        |
| Admin Dashboard        | ✅ Feature-complete   | 95%        |
| Driver App             | ✅ Functional         | 90%        |
| Paymob Payments        | ✅ Complete (sandbox) | 100%       |
| Database & Migrations  | ✅ Complete           | 100%       |
| i18n (EN + AR)         | ✅ Complete           | 95%        |
| Real-time (WebSockets) | ✅ Complete           | 90%        |
| Push Notifications     | ✅ Complete           | 90%        |
| Testing & QA           | 🔄 Partial            | 30%        |
| Deployment / CI/CD     | ⏳ Pending            | 10%        |

---

## ✅ BACKEND API — COMPLETE FEATURE LIST (Laravel 11)

### Authentication & User Management ✅ DONE

- [x] **Registration** with email + password + name + phone (RegisterRequest validation)
- [x] **OTP email verification** (8-digit, 10-min expiry, rate-limited)
- [x] **Login** with Sanctum token (access + refresh tokens)
- [x] **Token refresh** with concurrent-safe handling
- [x] **Forgot password** via OTP email
- [x] **Reset password** via OTP verification
- [x] **Change password** (authenticated, current password required)
- [x] **Social login** — Google OAuth + Apple Authentication (SocialAuthController)
- [x] **Google account relinking** for existing accounts
- [x] **Profile management** — get/update profile, avatar upload/delete (Cloudinary)
- [x] **Email change** with OTP verification flow
- [x] **Check email/phone availability** endpoints
- [x] **Password confirmation** middleware for sensitive operations
- [x] **Resend OTP** with rate limiting
- [x] **Login history tracking** (UserLoginHistory model)
- [x] **Multi-role support** — customer, admin, driver (User.role ENUM)

### Products & Catalog ✅ DONE

- [x] **Product listing** with search, filter, sort, pagination
- [x] **Full-text search** (MySQL FULLTEXT index on products)
- [x] **Single product detail** by barcode
- [x] **Featured products** endpoint
- [x] **Flash deals** endpoint
- [x] **Category listing** with hierarchical parent/child structure
- [x] **Featured categories with products**
- [x] **Category products** with filtering and pagination
- [x] **Product images** via Cloudinary CDN
- [x] **Search suggestions** — Redis-cached typeahead + popular search terms (SearchSuggestionsController)
- [x] **Product watchlist** — price drop / back-in-stock alerts (WatchlistController)
- [x] **Flash sales** — active, by ID, upcoming (FlashSaleController)

### Shopping Cart ✅ DONE

- [x] **Guest cart** with session ID (RedisCartService)
- [x] **Authenticated cart** with database persistence (CartService)
- [x] **Hybrid DB + Redis cart** architecture
- [x] **Add/update/remove items** with stock validation
- [x] **Clear cart**
- [x] **Promo code apply/remove** on cart
- [x] **Per-product quantity limits** (max-per-order enforcement)
- [x] **Cart abandonment reminders** (CartReminder model + ProcessCartAbandonmentReminders job)

### Checkout & Orders ✅ DONE

- [x] **Multi-step checkout** — delivery slots → address → payment → order summary (CheckoutController)
- [x] **Delivery time slot selection**
- [x] **Address selection** with pre-validation
- [x] **Payment method selection** (new card, saved card, COD)
- [x] **Order summary calculation** (subtotal, delivery fee, discount, tax, total)
- [x] **Promo code validation** at checkout
- [x] **Order creation** with inventory deduction (OrderService)
- [x] **Order listing** with status filtering and pagination
- [x] **Order detail** with items, timeline, payment info
- [x] **Order status tracking** — real-time via WebSocket (OrderStatusUpdated event)
- [x] **Order cancellation** — full and partial item cancel (OrderCancellationService)
- [x] **Cancellation reasons** endpoint
- [x] **Reorder** from previous order
- [x] **Invoice generation** — PDF via DomPDF (InvoiceService)
- [x] **Invoice download/email** endpoints
- [x] **Order status history** tracking (OrderStatusHistory model)
- [x] **Promo code snapshot** saved on orders for audit
- [x] **Async order processing** (ProcessOrderAsync job)

### Payment Gateway (Paymob) ✅ DONE

- [x] **Paymob Intention API** integration (PaymobService)
- [x] **3-step payment flow** — auth → order reg → payment key
- [x] **New card payment** with 3DS via iframe/WebView
- [x] **Saved card payment** with MOTO flow (PaymentDecisionService)
- [x] **Card tokenization** — save card during payment (PaymentTokenService)
- [x] **HMAC SHA-512 webhook verification** on all callbacks
- [x] **Payment status polling** endpoint
- [x] **Payment pre-check** validation
- [x] **Processed callback** (webhook from Paymob)
- [x] **Response callback** (redirect from Paymob)
- [x] **Payment confirmation** service (PaymentConfirmationService)
- [x] **Payment flow tracking** — MOTO vs 3DS decision tree
- [x] **Card refunds** via Paymob API (RefundService)
- [x] **Refund webhook handler** (RefundWebhookController) with HMAC
- [x] **Refund reconciliation**
- [x] **Payment recovery** for interrupted payments
- [x] **Saved payment methods** — list, set default, delete with password confirmation (PaymentMethodController)

### Wallet & Refunds ✅ DONE

- [x] **User wallet** with balance tracking (UserWallet model)
- [x] **Wallet transactions** — credits, debits with idempotency keys (WalletTransaction model)
- [x] **Wallet-based refunds** — full and partial (RefundController)
- [x] **Card-based refunds** via Paymob (AdminRefundDashboardController)
- [x] **Refund history** per order
- [x] **Order refund records** (OrderRefund model)

### Favorites / Wishlist ✅ DONE

- [x] **Add to favorites** (by product barcode)
- [x] **Remove from favorites**
- [x] **List favorites** with product details
- [x] **Form request validation** (StoreFavoriteRequest)

### Complaints & Support ✅ DONE

- [x] **Submit complaint** with category, priority, related order (ComplaintController)
- [x] **File/image attachments** on complaints (ComplaintAttachment model)
- [x] **Complaint status tracking** — open, in_progress, awaiting_response, resolved, closed
- [x] **Priority levels** — low, medium, high, urgent
- [x] **Message thread** within complaints (ComplaintMessage model)
- [x] **Close complaint** by customer
- [x] **Escalate to human agent**
- [x] **Smart bot auto-replies** (SmartBotService) with conversation context
- [x] **Bot satisfaction rating** (rateBot endpoint)
- [x] **Typing indicators** via Pusher (UserTyping event)
- [x] **Real-time chat** via WebSocket (ComplaintMessageSent event)
- [x] **Admin support tickets** — full lifecycle CRUD (SupportController)
- [x] **Agent assignment** to tickets
- [x] **Canned responses** for support agents (CannedResponseController)
- [x] **Smart suggestions** for agents
- [x] **Support analytics** — resolution time, categories, volumes

### Reviews & Ratings ✅ DONE

- [x] **Product reviews** — CRUD with validation (ReviewController V1)
- [x] **Review eligibility check** (must have purchased product)
- [x] **Helpful/not-helpful votes**
- [x] **Driver ↔ Customer bidirectional ratings** (RatingController)
- [x] **Admin review moderation** — approve/reject, respond, bulk operations (AdminReviewController)
- [x] **Review analytics** dashboard
- [x] **Product rating aggregates** synced to products table

### Promotions & Promo Codes ✅ DONE

- [x] **Promo code engine** — percentage, fixed_amount, free_delivery, BOGO (PromoCodeService)
- [x] **Promo code targeting** — applies_to: order, category, product (PromoCodeCategory/Product)
- [x] **BOGO rules** — buy X get Y free (PromoCodeBogoRule model)
- [x] **Per-user usage limits** (PromoCodeUsage tracking)
- [x] **First-order eligibility** check
- [x] **Promo code validation** with discount preview
- [x] **Available promo codes** for user browsing
- [x] **Promo recommendations** and suggestions
- [x] **Promo usage history** per user
- [x] **Marketing promotions/banners** — CRUD, featured, scheduling (PromotionService)
- [x] **Promotion products** linking
- [x] **Offers aggregation** — combines promos + promotions for mobile (OffersController)
- [x] **Offer summary stats** endpoint

### Delivery Zones & Geo-fencing ✅ DONE

- [x] **Delivery zones** with polygon geo-fencing (DeliveryZone model)
- [x] **Coverage check** by latitude/longitude (DeliveryZoneService)
- [x] **Delivery fee calculation** based on zone
- [x] **Address validation** against zone boundaries
- [x] **Reverse geocoding** via Nominatim/OpenStreetMap (GeoHelper)
- [x] **Zone schedules** — weekday-based delivery availability (DeliveryZoneSchedule)
- [x] **Admin zone management** — CRUD with polygon drawing, analytics, reordering

### Driver System ✅ DONE

- [x] **Driver dashboard** — stats, active orders, availability (DriverController)
- [x] **Online/offline toggle** (availability status)
- [x] **GPS location updates** with background tracking support
- [x] **Order lifecycle** — accept → pickup → deliver, with reject option
- [x] **Driver performance stats** — deliveries, rating, earnings
- [x] **Real-time driver location** broadcast (DriverLocationUpdated event)
- [x] **Admin driver management** — CRUD, assign to orders, performance metrics, live locations (AdminDriverController)

### Notifications ✅ DONE

- [x] **Push notifications** via Expo (PushNotificationService)
- [x] **Enterprise notification system** (EnterpriseNotificationService) — broadcast, targeted, scheduled
- [x] **Notification inbox** — list, unread count, mark read, delete (NotificationController)
- [x] **Notification preferences** — granular category toggles
- [x] **Device token management** — save/remove push tokens
- [x] **Notification templates** (NotificationTemplate model)
- [x] **Notification analytics** — delivery tracking (NotificationAnalytics, NotificationDelivery)
- [x] **Admin notification management** — broadcast, targeted send, resend, analytics (AdminNotificationController)
- [x] **Background jobs**:
  - [x] Cart abandonment reminders (ProcessCartAbandonmentReminders)
  - [x] Coupon expiration reminders (ProcessCouponExpirationReminders)
  - [x] Flash sale notifications (ProcessFlashSaleNotifications)
  - [x] Product watchlist alerts (ProcessProductWatchlistNotifications)
  - [x] Reorder reminders (ProcessReorderReminders)
  - [x] Push receipt checking (CheckPushReceipts)
  - [x] Order status notifications (SendOrderNotification)
  - [x] Broadcast chunk processing (SendBroadcastChunk)
  - [x] Delayed/scheduled notifications (SendDelayedNotification)
  - [x] Pending payment reconciliation (ReconcilePendingPayments)

### Address Management ✅ DONE

- [x] **Address CRUD** with coordinates/geo-processing (AddressController)
- [x] **Set default address**
- [x] **Coordinate storage** (latitude/longitude)
- [x] **Area field** for zone matching
- [x] **Form request validation** (StoreAddressRequest, UpdateAddressRequest)
- [x] **Backfill coordinates** artisan command (BackfillAddressCoordinates)

### Store Settings & CMS ✅ DONE

- [x] **Dynamic store settings** — key/value configuration (StoreSetting model)
- [x] **Store open/closed status** with working hours (StoreSettingsController)
- [x] **Delivery settings** — fee, minimum order, free delivery threshold
- [x] **Static CMS pages** — Terms, Privacy, About (StaticPage model) with version history
- [x] **Admin settings management** — CRUD, cache clearing (AdminStoreSettingsController)
- [x] **Admin static page management** — edit, toggle status, history (Admin StaticPageController)

### Admin Analytics & Reports ✅ DONE

- [x] **Basic analytics** — dashboard KPIs, product performance, customer insights (AnalyticsController)
- [x] **Comprehensive analytics** — 10 report types (ComprehensiveAnalyticsController):
  - [x] Sales analytics
  - [x] Customer analytics
  - [x] Product analytics
  - [x] Order analytics
  - [x] Marketing analytics
  - [x] Financial analytics
  - [x] Inventory analytics
  - [x] Operational analytics
  - [x] Overview dashboard
  - [x] CSV export
- [x] **Financial dashboard** — transactions, promo code analytics (FinancialController)
- [x] **Quick stats** with Redis caching

### Admin Management ✅ DONE

- [x] **Product management** — CRUD, image upload (Cloudinary), stock toggle, low-stock alerts (AdminProductController)
- [x] **Category management** — CRUD, image upload (AdminCategoryController)
- [x] **Order management** — list, detail, status updates, cancellation, filter by status (AdminOrderController)
- [x] **Customer management** — list, detail, notes, password reset, activity history, stats (CustomerController)
- [x] **Admin user management** — CRUD (UserController)
- [x] **RBAC** — roles, permissions, role-permission assignment (RbacController)
- [x] **Admin promo codes** — full CRUD, analytics, comparison, usage tracking, bulk ops, CSV export, duplicate, notification sending (AdminPromoCodeController)

### Audit & Logging ✅ DONE

- [x] **Activity logs** — user actions with IP/user-agent tracking (ActivityLog model)
- [x] **Admin audit logs** — detailed admin action trail (AdminLog model, LogAdminActivity middleware)
- [x] **Admin log viewer** — list, stats, export, entity history, per-user activity (AdminLogController)
- [x] **Activity log viewer** — list, stats, user filter, entity types, CSV export (ActivityLogController)

### Security & Infrastructure ✅ DONE

- [x] **Enterprise rate limiting** — Token Bucket algorithm, Redis Lua scripts, IP blacklisting (RateLimiterService + EnterpriseRateLimit middleware)
- [x] **Rate limit admin** — stats, config, offenders, blacklist/unblacklist IP (RateLimitController)
- [x] **Rate limit CLI** management (RateLimitManageCommand)
- [x] **Security headers middleware** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection (SecurityHeaders)
- [x] **Force JSON response** middleware (ForceJsonResponse)
- [x] **Gzip compression** middleware (GzipCompress)
- [x] **CORS** configured for mobile app
- [x] **Email verification gate** middleware (EnsureEmailIsVerified)
- [x] **Admin middleware** (role check)
- [x] **Driver middleware** (role check)
- [x] **Permission check middleware** (RBAC CheckPermission)
- [x] **Password confirmation middleware** (RequirePasswordConfirmation)
- [x] **Health checks** — ping, detailed system status, Prometheus-style metrics (HealthController)
- [x] **Performance indexes** — multiple migrations adding optimized DB indexes
- [x] **Full-text search index** on products

### Email System ✅ DONE

- [x] **OTP emails** (OtpMail) — sent via async job (SendOtpEmail)
- [x] **Invoice emails** (InvoiceMail) — with PDF attachment
- [x] **Refund receipt emails** (RefundReceiptMail)

### Real-time Broadcasting ✅ DONE

- [x] **Pusher/Reverb** WebSocket channels configured
- [x] **Private user channel** — `App.Models.User.{id}` (notifications)
- [x] **Complaint chat channel** — `complaints.{id}` (real-time messaging)
- [x] **Order tracking channel** — `order.{orderId}.tracking` (driver location)
- [x] **Events**: ComplaintMessageSent, DriverLocationUpdated, OrderStatusUpdated, UserTyping

### Database (82 migrations, 55 models) ✅ DONE

- [x] Users, Otp, UserLoginHistory, UserPurchasePattern
- [x] Products, Categories (hierarchical), FlashSale, FlashSaleProduct
- [x] Carts, CartItems, CartReminder
- [x] Orders, OrderItems, OrderStatusHistory, OrderRefund
- [x] Addresses (with coordinates)
- [x] PaymobPayment, PaymentTransaction, PaymentMethod
- [x] UserWallet, WalletTransaction
- [x] Favorites
- [x] Complaints, ComplaintMessages, ComplaintAttachments
- [x] SupportTickets, TicketMessages
- [x] Reviews, RatingLog
- [x] Promotions, PromoCode, PromoCodeBogoRule, PromoCodeCategory, PromoCodeProduct, PromoCodeUsage
- [x] DeliveryZone, DeliveryZoneSchedule
- [x] Notifications, NotificationAnalytics, NotificationDelivery, NotificationPreference, NotificationRead, NotificationTemplate
- [x] StoreSettings, StaticPages
- [x] BotConversationContext, BotResponse, CannedResponse
- [x] CustomerNote
- [x] ActivityLog, AdminLog
- [x] Roles, Permissions (RBAC)
- [x] ProductWatchlist

### Seeders ✅ DONE

- [x] DatabaseSeeder (master)
- [x] AddressSeeder
- [x] BotResponseSeeder (smart bot templates)
- [x] ComplaintFavoriteSeeder
- [x] NotificationTemplatesSeeder
- [x] PaymentMethodSeeder
- [x] PromoCodeSeeder (all types: order, category, product, free_delivery, first_order, BOGO)
- [x] RbacSeeder (roles & permissions)
- [x] StaticPagesSeeder (Terms, Privacy, About)
- [x] SQL seed files for products, categories, subcategories

---

## ✅ CUSTOMER MOBILE APP — COMPLETE FEATURE LIST (React Native / Expo)

### App Configuration ✅ DONE

- [x] **App Name**: CART Hypermarket (`com.cart.hypermarket`)
- [x] **Expo SDK 54**, React Native 0.81, React 19.1, New Architecture enabled
- [x] **State Management**: Zustand 5 with AsyncStorage persistence (migration to v3)
- [x] **Data Fetching**: TanStack React Query v5 (5-min stale, 10-min GC)
- [x] **Routing**: Expo Router v6 (file-based, typed routes)
- [x] **Real-time**: Laravel Echo + Pusher WebSockets
- [x] **Backend API**: `https://cartshop.site/api/v1`
- [x] **EAS Project**: Configured for builds

### Authentication ✅ DONE

- [x] **Email/password login** with form validation
- [x] **Registration** with multi-field validation + OTP email verification
- [x] **Social login** — Google (native SDK) + Apple Authentication (SocialIcons component)
- [x] **Biometric login** — fingerprint, Face ID, iris (biometricAuth service, expo-local-authentication)
- [x] **Forgot/reset password** via OTP flow
- [x] **Token refresh** with concurrent-safe handling
- [x] **Secure token storage** (SecureStore for biometric credentials)
- [x] **Password confirmation modal** for sensitive operations (usePasswordConfirm hook)
- [x] **Role-based routing** (customer vs driver auto-redirect in \_layout.tsx)
- [x] **Auth state check** on app startup with stored token validation
- [x] **Guest mode** — browse products/categories without login (GuestModal for cart/orders)

### Screens (70+ files) ✅ DONE

**Onboarding & Welcome**

- [x] Welcome screen with branding, floating orbs, CTAs
- [x] 3-screen onboarding carousel with skip option
- [x] First-time detection (shown once)

**Home Screen**

- [x] Time-of-day greeting
- [x] Notification bell with unread badge
- [x] Search bar
- [x] Hero banner carousel (HeroBanner component, auto-scroll promotions)
- [x] Category horizontal scroll
- [x] Featured products grid (2-column, ProductCard components)
- [x] Flash deals section with countdown timers
- [x] Categories with products sections
- [x] Floating orbs background (FloatingOrbs component)
- [x] Pull-to-refresh
- [x] Skeleton loading (SkeletonLoader, 800ms shimmer)
- [x] Offer banner with active offer count + max savings
- [x] Offline indicator

**Categories Tab**

- [x] Grid layout with category cards (image backgrounds, LinearGradient overlays)
- [x] Product count badges
- [x] Offer pricing overlay on categories with active deals
- [x] Pull-to-refresh
- [x] Floating orbs

**Category Detail**

- [x] Hierarchical display (main → subcategories)
- [x] Subcategory chips (horizontal scroll, tap to filter)
- [x] Breadcrumb navigation
- [x] Product grid with subcategory filtering
- [x] Sorting and filtering
- [x] Pull-to-refresh, skeleton loading, empty state

**Product Detail**

- [x] Image gallery with aspect ratio
- [x] Product info (name, description, nutrition facts)
- [x] Pricing — normal, sale, offer-aware pricing
- [x] Stock status
- [x] Rating stars (RatingStars component)
- [x] Quantity selector
- [x] Add to Cart CTA
- [x] Favorites toggle
- [x] Related products
- [x] Reviews section
- [x] Skeleton loading, error handling

**Product Reviews**

- [x] Reviews listing per product
- [x] Rating breakdown
- [x] User info, dates, helpful/not-helpful buttons

**Search**

- [x] Full-screen search with auto-focus
- [x] Typeahead suggestions (products, categories, offers) via searchApi
- [x] Recent searches (persisted, max 20)
- [x] Trending/popular searches
- [x] Product results grid
- [x] Clear search history

**Cart Tab**

- [x] Cart items list with images
- [x] Quantity controls with per-product max limits (quantityLimits utility)
- [x] Remove item
- [x] Price breakdown (subtotal, delivery, discount, total)
- [x] Promo code apply/remove input
- [x] Delivery fee display
- [x] Guest modal (prompts login for checkout)
- [x] Empty cart state
- [x] Optimistic updates with rollback

**Checkout Flow (3 steps)**

- [x] Address selection screen — saved addresses, add new
- [x] Payment selection — new card / saved card / COD
- [x] Confirmation — order summary review, place order, terms acceptance

**Payment**

- [x] PaymentWebView component (Paymob iframe)
- [x] Payment return handler
- [x] Payment recovery after app crash (paymentRecovery service)
- [x] User-friendly error messages (paymentMessages service)
- [x] PaymentResultModal (success/failure display)
- [x] SavedCardsList component

**Order Success**

- [x] Success animation
- [x] Order number display
- [x] Promo savings breakdown
- [x] Track Order / Continue Shopping CTAs

**Orders Tab**

- [x] Order history with status badges
- [x] Status filtering
- [x] Guest auth gate
- [x] Pull-to-refresh

**Order Detail**

- [x] Items list with quantities/prices
- [x] Promo code info and savings
- [x] Delivery information
- [x] Payment details
- [x] Order timeline (OrderStatusBar component)
- [x] Cancel order / refund request
- [x] Reorder functionality

**Order Tracking**

- [x] Live driver location on map (OrderTrackingMap component, Leaflet/OSM via WebView)
- [x] Real-time updates via Pusher WebSocket
- [x] Delivery timeline progress
- [x] ETA display
- [x] Driver info

**Order Rating**

- [x] Star rating selector (product/order/store)
- [x] Written review input
- [x] Submit / skip

**Offers Tab**

- [x] Promotions + promo code offers combined
- [x] Countdown timers for expiring offers (CountdownTimer component)
- [x] Offer types: percentage, fixed_amount, free_delivery, BOGO
- [x] Copy promo code to clipboard
- [x] Eligibility display
- [x] Search and filters (bottom sheet)
- [x] Hot / Ending Soon sections (horizontal carousels)
- [x] Skeleton loading

**Offers Screens**

- [x] Offer detail page
- [x] Offer items listing — products with discounted prices, category cards

**Promotions Screens**

- [x] Promotion detail page
- [x] Promotion products listing

**Flash Deals**

- [x] Countdown timer
- [x] Deal products grid
- [x] Stock remaining indicator

**Profile Tab**

- [x] User avatar and name
- [x] Order count stats
- [x] Navigation: Edit Profile, Addresses, Payment Methods, Favorites, Settings, Help, Complaints, About

**Edit Profile**

- [x] Name, phone, DOB, gender fields
- [x] Avatar upload/delete
- [x] Save changes with validation

**Change Password**

- [x] Current/new/confirm password fields
- [x] Password strength indicator

**Change Email**

- [x] New email with OTP verification flow

**Addresses Management**

- [x] Addresses list with default indicator
- [x] Add/edit address with **map picker** (MapAddressPicker component — Leaflet + OpenStreetMap + Nominatim geocoding)
- [x] Set default address
- [x] Delete address
- [x] Delivery zone coverage check

**Payment Methods**

- [x] Saved cards list (last 4 digits, brand icons)
- [x] Set default payment
- [x] Delete card (with password confirmation)
- [x] Add new card screen

**Favorites / Wishlist**

- [x] Product grid with favorite items
- [x] Quick add to cart
- [x] Remove from favorites
- [x] Optimistic sync with backend
- [x] Empty state

**Wallet**

- [x] Balance display
- [x] Transaction history

**Settings**

- [x] Language selection (Arabic/English) with RTL toggle + app reload
- [x] Biometric login toggle
- [x] App preferences

**Notification Preferences**

- [x] Granular toggles (12+ categories: order, delivery, marketing, cart reminders, etc.)
- [x] Quiet hours

**Help & Support**

- [x] Contact support info

**Complaints / Support Tickets**

- [x] Complaints list with status badges
- [x] Submit new complaint (category, subject, description, file/image attachments)
- [x] Complaint chat thread (user + bot + agent replies)
- [x] Bot satisfaction rating
- [x] Escalate to agent
- [x] Close complaint

**About Section**

- [x] About page (fetched from CMS, rendered as HTML — StaticPageScreen + HtmlContentRenderer)
- [x] Privacy Policy (CMS)
- [x] Terms & Conditions (CMS)

**Notifications Screen**

- [x] Notification list with pagination
- [x] Read/unread indicators
- [x] Mark read / mark all read
- [x] Delete
- [x] Pull-to-refresh

**Driver Module (In-app)**

- [x] Driver dashboard — active orders, availability toggle, zone info, today's stats
- [x] Driver order detail — items, customer info, delivery address, status actions
- [x] Driver statistics — earnings, ratings, delivery time

### Components Library (27 components) ✅ DONE

- [x] AnimatedSplash (Lottie)
- [x] BottomSheet (rounded-t-3xl, swipe dismiss)
- [x] Button (primary/secondary/accent, active:scale-95, 48dp touch targets)
- [x] ConfirmDialog
- [x] CountdownTimer (flash deals, offers)
- [x] FloatingOrbs (3+ animated gradient orbs)
- [x] GuestModal (auth gate)
- [x] HeroBanner (auto-scroll promotions)
- [x] HtmlContentRenderer (CMS pages)
- [x] MapAddressPicker (Leaflet + OSM + Nominatim)
- [x] OfflineIndicator (network status banner)
- [x] OrderStatusBar (progress indicator)
- [x] OrderTrackingMap (live driver on map)
- [x] PasswordConfirmModal
- [x] PaymentResultModal
- [x] PaymentWebView (Paymob iframe)
- [x] ProductCard (image, price, sale badge, favorite, add-to-cart)
- [x] PromotionCard
- [x] RateLimitBanner (429 handler UI)
- [x] RatingStars
- [x] SaleBadge (overlay)
- [x] SavedCardsList
- [x] SkeletonLoader (800ms shimmer)
- [x] SocialIcons (Google/Apple login buttons)
- [x] StaticPageScreen (CMS renderer)
- [x] Toast (success/error/warning/info, auto-dismiss)

### Services (37 service files) ✅ DONE

**Core:**

- [x] httpClient — centralized HTTP, auto auth token, 401 handling
- [x] rateLimiter — enterprise 429 handler, exponential backoff, priority queue
- [x] notificationService — push registration, badges, foreground/background handling (~888 lines)
- [x] backgroundNotificationTask — expo-task-manager background handler
- [x] biometricAuth — fingerprint/Face ID/iris, SecureStore credential management
- [x] socialAuth — Google native SDK + Apple Authentication
- [x] echo — Laravel Echo + Pusher WebSocket singleton

**API Services (24 files):**

- [x] authApi — register, login, verify, OTP, social, profile, logout
- [x] profileApi — get/update profile, avatar, change password/email, Google relink
- [x] cartApi — guest session, CRUD, promo apply/remove
- [x] productsApi — list, featured, flash deals, single product, caching
- [x] categoryApi — list, featured-with-products, single, category products
- [x] orderApi — list, detail, place, cancel, refund, reorder (~600 lines)
- [x] checkoutApi — delivery slots, address, payment, summary, place order
- [x] offersApi — list with filters, summary stats
- [x] promotionApi — list, featured, detail, products
- [x] promoCodeApi — validation at checkout
- [x] favoritesApi — list, add, remove
- [x] reviewsApi — product reviews, create, update, delete, vote, report
- [x] searchApi — typeahead suggestions, popular/trending
- [x] complaintsApi — list, create, detail, reply, rate bot, escalate, close
- [x] addressApi — CRUD, set default
- [x] notificationApi — token save/remove
- [x] trackingApi — live driver location, timeline, ETA
- [x] driverApi — dashboard, availability, status updates, stats
- [x] deliveryZoneApi — zones, coverage check, fee calc, address validation, reverse geocode
- [x] storeApi — open/close status, working hours, delivery settings
- [x] paymentMethodsApi — CRUD, payment initiation (new/saved card), status polling

**Payment Services:**

- [x] paymentMessages — user-friendly Paymob error mapping
- [x] paymentRecovery — pending payment persistence + recovery after app crash

**Cache Services:**

- [x] apiCache — dual-layer (in-memory + AsyncStorage), TTL-based, cache-first/network-first strategies
- [x] imageCache — file system cache (500MB max, 7-day expiry), in-memory URL cache
- [x] networkDetector — online/offline detection, connection type
- [x] reviewsCache — offline-first with TTL fresh check

### State Management (Zustand Store) ✅ DONE

- [x] App state (onboarding completion)
- [x] Auth (login, register, verify, social login, profile, auth status check)
- [x] Cart (API-synced, optimistic updates with rollback, promo code)
- [x] Favorites (fetch, toggle with optimistic sync)
- [x] Addresses (CRUD, set default)
- [x] Payment methods (CRUD, set default)
- [x] Orders (list, add, cancel)
- [x] Checkout (selected address/payment/promo)
- [x] Search (recent searches, persisted, max 20)
- [x] AsyncStorage persistence with migration

### Hooks ✅ DONE

- [x] useNotifications — paginated fetch, mark read, delete, preferences, push init
- [x] usePasswordConfirm — password confirmation modal
- [x] useResponsive — device size detection, dimension helpers

### Utilities ✅ DONE

- [x] offerPricing — find best offer for product, cached active offers, discount computation
- [x] quantityLimits — per-product max-per-order limits (specific barcodes)

### Internationalization ✅ DONE

- [x] I18n context provider with language persistence
- [x] RTL support (I18nManager.forceRTL) with app reload on switch
- [x] English translations (~1,071 keys)
- [x] Arabic translations (~1,061 keys)
- [x] Localized content: common, nav, auth, home, products, cart, checkout, orders, profile, settings, notifications, complaints, driver, offers, promotions, payment, search, about

### Design System Implementation ✅ DONE

- [x] Colors.ts — full ElBaraka palette (primary greens, neutrals, accents)
- [x] Spacing.ts — 8px grid system
- [x] Typography.ts — Poppins font sizes and weights
- [x] Poppins font family (4 weights loaded via @expo-google-fonts/poppins)

### Caching & Performance ✅ DONE

- [x] Dual-layer API cache (in-memory Map + AsyncStorage)
- [x] Image caching with expo-file-system (500MB, 7-day TTL)
- [x] TanStack Query (5-min stale time, 10-min GC)
- [x] In-memory token caching (avoids AsyncStorage reads)
- [x] Skeleton loading states on all screens
- [x] Network-first and cache-first fetch strategies

### Offline Support ✅ DONE

- [x] OfflineIndicator component
- [x] Network state detection (expo-network)
- [x] Cached data served when offline
- [x] Reviews available offline (reviewsCache)

### Deep Linking ✅ DONE

- [x] `cart://` custom scheme
- [x] `https://cart.com/product` universal links
- [x] Expo Router file-based routing with dynamic `[id]` params

### Dependencies (43+ runtime) ✅ DONE

- Expo SDK 54 core modules
- Auth: expo-apple-authentication, @react-native-google-signin, expo-local-authentication, expo-secure-store
- Notifications: expo-notifications, expo-task-manager
- Navigation: expo-router, react-native-screens, gesture-handler, safe-area-context
- State: zustand, @tanstack/react-query
- UI: react-native-reanimated, lottie-react-native, lucide-react-native, expo-image, expo-blur, expo-linear-gradient
- Fonts: @expo-google-fonts/poppins
- Storage: @react-native-async-storage/async-storage
- Network: @react-native-community/netinfo, expo-network
- Real-time: laravel-echo, pusher-js
- WebView: react-native-webview
- Utils: date-fns, expo-clipboard, expo-haptics, expo-sharing

---

## ✅ ADMIN DASHBOARD — COMPLETE FEATURE LIST (React + Vite)

### Tech Stack ✅ DONE

- [x] React 18 + TypeScript + Vite 5
- [x] Tailwind CSS 3.4 + tailwindcss-animate
- [x] Radix UI primitives (19 components)
- [x] TanStack React Query 5 + Axios
- [x] React Router DOM 6
- [x] React Hook Form + Zod validation
- [x] TanStack React Table 8
- [x] Recharts 2.12 (charts)
- [x] Leaflet + Leaflet Draw (maps)
- [x] i18next (EN + AR bilingual with RTL)
- [x] Laravel Echo + Pusher (real-time)
- [x] jsPDF + xlsx (PDF + Excel export)
- [x] DOMPurify (XSS sanitization)
- [x] Zustand 4.5 (auth store, persisted)

### Pages / Routes (29 pages) ✅ DONE

- [x] **Login** — admin JWT authentication
- [x] **Dashboard** — main overview with KPIs, charts, quick stats
- [x] **Products** — product catalog CRUD (search, filter, bulk actions, Cloudinary image upload)
- [x] **Categories** — category tree management (hierarchical, bilingual EN/AR)
- [x] **Orders** — order list with filters, status updates
- [x] **Order Detail** — full order view with items, customer, payment, timeline, status workflow
- [x] **Order Receipt** — printable PDF receipt
- [x] **Promotions** — campaign management (create/edit forms, scheduling, targeting)
- [x] **Promo Codes** — full promo management (BOGO rules, targeting, usage limits)
- [x] **Promo Code Analytics** — per-code analytics dashboard
- [x] **Refund Dashboard** — refund processing and tracking
- [x] **Support Tickets** — ticket list with filters
- [x] **Support Analytics** — support metrics & performance
- [x] **Ticket Detail** — real-time messaging with customer, canned responses, smart suggestions (SmartSuggestionsPanel)
- [x] **Financial Dashboard** — revenue analytics, payment breakdown, Excel & PDF export
- [x] **Admin Users** — admin user CRUD with role assignment
- [x] **Customers** — customer list with search/filter
- [x] **Customer Detail** — profile, LTV analytics, order history, COD restrictions, VIP flags
- [x] **Comprehensive Analytics** — 10 report types (sales, customers, products, orders, marketing, financial, inventory, operational)
- [x] **Activity Logs** — application-level event logging
- [x] **Admin Logs** — admin action audit trail
- [x] **Content Management** — CMS static pages (Terms, Privacy, About)
- [x] **Reviews** — product/order review moderation (approve, reject, respond, bulk ops)
- [x] **Delivery Zones** — polygon geo-fence drawing on Leaflet maps, zone CRUD
- [x] **Drivers** — driver management (assignment, zone allocation, performance, live locations)
- [x] **Store Settings** — store configuration (working hours, delivery, payments)
- [x] **Rate Limit Dashboard** — API rate limit monitoring and reporting

### Key Features ✅ DONE

- [x] **JWT Authentication** with auto token refresh
- [x] **RBAC System** — 4 roles (owner, cashier, support, store_manager) with granular module.action permissions
- [x] **Route guards** + navigation item permission filtering (usePermissions hook with `can()`, `canAny()`, `canAll()`)
- [x] **Real-time updates** via Laravel Echo + Pusher
- [x] **Data Export** — multi-sheet Excel + styled PDF reports (excel-export, pdf-export utilities)
- [x] **Form draft persistence** — auto-save to localStorage with debounce (useFormPersistence hook)
- [x] **Rate limit monitoring** — live API rate limit tracking (useRateLimitStatus hook)
- [x] **Error boundary** — global React error catching
- [x] **Responsive UI** — Tailwind + Radix primitives
- [x] **Full i18n** — English + Arabic bilingual with RTL layout support
- [x] **Dashboard sidebar navigation** with permission-based menu items

### Services (21 API service files) ✅ DONE

- [x] auth, order, product, category, promotion, promo-code
- [x] driver, delivery-zone, financial, analytics, comprehensive-analytics
- [x] support, canned-response, user, review, refund-dashboard
- [x] activity-log, admin-log, static-page, store-settings, rate-limit

---

## ✅ DRIVER APP — COMPLETE FEATURE LIST (React Native / Expo)

### Tech Stack ✅ DONE

- [x] React Native 0.81.5 / Expo SDK 54
- [x] Expo Router 6 (file-based routing)
- [x] TypeScript
- [x] Expo SecureStore (auth token storage)
- [x] Expo Location + TaskManager (background GPS tracking)
- [x] React Native WebView (embedded Leaflet/OSM map)
- [x] React Native Reanimated 4 + Gesture Handler
- [x] Expo Haptics

### Screens (8 screens) ✅ DONE

- [x] **Root redirect** — sends to home (authenticated) or login
- [x] **Login** — email/password with driver role validation
- [x] **Home/Dashboard** — online/offline toggle (haptic), today's stats (orders, delivered, cancelled, earnings), active orders list with call/navigate actions, auto-refresh (30s)
- [x] **Orders** — tab filters (All, New, Preparing, Delivering, Delivered), pagination, pull-to-refresh
- [x] **Stats/Earnings** — period selector (Today/7d/30d/All Time), delivery rate, rating, all-time totals
- [x] **Profile** — personal info, vehicle details (type + plate), zone assignment, change password, logout, app version
- [x] **Order Detail** — customer info, items, payment, address, status actions (accept/pickup/deliver/reject), call customer, open in maps, rate customer modal
- [x] **Delivery Map** — WebView OSM map with real-time driver position (4s updates), delivery pin, route visualization, open in external maps app

### Services ✅ DONE

- [x] **API client** — fetch-based HTTP with SecureStore token management, auto-auth, timeout
- [x] **Auth service** — login (driver-role guard), logout, stored user, profile, change password
- [x] **Driver service** — dashboard, availability, location, orders (paginated), order details, accept/pickup/deliver/reject, stats, customer rating
- [x] **Location service** — background GPS tracking via TaskManager, foreground service notification, configurable interval (15s) + distance filter (20m), active order linking for Pusher events

### Key Features ✅ DONE

- [x] Secure authentication with SecureStore persistence
- [x] Online/offline availability toggle with haptic feedback
- [x] Full order lifecycle — accept → pickup → deliver (with reject option + reason)
- [x] Customer communication — one-tap phone call, one-tap open address in Google Maps
- [x] Live delivery map — real-time GPS (4s interval), route to destination
- [x] **Background location tracking** — continues when app is backgrounded/killed
- [x] Period-filtered earnings & statistics
- [x] Customer rating (1-5 stars + comment)
- [x] Pull-to-refresh on all screens
- [x] Auto-refresh dashboard (30s interval)
- [x] Paginated order history with tab filters

---

## 🔧 DEVELOPMENT & CODE QUALITY

### Development Guidelines ✅ FOLLOWED

- [x] Mobile-first responsive design throughout
- [x] ElBaraka color palette strictly followed (emerald green primary, orange for promos only)
- [x] Consistent naming conventions (kebab-case files, camelCase variables, PascalCase components)
- [x] Proper error handling and user feedback on all interactions
- [x] Mobile-responsive patterns implemented

### Code Quality ✅ PARTIAL

- [x] TypeScript used across all 4 codebases
- [x] Form Request validation on backend endpoints
- [x] API Resources for consistent JSON responses
- [x] Zustand + TanStack Query architecture (frontend)
- [x] ESLint configured (frontend)
- [x] TypeScript strict mode options configured
- [ ] Unit test coverage (currently ~0%, target >80%)
- [ ] Integration tests (partial — load test scripts exist in k6-tests/)
- [ ] E2E testing framework not set up

### k6 Load Tests ✅ DONE

- [x] Auth storm test (01-auth-storm.js)
- [x] Browse catalog test (02-browse-catalog.js)
- [x] Cart operations test (03-cart-operations.js)
- [x] Full order flow test (04-full-order-flow.js)
- [x] Tracking poll test (05-tracking-poll.js)
- [x] Cancel/refund test (06-cancel-refund.js)
- [x] Full journey test (07-full-journey.js)
- [x] Test helpers (helpers.js)
- [x] PHP test user seeder (seed-test-users.php)

---

## 📐 DESIGN SYSTEM IMPLEMENTATION

### Typography ✅ DONE

- [x] Poppins font (4 weights via @expo-google-fonts/poppins)
- [x] H1: 34-40px bold, H2: 28-32px bold, H3: 22-24px semibold, H4: 18-20px semibold
- [x] Body: large 18px, base 16px, medium 14px, small 12px
- [x] Price: 30-34px bold emerald green

### Color Palette ✅ DONE

- [x] Primary (emerald green): #16a34a (buttons, prices, CTAs), #15803d (hover), #22c55e (success), #84cc16 (confirmations)
- [x] Neutral: #ffffff (cards), #f8fafc (backgrounds), #f1f5f9 (card bg), #e2e8f0 (skeleton), #64748b (secondary text), #1e293b (primary text)
- [x] Accent: #f97316 (promos only), #facc15 (highlight badges), #ef4444 (errors), #a3e635 (success highlights)

### Spacing ✅ DONE

- [x] Strict 8px grid system
- [x] Page horizontal padding: px-6 (24px) on all screens
- [x] Card internal padding: 12px; between cards: 16px
- [x] Touch targets: ≥48×48dp minimum

### Signature Elements ✅ DONE

- [x] Floating gradient orbs (3+ orbs, pulse animation, on Home & Categories)
- [x] Skeleton loading (800ms shimmer, headers preserved)
- [x] rounded-3xl on all cards
- [x] shadow-md + border border-neutral-gray/30 on all cards
- [x] Green prices everywhere (#16a34a)
- [x] Orange only for promos/deals
- [x] Bottom sheets (rounded-t-3xl) for Cart, Filters, Checkout
- [x] active:scale-95 micro-interactions on all buttons/cards

### Animations ✅ DONE

- [x] Lottie animated splash screen
- [x] Skeleton shimmer (1.5s infinite linear)
- [x] Floating orb pulse (8s infinite ease-in-out)
- [x] Button press scale (active:scale-95 + transition-all duration-200)
- [x] Hero banner auto-scroll
- [x] Countdown timers

---

## 🔐 SECURITY IMPLEMENTATION STATUS

### Authentication & Authorization ✅ DONE

- [x] Laravel Sanctum with access + refresh tokens
- [x] OTP email verification (8-digit, 10-min expiry)
- [x] Password confirmation for sensitive operations
- [x] Role-based access (customer, admin, driver) via middleware
- [x] RBAC with granular permissions (CheckPermission middleware)
- [x] Social login (Google + Apple) with proper OAuth flows
- [x] Biometric authentication on mobile

### Rate Limiting ✅ DONE

- [x] Enterprise-grade rate limiting (Token Bucket algorithm, Redis Lua)
- [x] Per-endpoint configuration (auth: 5/min, API: 120/min, payments: 10/min, search: 30/min)
- [x] IP-based limiting for unauthenticated requests
- [x] User-based limiting for authenticated requests
- [x] IP blacklisting/unblacklisting
- [x] Rate limit monitoring admin dashboard
- [x] Frontend 429 handler with exponential backoff + jitter

### Security Headers ✅ DONE

- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY
- [x] X-XSS-Protection: 1; mode=block
- [x] Strict-Transport-Security (HSTS)
- [x] Content-Security-Policy
- [x] Referrer-Policy

### Input Validation ✅ DONE

- [x] Form Request classes for auth, addresses, favorites, complaints, orders
- [x] Email validation (RFC/DNS, unique)
- [x] Phone validation (international format, unique)
- [x] Password policy (min 8 chars, confirmed)
- [x] Input sanitization (trim, strip_tags in prepareForValidation)
- [x] SQL injection prevention (Eloquent ORM everywhere)
- [x] XSS protection (auto JSON escaping + DOMPurify on admin frontend)

### Payment Security ✅ DONE

- [x] Paymob HMAC SHA-512 webhook verification
- [x] No card data stored (Paymob tokenization)
- [x] Card refunds via Paymob API
- [x] Transaction logging for audit trail
- [x] Payment idempotency
- [x] Secure environment variable configuration

### Other Security ✅ DONE

- [x] CORS configured for mobile app
- [x] Gzip compression middleware
- [x] Force JSON response middleware
- [x] Admin activity audit logging
- [x] .env files in .gitignore
- [x] Sensitive model attribute encryption (encrypted cast)

---

## 📈 PERFORMANCE IMPLEMENTATION STATUS

### Backend Performance ✅ DONE

- [x] Redis caching for hot data (search suggestions, quick stats, store settings)
- [x] Redis-backed guest cart (RedisCartService)
- [x] Database performance indexes (multiple migration files)
- [x] Full-text search index on products
- [x] API response pagination (default 20 items)
- [x] Gzip compression middleware
- [x] Async job processing (13 job classes)
- [x] Health check endpoints with Prometheus metrics

### Frontend Performance ✅ DONE

- [x] TanStack React Query caching (5-min stale, 10-min GC)
- [x] Dual-layer API cache (in-memory + AsyncStorage)
- [x] Image caching (500MB file system cache, 7-day TTL)
- [x] In-memory token caching
- [x] Skeleton loading on all screens
- [x] Optimistic updates with rollback (cart, favorites)
- [x] expo-image with caching
- [x] Zustand persistence with selective fields

---

## 📋 WHAT'S NOT YET DONE / REMAINING WORK

### Testing & QA ⏳

- [ ] Unit tests for backend (PHPUnit — 0% coverage)
- [ ] Unit tests for frontend (Jest — 0% coverage)
- [ ] Integration tests (beyond k6 load tests)
- [ ] E2E tests for critical user flows
- [ ] Device compatibility testing matrix
- [ ] iOS testing (currently Android-focused)
- [ ] RTL (Arabic) visual testing pass
- [ ] Performance profiling & bottleneck elimination

### Deployment & DevOps ⏳

- [ ] CI/CD pipeline setup
- [ ] Production environment configuration
- [ ] Domain + SSL configuration
- [ ] Database backup strategy
- [ ] Monitoring tools (Sentry/New Relic) setup
- [ ] Google Play Store deployment (guide exists: GOOGLE_PLAY_DEPLOYMENT_GUIDE.md)
- [ ] iOS App Store deployment
- [ ] Crash reporting setup
- [ ] Production Redis configuration
- [ ] Queue worker deployment (Supervisor)
- [ ] WebSocket server deployment (Pusher/Reverb production)

### Feature Gaps ⏳

- [ ] **Barcode scanner** — product lookup by scanning (planned, not implemented)
- [ ] **Elastic Search** — advanced search (using MySQL FULLTEXT currently)
- [ ] **Voice search** — integration pending
- [ ] **Advanced product filters** — price range slider, multi-select (basic filters exist)
- [ ] **Share product** — social sharing of products
- [ ] **Subscription orders** — recurring orders for regular items
- [ ] **Loyalty program** — points, rewards, tiers
- [ ] **Gift cards** — digital gift card system
- [ ] **SMS notifications** — Twilio configured but not fully wired
- [ ] **Admin notification campaigns** — scheduling with segmentation (backend exists, admin UI partial)
- [ ] **Bulk product import** (CSV) — admin panel
- [ ] **Advanced inventory management** — stock adjustment history, bulk stock update
- [ ] **Report scheduling** — automated periodic report generation

### Minor Items ⏳

- [ ] Empty states with CTAs on some screens (partial)
- [ ] Pull-to-refresh on all list views (most done, some missing)
- [ ] Smooth fade-in-up animations for list items
- [ ] Dark mode support (toggle exists, full theme not applied)
- [ ] Offline mode queue actions when offline
- [ ] APP_KEY rotation strategy documentation

---

## 📁 PROJECT STRUCTURE

```
cart/
├── unibackend/                  # Laravel 11 Backend API
│   ├── app/
│   │   ├── Console/Commands/    # Artisan commands (2)
│   │   ├── Events/              # Broadcast events (4)
│   │   ├── Http/
│   │   │   ├── Controllers/     # API controllers (30+)
│   │   │   ├── Middleware/       # Custom middleware (10)
│   │   │   ├── Requests/        # Form requests (14)
│   │   │   └── Resources/       # API resources (7)
│   │   ├── Jobs/                # Queue jobs (13)
│   │   ├── Mail/                # Mailables (3)
│   │   ├── Models/              # Eloquent models (55)
│   │   └── Services/            # Business logic services (26)
│   ├── database/
│   │   ├── migrations/          # 82 migrations
│   │   ├── seeders/             # 16 seeders + SQL seeds
│   │   └── factories/           # 1 factory (User)
│   ├── routes/
│   │   ├── api.php              # 170+ API endpoints
│   │   └── web.php              # Payment redirect routes
│   └── config/                  # App configs (payments, rate-limiting, cloudinary, etc.)
│
├── frontend/                    # Customer Mobile App (React Native / Expo)
│   ├── app/                     # 70+ screen files (Expo Router)
│   │   ├── (auth)/              # Login, signup, forgot password
│   │   ├── (tabs)/              # Home, categories, cart, orders, offers, profile
│   │   ├── product/             # Product detail, reviews
│   │   ├── categories/          # Category detail
│   │   ├── checkout/            # Address, payment, confirmation
│   │   ├── orders/              # Order detail, tracking, rating
│   │   ├── profile/             # Edit, settings, addresses, payments, favorites, complaints
│   │   ├── complaints/          # Complaint list, new, detail/chat
│   │   ├── offers/              # Offer detail, items
│   │   ├── promotions/          # Promotion detail, products
│   │   ├── deals/               # Flash deals
│   │   ├── driver/              # Driver dashboard, order detail, stats
│   │   └── about/               # About, privacy, terms (CMS)
│   ├── components/              # 27 reusable components
│   ├── services/                # 37 service files (API, cache, payment, auth)
│   ├── store/                   # Zustand store (~706 lines)
│   ├── hooks/                   # 3 custom hooks
│   ├── types/                   # 4 type definition files
│   ├── utils/                   # 2 utility files
│   ├── i18n/                    # EN + AR translations (~2,100+ lines total)
│   ├── constants/               # Colors, Spacing, Typography
│   ├── config/                  # App config
│   ├── data/                    # Mock data (6 files)
│   └── assets/                  # Images, icons, Lottie animations
│
├── AdminDashboard/              # Admin Panel (React + Vite)
│   └── src/
│       ├── pages/               # 29 page components
│       ├── components/          # Layout, support, UI primitives
│       ├── services/            # 21 API service files
│       ├── store/               # Zustand auth store
│       ├── hooks/               # 4 custom hooks
│       ├── lib/                 # API client, RBAC, utils, export
│       ├── i18n/                # EN + AR translations
│       └── types/               # TypeScript definitions
│
├── driver-app/                  # Driver Mobile App (React Native / Expo)
│   ├── app/                     # 8 screens (login, dashboard, orders, stats, profile, order detail, map)
│   ├── services/                # 4 service files (api, auth, driver, location)
│   ├── contexts/                # AuthContext
│   └── config/                  # App config
│
├── k6-tests/                    # Load testing scripts (7 tests)
├── layout.md                    # ElBaraka Design System
├── apis.md                      # Complete API documentation
├── elbaraka_unified.sql         # Full database SQL dump
└── [Various *.md docs]          # Reports, guides, deployment docs
```

---

## 📊 PROJECT METRICS

| Metric                       | Count             |
| ---------------------------- | ----------------- |
| **Backend Controllers**      | 30+               |
| **Backend Models**           | 55                |
| **Database Migrations**      | 82                |
| **Backend Services**         | 26                |
| **Background Jobs**          | 13                |
| **API Endpoints**            | 170+              |
| **Customer App Screens**     | 70+ files         |
| **Customer App Components**  | 27                |
| **Customer App Services**    | 37                |
| **Admin Dashboard Pages**    | 29                |
| **Admin Dashboard Services** | 21                |
| **Driver App Screens**       | 8                 |
| **Translation Keys**         | ~2,100+ (EN + AR) |
| **k6 Load Test Scripts**     | 7                 |

---

## 📝 CONFIGURATION REFERENCE

### Frontend Config (config/app.config.ts)

```typescript
API_BASE_URL: 'https://cartshop.site/api/v1'
TIMEOUT: 15000 (15s)
MAP: Nominatim/OSM (free, no API key)
TOKEN: 7-day access, 90-day refresh
OTP: 8-digit, 10-min expiry
```

### Admin Dashboard Config

```
API base: same backend
Auth: JWT + auto refresh
i18n: EN/AR with RTL
```

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
- 2026-02-26: Comprehensive project-instructions.md rewrite — audited all 4 codebases (backend: 55 models, 82 migrations, 30+ controllers, 26 services, 13 jobs; frontend: 70+ screens, 27 components, 37 services; admin: 29 pages, 21 services; driver: 8 screens, 4 services), marked all completed features, added missing sections (Admin Dashboard, Driver App, Notifications, Delivery Zones, RBAC, Analytics, etc.), updated project metrics and status.

---

**Document Version**: 2.0
**Last Updated**: February 26, 2026
**Maintained By**: CART Development Team
