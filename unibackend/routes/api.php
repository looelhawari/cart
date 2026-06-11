<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\AdminLogController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AnalyticsController;
use App\Http\Controllers\Api\Admin\ComprehensiveAnalyticsController;
use App\Http\Controllers\Api\Admin\FinancialController;
use App\Http\Controllers\Api\Admin\OrderStatusController;
use App\Http\Controllers\Api\Admin\RefundController as AdminRefundController;
use App\Http\Controllers\Api\Admin\SupportController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\PromotionController as AdminPromotionController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\PromoCodeController as AdminPromoCodeController;
use App\Http\Controllers\Api\Admin\AdminStoreSettingsController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminRefundDashboardController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OffersController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PromoCodeApiController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\StaticPageController;
use App\Http\Controllers\Api\StoreSettingsController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\V1\RatingController;
use App\Http\Controllers\Api\Admin\AdminDeliveryZoneController;
use App\Http\Controllers\Api\Admin\AdminDriverController;
use App\Http\Controllers\Api\RefundWebhookController;
use App\Http\Controllers\Api\Admin\StaticPageController as AdminStaticPageController;
use App\Http\Controllers\Api\SearchSuggestionsController;
use App\Http\Controllers\Api\Admin\RbacController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health check - basic ping (public, rate limited)
Route::middleware('throttle:60,1')->get('health', [HealthController::class, 'ping']);

// Health check - detailed & metrics (admin only — exposes system internals)
Route::middleware(['auth:sanctum', 'admin', 'throttle:30,1'])->group(function () {
    Route::get('health/detailed', [HealthController::class, 'detailed']);
    Route::get('health/metrics', [HealthController::class, 'metrics']);
});

Route::prefix('v1')->group(function () {

    // Auth routes (guest only) - using named 'auth' rate limiter (60/min by IP)
    Route::middleware(['guest', 'throttle:auth'])->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/verify-email', [AuthController::class, 'verifyEmail']);
        Route::post('auth/resend-otp', [AuthController::class, 'resendOtp']);
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
        Route::post('auth/check-email', [AuthController::class, 'checkEmail']);
        Route::post('auth/check-phone', [AuthController::class, 'checkPhone']);

        // Social authentication (stricter rate limit: 10 attempts per minute)
        Route::middleware('throttle:10,1')->group(function () {
            Route::post('auth/google', [SocialAuthController::class, 'google']);
            Route::post('auth/apple', [SocialAuthController::class, 'apple']);
        });
    });

    // Refresh token (no auth required) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->post('auth/refresh', [AuthController::class, 'refreshToken']);

    // Cart routes (guest or authenticated) - using named 'cart' rate limiter (200/min)
    Route::middleware('throttle:cart')->prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/items', [CartController::class, 'addItem']);
        Route::put('/items/{id}', [CartController::class, 'updateItem']);
        Route::delete('/items/{id}', [CartController::class, 'removeItem']);
        Route::delete('/clear', [CartController::class, 'clear']);
        Route::post('/apply-promo', [CartController::class, 'applyPromo']);
        Route::delete('/remove-promo', [CartController::class, 'removePromo']);
    });

    // Promo code routes — ALL endpoints require authentication.
    //
    // SECURITY (audit): /validate, /preview, /details and /suggestions used
    // to be public, allowing anyone to brute-force-enumerate promo codes
    // (60 req/min/IP × proxies = ~hundreds of thousands of probes/day).
    // Moved into auth:sanctum group + tighter rate limit per-user.
    Route::middleware(['auth:sanctum', 'throttle:30,1'])->prefix('promo-codes')->group(function () {
        Route::get('/available', [PromoCodeApiController::class, 'available']);
        Route::post('/validate', [PromoCodeApiController::class, 'validate']);
        Route::post('/preview', [PromoCodeApiController::class, 'preview']);
        Route::get('/details/{code}', [PromoCodeApiController::class, 'details']);
        Route::get('/suggestions', [PromoCodeApiController::class, 'suggestions']);
        Route::post('/recommendations', [PromoCodeApiController::class, 'recommendations']);
        Route::get('/my-usage', [PromoCodeApiController::class, 'myUsage']);
    });

    // Product routes (public) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('products', [ProductController::class, 'index']);
        Route::get('products/featured', [ProductController::class, 'featured']);
        Route::get('products/flash-deals', [ProductController::class, 'flashDeals']);
        Route::get('products/{barcode}', [ProductController::class, 'show']);
    });

    // Search suggestions (public) - high frequency, cached in Redis
    Route::middleware('throttle:120,1')->prefix('search')->group(function () {
        Route::get('suggestions', [SearchSuggestionsController::class, 'suggestions']);
        Route::get('popular', [SearchSuggestionsController::class, 'popular']);
    });

    // Category routes (public) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('/featured-with-products', [CategoryController::class, 'featuredWithProducts']);
        Route::get('/{id}', [CategoryController::class, 'show']);
        Route::get('/{id}/products', [CategoryController::class, 'products']);
    });

    // Promotion routes (public - for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('promotions')->group(function () {
        Route::get('/', [PromotionController::class, 'index']);
        Route::get('/featured', [PromotionController::class, 'featured']);
        Route::get('/{id}', [PromotionController::class, 'show']);
        Route::get('/{id}/products', [PromotionController::class, 'products']);
    });

    // Offers routes (public - promo codes for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('offers')->group(function () {
        Route::get('/', [OffersController::class, 'index']);
        Route::get('/summary', [OffersController::class, 'summary']);
    });

    // Reviews routes (public - for viewing reviews) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('reviews')->group(function () {
        Route::get('/product/{productId}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'getProductReviews']);
        Route::get('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'show']);
    });

    // Static pages routes (public - Terms, Privacy, About for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('pages')->group(function () {
        Route::get('/', [StaticPageController::class, 'index']);
        Route::get('/{slug}', [StaticPageController::class, 'show']);
    });

    // Store settings routes (public - for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('store')->group(function () {
        Route::get('/settings', [StoreSettingsController::class, 'index']);
        Route::get('/status', [StoreSettingsController::class, 'getStoreStatus']);
        Route::get('/working-hours', [StoreSettingsController::class, 'getWorkingHours']);
        Route::get('/delivery-settings', [StoreSettingsController::class, 'getDeliverySettings']);
    });

    // Delivery zones routes (public - zone listing for mobile map) - throttled to 60/min
    Route::middleware('throttle:60,1')->prefix('delivery-zones')->group(function () {
        Route::get('/', [DeliveryZoneController::class, 'index']);
        Route::post('/check-coverage', [DeliveryZoneController::class, 'checkCoverage']);
        Route::post('/calculate-fee', [DeliveryZoneController::class, 'calculateDeliveryFee']);
        Route::post('/reverse-geocode', [DeliveryZoneController::class, 'reverseGeocode']);
    });

    // Protected routes
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/confirm-password', [AuthController::class, 'confirmPassword']);

        // Broadcasting auth (Universal for Admin & Customer).
        //
        // SECURITY HARDENED (audit S4): the previous implementation contained
        // a manual-fallback branch that signed an arbitrary `private-XXX`
        // channel with the Pusher secret WITHOUT verifying the user owned the
        // channel — only `complaints.*` channels were checked. An attacker
        // could subscribe to anyone's `private-order.{id}.tracking` and watch
        // their GPS feed in real time.
        //
        // We now delegate exclusively to Broadcast::auth(), which honors the
        // ownership callbacks defined in routes/channels.php for every
        // channel. No manual signing, no fallback.
        Route::post('/broadcasting/auth', function (Request $request) {
            return Broadcast::auth($request);
        });

        // User profile endpoints
        Route::get('profile', [AuthController::class, 'getProfile']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::delete('profile/avatar', [AuthController::class, 'deleteAvatar']);
        Route::put('profile/change-password', [AuthController::class, 'changePassword']);
        Route::post('profile/avatar', [AuthController::class, 'uploadAvatar']);

        // Email change - verified OTP flow (password users only)
        Route::post('profile/request-email-change', [AuthController::class, 'requestEmailChange'])
            ->middleware('throttle:5,1'); // max 5 requests per minute
        Route::post('profile/verify-email-change', [AuthController::class, 'verifyEmailChange'])
            ->middleware('throttle:10,1');

        // Account deletion (authenticated user)
        Route::delete('profile/delete-account', [AuthController::class, 'deleteAccount'])
            ->middleware('throttle:3,1'); // max 3 attempts per minute

        // Relink Google account (social-only users).
        // SECURITY: heavy rate limit (3/hour per user) — endpoint changes
        // canonical email + google_id without step-up auth. A proper fix is
        // a 2-step flow with an OTP sent to the CURRENT email; until that's
        // implemented, the strict throttle raises the cost of exploitation.
        Route::post('profile/relink-google', [SocialAuthController::class, 'relinkGoogle'])
            ->middleware('throttle:3,60');

        // Address management endpoints
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::get('addresses/{id}', [AddressController::class, 'show']);
        Route::put('addresses/{id}', [AddressController::class, 'update']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
        Route::post('addresses/{id}/default', [AddressController::class, 'setDefault']);

        // Delivery zone validation (authenticated - needs user's address)
        Route::post('delivery-zones/validate-address', [DeliveryZoneController::class, 'validateAddress']);

        // Driver routes (requires driver role)
        Route::middleware(['driver', 'throttle:120,1'])->prefix('driver')->group(function () {
            Route::post('/orders/{id}/reject', [DriverController::class, 'rejectOrder']);
            Route::get('/dashboard', [DriverController::class, 'dashboard']);
            Route::post('/toggle-availability', [DriverController::class, 'toggleAvailability']);
            Route::post('/location', [DriverController::class, 'updateLocation']);
            Route::get('/orders', [DriverController::class, 'orders']);
            Route::get('/orders/{id}', [DriverController::class, 'orderDetails']);
            Route::post('/orders/{id}/accept', [DriverController::class, 'acceptOrder']);
            Route::post('/orders/{id}/pickup', [DriverController::class, 'pickupOrder']);
            Route::post('/orders/{id}/deliver', [DriverController::class, 'deliverOrder']);
            Route::get('/stats', [DriverController::class, 'stats']);

            // Driver rates customer
            Route::post('/orders/{id}/rate-customer', [RatingController::class, 'rateCustomer']);
            Route::get('/orders/{id}/can-rate-customer', [RatingController::class, 'canRateCustomer']);
        });

        // Payment Methods CRUD (Phase 4) - password required for deletion
        Route::prefix('payment-methods')->group(function () {
            Route::get('/', [PaymentMethodController::class, 'index']);
            Route::put('/{id}/default', [PaymentMethodController::class, 'setDefault']);
            Route::middleware('password.confirm')->delete('/{id}', [PaymentMethodController::class, 'destroy']);
        });
        // Checkout endpoints - password required for payment processing
        Route::prefix('checkout')->group(function () {
            Route::get('/addresses', [CheckoutController::class, 'getAddresses']);
            Route::get('/delivery-slots', [CheckoutController::class, 'getDeliverySlots']);
            Route::get('/payment-methods', [CheckoutController::class, 'getPaymentMethods']);
            Route::post('/calculate', [CheckoutController::class, 'calculateSummary']);
            Route::middleware('password.confirm')->post('/process-payment', [CheckoutController::class, 'processPayment']);
            Route::get('/payment-options/{orderId}', [CheckoutController::class, 'getPaymentOptions']);
            Route::post('/validate-promo', [CheckoutController::class, 'validatePromoCode']);
        });

        // Order endpoints
        Route::prefix('orders')->group(function () {
            Route::get('/cancellation-reasons', [OrderController::class, 'cancellationReasons']);
            Route::get('/', [OrderController::class, 'index']);
            Route::post('/', [OrderController::class, 'store']);
            Route::get('/{id}', [OrderController::class, 'show']);
            Route::get('/{id}/tracking', [OrderController::class, 'tracking']);
            Route::get('/{id}/can-cancel', [OrderController::class, 'canCancel']);
            Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
            Route::post('/{id}/partial-cancel', [OrderController::class, 'partialItemCancel']);
            Route::get('/{id}/refunds', [OrderController::class, 'refundHistory']);
            Route::post('/{id}/reorder', [OrderController::class, 'reorder']);

            // Customer rates driver
            Route::post('/{id}/rate-driver', [RatingController::class, 'rateDriver']);
            Route::get('/{id}/can-rate-driver', [RatingController::class, 'canRateDriver']);
            Route::get('/{id}/driver-rating', [RatingController::class, 'getDriverRating']);
            Route::get('/{id}/invoice', [OrderController::class, 'invoice']);
            Route::get('/{id}/invoice/download', [OrderController::class, 'invoiceDownload']);
            Route::post('/{id}/invoice/email', [OrderController::class, 'emailInvoice']);
        });

        // Notification endpoints
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
            Route::post('/token', [NotificationController::class, 'saveToken']);
            Route::delete('/token', [NotificationController::class, 'removeToken']);
            Route::get('/preferences', [NotificationController::class, 'getPreferences']);
            Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
        });

        // Payment endpoints (protected) - no session middleware for API (mobile/SPA)
        Route::prefix('payments')->group(function () {
            // Pre-check payment - SECURITY: tight rate limit. Each call creates
            // a Paymob order on the merchant account; spamming this drains
            // Paymob quota and pollutes reporting.
            Route::middleware('throttle:10,1')
                ->post('/paymob/pre-check', [PaymentController::class, 'preCheckPayment']);

            // Initiate payment (creates payment record). SECURITY: same risk
            // as pre-check; tighter cap.
            Route::middleware('throttle:10,1')
                ->post('/paymob/initiate', [PaymentController::class, 'initiatePayment']);

            // Initiate payment with saved card (Phase 5)
            Route::middleware('throttle:10,1')
                ->post('/paymob/initiate-with-saved-card', [PaymentController::class, 'initiateSavedCardPayment']);

            // Check payment status for polling (per-payment query)
            Route::get('/status/{paymentId}', [PaymentController::class, 'checkStatus']);

            // Get payment status by order ID (LEGACY: per-order query)
            Route::get('/order/{orderId}/status', [PaymentController::class, 'getPaymentStatus']);
        });

        // Wallet feature removed from product — endpoints deleted.

        // Favorites endpoints
        Route::prefix('favorites')->group(function () {
            Route::get('/', [FavoriteController::class, 'index']);
            Route::post('/', [FavoriteController::class, 'store']);
            Route::delete('/{id}', [FavoriteController::class, 'destroy']);
            Route::get('/check/{productId}', [FavoriteController::class, 'check']);
        });

        // Complaints endpoints
        Route::prefix('complaints')->group(function () {
            Route::get('/', [ComplaintController::class, 'index']);
            Route::post('/', [ComplaintController::class, 'store']);
            Route::get('/{id}', [ComplaintController::class, 'show']);
            Route::post('/{id}/messages', [ComplaintController::class, 'addMessage']);
            Route::post('/{id}/typing', [ComplaintController::class, 'typing']);
            Route::post('/{id}/escalate', [ComplaintController::class, 'escalate']);
            Route::post('/{id}/rate-bot', [ComplaintController::class, 'rateBot']);
            Route::post('/{id}/close', [ComplaintController::class, 'close']);
        });

        // Reviews endpoints (protected)
        Route::prefix('reviews')->group(function () {
            Route::post('/', [\App\Http\Controllers\Api\V1\ReviewController::class, 'store']);
            Route::get('/my-reviews', [\App\Http\Controllers\Api\V1\ReviewController::class, 'getUserReviews']);
            Route::get('/can-review/{productId}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'canReview']);
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'destroy']);
            Route::post('/{id}/helpful', [\App\Http\Controllers\Api\V1\ReviewController::class, 'markHelpful']);
        });

        // Product Watchlist endpoints (Enterprise Notifications)
        Route::prefix('watchlist')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\WatchlistController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\WatchlistController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\WatchlistController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\WatchlistController::class, 'destroy']);
            Route::get('/check/{productId}', [\App\Http\Controllers\Api\WatchlistController::class, 'check']);
        });

        // Flash Sales endpoints (Enterprise Notifications)
        Route::prefix('flash-sales')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\FlashSaleController::class, 'index']);
            Route::get('/upcoming', [\App\Http\Controllers\Api\FlashSaleController::class, 'upcoming']);
            Route::get('/{id}', [\App\Http\Controllers\Api\FlashSaleController::class, 'show']);
        });

        // Admin routes (requires admin role)
        Route::middleware(['admin', 'log.admin.activity', 'throttle:admin'])->prefix('admin')->group(function () {

            // ── RBAC: Get my permissions (every admin calls this) ──
            Route::get('/rbac/my-permissions', [RbacController::class, 'myPermissions']);

            // ── RBAC Management (owner only) ──
            Route::middleware('permission:users.manage')->prefix('rbac')->group(function () {
                Route::get('/roles', [RbacController::class, 'roles']);
                Route::get('/permissions', [RbacController::class, 'permissions']);
                Route::put('/roles/{roleId}/permissions', [RbacController::class, 'updateRolePermissions']);
            });

            // Activity Logs (legacy - for app-level logs like user registrations, logins)
            Route::middleware('permission:app_logs.view')->prefix('activity-logs')->group(function () {
                Route::get('/', [ActivityLogController::class, 'index']);
                Route::get('/statistics', [ActivityLogController::class, 'statistics']);
                Route::get('/users', [ActivityLogController::class, 'users']);
                Route::get('/entity-types', [ActivityLogController::class, 'entityTypes']);
                Route::get('/export', [ActivityLogController::class, 'export']);
                Route::get('/{id}', [ActivityLogController::class, 'show']);
            });

            // Admin Logs (detailed admin action tracking)
            Route::middleware('permission:admin_logs.view')->prefix('admin-logs')->group(function () {
                Route::get('/', [AdminLogController::class, 'index']);
                Route::get('/statistics', [AdminLogController::class, 'statistics']);
                Route::get('/users', [AdminLogController::class, 'users']);
                Route::get('/entity-types', [AdminLogController::class, 'entityTypes']);
                Route::get('/modules', [AdminLogController::class, 'modules']);
                Route::get('/action-types', [AdminLogController::class, 'actionTypes']);
                Route::get('/export', [AdminLogController::class, 'export']);
                Route::get('/recent', [AdminLogController::class, 'recent']);
                Route::get('/entity-history', [AdminLogController::class, 'entityHistory']);
                Route::get('/user-activity/{userId}', [AdminLogController::class, 'userActivity']);
                Route::get('/{id}', [AdminLogController::class, 'show']);
            });

            // Products Management
            //
            // SECURITY HARDENED (audit C4 — permission OR-bug):
            // Group middleware uses comma-OR semantics ("user has view OR
            // manage"), so a store_manager with only products.view used to
            // reach POST/PUT/DELETE. Each mutating route now ALSO requires
            // products.manage explicitly — middleware composes, so both the
            // group OR-check and the per-route AND-check must pass.
            Route::middleware('permission:products.view,products.manage')->prefix('products')->group(function () {
                Route::get('/', [AdminProductController::class, 'index']);
                Route::get('/stock-alerts', [AdminProductController::class, 'stockAlerts']);
                Route::get('/{barcode}', [AdminProductController::class, 'show']);
                Route::post('/', [AdminProductController::class, 'store'])->middleware('permission:products.manage');
                Route::post('/bulk-stock', [AdminProductController::class, 'bulkToggleStock'])->middleware('permission:products.manage');
                Route::put('/{barcode}', [AdminProductController::class, 'update'])->middleware('permission:products.manage');
                Route::delete('/{barcode}', [AdminProductController::class, 'destroy'])->middleware('permission:products.manage');
                Route::post('/{barcode}/upload-image', [AdminProductController::class, 'uploadImage'])->middleware('permission:products.manage');
                Route::put('/{barcode}/stock', [AdminProductController::class, 'toggleStock'])->middleware('permission:products.manage');
            });

            // Categories Management (same C4 hardening as products)
            Route::middleware('permission:categories.view,categories.manage')->prefix('categories')->group(function () {
                Route::get('/', [AdminCategoryController::class, 'index']);
                Route::get('/{id}', [AdminCategoryController::class, 'show']);
                Route::post('/', [AdminCategoryController::class, 'store'])->middleware('permission:categories.manage');
                Route::put('/{id}', [AdminCategoryController::class, 'update'])->middleware('permission:categories.manage');
                Route::delete('/{id}', [AdminCategoryController::class, 'destroy'])->middleware('permission:categories.manage');
                Route::post('/{id}/upload-image', [AdminCategoryController::class, 'uploadImage'])->middleware('permission:categories.manage');
            });

            // Orders Management (same C4 hardening)
            Route::middleware('permission:orders.view,orders.manage')->prefix('orders')->group(function () {
                Route::get('/', [AdminOrderController::class, 'index']);
                Route::get('/status/{status}', [AdminOrderController::class, 'byStatus']);
                Route::get('/{id}', [AdminOrderController::class, 'show']);
                Route::put('/{id}/status', [AdminOrderController::class, 'updateStatus'])->middleware('permission:orders.manage');
                Route::post('/{id}/cancel', [AdminOrderController::class, 'cancel'])->middleware('permission:orders.manage');
                Route::post('/{orderId}/deliver', [OrderStatusController::class, 'markDelivered'])->middleware('permission:orders.manage');
            });

            // Support Tickets (C4 hardening — write actions require .manage)
            Route::middleware('permission:support.view,support.manage')->prefix('support')->group(function () {
                Route::get('/tickets', [SupportController::class, 'index']);
                Route::get('/tickets/{id}', [SupportController::class, 'show']);
                Route::get('/tickets/{id}/suggestions', [SupportController::class, 'getSuggestions']);
                Route::get('/tickets/{id}/customer-history', [SupportController::class, 'getCustomerHistory']);
                Route::get('/analytics', [SupportController::class, 'analytics']);
                Route::post('/tickets', [SupportController::class, 'store'])->middleware('permission:support.manage');
                Route::put('/tickets/{id}', [SupportController::class, 'update'])->middleware('permission:support.manage');
                Route::put('/tickets/{id}/status', [SupportController::class, 'updateStatus'])->middleware('permission:support.manage');
                Route::put('/tickets/{id}/priority', [SupportController::class, 'updatePriority'])->middleware('permission:support.manage');
                Route::post('/tickets/{id}/assign', [SupportController::class, 'assignTicket'])->middleware('permission:support.manage');
                Route::post('/tickets/{id}/messages', [SupportController::class, 'addMessage'])->middleware('permission:support.manage');
                Route::post('/tickets/{id}/typing', [SupportController::class, 'typing'])->middleware('permission:support.manage');
                Route::post('/tickets/{id}/read', [SupportController::class, 'markAsRead'])->middleware('permission:support.manage');
            });

            // Canned Responses (C4 hardening — mutations require support.manage)
            Route::middleware('permission:support.view,support.manage')->prefix('canned-responses')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'store'])->middleware('permission:support.manage');
                Route::get('/categories', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'categories']);
                Route::get('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'show']);
                Route::put('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'update'])->middleware('permission:support.manage');
                Route::delete('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'destroy'])->middleware('permission:support.manage');
            });

            // Financial Management (C4 hardening)
            Route::middleware('permission:financial.view,financial.manage')->prefix('financial')->group(function () {
                Route::get('/dashboard', [FinancialController::class, 'dashboard']);
                Route::get('/transactions', [FinancialController::class, 'transactions']);
                Route::get('/promo-codes', [FinancialController::class, 'promoCodes']);
                Route::get('/promo-codes/analytics', [FinancialController::class, 'promoCodesAnalytics']);
                Route::post('/promo-codes', [FinancialController::class, 'createPromoCode'])->middleware('permission:financial.manage');
                Route::put('/promo-codes/{id}', [FinancialController::class, 'updatePromoCode'])->middleware('permission:financial.manage');
                Route::delete('/promo-codes/{id}', [FinancialController::class, 'deletePromoCode'])->middleware('permission:financial.manage');
            });

            // Promotions Management (C4 hardening)
            Route::middleware('permission:promotions.view,promotions.manage')->prefix('promotions')->group(function () {
                Route::get('/', [AdminPromotionController::class, 'index']);
                Route::get('/summary-analytics', [AdminPromotionController::class, 'summaryAnalytics']);
                Route::get('/{id}', [AdminPromotionController::class, 'show']);
                Route::get('/{id}/analytics', [AdminPromotionController::class, 'analytics']);
                Route::post('/', [AdminPromotionController::class, 'store'])->middleware('permission:promotions.manage');
                Route::put('/{id}', [AdminPromotionController::class, 'update'])->middleware('permission:promotions.manage');
                Route::delete('/{id}', [AdminPromotionController::class, 'destroy'])->middleware('permission:promotions.manage');
                Route::post('/{id}/feature', [AdminPromotionController::class, 'setFeatured'])->middleware('permission:promotions.manage');
                Route::post('/sync-status', [AdminPromotionController::class, 'syncStatus'])->middleware('permission:promotions.manage');
            });

            // Notification Management (C4 hardening — mutations require notifications.manage)
            Route::middleware('permission:notifications.view,notifications.manage')->prefix('notifications')->group(function () {
                Route::get('/', [AdminNotificationController::class, 'index']);
                Route::get('/analytics', [AdminNotificationController::class, 'analytics']);
                Route::get('/{id}', [AdminNotificationController::class, 'show']);
                Route::delete('/{id}', [AdminNotificationController::class, 'destroy'])->middleware('permission:notifications.manage');
                Route::post('/{id}/resend', [AdminNotificationController::class, 'resend'])->middleware('permission:notifications.manage');
                Route::post('/broadcast', [AdminNotificationController::class, 'sendBroadcast'])->middleware('permission:notifications.manage');
                Route::post('/send-to-users', [AdminNotificationController::class, 'sendToUsers'])->middleware('permission:notifications.manage');
                Route::post('/send-promotion', [AdminNotificationController::class, 'sendPromotion'])->middleware('permission:notifications.manage');
            });

            // Static Pages Management (Terms, Privacy, About) — C4 hardening
            Route::middleware('permission:content.view,content.manage')->prefix('pages')->group(function () {
                Route::get('/', [AdminStaticPageController::class, 'index']);
                Route::get('/{slug}', [AdminStaticPageController::class, 'show']);
                Route::get('/{slug}/history', [AdminStaticPageController::class, 'history']);
                Route::put('/{slug}', [AdminStaticPageController::class, 'update'])->middleware('permission:content.manage');
                Route::post('/{slug}/toggle-status', [AdminStaticPageController::class, 'toggleStatus'])->middleware('permission:content.manage');
            });

            // Customer Management (C4 hardening — cashier had view only and
            // could still hit reset-password / update / notes; now those
            // explicitly require customers.manage)
            Route::middleware('permission:customers.view,customers.manage')->prefix('customers')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'index']);
                Route::get('/stats', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'stats']);
                Route::get('/{id}', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'show']);
                Route::get('/{id}/activity', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'activity']);
                Route::put('/{id}', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'update'])->middleware('permission:customers.manage');
                Route::post('/{id}/notes', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'storeNote'])->middleware('permission:customers.manage');
                Route::post('/{id}/reset-password', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'resetPassword'])->middleware('permission:customers.manage');
            });

            // User Management (C4 hardening)
            Route::middleware('permission:users.view,users.manage')->prefix('users')->group(function () {
                Route::get('/', [UserController::class, 'index']);
                Route::get('/{id}', [UserController::class, 'show']);
                Route::post('/', [UserController::class, 'store'])->middleware('permission:users.manage');
                Route::put('/{id}', [UserController::class, 'update'])->middleware('permission:users.manage');
                Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('permission:users.manage');
            });

            // Analytics & Reporting
            Route::middleware('permission:analytics.view,analytics.manage')->prefix('analytics')->group(function () {
                Route::get('/dashboard', [AnalyticsController::class, 'dashboard']);
                Route::get('/quick-stats', [AnalyticsController::class, 'quickStats']); // Cached lightweight stats
                Route::get('/products', [AnalyticsController::class, 'productPerformance']);
                Route::get('/customers', [AnalyticsController::class, 'customerInsights']);

                // Comprehensive Analytics
                Route::get('/overview', [ComprehensiveAnalyticsController::class, 'overview']);
                Route::get('/sales', [ComprehensiveAnalyticsController::class, 'salesAnalytics']);
                Route::get('/customers-detailed', [ComprehensiveAnalyticsController::class, 'customerAnalytics']);
                Route::get('/products-detailed', [ComprehensiveAnalyticsController::class, 'productAnalytics']);
                Route::get('/orders-detailed', [ComprehensiveAnalyticsController::class, 'orderAnalytics']);
                Route::get('/marketing', [ComprehensiveAnalyticsController::class, 'marketingAnalytics']);
                Route::get('/financial', [ComprehensiveAnalyticsController::class, 'financialAnalytics']);
                Route::get('/inventory', [ComprehensiveAnalyticsController::class, 'inventoryAnalytics']);
                Route::get('/operational', [ComprehensiveAnalyticsController::class, 'operationalAnalytics']);
                Route::get('/export', [ComprehensiveAnalyticsController::class, 'exportAnalytics']);
            });

            // Refunds (wallet-based) — C4 hardening: issuing money requires refunds.manage
            Route::middleware('permission:refunds.view,refunds.manage')->prefix('refunds')->group(function () {
                Route::post('/full', [AdminRefundController::class, 'fullRefund'])->middleware('permission:refunds.manage');
                Route::post('/partial', [AdminRefundController::class, 'partialRefund'])->middleware('permission:refunds.manage');
                Route::get('/history/{orderId}', [AdminRefundController::class, 'getRefundHistory']);
            });

            // Refund Dashboard (Paymob card refunds) — C4 + I15 hardening.
            // The previous /reconcile route pointed to a method that didn't
            // exist on AdminRefundDashboardController (would 500 with "method
            // not found"). The actual reconcile lives on RefundWebhookController.
            // Re-route there with the manage permission required.
            Route::middleware('permission:refunds.view,refunds.manage')->prefix('refund-dashboard')->group(function () {
                Route::get('/', [AdminRefundDashboardController::class, 'index']);
                Route::get('/stats', [AdminRefundDashboardController::class, 'stats']);
                Route::get('/{id}', [AdminRefundDashboardController::class, 'show']);
                Route::post('/partial-item-refund', [AdminRefundDashboardController::class, 'partialItemRefund'])
                    ->middleware('permission:refunds.manage');
                Route::post('/reconcile', [\App\Http\Controllers\Api\RefundWebhookController::class, 'reconcile'])
                    ->middleware('permission:refunds.manage');
            });

            // Promo Code Analytics & Management
            Route::middleware('permission:promo_codes.view,promo_codes.manage')->prefix('promo-codes')->group(function () {
                // CRUD operations (C4 hardening — mutations require promo_codes.manage)
                Route::get('/', [AdminPromoCodeController::class, 'index']);
                Route::post('/', [AdminPromoCodeController::class, 'store'])->middleware('permission:promo_codes.manage');
                Route::get('/products', [AdminPromoCodeController::class, 'getProducts']);
                Route::get('/categories', [AdminPromoCodeController::class, 'getCategories']);
                Route::post('/compare', [AdminPromoCodeController::class, 'compare']);
                Route::post('/bulk-status', [AdminPromoCodeController::class, 'bulkUpdateStatus'])->middleware('permission:promo_codes.manage');
                Route::get('/export', [AdminPromoCodeController::class, 'export']);

                // Single promo code operations
                Route::get('/{id}', [AdminPromoCodeController::class, 'show']);
                Route::put('/{id}', [AdminPromoCodeController::class, 'update'])->middleware('permission:promo_codes.manage');
                Route::delete('/{id}', [AdminPromoCodeController::class, 'destroy'])->middleware('permission:promo_codes.manage');
                Route::post('/{id}/duplicate', [AdminPromoCodeController::class, 'duplicate'])->middleware('permission:promo_codes.manage');
                Route::post('/{id}/send-notification', [AdminPromoCodeController::class, 'sendNotification'])->middleware('permission:promo_codes.manage');
                Route::get('/{id}/analytics', [AdminPromoCodeController::class, 'analytics']);
                Route::get('/{id}/usage-history', [AdminPromoCodeController::class, 'usageHistory']);
                Route::get('/{id}/users', [AdminPromoCodeController::class, 'users']);
                Route::get('/{id}/user/{userId}', [AdminPromoCodeController::class, 'userUsage']);
            });

            // Store Settings Management (C4 hardening — mutations require settings.manage)
            Route::middleware('permission:settings.view,settings.manage')->prefix('store-settings')->group(function () {
                Route::get('/', [AdminStoreSettingsController::class, 'index']);
                Route::get('/status', [AdminStoreSettingsController::class, 'getStoreStatus']);
                Route::get('/delivery', [AdminStoreSettingsController::class, 'getDeliverySettings']);
                Route::put('/working-hours', [AdminStoreSettingsController::class, 'updateWorkingHours'])->middleware('permission:settings.manage');
                Route::put('/delivery', [AdminStoreSettingsController::class, 'updateDeliverySettings'])->middleware('permission:settings.manage');
                Route::post('/toggle-closure', [AdminStoreSettingsController::class, 'toggleStoreClosure'])->middleware('permission:settings.manage');
                Route::put('/setting', [AdminStoreSettingsController::class, 'updateSetting'])->middleware('permission:settings.manage');
                Route::put('/settings', [AdminStoreSettingsController::class, 'updateSettings'])->middleware('permission:settings.manage');
                Route::post('/settings', [AdminStoreSettingsController::class, 'createSetting'])->middleware('permission:settings.manage');
                Route::delete('/settings/{key}', [AdminStoreSettingsController::class, 'deleteSetting'])->middleware('permission:settings.manage');
                Route::post('/clear-cache', [AdminStoreSettingsController::class, 'clearCache'])->middleware('permission:settings.manage');
            });

            // Reviews & Ratings Management
            Route::middleware('permission:reviews.view,reviews.manage')->prefix('reviews')->group(function () {
                Route::get('/', [AdminReviewController::class, 'index']);
                Route::get('/analytics', [AdminReviewController::class, 'analytics']);
                Route::get('/order/{orderId}', [AdminReviewController::class, 'orderReviews']);
                Route::get('/{id}', [AdminReviewController::class, 'show']);
                Route::get('/{id}/history', [AdminReviewController::class, 'history']);
                Route::put('/{id}/status', [AdminReviewController::class, 'updateStatus'])->middleware('permission:reviews.manage');
                Route::post('/{id}/respond', [AdminReviewController::class, 'respond'])->middleware('permission:reviews.manage');
                Route::post('/bulk-status', [AdminReviewController::class, 'bulkUpdateStatus'])->middleware('permission:reviews.manage');
                Route::delete('/{id}', [AdminReviewController::class, 'destroy'])->middleware('permission:reviews.manage');
            });

            // Delivery Zones Management (C4 hardening — mutations require delivery_zones.manage;
            // check-coordinate is a read-style query so it stays view-level)
            Route::middleware('permission:delivery_zones.view,delivery_zones.manage')->prefix('delivery-zones')->group(function () {
                Route::get('/', [AdminDeliveryZoneController::class, 'index']);
                Route::get('/dashboard', [AdminDeliveryZoneController::class, 'dashboard']);
                Route::post('/', [AdminDeliveryZoneController::class, 'store'])->middleware('permission:delivery_zones.manage');
                Route::post('/check-coordinate', [AdminDeliveryZoneController::class, 'checkCoordinate']);
                Route::post('/reorder', [AdminDeliveryZoneController::class, 'reorder'])->middleware('permission:delivery_zones.manage');
                Route::get('/{id}', [AdminDeliveryZoneController::class, 'show']);
                Route::put('/{id}', [AdminDeliveryZoneController::class, 'update'])->middleware('permission:delivery_zones.manage');
                Route::delete('/{id}', [AdminDeliveryZoneController::class, 'destroy'])->middleware('permission:delivery_zones.manage');
                Route::post('/{id}/toggle-status', [AdminDeliveryZoneController::class, 'toggleStatus'])->middleware('permission:delivery_zones.manage');
                Route::get('/{id}/analytics', [AdminDeliveryZoneController::class, 'analytics']);
            });

            // Driver Management (C4 hardening)
            Route::middleware('permission:drivers.view,drivers.manage')->prefix('drivers')->group(function () {
                Route::get('/', [AdminDriverController::class, 'index']);
                Route::get('/available', [AdminDriverController::class, 'availableDrivers']);
                Route::get('/locations', [AdminDriverController::class, 'locations']);
                Route::get('/performance', [AdminDriverController::class, 'performance']);
                Route::get('/{id}', [AdminDriverController::class, 'show']);
                Route::post('/', [AdminDriverController::class, 'store'])->middleware('permission:drivers.manage');
                Route::put('/{id}', [AdminDriverController::class, 'update'])->middleware('permission:drivers.manage');
                Route::delete('/{id}', [AdminDriverController::class, 'destroy'])->middleware('permission:drivers.manage');
            });

            // Assign driver to order
            // SECURITY FIXED (audit I5): previously this route was registered
            // OUTSIDE any permission middleware (only the admin group's
            // is-admin check applied), so cashier / support / store_manager
            // could reassign drivers without `drivers.manage`. Wrap it now.
            Route::post('/orders/{orderId}/assign-driver', [AdminDriverController::class, 'assignDriverToOrder'])
                ->middleware('permission:drivers.manage');
        });
    });

    // Paymob callbacks (public - no auth required, HMAC verified internally)
    Route::middleware('throttle:60,1')->group(function () {
        Route::post('paymob/processed', [PaymentController::class, 'processedCallback']);
        Route::post('paymob/refund-webhook', [RefundWebhookController::class, 'handle']);
        Route::get('payment/response', [PaymentController::class, 'responseCallback']);
    });

});
